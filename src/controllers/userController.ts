import { Request, Response } from "express";
import User from "../db/models/userModel";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
import LeaveAllowance from "../db/models/leaveAllowanceModel";
import { validationResult } from "express-validator";
import { Op, OrderItem, Sequelize } from "sequelize";
import { format } from "date-fns";
import AppConstants from "../AppConstants";

const userController = {
  getAllUser: async (req: Request, res: Response) => {
    try {
      const { page, limit, search, filter_by } = req.query;
      const sort_by = req.query.sort_by as string || 'asc';
      const sort_field = req.query.sort_field as string || "id";
  
      const user = await User.findAndCountAll()
  
      const parsedPage = parseInt(page as string) || 1;
      const parsedLimit = parseInt(limit as string) || user.count;
  
      const validSortBy = ['asc', 'desc'];
      const isValidSortBy = validSortBy.includes(sort_by as string);
      const isValidSortField = typeof sort_field === 'string' && sort_field !== '';
  
      if (!isValidSortBy || !isValidSortField) {
        return res.status(400).json({ error: AppConstants.ErrorMessages.Other.INVALID_SORT });
      }
  
      const offset = (parsedPage - 1) * parsedLimit;
  
      let order: OrderItem[] = [];
      if (isValidSortField) {
        if (sort_field === 'total_days') {
          order = [[{ model: LeaveAllowance, as: 'leaveAllowance' }, sort_field as string, sort_by as string]];
        } else {
          order = [[sort_field as string, sort_by as string]];
        }
      }
  
      const whereCondition: any = { is_deleted: 0 };
  
      if (search && typeof search === 'string') {
        if (filter_by === AppConstants.Column.NAME) {
            whereCondition.name = { [Op.startsWith]: search };
        } else if (filter_by === AppConstants.Column.EMAIL) {
            whereCondition.email = { [Op.startsWith]: search };
        } else if (filter_by === AppConstants.Column.TELEPHONE) {
            whereCondition.telephone = { [Op.startsWith]: search };
        }
      }
  
      const users = await User.findAndCountAll({
        where: whereCondition,
        limit: parsedLimit,
        offset: offset,
        order: order,
        include: [
          {
            model: LeaveAllowance,
            as: 'leaveAllowance',
            attributes: ['total_days']
          }
        ],
        raw: true
      });
  
      const modifiedUsers = users.rows.map((user: any) => {
        const { 'leaveAllowance.total_days': total_days, ...userWithoutLeaveAllowance } = user;
  
        const formattedCreatedAt = user.created_at ? format(new Date(user.created_at), 'yyyy-MM-dd HH:mm:ss') : null;
        const formattedUpdatedAt = user.updated_at ? format(new Date(user.updated_at), 'yyyy-MM-dd HH:mm:ss') : null;
  
        return {
          ...userWithoutLeaveAllowance,
          total_days: total_days,
          created_at: formattedCreatedAt,
          updated_at: formattedUpdatedAt
        };
      });
  
      const totalPages = Math.ceil(users.count / parsedLimit);
  
      res.status(200).json({
        count: user.count,
        users: modifiedUsers,
        currentPage: parsedPage,
        totalPages: totalPages
      });
    } catch (error) {
      console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
      res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
    }
  },
  
  createUser: async (req: Request, res: Response) => {
    try {
      const { name, email, role, position, department, telephone, join_date, gender, leave_allowance } = req.body;
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
      }

      const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
      const user_id = decoded.userId;

      const errors = validationResult(req);
          if (!errors.isEmpty()) {
           res.status(400).json({ errors: errors.array() });
           return
      }

      const existingUser = await User.findOne({ where: { email: email } });
      if (existingUser) {
        return res.status(400).json({ error: AppConstants.ErrorMessages.Auth.EMAIL_ALREADY_EXISTS });
      }
  
      const hashedPassword = await bcrypt.hash('1234', 10);
  
      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        position,
        role,
        department,
        telephone, 
        join_date,
        gender,
        created_at: new Date(),
        created_by: user_id,
        is_deleted: 0
      });

      const joinDate = new Date(newUser.join_date);
      const currentDate = new Date();
      const diffYears = currentDate.getFullYear() - joinDate.getFullYear();
      const diffMonths = diffYears * 12 + (currentDate.getMonth() - joinDate.getMonth());
      
      let leaveAllowance = 0;
      if ( leave_allowance === 0 ){
        leaveAllowance = 0
      } else if ( !leave_allowance || typeof leave_allowance !== 'number' ){
        if (diffMonths >= 72) {
          leaveAllowance = 17;
        } else if (diffMonths >= 60) {
          leaveAllowance = 16;
        } else if (diffMonths >= 48) {
          leaveAllowance = 15;
        } else if (diffMonths >= 36) {
          leaveAllowance = 14;
        } else if (diffMonths >= 24) {
          leaveAllowance = 13;
        } else if (diffMonths >= 12) {
          leaveAllowance = 12;
        } else {
          leaveAllowance = 0;
        }
      } else {
        leaveAllowance = leave_allowance
      }

      const newLeaveAllowance = await LeaveAllowance.create({
        user_id: newUser.id, 
        total_days: leaveAllowance,
        created_at: new Date(),
        created_by: user_id,
        is_deleted: 0
      });
  
      res.status(201).json({ message: AppConstants.ErrorMessages.User.USER_CREATE_SUCCES, user: newUser });
    } catch (error) {
      console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
      res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
    }
  },

  getUserById: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
  
      const user: any = await User.findByPk(userId, {
        include: {
          model: LeaveAllowance,
          as: 'leaveAllowance',
          attributes: ['total_days']
        },
        raw: true 
      });
  
      if (!user || user.is_deleted === 1) {
        return res.status(404).json({ error: AppConstants.ErrorMessages.User.USER_NOT_FOUND });
      }
  
      const total_days = user['leaveAllowance.total_days'];
  
      const { 'leaveAllowance.total_days': totalDays, ...userWithoutLeaveance } = user;
  
      const response = {
        ...userWithoutLeaveance, 
        total_days 
      };
  
      res.status(200).json(response);
    } catch (error) {
      console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
      res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
    }
  },

  updateUserData: async (req: Request, res: Response) => {
    try {
      const userIdParams = req.params.id;
      const { name, email, position, department, telephone, join_date, gender, role } = req.body;
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
      }

      const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
      const user_id = decoded.userId;

      const errors = validationResult(req);
          if (!errors.isEmpty()) {
           res.status(400).json({ errors: errors.array() });
           return
      }
      const user: any = await User.findByPk(userIdParams)

      if (!user || user.is_deleted === 1) {
        return res.status(404).json({ error: AppConstants.ErrorMessages.User.USER_NOT_FOUND });
      }

      const [updatedRowsCount] = await User.update(
        {
          name,
          email,
          role,
          position,
          department,
          telephone,
          join_date,
          gender,
          updated_at: new Date(),
          updated_by: user_id,
        },
        { where: { id: userIdParams } }
      );

      if (updatedRowsCount === 0) {
        return res.status(404).json({ error: AppConstants.ErrorMessages.User.USER_NOT_FOUND });
      }

      const joinDate = new Date(join_date); 
      const userJoinDate = new Date(user.join_date);
      const joinDateYear = joinDate.getFullYear();
      const userJoinDateYear = userJoinDate.getFullYear();
      const currentDate = new Date();
      const currentYear = new Date().getFullYear();
      const diffYears = currentDate.getFullYear() - joinDate.getFullYear();
      const diffMonths = diffYears * 12 + (currentDate.getMonth() - joinDate.getMonth());

      if (userJoinDateYear !== joinDateYear){
        let leaveAllowance = 0;
        if (diffMonths >= 72) {
          leaveAllowance = 17;
        } else if (diffMonths >= 60) {
          leaveAllowance = 16;
        } else if (diffMonths >= 48) {
          leaveAllowance = 15;
        } else if (diffMonths >= 36) {
          leaveAllowance = 14;
        } else if (diffMonths >= 24) {
          leaveAllowance = 13;
        } else if (diffMonths >= 12) {
          leaveAllowance = 12;
        } else {
          leaveAllowance = 0;
        }
      
        const leaveStats = await User.findAll({
          attributes: [
            [Sequelize.literal(`(
                SELECT SUM(b.reduction_amount)
                FROM leave_submissions AS b
                WHERE b.is_deleted = 0
                AND b.status = 'diterima'
                AND YEAR(b.start_date) = '${currentYear.toString()}'
                AND b.user_id = ${userIdParams}
            )`), 'jumlah_hari_cuti']
          ],
          where: {
            role: {
              [Op.ne]: 'owner'
            },
          },
        });
      
        console.log("Leave Stats: ", leaveStats);
      
        const jumlahHariCuti = leaveStats.length > 0 ? leaveStats[0].get('jumlah_hari_cuti') : 0;
        const jumlahHariCutiInt = jumlahHariCuti ? parseInt(jumlahHariCuti.toString(), 10) : 0;
      
        const updatedLeaveAllowance = leaveAllowance - jumlahHariCutiInt;

        const [newLeaveAllowance] = await LeaveAllowance.update({
          total_days: updatedLeaveAllowance,
          total_days_copy: leaveAllowance,
          updated_at: new Date(),
          updated_by: user_id,
        },{ where: { user_id: userIdParams } });

        if (newLeaveAllowance === 0) {
          return res.status(404).json({ error: AppConstants.ErrorMessages.LeaveAllowance.LEAVE_ALLOWANCE_NOT_FOUND });
        }
      }

      res.status(200).json({ message: AppConstants.ErrorMessages.User.USER_UPDATE_SUCCES });
    } catch (error) {
      console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
      res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
    }
  },

  softDeleteUser: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;

      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
      }

      const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
      const userIdLogin = decoded.userId;

      const softDeletedLeaveAllowanceRowsCount = await LeaveAllowance.update({ 
        deleted_at: new Date(),
        deleted_by: userIdLogin,
        is_deleted: 1
      }, { where: { id: userId } });
  
      const softDeletedRowsCount = await User.update({ 
        deleted_at: new Date(),
        deleted_by: userIdLogin,
        is_deleted: 1
      }, { where: { id: userId } });
  
      if (softDeletedRowsCount[0] === 0) {
        res.status(404).json({ error: AppConstants.ErrorMessages.User.USER_NOT_FOUND });
      } else {
        res.status(200).json({ message: AppConstants.ErrorMessages.User.USER_DELETE_SUCCES });
      }
    } catch (error) {
      console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
      res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
    }
  },

  getUserProfil: async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
      }

      const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
      const user_id = decoded.userId

      const user: any = await User.findByPk(user_id, {
        include: {
          model: LeaveAllowance,
          as: 'leaveAllowance',
          attributes: ['total_days']
        },
        raw: true 
      });
  
      if (!user || user.is_deleted === 1) {
        return res.status(404).json({ error: AppConstants.ErrorMessages.User.USER_NOT_FOUND });
      }
  
      const total_days = user['leaveAllowance.total_days'];
  
      const { 'leaveAllowance.total_days': totalDays, ...userWithoutLeaveance } = user;
  
      const response = {
        ...userWithoutLeaveance, 
        total_days 
      };
  
      // Send the response
      res.status(200).json(response);

    } catch (error) {
      console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
      res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
    }
  },

  updateProfil: async (req: Request, res: Response) => {
    try {
      const { name, email, telephone,} = req.body;
      const token = req.headers.authorization?.split(' ')[1];
  
      if (!token) {
        return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
      }
  
      const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
      const user_id = decoded.userId;
  
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const user: any = await User.findByPk(user_id);
  
      if (!user || user.is_deleted === 1) {
        return res.status(404).json({ error: AppConstants.ErrorMessages.User.USER_NOT_FOUND });
      }
  
      const [updatedRowsCount] = await User.update(
        {
          name,
          email,
          telephone,
          updated_at: new Date(),
          updated_by: user_id,
        },
        { where: { id: user_id } }
      );
  
      if (updatedRowsCount === 0) {
        return res.status(404).json({ error: AppConstants.ErrorMessages.User.USER_NOT_FOUND });
      }
  
      res.status(200).json({ message: AppConstants.ErrorMessages.User.USER_UPDATE_SUCCES });
    } catch (error) {
      console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
      res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
    }
  },

}

export default userController