import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../db/models/userModel';

declare global {
    namespace Express {
        interface Request {
            user?: User;
        }
    }
}

export const verifyToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
       
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        next();
    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
};


