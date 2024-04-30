import express from "express";
import userController from "../controllers/userController";
import { verifyToken } from "../middleware/verifyToken";

const router = express.Router();

router.get("/userlogin", verifyToken, userController.getUserLogin)

router.get("/", verifyToken, userController.getAllUser);
router.get("/:id", verifyToken, userController.getUserById)
router.post("/", verifyToken, userController.createUser)
router.put("/update1/:id", verifyToken, userController.updateUserData1)
router.put("/update2/:id", verifyToken, userController.updateUserData2)
router.delete("/:id", verifyToken, userController.deleteUser)

// router.get("/", userController.getAllUser);
// router.get("/:id", userController.getUserById)
// router.post("/", userController.createUser)
// router.put("/update1/:id", userController.updateUserData1)
// router.put("/update2/:id", userController.updateUserData2)
// router.delete("/:id", userController.deleteUser)

// router.put("/update3/:id", userController.updateUserData3)
export default router;