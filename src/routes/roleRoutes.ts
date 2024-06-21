import express from "express";
import roleController from "../controllers/roleController";
import { verifyToken } from "../middleware/verifyToken";


const router = express.Router();


router.get("/", verifyToken, roleController.getAllRole);

router.post("/", verifyToken, roleController.addRole);

router.put("/:id", verifyToken, roleController.updateRole);

router.delete("/:id", verifyToken, roleController.deleteRole);

export default router