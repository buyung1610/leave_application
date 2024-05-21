import express from "express";
import submissionController from "../controllers/leaveSubmissionController";
import { verifyToken } from "../middleware/verifyToken";
import { body } from "express-validator";

const router = express.Router();

router.get("/", verifyToken, submissionController.getAllSubmission);    
router.get("/login", verifyToken, submissionController.getSubmissionLogin);
router.get("/:id", verifyToken, submissionController.getSubmissionById);
// router.get("/:status", verifyToken, submissionController.getSubmissionByStatus);
router.post("/", verifyToken,[
    body('start_date').notEmpty().withMessage('Start date is required'),
    body('end_date').notEmpty().withMessage('End date is required'),
    body('leave_type').notEmpty().withMessage('Leave type is required'),
    body('emergency_call').notEmpty().withMessage('Emergency call is required'),
    body('description').notEmpty().withMessage('Description is required'),
], submissionController.createSubmission)

router.put("/:id", verifyToken, submissionController.updateSubmission);
router.put("/:id/accept", verifyToken, submissionController.acceptSubmission);
router.put("/:id/reject", verifyToken, submissionController.rejectSubmission);
router.delete("/:id", verifyToken, submissionController.deleteSubmission);


export default router;