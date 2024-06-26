import express from "express";
import submissionController from "../controllers/leaveSubmissionController";
import { authorize, verifyToken } from "../middleware/verifyToken";
import upload from "../middleware/upload";
import { body } from "express-validator";
import LeaveAllowance from "../db/models/leaveAllowanceModel";
import jwt from "jsonwebtoken";


const router = express.Router();


router.post("/upload", verifyToken, upload.single('file'), submissionController.uploadAttachment);

router.put("/delete/:id", verifyToken, submissionController.softDeleteSubmission);

router.put("/upload/:id", verifyToken, upload.single('file'), submissionController.updateAttachment)

router.put("/:id/accept", verifyToken, authorize(['hr', 'owner']), submissionController.acceptSubmission);

router.put("/:id/reject", verifyToken, authorize(['hr', 'owner']), submissionController.rejectSubmission);

router.put("/:id", verifyToken, [
  body('start_date').notEmpty().withMessage('Start date is required'),
  body('end_date').notEmpty().withMessage('End date is required'),
  body('leave_type').notEmpty().withMessage('Leave type is required'),
  body('emergency_call').notEmpty().withMessage('Emergency call is required')
    .isLength({ min: 10 }).withMessage('Emergency call must be at least 10 characters long'),
  body('description').notEmpty().withMessage('Description is required')
    .isLength({ min: 20 }).withMessage('Description must be at least 20 characters long'),
], submissionController.updateSubmission);

router.post("/:id", verifyToken,[
  body('start_date').notEmpty().withMessage('Start date is required'),
  body('end_date').notEmpty().withMessage('End date is required'),
  body('leave_type').notEmpty().withMessage('Leave type is required'),
  body('emergency_call').notEmpty().withMessage('Emergency call is required')
    .isLength({ min: 10 }).withMessage('Emergency call must be at least 10 characters long'),
  body('description').notEmpty().withMessage('Description is required')
    .isLength({ min: 20 }).withMessage('Description must be at least 20 characters long'),
], submissionController.createEmployeeSubmission);

router.post("/", verifyToken,[
  body('start_date').notEmpty().withMessage('Start date is required'),
  body('end_date').notEmpty().withMessage('End date is required'),
  body('leave_type').notEmpty().withMessage('Leave type is required'),
  body('emergency_call').notEmpty().withMessage('Emergency call is required')
    .isLength({ min: 10 }).withMessage('Emergency call must be at least 10 characters long'),
  body('description').notEmpty().withMessage('Description is required')
    .isLength({ min: 20 }).withMessage('Description must be at least 20 characters long'),
], submissionController.createSubmission);

router.get("/", verifyToken, submissionController.getAllSubmission);

router.get("/login", verifyToken, submissionController.getSubmissionLogin);

router.get("/permintaan-cuti", verifyToken, submissionController.permintaanCuti);

router.get("/history-user", verifyToken, submissionController.getLeaveStats);

router.get("/download-history-user", verifyToken, submissionController.downloadLeaveStats);

router.get("/karyawan-cuti", verifyToken, submissionController.karyawanCuti);

router.get("/cuti-diterima", verifyToken, submissionController.cutiDiterima);

router.get("/cuti-ditolak", verifyToken, submissionController.cutiDitolak);

router.get('/uploads/:filename', verifyToken, submissionController.getAttachment);

router.get("/:id", verifyToken, submissionController.getSubmissionById);

export default router;