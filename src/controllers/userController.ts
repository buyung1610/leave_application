import { Request, Response } from "express";
import User from "../db/models/userModel";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
import LeaveAllowance from "../db/models/leaveAllowanceModel";
import { validationResult } from "express-validator";
import { OrderItem } from "sequelize";
import { format } from "date-fns";

const userController = {
  getAllUser: async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query;
      const sort_by = req.query.sort_by as string || 'asc';
      const sort_field = req.query.sort_field as string || "id";
      console.log(sort_field)

      const user = await User.findAndCountAll()
  
      const parsedPage = parseInt(page as string) || 1;
      const parsedLimit = parseInt(limit as string) || user.count;
  
      // Validasi sort_by dan sort_field
      const validSortBy = ['asc', 'desc'];
      const isValidSortBy = validSortBy.includes(sort_by as string);
      const isValidSortField = typeof sort_field === 'string' && sort_field !== ''; // Memastikan sort_field ada dan tidak kosong
  
      if (!isValidSortBy || !isValidSortField) {
        return res.status(400).json({ error: 'Invalid sort_by or sort_field' });
      }
  
      const offset = (parsedPage - 1) * parsedLimit;
  
      let order: OrderItem[] = [];
      if (isValidSortField) {
        if (sort_field === 'total_days') {
          // Jika sort_field adalah 'total_days', order akan diganti
          order = [[{ model: LeaveAllowance, as: 'leaveAllowance' }, sort_field as string, sort_by as string]];
        } else {
          // Jika sort_field bukan 'total_days', gunakan sort_field yang diberikan pengguna
          order = [[sort_field as string, sort_by as string]];
        }
      }

      const users = await User.findAndCountAll({
        where: {
          is_deleted: 0
        },
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
        // Buat salinan objek user tanpa properti leaveAllowance.total_days
        const { 'leaveAllowance.total_days': total_days, ...userWithoutLeaveAllowance } = user;
  
        // Format created_at dan updated_at menggunakan date-fns
        const formattedCreatedAt = user.created_at ? format(new Date(user.created_at), 'yyyy-MM-dd HH:mm:ss') : null;
        const formattedUpdatedAt = user.updated_at ? format(new Date(user.updated_at), 'yyyy-MM-dd HH:mm:ss') : null;
  
        return {
          ...userWithoutLeaveAllowance, // Salin semua properti kecuali leaveAllowance
          total_days: total_days, // Gunakan nilai total_days di luar leaveAllowance
          created_at: formattedCreatedAt, // Tambahkan formatted created_at
          updated_at: formattedUpdatedAt // Tambahkan formatted updated_at
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
      console.error('Error while fetching users:', error);
      res.status(500).json({ error: 'Unable to fetch users' });
    }
  },
  
  createUser: async (req: Request, res: Response) => {
    try {
      const { name, email, role, position, department, telephone, join_date, gender } = req.body;
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
      const user_id = decoded.userId;

      const errors = validationResult(req);
          if (!errors.isEmpty()) {
           res.status(400).json({ errors: errors.array() });
           return
      }

      // Mengecek apakah email sudah ada di dalam database
      const existingUser = await User.findOne({ where: { email: email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }
  
      // Hash password menggunakan bcrypt
      const hashedPassword = await bcrypt.hash('1234', 10);
  
      // Membuat pengguna baru dengan password yang di-hash
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
      // Membuat data jatah cuti untuk pengguna baru
      const newLeaveAllowance = await LeaveAllowance.create({
        user_id: newUser.id, // Menggunakan ID pengguna yang baru dibuat
        total_days: leaveAllowance,
        created_at: new Date(),
        created_by: user_id,
        is_deleted: 0
      });
  
      res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getUserById: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
  
      // Retrieve user data by ID, including associated LeaveAllowance
      const user: any = await User.findByPk(userId, {
        include: {
          model: LeaveAllowance,
          as: 'leaveAllowance',
          attributes: ['total_days']
        },
        raw: true // Get raw data for flat structure
      });
  
      // If user not found
      if (!user || user.is_deleted === 1) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Extract total_days from leaveAllowance (if available)
      const total_days = user['leaveAllowance.total_days'];
  
      // Remove leaveAllowance from user object
      const { 'leaveAllowance.total_days': totalDays, ...userWithoutLeaveance } = user;
  
      // Construct the response object
      const response = {
        ...userWithoutLeaveance, // Include all user properties except leaveAllowance
        total_days // Include total_days directly
      };
  
      // Send the response
      res.status(200).json(response);
    } catch (error) {
      console.error('Error while fetching user by id:', error);
      res.status(500).json({ error: 'Unable to fetch user' });
    }
  },

  updateUserData: async (req: Request, res: Response) => {
    try {
      const userIdParams = req.params.id;
      const { name, email, position, department, telephone, join_date, gender, role, leave_allowance } = req.body;
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
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
        return res.status(404).json({ error: 'User not found' });
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
        return res.status(404).json({ error: 'User not found' });
      }

      // Hitung jatah cuti berdasarkan perbedaan bulan antara join_date dan tanggal saat ini
      const joinDate = new Date(join_date); // Konversi join_date ke objek Date
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
      

      // Simpan data jatah cuti untuk pengguna yang diperbarui
      const [newLeaveAllowance] = await LeaveAllowance.update({
        total_days: leaveAllowance,
        updated_at: new Date(),
        updated_by: user_id,
      },{ where: { user_id: userIdParams } });

      if (newLeaveAllowance === 0) {
        return res.status(404).json({ error: 'leave allowance not found' });
      }

      res.status(200).json({ message: 'User data updated successfully' });
    } catch (error) {
      console.error('Error while updating user data:', error);
      res.status(500).json({ error: 'Unable to update user data' });
    }
  },

  deleteUser: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;

      const deletedLeaveAllowance = await LeaveAllowance.destroy({ where: { user_id: userId} })
      const deletedUpdate = await User.update({ 
        updated_by: null,
        created_by: null
       }, { where: { id: userId } });
      const deletedRowsCount = await User.destroy({ where: { id: userId } });

      if (deletedRowsCount === 0) {
        res.status(404).json({ error: 'User not found' });
      } else {
        res.status(200).json({ message: 'User deleted successfully' });
      }
    } catch (error) {
      console.error('Error while deleting user:', error);
      res.status(500).json({ error: 'Unable to delete user' });
    }
  },

  softDeleteUser: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;

      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
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
        res.status(404).json({ error: 'User not found' });
      } else {
        res.status(200).json({ message: 'User deleted successfully' });
      }
    } catch (error) {
      console.error('Error while deleting user:', error);
      res.status(500).json({ error: 'Unable to delete user' });
    }
  },

  getUserProfil: async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
          return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
      const user_id = decoded.userId

      // Temukan pengguna berdasarkan ID yang didekodekan dari token
      const user: any = await User.findByPk(user_id, {
        include: {
          model: LeaveAllowance,
          as: 'leaveAllowance',
          attributes: ['total_days']
        },
        raw: true // Get raw data for flat structure
      });
  
      // If user not found
      if (!user || user.is_deleted === 1) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Extract total_days from leaveAllowance (if available)
      const total_days = user['leaveAllowance.total_days'];
  
      // Remove leaveAllowance from user object
      const { 'leaveAllowance.total_days': totalDays, ...userWithoutLeaveance } = user;
  
      // Construct the response object
      const response = {
        ...userWithoutLeaveance, // Include all user properties except leaveAllowance
        total_days // Include total_days directly
      };
  
      // Send the response
      res.status(200).json(response);

    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
  },

  updateProfil: async (req: Request, res: Response) => {
    try {
      const { name, email, telephone,} = req.body;
      const token = req.headers.authorization?.split(' ')[1];
  
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }
  
      const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
      const user_id = decoded.userId;
  
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const user: any = await User.findByPk(user_id);
  
      // If user not found
      if (!user || user.is_deleted === 1) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Update data pengguna
      const [updatedRowsCount] = await User.update(
        {
          name,
          email,
          telephone,
          updated_at: new Date(),
          updated_by: user_id,
        },
        { where: { id: user_id } } // Pindahkan where ke opsi update
      );
  
      if (updatedRowsCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
  
      // Hitung jatah cuti berdasarkan perbedaan bulan antara join_date dan tanggal saat ini
  
      // Perbarui data jatah cuti untuk pengguna yang diperbarui
  
      res.status(200).json({ message: 'User data updated successfully' });
    } catch (error) {
      console.error('Error while updating user data:', error);
      res.status(500).json({ error: 'Unable to update user data' });
    }
  },

}

export default userController