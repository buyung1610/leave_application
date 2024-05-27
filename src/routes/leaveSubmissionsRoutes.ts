import express from "express";
import submissionController from "../controllers/leaveSubmissionController";
import { authorize, verifyToken } from "../middleware/verifyToken";
import upload from "../middleware/upload";
import { body } from "express-validator";

const router = express.Router();

router.get("/", verifyToken, submissionController.getAllSubmission);    
router.get("/login", verifyToken, submissionController.getSubmissionLogin);
router.get("/:id", verifyToken, submissionController.getSubmissionById);
// router.get("/:status", verifyToken, submissionController.getSubmissionByStatus);

router.post("/upload", verifyToken, upload.single('image'), submissionController.uploadAttachment)
router.post("/", verifyToken,[
    body('start_date').notEmpty().withMessage('Start date is required'),
    body('end_date').notEmpty().withMessage('End date is required'),
    body('leave_type').notEmpty().withMessage('Leave type is required'),
    body('emergency_call').notEmpty().withMessage('Emergency call is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('attachment').custom((value, { req }) => {
        const startDate = new Date(req.body.start_date);
        const endDate = new Date(req.body.end_date);
        const calculateWorkingDays = (start: Date, end: Date): number => {
            let totalDays = 0;
            let currentDate = new Date(start);
      
            while (currentDate <= end) {
              const dayOfWeek = currentDate.getDay();
              if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Minggu, 6 = Sabtu
                totalDays++;
              }
              currentDate.setDate(currentDate.getDate() + 1);
            }
      
            return totalDays;
          };
      
          const numberOfDays = calculateWorkingDays(startDate, endDate);
        if (req.body.leave_type === '2' && numberOfDays > 1 && (!value || typeof value !== 'string' || value.trim() === "")) {
            throw new Error('Attachment is required');
        }
        return true;
    }),
], submissionController.createSubmission)

router.put("/delete/:id", verifyToken,[
    body('start_date').notEmpty().withMessage('Start date is required'),
    body('end_date').notEmpty().withMessage('End date is required'),
    body('leave_type').notEmpty().withMessage('Leave type is required'),
    body('emergency_call').notEmpty().withMessage('Emergency call is required'),
    body('description').notEmpty().withMessage('Description is required'),
], submissionController.softDeleteSubmission);
router.put("/:id", verifyToken, submissionController.updateSubmission);
router.put("/:id/accept", verifyToken, authorize(['hr', 'owner']), submissionController.acceptSubmission);
router.put("/:id/reject", verifyToken, authorize(['hr', 'owner']), submissionController.rejectSubmission);


export default router;