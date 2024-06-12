import express from "express";
import leaveTypeController from "../controllers/leaveTypeController";
import { verifyToken } from "../middleware/verifyToken";


const router = express.Router();


router.get("/", verifyToken, leaveTypeController.getAll);

router.post("/", verifyToken, leaveTypeController.createLeaveType);

router.put("/:id", verifyToken, leaveTypeController.updateLeaveType);

router.delete("/:id", verifyToken, leaveTypeController.deleteLeavetype);

export default router