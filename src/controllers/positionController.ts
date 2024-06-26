import { Request, Response } from "express";
import Position from "../db/models/positionModel";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import AppConstants from "../AppConstants";

const roleController = {
    getAllPosition: async (req: Request, res: Response) => {
      try {
        const position = await Position.findAll({ where: { is_deleted: 0 } });
        res.status(200).json(position);
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    addPosition: async (req: Request, res: Response) => {
        try{
          const { name, department_id } = req.body
          const token = req.headers.authorization?.split(' ')[1];

          if (!token) {
            return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
          }

          const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
          const user_id = decoded.userId;

          const position = await Position.create({
            name,
            department_id,
            created_at: new Date(),
            created_by: user_id,
            is_deleted: 0
          })

          res.status(201).json({ message: AppConstants.ErrorMessages.Position.CREATE_SUCCES });
        } catch (error) {
          console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
          res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
        }
    },

    updatePosition: async (req: Request, res: Response) => {
      try {
        const positionId = req.params.id
        const { name } = req.body
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
        }

        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const user_id = decoded.userId;
  
        // Lakukan update data pengguna
        const [updatedRowsCount] = await Position.update({ 
          name,
          updated_at: new Date(),
          updated_by: user_id
        }, { where: { id: positionId } });
  
        if (updatedRowsCount === 0) {
          res.status(404).json({ error: AppConstants.ErrorMessages.Position.NOT_FOUND });
        } else {
          res.status(200).json({ message: AppConstants.ErrorMessages.Position.UPDATE_SUCCES });
        }
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    deletePosition: async (req: Request, res: Response) => {
      try {
        const positionId = req.params.id;
  
        const deletedRowsCount = await Position.destroy({ where: { id: positionId } });
  
        if (deletedRowsCount === 0) {
          res.status(404).json({ error: AppConstants.ErrorMessages.Position.NOT_FOUND
           });
        } else {
          res.status(200).json({ message: AppConstants.ErrorMessages.Position.DELETE_SUCCES });
        }
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    }
    
}

export default roleController