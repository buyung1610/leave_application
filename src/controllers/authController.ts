import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from "../db/models/userModel";
import bcrypt from 'bcrypt'
import { JwtPayload } from '../db/types';
import crypto from "crypto"

const authController = {
    loginController : async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password } = req.body;
        
            // Temukan pengguna berdasarkan email
            const user = await User.findOne({ where: { email } });
        
            if (!user) {
              res.status(404).json({ error: 'User not found' });
              return;
            }
        
            // Bandingkan kata sandi yang diberikan dengan kata sandi yang di-hash dalam database menggunakan bcrypt
            const isMatch = await bcrypt.compare(password, user.password);
        
            if (!isMatch) {
              res.status(401).json({ error: 'Incorrect password' });
              return;
            }
        
            // Buat payload untuk token JWT
            const payload = {
              userId: user.id,
              email: user.email,
            };
        
            // Buat token JWT menggunakan payload dan secret key
            const token = jwt.sign(payload, 'your_secret_key', { expiresIn: '1h' });
        
            // Kirim token JWT sebagai respons
            res.status(200).json({ token });
          } catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({ error: 'Unable to process login' });
          }
    },

    changePassword: async (req: Request, res: Response) => { 
      
        try {
            const { currentPassword, newPassword, confirmPassword } = req.body;
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }

            const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };

            // Temukan pengguna berdasarkan ID yang didekodekan dari token
            const user = await User.findByPk(decoded.userId);

            if (!user) {
            return res.status(404).json({ error: 'User not found' });
            }

            // Verifikasi password saat ini
            const isMatch = await bcrypt.compare(currentPassword, user.password);

            if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
            }

            // Validasi konfirmasi password
            if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: 'New password and confirm password do not match' });
            }

            // Hash password baru sebelum menyimpannya
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            // Ganti password pengguna dengan password baru yang di-hash
            user.password = hashedNewPassword;
            await user.save();

            res.status(200).json({ message: 'Password changed successfully' });
        } catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

export default authController