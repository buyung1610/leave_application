import { Request, Response } from "express";
import User from "../db/models/userModel";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'
import LeaveAllowance from "../db/models/leaveAllowanceModel";

const userController = {
  getAllUser: async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query;
      const sort_by = req.query.sort_by as string || 'asc';
      const sort_field = req.query.sort_field as string || "id";

      const parsedPage = parseInt(page as string) || 1;
      const parsedLimit = parseInt(limit as string) || Number.MAX_SAFE_INTEGER;

      // Validate sort_by and sort_field values
      const validSortBy = ['asc', 'desc'];
      const isValidSortBy = validSortBy.includes(sort_by as string);
      const isValidSortField = typeof sort_field === 'string'; // Additional validation based on your column names

      if (!isValidSortBy || !isValidSortField) {
        return res.status(400).json({ error: 'Invalid sort_by or sort_field' });
      }

      const offset = (parsedPage - 1) * parsedLimit;
  
      const users = await User.findAndCountAll({
        limit: parsedLimit,
        offset: offset,
        order: [[sort_field, sort_by]],
        include: [
          {
            model: LeaveAllowance,
            as: 'leaveAllowance',
            attributes: ['total_days']
          }
        ]
      });
  
      const totalPages = Math.ceil(users.count / parsedLimit);
  
      res.status(200).json({
        users: users.rows,
        currentPage: parsedPage,
        totalPages: totalPages
      });
    } catch (error) {
      console.error('Error while fetching users:', error);
      res.status(500).json({ error: 'Unable to fetch users' });
    }
  },
  
  // Method untuk membuat pengguna baru
  createUser: async (req: Request, res: Response) => {
    try {
      const { name, email, position, department, telephone, join_date, gender } = req.body;
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
      const user_id = decoded.userId;
      
      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      if (!position) {
        return res.status(400).json({ error: 'Position is required' });
      }
      
      if (!department) {
        return res.status(400).json({ error: 'Department is required' });
      }
      
      if (!telephone) {
        return res.status(400).json({ error: 'Telephone is required' });
      }
      
      if (!join_date) {
        return res.status(400).json({ error: 'Join date is required' });
      }
      
      if (!gender) {
        return res.status(400).json({ error: 'Gender is required' });
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
        department,
        telephone, 
        join_date,
        gender,
        created_at: new Date(),
        created_by: user_id
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
        created_by: user_id
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
      const user = await User.findByPk(userId);
      if (user) {
        res.status(200).json(user);
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      console.error('Error while fetching user by id:', error);
      res.status(500).json({ error: 'Unable to fetch user' });
    }
  },

  updateUserData: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      const { name, email, position, department, telephone, join_date, gender } = req.body;
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
      const user_id = decoded.userId;

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      if (!position) {
        return res.status(400).json({ error: 'Position is required' });
      }
      
      if (!department) {
        return res.status(400).json({ error: 'Department is required' });
      }
      
      if (!telephone) {
        return res.status(400).json({ error: 'Telephone is required' });
      }
      
      if (!join_date) {
        return res.status(400).json({ error: 'Join date is required' });
      }
      
      if (!gender) {
        return res.status(400).json({ error: 'Gender is required' });
      }

      // Lakukan update data pengguna
      const [updatedRowsCount] = await User.update({ 
        name, 
        email, 
        position,
        department,
        telephone,
        join_date,
        gender,
        updated_at: new Date(),
        updated_by: user_id
      }, { where: { id: userId } });

      if (updatedRowsCount === 0) {
        res.status(404).json({ error: 'User not found' });
      } else {
        res.status(200).json({ message: 'User data updated successfully' });
      }
    } catch (error) {
      console.error('Error while updating user data:', error);
      res.status(500).json({ error: 'Unable to update user data' });
    }
  },

  deleteUser: async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;

      // Hapus pengguna
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

  getUserLogin: async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
          return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
      const user_id = decoded.userId

      // Temukan pengguna berdasarkan ID yang didekodekan dari token
      const user = await User.findByPk(user_id);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({user})

    } catch (error) {
        console.error('Error verifying token:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
  },

  // updateUserData3: async (req: Request, res: Response): Promise<void> => {
  //   try {
  //     const userId = req.params.id;
  //     const plainPassword = '1234'; // Password tanpa hash
  
  //     // Hash password dengan bcrypt
  //     const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  //     // Perbarui password di database dengan nilai yang telah di-hash
  //     const [updatedRowsCount] = await User.update(
  //       { password: hashedPassword },
  //       { where: { id: userId } }
  //     );
  
  //     if (updatedRowsCount === 0) {
  //       res.status(404).json({ error: 'User not found' });
  //     } else {
  //       res.json({ message: 'User data updated successfully' });
  //     }
  //   } catch (error) {
  //     console.error('Error while updating user data:', error);
  //     res.status(500).json({ error: 'Unable to update user data' });
  //   }
  // },
}

export default userController