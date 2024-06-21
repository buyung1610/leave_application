import { Request, Response } from "express";
import Department from "../db/models/departmentModel";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import AppConstants from "../AppConstants";

const departmentController = {
    getAll: async (req: Request, res: Response) => {
      try {
        const types = await Department.findAll({ where: { is_deleted: 0 } });
        res.status(200).json(types);
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    addDepartment: async (req: Request, res: Response) => {
        try{
          const { name } = req.body
          const token = req.headers.authorization?.split(' ')[1];

          if (!token) {
            return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
          }

          const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
          const user_id = decoded.userId;

          const leaveType = await Department.create({
            name,
            created_at: new Date(),
            created_by: user_id,
            is_deleted: 0
          })

          res.status(201).json({ message: AppConstants.ErrorMessages.LeaveType.CREATE_SUCCES });
        } catch (error) {
          console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
          res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
        }
    },

    updateDepartment: async (req: Request, res: Response) => {
      try {
        const departmentId = req.params.id
        const { name } = req.body
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
        }

        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const user_id = decoded.userId;
  
        // Lakukan update data pengguna
        const [updatedRowsCount] = await Department.update({ 
          name,
          updated_at: new Date(),
          updated_by: user_id
        }, { where: { id: departmentId } });
  
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

    deleteDepartment: async (req: Request, res: Response) => {
      try {
        const departmentId = req.params.id;
  
        // Hapus pengguna
        const deletedRowsCount = await Department.destroy({ where: { id: departmentId } });
  
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

export default departmentController