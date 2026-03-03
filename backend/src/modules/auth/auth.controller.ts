import { Request, Response } from "express";
import { AuthService } from "./authService";
import { registerSchema, loginSchema } from "./authValidators";

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
}
