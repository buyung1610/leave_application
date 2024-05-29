import express, { Router } from "express";
import authController from "../controllers/authController";
import { verifyToken } from "../middleware/verifyToken";
import { body } from 'express-validator';
// import { requestPasswordReset, resetPassword } from '../controllers/authController';

const router = express.Router();

router.post('/request-password-reset', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);


router.post("/login",[
    body('email').isEmail().withMessage('Invalid email'),
    body('email').notEmpty().withMessage('Email is required'),
    body('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters long')
], authController.loginController)

router.put("/changePassword", verifyToken, authController.changePassword)

export default router;