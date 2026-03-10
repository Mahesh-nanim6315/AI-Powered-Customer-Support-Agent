import { Request, Response } from "express";
import { AuthService } from "./authService";
import { registerSchema, loginSchema, switchOrgSchema, inviteSchema, acceptInviteSchema, registerCustomerSchema } from "./authValidators";

export class AuthController {

    static async register(req: Request, res: Response) {
        try {
            const data = registerSchema.parse(req.body);

            const result = await AuthService.register(
                data.orgName,
                data.email,
                data.password
            );

            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async login(req: Request, res: Response) {
        try {
            const data = loginSchema.parse(req.body);

            const result = await AuthService.login(
                data.email,
                data.password
            );

            res.json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async me(req: Request, res: Response) {
        try {
            if (!req.user?.userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const result = await AuthService.me(req.user.userId);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async switchOrg(req: Request, res: Response) {
        try {
            if (!req.user?.userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const data = switchOrgSchema.parse(req.body);
            const result = await AuthService.switchOrg(req.user.userId, data.orgId);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async invite(req: Request, res: Response) {
        try {
            if (!req.user?.orgId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const data = inviteSchema.parse(req.body);
            const result = await AuthService.invite(req.user.orgId, data.email, data.role);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async acceptInvite(req: Request, res: Response) {
        try {
            const data = acceptInviteSchema.parse(req.body);
            const result = await AuthService.acceptInvite(data.token, data.password);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    static async registerCustomer(req: Request, res: Response) {
        try {
            const data = registerCustomerSchema.parse(req.body);
            const result = await AuthService.registerCustomer(
                data.orgId,
                data.email,
                data.password,
                data.name
            );
            res.status(201).json(result);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }
}
