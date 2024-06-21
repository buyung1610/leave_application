import express from "express";
import departmenController from "../controllers/departmentController";
import { verifyToken } from "../middleware/verifyToken";


const router = express.Router();


router.get("/", verifyToken, departmenController.getAll);

router.post("/", verifyToken, departmenController.addDepartment);

router.put("/:id", verifyToken, departmenController.updateDepartment);

router.delete("/:id", verifyToken, departmenController.deleteDepartment);

export default router