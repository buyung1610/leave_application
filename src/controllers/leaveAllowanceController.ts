import { Request, Response } from "express";
import LeaveAllowance from "../db/models/leaveAllowanceModel";

const leaveAllowanceController = {
    getAllLeaveAllownce: async (req: Request, res: Response) => {
        try {
          // Mengambil semua data dari tabel User
          const users = await LeaveAllowance.findAll();
          res.status(200).json(users);
        } catch (error) {
          // Menangani kesalahan jika terjadi
          console.error('Error while fetching users:', error);
          res.status(500).json({ error: 'Unable to fetch users' });
        }
      },
    
}

export default leaveAllowanceController