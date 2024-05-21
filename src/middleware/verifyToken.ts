import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import User from '../db/models/userModel';
import { JwtPayload } from '../db/types';

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

      const secretKey = process.env.JWT_SECRET || 'your_secret_key';
      jwt.verify(token, secretKey, (err, decodedToken) => {
          if (err) {
              if (err instanceof TokenExpiredError) {
                  return res.status(401).json({ error: 'Token expired' });
              }
              return res.status(401).json({ error: 'Invalid token' });
          }

          // Lanjutkan permintaan ke middleware atau rute berikutnya
          next();
      });
  } catch (error) {
      console.error('Error verifying token:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const authorize = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
      // Mengambil token dari header Authorization
      const token = req.headers.authorization?.split(' ')[1];
  
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
  
      try {
        // Verifikasi token dan ekstrak payload
        const decoded = jwt.verify(token, 'your_secret_key') as { role: string };
  
        // Mendapatkan position dari payload token
        const position = decoded.role;
  
        // Memeriksa apakah position termasuk dalam roles yang diizinkan
        if (position && roles.includes(position)) {
          return next();
        } else {
          return res.status(403).json({ message: 'Forbidden' });
        }
      } catch (error) {
        return res.status(403).json({ message: 'Invalid token' });
      }
    };
  };


