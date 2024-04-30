import express from "express";
import leaveAllowanceController from "../controllers/leaveAllowanceController";
import { verifyToken } from "../middleware/verifyToken";

const router = express.Router();

router.get("/", verifyToken, leaveAllowanceController.getAll)

export default router