import { Request, Response } from "express";
import Role from "../db/models/roleModel";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import AppConstants from "../AppConstants";

const roleController = {
    getAllRole: async (req: Request, res: Response) => {
      try {
        const role = await Role.findAll({ where: { is_deleted: 0 } });
        res.status(200).json(role);
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    addRole: async (req: Request, res: Response) => {
        try{
          const { name } = req.body
          const token = req.headers.authorization?.split(' ')[1];

          if (!token) {
            return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
          }

          const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
          const user_id = decoded.userId;

          const role = await Role.create({
            name,
            created_at: new Date(),
            created_by: user_id,
            is_deleted: 0
          })

          res.status(201).json({ message: AppConstants.ErrorMessages.Role.CREATE_SUCCES });
        } catch (error) {
          console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
          res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
        }
    },

    updateRole: async (req: Request, res: Response) => {
      try {
        const roleId = req.params.id
        const { name } = req.body
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
        }

        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const user_id = decoded.userId;
  
        const [updatedRowsCount] = await Role.update({ 
          name,
          updated_at: new Date(),
          updated_by: user_id
        }, { where: { id: roleId } });
  
        if (updatedRowsCount === 0) {
          res.status(404).json({ error: AppConstants.ErrorMessages.Role.NOT_FOUND });
        } else {
          res.status(200).json({ message: AppConstants.ErrorMessages.Role.UPDATE_SUCCES });
        }
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    deleteRole: async (req: Request, res: Response) => {
      try {
        const roleId = req.params.id;
  
        const deletedRowsCount = await Role.destroy({ where: { id: roleId } });
  
        if (deletedRowsCount === 0) {
          res.status(404).json({ error: AppConstants.ErrorMessages.Role.NOT_FOUND
           });
        } else {
          res.status(200).json({ message: AppConstants.ErrorMessages.Role.DELETE_SUCCES });
        }
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    }
}

export default roleController