import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from "../db/models/userModel";
import bcrypt from 'bcrypt'
import { validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { Op } from 'sequelize';
import AppConstants from '../AppConstants';
require('dotenv').config();

const authController = {
    loginController : async (req: Request, res: Response): Promise<void> => {
        try { 
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
           res.status(400).json({ errors: errors.array() });
           return
          }
          
          const { email, password } = req.body;
      
          const user = await User.findOne({ where: { email: email } });
      
          if (!user || user.is_deleted === 1) {
            res.status(404).json({ error: AppConstants.ErrorMessages.User.USER_NOT_FOUND });
            return;
          }
      
          const isMatch = await bcrypt.compare(password, user.password);
      
          if (!isMatch) {
            res.status(401).json({ error: AppConstants.ErrorMessages.Auth.INCORRECT_PASSWORD });
            return;
          }
      
          const payload = {
            userId: user.id,
            role: user.role,
            gender: user.gender
          };
      
          const token = jwt.sign(payload, 'your_secret_key', { expiresIn: '24h' });
      
          res.status(200).json({ token });
        } catch (error) {
          console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
          res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
        }
    },

    changePassword: async (req: Request, res: Response) => { 
      
        try {
            const { currentPassword, newPassword, confirmPassword } = req.body;
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
            }

            const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
            const user_id = decoded.userId

            // Temukan pengguna berdasarkan ID yang didekodekan dari token
            const user = await User.findByPk(user_id);

            if (!user || user.is_deleted === 1) {
            return res.status(404).json({ error: AppConstants.ErrorMessages.User.USER_NOT_FOUND });
            }

            // Verifikasi password saat ini
            const isMatch = await bcrypt.compare(currentPassword, user.password);

            if (!isMatch) {
            return res.status(401).json({ error: AppConstants.ErrorMessages.Auth.CURRENT_PASSWORD_INCORRECT});
            }

            // Validasi konfirmasi password
            if (newPassword !== confirmPassword) {
            return res.status(400).json({ error: AppConstants.ErrorMessages.Auth.ERROR_CONFIRM_PASSWORD });
            }

            // Hash password baru sebelum menyimpannya
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            // Ganti password pengguna dengan password baru yang di-hash
            user.password = hashedNewPassword;
            await user.save();

            res.status(200).json({ message: AppConstants.ErrorMessages.Auth.CHANGE_PASSWORD_SUCCES });
        } catch (error) {
            console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
            res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
        }
    },

    forgotPassword: async (req: Request, res: Response): Promise<void> => {
      try {
          const { email } = req.body;

          if (!email){
              res.status(400).json(AppConstants.ErrorMessages.Auth.EMAIL_IS_REQUIRED);
              return;
          }

          const user = await User.findOne({ where: { email: email } });

          if (!user || user.is_deleted === 1) {
              res.status(404).json({ error: AppConstants.ErrorMessages.User.USER_NOT_FOUND });
              return;
          }

          const resetToken = crypto.randomInt(100000, 999999).toString();
          const resetTokenHash = await bcrypt.hash(resetToken, 10);
          user.resetToken = resetTokenHash;
          user.resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now
          await user.save();

          const transporter = nodemailer.createTransport({
              service: 'Gmail',
              auth: {
                  user: process.env.EMAIL_USER,
                  pass: process.env.EMAIL_PASS,
              },
          });

          const mailOptions = {
            to: user.email,
            from: process.env.EMAIL_USER,
            subject: 'Password Reset Token',
            text: `Your password reset token is:\n\n${resetToken}\n\nIf you did not request this, please ignore this email and your password will remain unchanged.\n`
          };


          await transporter.sendMail(mailOptions);

          res.status(200).json({ message: AppConstants.ErrorMessages.Auth.SEND_PASSWORD_RESET_LINK });
        } catch (error) {
            console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
            res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
        }
    },

    resetPassword: async (req: Request, res: Response): Promise<void> => {
        try {
            const { token, newPassword, confirmPassword } = req.body;

            const user = await User.findOne({
                where: {
                    resetTokenExpires: { [Op.gt]: new Date() }
                }
            });

            if (!user) {
                res.status(400).json({ error: AppConstants.ErrorMessages.Auth.RESET_TOKEN_INVALID });
                return;
            }

            if (!user.resetToken) {
                res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
                return
            }

            const isMatch = bcrypt.compare(token, user.resetToken);

            if (!isMatch) {
                res.status(400).json({ error: AppConstants.ErrorMessages.Auth.RESET_TOKEN_INVALID });
                return;
            }

            if (newPassword !== confirmPassword) {
                res.status(400).json({ error: AppConstants.ErrorMessages.Auth.ERROR_CONFIRM_PASSWORD });
                return;
            }

            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedNewPassword;
            user.resetToken = null;
            user.resetTokenExpires = null;
            await user.save();

            res.status(200).json({ message: AppConstants.ErrorMessages.Auth.RESET_PASSWORD_SUCCES });
        } catch (error) {
            console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
            res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
        }
    }
}

export default authController