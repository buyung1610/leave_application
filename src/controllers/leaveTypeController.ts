import { Request, Response } from "express";
import LeaveType from "../db/models/leaveTypeModel";

const leaveTypeController = {
    getAll: async (req: Request, res: Response) => {
        try {
          const Type = await LeaveType.findAll();
          res.status(200).json(Type);
        } catch (error) {
          // Menangani kesalahan jika terjadi
          console.error('Error while fetching users:', error);
          res.status(500).json({ error: 'Unable to fetch users' });
        }
    },

    createLeaveType: async (req: Request, res: Response) => {
        
    }
    
}

export default leaveTypeController