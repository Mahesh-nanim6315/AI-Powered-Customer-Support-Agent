import prisma from "../../config/database";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { EmailService } from "../../services/email.service";

const customerSelect = {
  id: true,
  orgId: true,
  email: true,
  name: true,
  status: true,
  metadata: true,
  createdAt: true,
};

export class CustomersService {
  static async create(
    orgId: string,
    data: { email: string; name: string; metadata?: Record<string, unknown> }
  ) {
    const existing = await prisma.customer.findFirst({
      where: { orgId, email: data.email },
      select: { id: true },
    });
    if (existing) {
      throw new Error("Customer already exists");
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const customer = await prisma.$transaction(async (tx) => {
      const created = await tx.customer.create({
        data: {
          orgId,
          email: data.email,
          name: data.name,
          status: "PENDING",
          metadata: data.metadata as Prisma.InputJsonValue | undefined,
        },
        select: customerSelect,
      });

      await tx.customerInviteToken.create({
        data: {
          orgId,
          email: data.email,
          token,
          expiresAt,
          customerId: created.id,
        },
      });

      return created;
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteUrl = `${frontendUrl}/customer-invite?token=${token}`;

    let inviteSent = true;
    try {
      await EmailService.sendCustomerInviteEmail(data.name, data.email, inviteUrl);
    } catch (error) {
      inviteSent = false;
      console.error("Customer invite email failed:", error);
    }

    return { customer, inviteSent };
  }

  static async list(orgId: string) {
    return prisma.customer.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      select: customerSelect,
    });
  }

  static async getById(orgId: string, id: string) {
    return prisma.customer.findFirst({
      where: { orgId, id },
      select: customerSelect,
    });
  }

  static async acceptInvite(token: string, password: string) {
    const invite = await prisma.customerInviteToken.findUnique({
      where: { token },
    });

    if (!invite) {
      throw new Error("Invalid invite token");
    }

    if (invite.expiresAt < new Date()) {
      throw new Error("Invite token has expired");
    }

    const customer = await prisma.customer.findFirst({
      where: { orgId: invite.orgId, email: invite.email },
      select: { id: true, status: true },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    if (customer.status === "ACTIVE") {
      throw new Error("Customer is already active");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updated = await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: invite.email },
      });

      if (existingUser && existingUser.role !== "CUSTOMER") {
        throw new Error("Email already belongs to a non-customer account");
      }

      const user =
        existingUser ??
        (await tx.user.create({
          data: {
            email: invite.email,
            password: hashedPassword,
            role: "CUSTOMER",
            orgId: invite.orgId,
          },
        }));

      await tx.organizationMember.upsert({
        where: {
          userId_orgId: {
            userId: user.id,
            orgId: invite.orgId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          orgId: invite.orgId,
        },
      });

      const result = await tx.customer.update({
        where: { id: customer.id },
        data: {
          password: hashedPassword,
          status: "ACTIVE",
          userId: user.id,
        },
        select: customerSelect,
      });

      await tx.customerInviteToken.delete({
        where: { id: invite.id },
      });

      return result;
    });

    return updated;
  }
}

