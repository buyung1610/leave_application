import express from "express";
import submissionController from "../controllers/leaveSubmissionController";
import { authorize, verifyToken } from "../middleware/verifyToken";
import upload from "../middleware/upload";
import { body } from "express-validator";
import LeaveAllowance from "../db/models/leaveAllowanceModel";
import jwt from "jsonwebtoken";

const router = express.Router();

// Rute untuk mengunggah lampiran
router.post("/upload", verifyToken, upload.single('file'), submissionController.uploadAttachment);

// Rute untuk menghapus pengajuan cuti (Soft Delete)
router.put("/delete/:id", verifyToken,[
    body('start_date').notEmpty().withMessage('Start date is required'),
    body('end_date').notEmpty().withMessage('End date is required'),
    body('leave_type').notEmpty().withMessage('Leave type is required'),
    body('emergency_call').notEmpty().withMessage('Emergency call is required'),
    body('description').notEmpty().withMessage('Description is required'),
], submissionController.softDeleteSubmission);

router.put("/upload/:id", verifyToken, upload.single('file'), submissionController.updateAttachment)

// Rute untuk menerima atau menolak pengajuan cuti
router.put("/:id/accept", verifyToken, authorize(['hr', 'owner']), submissionController.acceptSubmission);
router.put("/:id/reject", verifyToken, authorize(['hr', 'owner']), submissionController.rejectSubmission);

router.put("/:id", verifyToken, [
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

    if ((req.body.leave_type === '2' || req.body.leave_type === 2) && numberOfDays > 1 && (!value || typeof value !== 'string' || value.trim() === "")) {
      throw new Error('Attachment is required');
    }
    return true;
  }),
], submissionController.updateSubmission);

// Rute untuk membuat pengajuan cuti
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
      if (req.body.leave_type === '2' || req.body.leave_type === 2 && numberOfDays > 1 && (!value || typeof value !== 'string' || value.trim() === "")) {
          throw new Error('Attachment is required');
      }
      return true;
  }),
], submissionController.createSubmission);

// Rute untuk menampilkan semua pengajuan cuti
router.get("/", verifyToken, submissionController.getAllSubmission);

// Rute untuk menampilkan pengajuan cuti ketika login
router.get("/login", verifyToken, submissionController.getSubmissionLogin);

// Rute untuk menampilkan pengajuan cuti yang dikirim hari ini dengan status pending
router.get("/permintaan-cuti", verifyToken, submissionController.permintaanCuti);

router.get("/leave-history", verifyToken, submissionController.getLeaveHistory);
router.get("/getMonthlyLeaveChart", verifyToken, submissionController.getMonthlyLeaveChart);


// Rute untuk menampilkan pengajuan cuti karyawan
router.get("/karyawan-cuti", verifyToken, submissionController.karyawanCuti);

router.get("/cuti-diterima", verifyToken, submissionController.cutiDiterima);

router.get("/cuti-ditolak", verifyToken, submissionController.cutiDitolak);

router.get('/uploads/:filename', verifyToken, submissionController.getAttachment);

// Rute untuk menampilkan pengajuan cuti berdasarkan ID
router.get("/:id", verifyToken, submissionController.getSubmissionById);

export default router;
