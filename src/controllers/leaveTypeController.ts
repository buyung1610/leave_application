import { Request, Response } from "express";
import LeaveType from "../db/models/leaveTypeModel";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import AppConstants from "../AppConstants";

const leaveTypeController = {
    getAll: async (req: Request, res: Response) => {
      try {
        let whereClause: any = { is_deleted: 0 }; 
        
        if (req.query.is_emergency !== undefined) {
          const is_emergency = req.query.is_emergency as string;
          whereClause.is_emergency = is_emergency; 
        }
    
        const types = await LeaveType.findAll({ where: whereClause });
        res.status(200).json(types);
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    createLeaveType: async (req: Request, res: Response) => {
        try{
          const { type, is_emergency } = req.body
          const token = req.headers.authorization?.split(' ')[1];

          if (!token) {
            return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
          }

          const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
          const user_id = decoded.userId;

          const leaveType = await LeaveType.create({
            type,
            is_emergency, 
            created_at: new Date(),
            created_by: user_id
          })

          res.status(201).json({ message: AppConstants.ErrorMessages.LeaveType.CREATE_SUCCES });
        } catch (error) {
          console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
          res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
        }
    },

    updateLeaveType: async (req: Request, res: Response) => {
      try {
        const leaveTypeId = req.params
        const { type, is_emergency } = req.body
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
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
          res.status(404).json({ error: AppConstants.ErrorMessages.LeaveType.NOT_FOUND });
        } else {
          res.status(200).json({ message: AppConstants.ErrorMessages.LeaveType.UPDATE_SUCCES });
        }
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    deleteLeavetype: async (req: Request, res: Response) => {
      try {
        const leaveTypeId = req.params.id;
  
        // Hapus pengguna
        const deletedRowsCount = await LeaveType.destroy({ where: { id: leaveTypeId } });
  
        if (deletedRowsCount === 0) {
          res.status(404).json({ error: AppConstants.ErrorMessages.LeaveType.NOT_FOUND
           });
        } else {
          res.status(200).json({ message: AppConstants.ErrorMessages.LeaveType.DELETE_SUCCES });
        }
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    }
    
}

export default leaveTypeController