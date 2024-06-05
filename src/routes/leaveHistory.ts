import express from "express";
import leaveHistoryController from "../controllers/leaveHitoryController";
import submissionController from "../controllers/leaveSubmissionController";
import { authorize, verifyToken } from "../middleware/verifyToken";
import upload from "../middleware/upload";
import { body } from "express-validator";
import LeaveAllowance from "../db/models/leaveAllowanceModel";
import jwt from "jsonwebtoken";

const router = express.Router();


router.get("/user", verifyToken, leaveHistoryController.getLeaveHistory);
router.get("/month", verifyToken, leaveHistoryController.getMonthlyLeaveChart);


export default router;
