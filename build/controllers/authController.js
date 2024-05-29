"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userModel_1 = __importDefault(require("../db/models/userModel"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const express_validator_1 = require("express-validator");
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = __importDefault(require("crypto"));
const sequelize_1 = require("sequelize");
require('dotenv').config();
const authController = {
    loginController: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }
            const { email, password } = req.body;
            // Temukan pengguna berdasarkan email
            const user = yield userModel_1.default.findOne({ where: { email: email } });
            if (!user || user.is_deleted === 1) {
                res.status(404).json({ error: 'User not found' });
                return;
            }
            // Bandingkan kata sandi yang diberikan dengan kata sandi yang di-hash dalam database menggunakan bcrypt
            const isMatch = yield bcrypt_1.default.compare(password, user.password);
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
            const token = jsonwebtoken_1.default.sign(payload, 'your_secret_key', { expiresIn: '24h' });
            // Kirim token JWT sebagai respons
            res.status(200).json({ token });
        }
        catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({ error: 'Unable to process login' });
        }
    }),
    changePassword: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const { currentPassword, newPassword, confirmPassword } = req.body;
            const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const user_id = decoded.userId;
            // Temukan pengguna berdasarkan ID yang didekodekan dari token
            const user = yield userModel_1.default.findByPk(user_id);
            if (!user || user.is_deleted === 1) {
                return res.status(404).json({ error: 'User not found' });
            }
            // Verifikasi password saat ini
            const isMatch = yield bcrypt_1.default.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(401).json({ error: 'Current password is incorrect' });
            }
            // Validasi konfirmasi password
            if (newPassword !== confirmPassword) {
                return res.status(400).json({ error: 'New password and confirm password do not match' });
            }
            // Hash password baru sebelum menyimpannya
            const hashedNewPassword = yield bcrypt_1.default.hash(newPassword, 10);
            // Ganti password pengguna dengan password baru yang di-hash
            user.password = hashedNewPassword;
            yield user.save();
            res.status(200).json({ message: 'Password changed successfully' });
        }
        catch (error) {
            console.error('Error changing password:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }),
    forgotPassword: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { email } = req.body;
            const user = yield userModel_1.default.findOne({ where: { email } });
            if (!user) {
                res.status(404).json({ error: 'Email not found' });
                return;
            }
            const resetToken = crypto_1.default.randomInt(100000, 999999);
            const resetTokenExpires = new Date(Date.now() + 3600000); // 1 jam
            user.resetToken = resetToken;
            user.resetTokenExpires = resetTokenExpires;
            yield user.save();
            const transporter = nodemailer_1.default.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS,
                },
            });
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Password Reset Request',
                text: `You requested for a password reset. Your verification code is: ${resetToken}`,
            };
            yield transporter.sendMail(mailOptions);
            res.status(200).json({ message: 'The verification code has been sent to your email' });
        }
        catch (error) {
            console.error('Error sending password reset email:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }),
    resetPassword: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { token, newPassword } = req.body;
            const user = yield userModel_1.default.findOne({
                where: {
                    resetToken: token,
                    resetTokenExpires: {
                        [sequelize_1.Op.gt]: new Date(),
                    },
                },
            });
            if (!user) {
                res.status(400).json({ error: 'Invalid or expired token' });
                return;
            }
            const hashedPassword = yield bcrypt_1.default.hash(newPassword, 10);
            user.password = hashedPassword;
            user.resetToken = null;
            user.resetTokenExpires = null;
            yield user.save();
            res.status(200).json({ message: 'Password has been reset successfully' });
        }
        catch (error) {
            console.error('Error resetting password:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    })
};
exports.default = authController;
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
