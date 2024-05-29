"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = __importDefault(require("../controllers/userController"));
const verifyToken_1 = require("../middleware/verifyToken");
const express_validator_1 = require("express-validator");
const verifyToken_2 = require("../middleware/verifyToken");
const router = express_1.default.Router();
router.get("/profil", verifyToken_1.verifyToken, userController_1.default.getUserProfil);
router.get("/", verifyToken_1.verifyToken, (0, verifyToken_2.authorize)(['staff', 'hr', 'owner']), userController_1.default.getAllUser);
router.get("/:id", verifyToken_1.verifyToken, (0, verifyToken_2.authorize)(['staff', 'hr', 'owner']), userController_1.default.getUserById);
router.post("/", verifyToken_1.verifyToken, (0, verifyToken_2.authorize)(['staff', 'hr', 'owner']), [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Invalid email'),
    (0, express_validator_1.body)('email').notEmpty().withMessage('Email is required'),
    (0, express_validator_1.body)('position').notEmpty().withMessage('Position is required'),
    (0, express_validator_1.body)('department').notEmpty().withMessage('Department is required'),
    (0, express_validator_1.body)('telephone').notEmpty().withMessage('Telephone is required'),
    (0, express_validator_1.body)('join_date').notEmpty().withMessage('Join date is required'),
    (0, express_validator_1.body)('gender').notEmpty().withMessage('Gender is required')
], userController_1.default.createUser);
router.put("/delete/:id", verifyToken_1.verifyToken, (0, verifyToken_2.authorize)(['staff', 'hr', 'owner']), userController_1.default.softDeleteUser);
router.put("/profil", verifyToken_1.verifyToken, [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Invalid email'),
    (0, express_validator_1.body)('email').notEmpty().withMessage('Email is required'),
    (0, express_validator_1.body)('telephone').notEmpty().withMessage('Telephone is required'),
], userController_1.default.updateProfil);
router.put("/:id", (0, verifyToken_2.authorize)(['staff', 'hr', 'owner']), verifyToken_1.verifyToken, [
    (0, express_validator_1.body)('name').notEmpty().withMessage('Name is required'),
    (0, express_validator_1.body)('email').isEmail().withMessage('Invalid email'),
    (0, express_validator_1.body)('email').notEmpty().withMessage('Email is required'),
    (0, express_validator_1.body)('position').notEmpty().withMessage('Position is required'),
    (0, express_validator_1.body)('department').notEmpty().withMessage('Department is required'),
    (0, express_validator_1.body)('telephone').notEmpty().withMessage('Telephone is required'),
    (0, express_validator_1.body)('join_date').notEmpty().withMessage('Join date is required'),
    (0, express_validator_1.body)('gender').notEmpty().withMessage('Gender is required')
], userController_1.default.updateUserData);
// router.delete("/:id", verifyToken, userController.deleteUser)
// router.get("/", userController.getAllUser);
// router.get("/:id", userController.getUserById)
// router.post("/", userController.createUser)
// router.put("/update1/:id", userController.updateUserData1)
// router.put("/update2/:id", userController.updateUserData2)
// router.delete("/:id", userController.deleteUser)
// router.put("/update3/:id", userController.updateUserData3)
exports.default = router;
