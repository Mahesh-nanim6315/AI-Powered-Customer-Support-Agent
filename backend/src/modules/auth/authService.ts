import prisma from "../../config/database";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { generateToken } from "../../utils/jwt";
import { EmailService } from "../../services/email.service";

export class AuthService {

    static async register(orgName: string, email: string, password: string) {

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new Error("User already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const { organization, user } = await prisma.$transaction(async (tx) => {
            const createdOrg = await tx.organization.create({
                data: {
                    name: orgName
                }
            });

            const createdUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    role: "ADMIN",
                    orgId: createdOrg.id
                }
            });

            await tx.organizationMember.create({
                data: {
                    orgId: createdOrg.id,
                    userId: createdUser.id
                }
            });

            return { organization: createdOrg, user: createdUser };
        });

        const token = generateToken({
            userId: user.id,
            orgId: organization.id,
            role: user.role
        });

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                orgId: organization.id,
                role: user.role
            },
            organizations: [organization]
        };
    }

    static async login(email: string, password: string) {

        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            throw new Error("Invalid credentials");
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            throw new Error("Invalid credentials");
        }

        if (user.role === "CUSTOMER") {
            await prisma.customer.updateMany({
                where: {
                    orgId: user.orgId,
                    email: user.email,
                    userId: null
                },
                data: {
                    userId: user.id,
                    status: "ACTIVE"
                }
            });
        }

        // Ensure the user has at least one org membership
        const existingMembership = await prisma.organizationMember.findFirst({
            where: { userId: user.id }
        });
        if (!existingMembership) {
            await prisma.organizationMember.create({
                data: {
                    userId: user.id,
                    orgId: user.orgId
                }
            });
        }

        const organizations = await prisma.organizationMember.findMany({
            where: { userId: user.id },
            include: { org: true },
            orderBy: { createdAt: "asc" }
        });

        const token = generateToken({
            userId: user.id,
            orgId: user.orgId,
            role: user.role
        });

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                orgId: user.orgId,
                role: user.role
            },
            organizations: organizations.map((membership) => membership.org)
        };
    }

    static async me(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error("User not found");
        }

        const organizations = await prisma.organizationMember.findMany({
            where: { userId },
            include: { org: true },
            orderBy: { createdAt: "asc" }
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                orgId: user.orgId,
                role: user.role
            },
            organizations: organizations.map((membership) => membership.org)
        };
    }

    static async switchOrg(userId: string, orgId: string) {
        const membership = await prisma.organizationMember.findFirst({
            where: { userId, orgId }
        });

        if (!membership) {
            throw new Error("Organization access denied");
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            throw new Error("User not found");
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { orgId }
        });

        const token = generateToken({
            userId: user.id,
            orgId,
            role: user.role
        });

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                orgId,
                role: user.role
            }
        };
    }

    static async invite(orgId: string, email: string, role: "ADMIN" | "AGENT" | "CUSTOMER" = "AGENT") {
        const token = randomBytes(24).toString("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

        const invite = await prisma.invite.create({
            data: {
                orgId,
                email,
                role,
                token,
                expiresAt
            }
        });

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const inviteUrl = `${frontendUrl}/accept-invite?token=${invite.token}`;

        await EmailService.sendEmail(
            email,
            "You're invited to join Support Console",
            `
                <p>You have been invited to join an organization.</p>
                <p>Click the link below to accept the invite:</p>
                <a href="${inviteUrl}" target="_blank">${inviteUrl}</a>
                <p>This invite expires in 7 days.</p>
            `
        );

        return {
            success: true,
            invite: {
                id: invite.id,
                email: invite.email,
                role: invite.role,
                status: invite.status,
                expiresAt: invite.expiresAt
            }
        };
    }

    static async acceptInvite(token: string, password?: string) {
        const invite = await prisma.invite.findUnique({
            where: { token }
        });

        if (!invite) {
            throw new Error("Invalid invite token");
        }

        if (invite.status !== "PENDING") {
            throw new Error("Invite is no longer valid");
        }

        if (invite.expiresAt < new Date()) {
            await prisma.invite.update({
                where: { id: invite.id },
                data: { status: "EXPIRED" }
            });
            throw new Error("Invite has expired");
        }

        let user = await prisma.user.findUnique({
            where: { email: invite.email }
        });

        if (!user) {
            if (!password || password.length < 6) {
                throw new Error("Password is required and must be at least 6 characters");
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            user = await prisma.user.create({
                data: {
                    email: invite.email,
                    password: hashedPassword,
                    role: invite.role,
                    orgId: invite.orgId
                }
            });
        }

        await prisma.organizationMember.upsert({
            where: {
                userId_orgId: {
                    userId: user.id,
                    orgId: invite.orgId
                }
            },
            update: {},
            create: {
                userId: user.id,
                orgId: invite.orgId
            }
        });

        await prisma.invite.update({
            where: { id: invite.id },
            data: {
                status: "ACCEPTED",
                acceptedByUserId: user.id,
                acceptedAt: new Date()
            }
        });

        const tokenValue = generateToken({
            userId: user.id,
            orgId: invite.orgId,
            role: user.role
        });

        return {
            token: tokenValue,
            user: {
                id: user.id,
                email: user.email,
                orgId: invite.orgId,
                role: user.role
            }
        };
    }

    static async registerCustomer(orgId: string, email: string, password: string, name: string) {
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new Error("User already exists");
        }

        const organization = await prisma.organization.findUnique({
            where: { id: orgId }
        });

        if (!organization) {
            throw new Error("Organization not found");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: "CUSTOMER",
                orgId
            }
        });

        await prisma.customer.create({
            data: {
                email,
                name,
                orgId,
                password: hashedPassword,
                status: "ACTIVE",
                userId: user.id
            }
        });

        await prisma.organizationMember.create({
            data: {
                userId: user.id,
                orgId
            }
        });

        const token = generateToken({
            userId: user.id,
            orgId,
            role: user.role
        });

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                orgId,
                role: user.role
            }
        };
    }
}
