"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const leaveSubmissionController_1 = __importDefault(require("../controllers/leaveSubmissionController"));
const verifyToken_1 = require("../middleware/verifyToken");
const upload_1 = __importDefault(require("../middleware/upload"));
const express_validator_1 = require("express-validator");
const router = express_1.default.Router();
router.get("/", verifyToken_1.verifyToken, leaveSubmissionController_1.default.getAllSubmission);
router.get("/login", verifyToken_1.verifyToken, leaveSubmissionController_1.default.getSubmissionLogin);
router.get("/:id", verifyToken_1.verifyToken, leaveSubmissionController_1.default.getSubmissionById);
// router.get("/:status", verifyToken, submissionController.getSubmissionByStatus);
router.post("/upload", verifyToken_1.verifyToken, upload_1.default.single('image'), leaveSubmissionController_1.default.uploadAttachment);
router.post("/", verifyToken_1.verifyToken, [
    (0, express_validator_1.body)('start_date').notEmpty().withMessage('Start date is required'),
    (0, express_validator_1.body)('end_date').notEmpty().withMessage('End date is required'),
    (0, express_validator_1.body)('leave_type').notEmpty().withMessage('Leave type is required'),
    (0, express_validator_1.body)('emergency_call').notEmpty().withMessage('Emergency call is required'),
    (0, express_validator_1.body)('description').notEmpty().withMessage('Description is required'),
    (0, express_validator_1.body)('attachment').custom((value, { req }) => {
        const startDate = new Date(req.body.start_date);
        const endDate = new Date(req.body.end_date);
        const calculateWorkingDays = (start, end) => {
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
], leaveSubmissionController_1.default.createSubmission);
router.put("/delete/:id", verifyToken_1.verifyToken, [
    (0, express_validator_1.body)('start_date').notEmpty().withMessage('Start date is required'),
    (0, express_validator_1.body)('end_date').notEmpty().withMessage('End date is required'),
    (0, express_validator_1.body)('leave_type').notEmpty().withMessage('Leave type is required'),
    (0, express_validator_1.body)('emergency_call').notEmpty().withMessage('Emergency call is required'),
    (0, express_validator_1.body)('description').notEmpty().withMessage('Description is required'),
], leaveSubmissionController_1.default.softDeleteSubmission);
router.put("/:id", verifyToken_1.verifyToken, leaveSubmissionController_1.default.updateSubmission);
router.put("/:id/accept", verifyToken_1.verifyToken, (0, verifyToken_1.authorize)(['hr', 'owner']), leaveSubmissionController_1.default.acceptSubmission);
router.put("/:id/reject", verifyToken_1.verifyToken, (0, verifyToken_1.authorize)(['hr', 'owner']), leaveSubmissionController_1.default.rejectSubmission);
exports.default = router;
