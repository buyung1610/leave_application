import { Request, Response } from "express";
import LeaveType from "../db/models/leaveTypeModel";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";

const leaveTypeController = {
    getFromGender: async (req: Request, res: Response) => {
      try {
        const token = req.headers.authorization?.split(' ')[1];
    
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }
    
        const decoded = jwt.verify(token, 'your_secret_key') as { gender: string };
        const gender = decoded.gender;
        
        console.log(gender)
        let whereClause: any = {}; 
    
        if (gender === 'male') {
          whereClause.id = { [Op.ne]: 10 }; 
        }

        if (gender === 'female') {
          whereClause.id = {
            [Op.and]: [
              { [Op.ne]: 7 },
              { [Op.ne]: 11 }
            ]
          };
        }
        

        if (req.query.is_emergency !== undefined) {
          const is_emergency = req.query.is_emergency as string;
          whereClause.is_emergency = is_emergency; 
        }
    
        const types = await LeaveType.findAll({ where: whereClause });
        res.status(200).json(types);
      } catch (error) {
        console.error('Error while fetching users:', error);
        res.status(500).json({ error: 'Unable to fetch users' });
      }
    },

    getAll: async (req: Request, res: Response) => {
      try {
        
        const types = await LeaveType.findAll();
        res.status(200).json(types);
      } catch (error) {
        console.error('Error while fetching users:', error);
        res.status(500).json({ error: 'Unable to fetch users' });
      }
    },

    createLeaveType: async (req: Request, res: Response) => {
        try{
          const { type, is_emergency } = req.body
          const token = req.headers.authorization?.split(' ')[1];

          if (!token) {
            return res.status(401).json({ error: 'No token provided' });
          }

          const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
          const user_id = decoded.userId;

          const leaveType = await LeaveType.create({
            type,
            is_emergency, 
            created_at: new Date(),
            created_by: user_id
          })

          res.status(201).json({ message: 'leave type created successfully' });
        } catch (error) {
          console.error('Error creating user:', error);
          res.status(500).json({ error: 'Internal server error' });
        }
    },

    updateLeaveType: async (req: Request, res: Response) => {
      try {
        const leaveTypeId = req.params
        const { type, is_emergency } = req.body
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const user_id = decoded.userId;
  
        // Lakukan update data pengguna
        const [updatedRowsCount] = await LeaveType.update({ 
          type, 
          is_emergency, 
          updated_at: new Date(),
          updated_by: user_id
        }, { where: { id: leaveTypeId } });
  
        if (updatedRowsCount === 0) {
          res.status(404).json({ error: 'Leave type not found' });
        } else {
          res.status(200).json({ message: 'Leave type data updated successfully' });
        }
      } catch (error) {
        console.error('Error while updating leave type :', error);
        res.status(500).json({ error: 'Unable to update leave type' });
      }
    },

    deleteLeavetype: async (req: Request, res: Response) => {
      try {
        const leaveTypeId = req.params.id;
  
        // Hapus pengguna
        const deletedRowsCount = await LeaveType.destroy({ where: { id: leaveTypeId } });
  
        if (deletedRowsCount === 0) {
          res.status(404).json({ error: 'Leave type not found' });
        } else {
          res.status(200).json({ message: 'Leave type deleted successfully' });
        }
      } catch (error) {
        console.error('Error while deleting leave type:', error);
        res.status(500).json({ error: 'Unable to delete leave type' });
      }
    }
    
}

export default leaveTypeController