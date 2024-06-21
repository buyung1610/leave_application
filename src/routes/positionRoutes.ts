import express from "express";
import positionController from "../controllers/positionController";
import { verifyToken } from "../middleware/verifyToken";


const router = express.Router();


router.get("/", verifyToken, positionController.getAllPosition);

router.post("/", verifyToken, positionController.addPosition);

router.put("/:id", verifyToken, positionController.updatePosition);

router.delete("/:id", verifyToken, positionController.deletePosition);

export default router