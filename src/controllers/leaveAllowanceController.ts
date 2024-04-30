import { Request, Response } from "express";
import LeaveAllowance from "../db/models/leaveAllowanceModel";

const leaveAllowanceController = {
    getAll: async (req: Request, res: Response) => {
        try {
          const alowance = await LeaveAllowance.findAll();
          res.status(200).json(alowance);
        } catch (error) {
          // Menangani kesalahan jika terjadi
          console.error('Error while fetching users:', error);
          res.status(500).json({ error: 'Unable to fetch users' });
        }
    },
    
}

export default leaveAllowanceController