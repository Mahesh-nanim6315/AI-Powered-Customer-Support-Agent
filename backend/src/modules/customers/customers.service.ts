import prisma from "../../config/database";
import { Prisma } from "@prisma/client";

export class CustomersService {
  static async create(
    orgId: string,
    data: { email: string; name: string; metadata?: Record<string, unknown> }
  ) {
    return prisma.customer.create({
      data: {
        orgId,
        email: data.email,
        name: data.name,
        metadata: data.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  static async list(orgId: string) {
    return prisma.customer.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async getById(orgId: string, id: string) {
    return prisma.customer.findFirst({
      where: { orgId, id },
    });
  }
}

