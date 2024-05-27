import express from "express";
import userController from "../controllers/userController";
import { verifyToken } from "../middleware/verifyToken";
import { body } from "express-validator";
import { authorize } from "../middleware/verifyToken";

const router = express.Router();

router.get("/profil", verifyToken, userController.getUserProfil)

router.get("/", verifyToken, authorize(['staff', 'hr', 'owner']), userController.getAllUser);

router.get("/:id", verifyToken, authorize(['staff', 'hr', 'owner']), userController.getUserById)

router.post("/", verifyToken, authorize(['staff', 'hr', 'owner']),[
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('email').notEmpty().withMessage('Email is required'),
    body('position').notEmpty().withMessage('Position is required'),
    body('department').notEmpty().withMessage('Department is required'),
    body('telephone').notEmpty().withMessage('Telephone is required'),
    body('join_date').notEmpty().withMessage('Join date is required'),
    body('gender').notEmpty().withMessage('Gender is required')
], userController.createUser)

router.put("/delete/:id", verifyToken, authorize(['staff', 'hr', 'owner']), userController.softDeleteUser)

router.put("/profil", verifyToken,[
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('email').notEmpty().withMessage('Email is required'),
    body('telephone').notEmpty().withMessage('Telephone is required'),
], userController.updateProfil)

router.put("/:id", authorize(['staff', 'hr', 'owner']), verifyToken,[
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Invalid email'),
    body('email').notEmpty().withMessage('Email is required'),
    body('position').notEmpty().withMessage('Position is required'),
    body('department').notEmpty().withMessage('Department is required'),
    body('telephone').notEmpty().withMessage('Telephone is required'),
    body('join_date').notEmpty().withMessage('Join date is required'),
    body('gender').notEmpty().withMessage('Gender is required')
], userController.updateUserData)



// router.delete("/:id", verifyToken, userController.deleteUser)

// router.get("/", userController.getAllUser);
// router.get("/:id", userController.getUserById)
// router.post("/", userController.createUser)
// router.put("/update1/:id", userController.updateUserData1)
// router.put("/update2/:id", userController.updateUserData2)
// router.delete("/:id", userController.deleteUser)

// router.put("/update3/:id", userController.updateUserData3)
export default router;