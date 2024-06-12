import express from "express";
import userController from "../controllers/userController";
import { verifyToken } from "../middleware/verifyToken";
import { body } from "express-validator";
import { authorize } from "../middleware/verifyToken";


const router = express.Router();


router.get("/profil", verifyToken, userController.getUserProfil)

router.get("/", verifyToken, userController.getAllUser);

router.get("/:id", verifyToken, userController.getUserById)

router.post("/", verifyToken,[
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('email').notEmpty().withMessage('Email is required'),
    body('position').notEmpty().withMessage('Position is required'),
    body('department').notEmpty().withMessage('Department is required'),
    body('telephone').notEmpty().withMessage('Telephone is required'),
    body('join_date').notEmpty().withMessage('Join date is required'),
    body('gender').notEmpty().withMessage('Gender is required')
], userController.createUser)

router.put("/delete/:id", verifyToken, userController.softDeleteUser)

router.put("/profil", verifyToken,[
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('email').notEmpty().withMessage('Email is required'),
    body('telephone').notEmpty().withMessage('Telephone is required'),
], userController.updateProfil)

router.put("/:id", verifyToken,[
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('email').notEmpty().withMessage('Email is required'),
    body('position').notEmpty().withMessage('Position is required'),
    body('department').notEmpty().withMessage('Department is required'),
    body('telephone').notEmpty().withMessage('Telephone is required'),
    body('join_date').notEmpty().withMessage('Join date is required'),
    body('gender').notEmpty().withMessage('Gender is required')
], userController.updateUserData)

export default router;