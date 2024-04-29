import express from "express";
import submissionController from "../controllers/leaveSubmissionController";
import { verifyToken } from "../middleware/verifyToken";

const router = express.Router();


router.get("/", verifyToken, submissionController.getAllSubmission);
router.get("/:id", verifyToken, submissionController.getSubmissionById);
router.get("/:status", verifyToken, submissionController.getSubmissionByStatus);
router.post("/", verifyToken, submissionController.createSubmission)
router.put("/:id", verifyToken, submissionController.updateSubmission);
router.put("/status/:id", verifyToken, submissionController.updateSubmissionStatus);
router.delete("/:id", verifyToken, submissionController.deleteSubmission);

// router.get("/", submissionController.getAllSubmission);
// router.get("/:id", submissionController.getSubmissionById);
// router.get("/:status", submissionController.getSubmissionByStatus);
// router.post("/", submissionController.createSubmission)
// router.put("/:id", submissionController.updateSubmission);
// router.put("/status/:id", submissionController.updateSubmissionStatus);
// router.delete("/:id", submissionController.deleteSubmission);


export default router;