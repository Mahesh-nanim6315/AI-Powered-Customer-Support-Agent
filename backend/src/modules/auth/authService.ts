import prisma from "../../config/database";
import bcrypt from "bcrypt";
import { generateToken } from "../../utils/jwt";

export class AuthService {

    static async register(orgName: string, email: string, password: string) {

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            throw new Error("User already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const organization = await prisma.organization.create({
            data: {
                name: orgName
            }
        });

        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                role: "ADMIN",
                orgId: organization.id
            }
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
            }
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
            }
        };
    }
}