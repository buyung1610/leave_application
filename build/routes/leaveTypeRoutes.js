"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const leaveTypeController_1 = __importDefault(require("../controllers/leaveTypeController"));
const verifyToken_1 = require("../middleware/verifyToken");
const router = express_1.default.Router();
router.get("/", verifyToken_1.verifyToken, leaveTypeController_1.default.getAll);
router.post("/", verifyToken_1.verifyToken, leaveTypeController_1.default.createLeaveType);
router.put("/:id", verifyToken_1.verifyToken, leaveTypeController_1.default.updateLeaveType);
router.delete("/:id", verifyToken_1.verifyToken, leaveTypeController_1.default.deleteLeavetype);
exports.default = router;
