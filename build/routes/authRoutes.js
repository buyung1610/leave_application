"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = __importDefault(require("../controllers/authController"));
const verifyToken_1 = require("../middleware/verifyToken");
const express_validator_1 = require("express-validator");
// import { requestPasswordReset, resetPassword } from '../controllers/authController';
const router = express_1.default.Router();
router.post('/request-password-reset', authController_1.default.forgotPassword);
router.post('/reset-password', authController_1.default.resetPassword);
router.post("/login", [
    (0, express_validator_1.body)('email').isEmail().withMessage('Invalid email'),
    (0, express_validator_1.body)('email').notEmpty().withMessage('Email is required'),
    (0, express_validator_1.body)('password').isLength({ min: 4 }).withMessage('Password must be at least 4 characters long')
], authController_1.default.loginController);
router.put("/changePassword", verifyToken_1.verifyToken, authController_1.default.changePassword);
exports.default = router;
