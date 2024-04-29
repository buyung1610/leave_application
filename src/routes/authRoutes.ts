import express, { Router } from "express";
import authController from "../controllers/authController";
import { verifyToken } from "../middleware/verifyToken";

const router = express.Router();

router.post("/login", authController.loginController)
router.put("/changePassword", authController.changePassword)

export default router;