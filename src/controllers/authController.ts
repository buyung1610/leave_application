import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from "../db/models/userModel";
import bcrypt from 'bcrypt'
import { JwtPayload } from '../db/types';
import { validationResult } from 'express-validator';

const authController = {
    loginController : async (req: Request, res: Response): Promise<void> => {
        try { 
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
           res.status(400).json({ errors: errors.array() });
           return
          }
          
          const { email, password } = req.body;
      
          // Temukan pengguna berdasarkan email
          const user = await User.findOne({ where: { email: email } });
      
          if (!user || user.is_deleted === 1) {
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
            role: user.role,
          };
      
          // Buat token JWT menggunakan payload dan secret key
          const token = jwt.sign(payload, 'your_secret_key', { expiresIn: '24h' });
      
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
            const user_id = decoded.userId

            // Temukan pengguna berdasarkan ID yang didekodekan dari token
            const user = await User.findByPk(user_id);

            if (!user || user.is_deleted === 1) {
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


// import nodemailer from 'nodemailer';
// import crypto from 'crypto';
// import { Op } from 'sequelize';
// require('dotenv').config();

// // Konfigurasi transporter untuk nodemailer
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'akunku444456@gmail.com', // Gunakan environment variable
//     pass: '1610buyung', // Gunakan environment variable
//   },
// });

// export const requestPasswordReset = async (req: Request, res: Response) => {
//   try {
//     const { email } = req.body;
//     const user = await User.findOne({ where: { email } });

//     if (!user) {
//       return res.status(404).json({ error: 'Email not found' });
//     }

//     const resetToken = crypto.randomBytes(32).toString('hex');
//     const resetTokenExpires = new Date(Date.now() + 3600000); // 1 jam

//     user.resetToken = resetToken;
//     user.resetTokenExpires = resetTokenExpires;
//     await user.save();

//     const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;

//     const mailOptions = {
//       from: 'akunku444456@gmail.com', // Gunakan environment variable
//       to: email,
//       subject: 'Password Reset Request',
//       text: `You requested for a password reset. Please use the following link to reset your password: ${resetUrl}`,
//     };

//     await transporter.sendMail(mailOptions);

//     res.status(200).json({ message: 'Password reset link sent to your email' });
//   } catch (error) {
//     console.error('Error sending password reset email:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };


// export const resetPassword = async (req: Request, res: Response) => {
//   try {
//     const { token, newPassword } = req.body;

//     const user = await User.findOne({
//       where: {
//         resetToken: token,
//         resetTokenExpires: {
//           [Op.gt]: new Date(),
//         },
//       },
//     });

//     if (!user) {
//       return res.status(400).json({ error: 'Invalid or expired token' });
//     }

//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     user.password = hashedPassword;
//     user.resetToken = null;
//     user.resetTokenExpires = null;
//     await user.save();

//     res.status(200).json({ message: 'Password has been reset successfully' });
//   } catch (error) {
//     console.error('Error resetting password:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

export default authController