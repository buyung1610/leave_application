import { Request, Response } from "express";
import LeaveSubmission from "../db/models/leaveSubmissionModel";
import LeaveAllowance from "../db/models/leaveAllowanceModel";
import jwt from "jsonwebtoken"
import { validationResult } from "express-validator";
import { FindAndCountOptions, FindOptions, Includeable, Op, Sequelize, where } from "sequelize";
import User from "../db/models/userModel";
import LeaveType from "../db/models/leaveTypeModel";
import { format } from "date-fns";
import path from "path";
import fs from 'fs';
import dotenv from 'dotenv'
import sequelize from "../config/dbConnection";
import { count } from "console";
// import sequelize from "sequelize/types/sequelize";


const leaveSubmissionController = {
    getAllSubmission: async (req: Request, res: Response) => {
        try {
          const { page, limit, status, leave_type_id, user_id, start_date, end_date } = req.query;
          const sort_by = req.query.sort_by as string || 'asc';
          const sort_field = req.query.sort_field as string || 'id';
    
          const submissionCount = await LeaveSubmission.findAndCountAll();
    
          const parsedPage = parseInt(page as string) || 1;
          const parsedLimit = parseInt(limit as string) || submissionCount.count;
          const token = req.headers.authorization?.split(' ')[1];
    
          if (!token) {
            return res.status(401).json({ error: 'No token provided' });
          }
          // Verifikasi token dan ekstrak payload
          const decoded = jwt.verify(token, 'your_secret_key') as { role: string };
    
          // Mendapatkan position dari payload token
          const role = decoded.role;
    
          // Validasi sort_by dan sort_field
          const validSortBy = ['asc', 'desc'];
          const isValidSortBy = validSortBy.includes(sort_by as string);
          const validSortFields = [
            'id', 'name', 'submissionDate', 'telephone', 'emergencyCall',
            'position', 'department', 'startDate', 'endDate', 'totalDays',
            'leaveType', 'description', 'leaveAllowance', 'status', 'approver'
          ];
          const isValidSortField = validSortFields.includes(sort_field);
    
          if (!isValidSortBy || !isValidSortField) {
            return res.status(400).json({ error: 'Invalid sort_by or sort_field' });
          }
    
          const offset = (parsedPage - 1) * parsedLimit;
    
          // Membuat objek pengaturan untuk pengambilan data
          const options: FindAndCountOptions = {
            where: {
              is_deleted: 0
            },
            limit: parsedLimit,
            offset: offset,
            order: [[sort_field, sort_by]],
            include: [
              {
                model: User,
                attributes: ['name', 'position', 'department', 'telephone', 'role']
              },
              {
                model: LeaveType,
                attributes: ['type']
              },
              {
                model: LeaveAllowance,
                attributes: ['total_days']
              },
              {
                model: User,
                as: 'Approver', 
                attributes: ['name'],
              },
            ]
          };
    
          // Menambahkan kondisi where berdasarkan status jika status tersedia
          if (status && typeof status === 'string') {
            const statusArray = status.split(',');
            options.where = {
              ...options.where,
              status: { [Op.in]: statusArray }
            };
          }
    
          if (leave_type_id && typeof leave_type_id === 'string') {
            const leaveTypeArray = leave_type_id.split(',');
            options.where = {
              ...options.where,
              leave_type_id: { [Op.in]: leaveTypeArray }
            };
          }
    
          if (role === 'hr') {
            if (user_id && typeof user_id === 'string') {
              const userIdArray = user_id.split(',');
              options.where = {
                ...options.where,
                user_id: { [Op.in]: userIdArray }
              };
            }
          }

          if (role === 'hr') {
            if (user_id && typeof user_id === 'string') {
                const userIdArray = user_id.split(',');
                options.where = {
                    ...options.where,
                    user_id: { [Op.in]: userIdArray }
                };
            }

            if (status === 'pending' || 'Pending') {
                // Menambahkan kondisi where pada include User
                if (Array.isArray(options.include)) {
                    const userInclude = options.include.find(
                        (include): include is Includeable & { model: typeof User, where?: any } =>
                            typeof include === 'object' && 'model' in include && include.model === User
                    );

                    if (userInclude) {
                        userInclude.where = {
                            ...userInclude.where,
                            role: { [Op.ne]: 'hr' }
                        };
                    }
                }
            }
          }

          if (start_date && end_date) {
            // Ubah format tanggal dari req.query menjadi format yang sesuai untuk query database
            const startDate = new Date(start_date as string);
            const endDate = new Date(end_date as string);
        
            options.where = {
                ...options.where,
                [Op.or]: [
                    {
                        start_date: {
                            [Op.between]: [startDate, endDate]
                        }
                    },
                    {
                        end_date: {
                            [Op.between]: [startDate, endDate]
                        }
                    }
                ]
            };
          }
    
          // Mengambil semua data LeaveSubmission sesuai dengan pengaturan options
          const { rows, count } = await LeaveSubmission.findAndCountAll(options);
    
          // Membuat array baru hanya dengan nilai-nilai yang diinginkan
          const submissions = rows.map((submission: any) => {
            const formattedDate = submission.created_at ? format(new Date(submission.created_at), 'yyyy-MM-dd') : null;
            
            return {
              id: submission.id,
              name: submission.User ? submission.User.name : null,
              submissionDate: formattedDate,
              telephone: submission.User ? submission.User.telephone : null,
              emergencyCall: submission.emergency_call,
              position: submission.User ? submission.User.position : null,
              department: submission.User ? submission.User.department : null,
              startDate: submission.start_date,
              endDate: submission.end_date,
              totalDays: submission.total_days,
              leaveType: submission.LeaveType ? submission.LeaveType.type : null,
              description: submission.description,
              leaveAllowance: submission.LeaveAllowance ? submission.LeaveAllowance.total_days : null,
              status: submission.status,
              approver: submission.Approver ? submission.Approver.name : null,
              attachment: submission.attachment,
            };
          });
    
          res.status(200).json({
            count,
            submissions,
          });
        } catch (error) {
          console.error('Error while fetching submissions:', error);
          res.status(500).json({ error: 'Unable to fetch submissions' });
        }
    },

    getSubmissionById: async (req: Request, res: Response) => {
      try {
        const submissionId = req.params.id;
    
        // Membuat objek pengaturan untuk pengambilan data berdasarkan ID
        const options: FindOptions = {
          where: { 
            id: submissionId,
            is_deleted: 0 
          },
          include: [
            {
              model: User,
              attributes: ['name', 'position', 'department', 'telephone'],
            },
            {
              model: LeaveType,
              attributes: ['type'],
            },
            {
              model: LeaveAllowance,
              attributes: ['total_days'],
            },
            {
              model: User,
              as: 'Approver',
              attributes: ['name'],
            },
          ],
        };
    
        const submission = await LeaveSubmission.findOne(options);
    
        if (submission) {
          // Membuat objek respons dengan struktur yang diinginkan
          const formattedSubmission = {
            id: submission.id,
            name: submission.User ? submission.User.name : null,
            submissionDate: submission.created_at ? format(new Date(submission.created_at), 'yyyy-MM-dd') : null,
            telephone: submission.User ? submission.User.telephone : null,
            emergencyCall: submission.emergency_call,
            position: submission.User ? submission.User.position : null,
            department: submission.User ? submission.User.department : null,
            startDate: submission.start_date,
            endDate: submission.end_date,
            totalDays: submission.total_days,
            leaveType: submission.LeaveType ? submission.LeaveType.type : null,
            description: submission.description,
            leaveAllowance: submission.LeaveAllowance ? submission.LeaveAllowance.total_days : null,
            status: submission.status,
            approver: submission.Approver ? submission.Approver.name : null,
            attachment: submission.attachment,
          };
    
          res.status(200).json(formattedSubmission);
        } else {
          res.status(404).json({ error: 'Submission not found' });
        }
      } catch (error) {
        console.error('Error while fetching submission by id:', error);
        res.status(500).json({ error: 'Unable to fetch submission' });
      }
    },

    getSubmissionLogin: async (req: Request, res: Response) => {
      try {
        const { page, limit, status } = req.query;
        const sort_by = req.query.sort_by as string || 'asc';
        const sort_field = req.query.sort_field as string || 'id';
        const token = req.headers.authorization?.split(' ')[1];
    
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }
    
        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const user_id = decoded.userId;

        const submisssionCount = await LeaveSubmission.findAndCountAll({ where: { user_id: user_id, is_deleted: 0 } });
    
        const parsedPage = parseInt(page as string) || 1;
        const parsedLimit = parseInt(limit as string) || submisssionCount.count;
    
        // Validasi sort_by dan sort_field
        const validSortBy = ['asc', 'desc'];
        const isValidSortBy = validSortBy.includes(sort_by as string);
        const isValidSortField = typeof sort_field === 'string' && sort_field !== '';
    
        if (!isValidSortBy || !isValidSortField) {
          return res.status(400).json({ error: 'Invalid sort_by or sort_field' });
        }
    
        const offset = (parsedPage - 1) * parsedLimit;

        const options: FindOptions = {
          where: { 
            user_id: user_id,
            is_deleted: 0
           },
          limit: parsedLimit,
          offset: offset,
          order: [[sort_field, sort_by]],
          include: [
            {
              model: User,
              attributes: ['name', 'position', 'department', 'telephone'],
            },
            {
              model: LeaveType,
              attributes: ['type'],
            },
            {
              model: LeaveAllowance,
              attributes: ['total_days'],
            },
            {
              model: User,
              as: 'Approver',
              attributes: ['name'],
            },
          ],
        };

        if (status && typeof status === 'string') {
            const statusArray = status.split(',');
            options.where = {
              ...options.where,
              status: { [Op.in]: statusArray }
            };
          }
    
        const submissions = await LeaveSubmission.findAll(options);
    
        if (submissions.length > 0) {
          // Membuat array untuk menyimpan hasil pengolahan
          
          const { rows, count } = await LeaveSubmission.findAndCountAll(options);

          const submissions = rows.map((submission: any) => {
            // Mengonversi tanggal ke string ISO 8601 dan mengambil bagian tanggal saja
            // const formattedDate = submission.created_at ? new Date (submission.created_at).toISOString().slice(0, 10) : null;
            const formattedDate = submission.created_at ? format(new Date(submission.created_at), 'yyyy-MM-dd') : null;
          
            return {
              id: submission.id,
              name: submission.User ? submission.User.name : null,
              submissionDate: formattedDate, // Menggunakan tanggal yang sudah diformat
              telephone: submission.User ? submission.User.telephone : null,
              emergencyCall: submission.emergency_call,
              position: submission.User ? submission.User.position : null,
              department: submission.User ? submission.User.department : null,
              startDate: submission.start_date,
              endDate: submission.end_date,
              totalDays: submission.total_days,
              leaveType: submission.LeaveType ? submission.LeaveType.type : null,
              description: submission.description,
              leaveAllowance: submission.LeaveAllowance ? submission.LeaveAllowance.total_days : null,
              status: submission.status,
              approver: submission.Approver ? submission.Approver.name : null,
              attachment: submission.attachment,
            };
          });
          res.status(200).json({
            count,
            submissions,
          });
        } else {
          res.status(404).json({ error: 'Submissions not found' });
        }
      } catch (error) {
        console.error('Error while fetching submissions:', error);
        res.status(500).json({ error: 'Unable to fetch submissions' });
      }
    },

    createSubmission: async (req: Request, res: Response) => {
      try {
        const { start_date, end_date, leave_type, emergency_call, description, attachment } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
    
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }
    
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
    
        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const user_id = decoded.userId;

        if (leave_type === 1 || leave_type === "1") {
          const leaveAllowance = await LeaveAllowance.findOne({ where: { user_id: user_id, is_deleted: 0 } });
          if (!leaveAllowance || leaveAllowance.total_days === 0) {
              return res.status(401).json({ error: 'Jatah cuti tidak cukup' });
          }
        }
        
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const calculateWorkingDays = (start: Date, end: Date): number => {
          let totalDays = 0;
          let currentDate = new Date(start);
    
          while (currentDate <= end) {
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6 || currentDate.getDate() === 31) {
              totalDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
    
          return totalDays;
        };
    
        const numberOfDays = calculateWorkingDays(startDate, endDate);
        
        const leaveSubmission = await LeaveSubmission.create({
          user_id: user_id,
          leave_type_id: leave_type,
          total_days: numberOfDays,
          start_date: start_date,
          end_date: end_date,
          emergency_call: emergency_call,
          description: description,
          created_at: new Date(),
          created_by: user_id,
          is_deleted: 0,
          attachment: attachment
        });
    
        return res.status(201).json({ message: 'Leave submission created successfully' });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Unable to create leave submission' });
      }
    },
    
    updateSubmission: async (req: Request, res: Response) => {
      try {
        const submissionId = req.params.id;
        const { start_date, end_date, leave_type, emergency_call, description, attachment } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
    
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
    
        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const user_id = decoded.userId;
    
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const calculateWorkingDays = (start: Date, end: Date): number => {
          let totalDays = 0;
          let currentDate = new Date(start);
    
          while (currentDate <= end) {
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Minggu, 6 = Sabtu
              totalDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
    
          return totalDays;
        };
    
        const numberOfDays = calculateWorkingDays(startDate, endDate);
    
        if (leave_type === 1) {
          const leaveAllowance = await LeaveAllowance.findOne({ where: { user_id: user_id, is_deleted: 0 } });
          if (!leaveAllowance || leaveAllowance.total_days === 0) {
              return res.status(401).json({ error: 'Jatah cuti tidak cukup' });
          }
        }
        
        const [updateSubmission] = await LeaveSubmission.update({
            leave_type_id: leave_type,
            total_days: numberOfDays,
            start_date: start_date,
            end_date: end_date,
            emergency_call,
            description,
            updated_at: new Date(),
            updated_by: user_id,
            attachment: attachment
          },{ where: { id: submissionId, is_deleted: 0, status: "Pending" } }
        );
    
        if (updateSubmission === 0) {
          res.status(404).json({ error: 'Submission not found' });
        } else {
          res.status(200).json({ message: 'Submission data updated successfully' });
          // res.status(200).json(submission);
        }
      } catch (error) {
        console.error('Error while updating submission data:', error);
        res.status(500).json({ error: 'Unable to update submission data' });
      }
    },

    acceptSubmission: async (req: Request, res: Response) => {
      try {
        const submissionId = req.params.id
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const user_id = decoded.userId;

        const submission = await LeaveSubmission.findOne({ where: { id: submissionId, is_deleted: 0 } });

        if (!submission) {
          return res.status(404).json({ error: 'Submission not found' });
        } else if (submission.status === 'Diterima') {
          return res.status(200).json({ error: 'Submission has already been accepted' });
        } else if (submission.status === 'Ditolak') {
          return res.status(200).json({ error: 'Submission has already been rejected' });
        } else if (submission.status === 'Pending') {

          const leaveAllowances = await LeaveAllowance.findOne({ where: { user_id: submission.user_id, is_deleted: 0 } });
          if (!leaveAllowances) {
            return res.status(500).json({ error: 'Leave allowance not found' });
          }

          const [updateSubmission] = await LeaveSubmission.update({
            status: 'Diterima',
            approver_user_id: user_id,
            // updatedAt: new Date(),
            updated_by: user_id
          }, {where: { id: submissionId, is_deleted: 0 }})

          if (updateSubmission === 0) {
            res.status(404).json({ error: 'Submission not found' });
          } 

          if(submission.leave_type_id === 1){
            const userId = submission.user_id;
      
              // Kurangi jatah cuti di leave_allowance
            const leaveAllowance = await LeaveAllowance.findOne({ where: { user_id: userId, is_deleted: 0 } });
            if (!leaveAllowance) {
              res.status(500).json({ error: 'Leave allowance not found' });
              return;
            }
            await leaveAllowance.update({ total_days: (leaveAllowance.total_days ?? 0) - submission.total_days })
          }

          res.status(200).json({ message: 'User updated successfully' });
        }
      } catch (error) {
        console.error('Error while updating submission data:', error);
        res.status(500).json({ error: 'Unable to update submission data' });
      }
    },

    rejectSubmission: async (req: Request, res: Response) => {
      try {
        const submissionId = req.params.id
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const user_id = decoded.userId;

        const submission = await LeaveSubmission.findOne({ where: { id: submissionId, is_deleted: 0 } });

        if (!submission) {
          return res.status(404).json({ error: 'Submission not found' });
        } else if (submission.status === 'Diterima') {
          return res.status(200).json({ error: 'Submission has already been accepted' });
        } else if (submission.status === 'Ditolak') {
          return res.status(200).json({ error: 'Submission has already been rejected' });
        } else if (submission.status === 'Pending') {

          const [updateSubmission] = await LeaveSubmission.update({
            status: 'Ditolak',
            approver_user_id: user_id,
            // updated_at: new Date(),
            updated_by: user_id
          }, {where: { id: submissionId, is_deleted: 0 }})
  
          if (updateSubmission === 0) {
            res.status(404).json({ error: 'Submission not found' });
          } 
  
          res.status(200).json({ message: 'User updated successfully' });

        }
      } catch (error) {
        console.error('Error while updating submission data:', error);
        res.status(500).json({ error: 'Unable to update submission data' });
      }
    },

    softDeleteSubmission: async (req: Request, res: Response) => {
      try {
        const submissionId = req.params.id;
  
        const token = req.headers.authorization?.split(' ')[1];
  
        if (!token) {
          return res.status(401).json({ error: 'No token provided' });
        }
  
        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const userIdLogin = decoded.userId;
  
        const softDeletedRowsCount = await LeaveSubmission.update({ 
          deleted_at: new Date(),
          deleted_by: userIdLogin,
          is_deleted: 1
        }, { where: { id: submissionId } });
    
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



    uploadAttachment: async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }
    
        return res.status(200).json({ filename: req.file.filename });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Failed to upload file' });
      }
    },

    updateAttachment: async (req: Request, res: Response) => {
        try {
            const submissionId = req.params.id;
    
            // Temukan data submission berdasarkan ID
            const submission = await LeaveSubmission.findOne({
                where: {
                  id: submissionId,
                  is_deleted: 0
                }
            });
    
            if (!submission) {
                return res.status(404).json({ error: 'Submission not found' });
            }
    
            // Jika ada file baru di-upload
            if (req.file) {
                // Dapatkan path file lama jika ada
                const oldFilePath = submission.attachment;
    
                // Hapus file lama jika ada
                if (oldFilePath) {
                    const oldFileFullPath = path.join(__dirname, '../../uploads', oldFilePath);
                    fs.unlink(oldFileFullPath, (err: any) => {
                        if (err) {
                            console.error('Error while deleting old file:', err);
                        }
                    });
                }
    
                return res.status(200).json({ message: 'Attachment updated successfully', filename: req.file.filename });
            } else {
                return res.status(400).json({ error: 'No file uploaded' });
            }
        } catch (error) {
            console.error('Error while updating attachment:', error);
            return res.status(500).json({ error: 'Failed to update attachment' });
        }
    },

    getAttachment: async (req: Request, res: Response) => {
        try {
            const { filename } = req.params;

            if (!process.env.UPLOAD) {
              return res.status(500).json({ error: 'UPLOAD directory is not defined in environment variables' });
            }
            
            const filePath = path.join(__dirname, process.env.UPLOAD, filename);
      
            res.sendFile(filePath, (err) => {
              if (err) {
                console.error('Error while sending file:', err);
                res.status(404).json({ error: 'File not found' });
              }
            });
        } catch (error) {
            console.error('Error while fetching attachment:', error);
            res.status(500).json({ error: 'Unable to fetch attachment' });
        }
    },

    

    karyawanCuti: async (req: Request, res: Response) => {
      try {
        const { page, limit } = req.query;
        const sort_by = req.query.sort_by as string || 'asc';
        const sort_field = req.query.sort_field as string || 'id';

        const submisssionCount = await LeaveSubmission.findAndCountAll({ where: { is_deleted: 0 } });
    
        const parsedPage = parseInt(page as string) || 1;
        const parsedLimit = parseInt(limit as string) || submisssionCount.count;
    
        // Validasi sort_by dan sort_field
        const validSortBy = ['asc', 'desc'];
        const isValidSortBy = validSortBy.includes(sort_by as string);
        const isValidSortField = typeof sort_field === 'string' && sort_field !== '';
    
        if (!isValidSortBy || !isValidSortField) {
          return res.status(400).json({ error: 'Invalid sort_by or sort_field' });
        }
    
        const offset = (parsedPage - 1) * parsedLimit;

        const today = new Date();
        const formattedToday = format(today, 'yyyy-MM-dd');

        const options: FindOptions = {
          where: {
            is_deleted: 0,
            status: 'Diterima',
            start_date: {
              [Op.lte]: formattedToday,
            },
            end_date: {
              [Op.gte]: formattedToday,
            },
          },
          limit: parsedLimit,
          offset: offset,
          order: [[sort_field, sort_by]],
          include: [
            {
              model: User,
              attributes: ['name', 'position', 'department', 'telephone'],
            },
            {
              model: LeaveType,
              attributes: ['type'],
            },
            {
              model: LeaveAllowance,
              attributes: ['total_days'],
            },
            {
              model: User,
              as: 'Approver',
              attributes: ['name'],
            },
          ],
        };
    
        const submissions = await LeaveSubmission.findAll(options);
    
          if (submissions.length > 0) {
            // Membuat array untuk menyimpan hasil pengolahan
            
            const { rows, count } = await LeaveSubmission.findAndCountAll(options);

            const submissions = rows.map((submission: any) => {
              // Mengonversi tanggal ke string ISO 8601 dan mengambil bagian tanggal saja
              // const formattedDate = submission.created_at ? new Date (submission.created_at).toISOString().slice(0, 10) : null;
              const formattedDate = submission.created_at ? format(new Date(submission.created_at), 'yyyy-MM-dd') : null;
            
              return {
                id: submission.id,
                name: submission.User ? submission.User.name : null,
                submissionDate: formattedDate, // Menggunakan tanggal yang sudah diformat
                telephone: submission.User ? submission.User.telephone : null,
                emergencyCall: submission.emergency_call,
                position: submission.User ? submission.User.position : null,
                department: submission.User ? submission.User.department : null,
                startDate: submission.start_date,
                endDate: submission.end_date,
                totalDays: submission.total_days,
                leaveType: submission.LeaveType ? submission.LeaveType.type : null,
                description: submission.description,
                leaveAllowance: submission.LeaveAllowance ? submission.LeaveAllowance.total_days : null,
                status: submission.status,
                approver: submission.Approver ? submission.Approver.name : null,
                attachment: submission.attachment,
              };
            });
            res.status(200).json({
              count,
              submissions,
            });
          } else {
            res.status(200).json({
              count: 0,
              submissions: [],
            });
          }

      } catch (error) {
        console.error('Error while fetching submissions:', error);
        res.status(500).json({ error: 'Unable to fetch submissions' });
      }
    },

    permintaanCuti: async (req: Request, res: Response) => {
      try {
        const { page, limit } = req.query;
        const sort_by = req.query.sort_by as string || 'asc';
        const sort_field = req.query.sort_field as string || 'id';
    
        const submisssionCount = await LeaveSubmission.findAndCountAll({ where: { is_deleted: 0 } });
    
        const parsedPage = parseInt(page as string) || 1;
        const parsedLimit = parseInt(limit as string) || submisssionCount.count;
    
        // Validasi sort_by dan sort_field
        const validSortBy = ['asc', 'desc'];
        const isValidSortBy = validSortBy.includes(sort_by);
        const isValidSortField = typeof sort_field === 'string' && sort_field !== '';
    
        if (!isValidSortBy || !isValidSortField) {
          return res.status(400).json({ error: 'Invalid sort_by or sort_field' });
        }
    
        const offset = (parsedPage - 1) * parsedLimit;
    
        const options: FindOptions = {
          where: {
            is_deleted: 0,
            status: 'Pending',
          },
          limit: parsedLimit,
          offset: offset,
          order: [[sort_field, sort_by]],
          include: [
            {
              model: User,
              attributes: ['name', 'position', 'department', 'telephone'],
            },
            {
              model: LeaveType,
              attributes: ['type'],
            },
            {
              model: LeaveAllowance,
              attributes: ['total_days'],
            },
            {
              model: User,
              as: 'Approver',
              attributes: ['name'],
            },
          ],
        };
    
        const { rows, count } = await LeaveSubmission.findAndCountAll(options);
    
        if (rows.length > 0) {
          const submissions = rows.map((submission: any) => {
            const formattedDate = submission.created_at ? format(new Date(submission.created_at), 'yyyy-MM-dd') : null;
    
            return {
              id: submission.id,
              name: submission.User ? submission.User.name : null,
              submissionDate: formattedDate,
              telephone: submission.User ? submission.User.telephone : null,
              emergencyCall: submission.emergency_call,
              position: submission.User ? submission.User.position : null,
              department: submission.User ? submission.User.department : null,
              startDate: submission.start_date,
              endDate: submission.end_date,
              totalDays: submission.total_days,
              leaveType: submission.LeaveType ? submission.LeaveType.type : null,
              description: submission.description,
              leaveAllowance: submission.LeaveAllowance ? submission.LeaveAllowance.total_days : null,
              status: submission.status,
              approver: submission.Approver ? submission.Approver.name : null,
              attachment: submission.attachment,
            };
          });
          res.status(200).json({
            count,
            submissions,
          });
        } else {
          res.status(200).json({
            count: 0,
            submissions: [],
          });
        }
      } catch (error) {
        console.error('Error while fetching submissions:', error);
        res.status(500).json({ error: 'Unable to fetch submissions' });
      }
    },

    cutiDiterima: async (req: Request, res: Response) => {
      try {
        const { page, limit } = req.query;
        const sort_by = req.query.sort_by as string || 'asc';
        const sort_field = req.query.sort_field as string || 'id';
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const user_id = decoded.userId

    
        const submisssionCount = await LeaveSubmission.findAndCountAll({ where: { is_deleted: 0 } });
    
        const parsedPage = parseInt(page as string) || 1;
        const parsedLimit = parseInt(limit as string) || submisssionCount.count;
    
        // Validasi sort_by dan sort_field
        const validSortBy = ['asc', 'desc'];
        const isValidSortBy = validSortBy.includes(sort_by);
        const isValidSortField = typeof sort_field === 'string' && sort_field !== '';
    
        if (!isValidSortBy || !isValidSortField) {
          return res.status(400).json({ error: 'Invalid sort_by or sort_field' });
        }
    
        const offset = (parsedPage - 1) * parsedLimit;
    
        const options: FindOptions = {
          where: {
            is_deleted: 0,
            status: 'Diterima',
            user_id: user_id
          },
          limit: parsedLimit,
          offset: offset,
          order: [[sort_field, sort_by]],
          include: [
            {
              model: User,
              attributes: ['name', 'position', 'department', 'telephone'],
            },
            {
              model: LeaveType,
              attributes: ['type'],
            },
            {
              model: LeaveAllowance,
              attributes: ['total_days'],
            },
            {
              model: User,
              as: 'Approver',
              attributes: ['name'],
            },
          ],
        };
    
        const { rows, count } = await LeaveSubmission.findAndCountAll(options);
    
        if (rows.length > 0) {
          const submissions = rows.map((submission: any) => {
            const formattedDate = submission.created_at ? format(new Date(submission.created_at), 'yyyy-MM-dd') : null;
    
            return {
              id: submission.id,
              name: submission.User ? submission.User.name : null,
              submissionDate: formattedDate,
              telephone: submission.User ? submission.User.telephone : null,
              emergencyCall: submission.emergency_call,
              position: submission.User ? submission.User.position : null,
              department: submission.User ? submission.User.department : null,
              startDate: submission.start_date,
              endDate: submission.end_date,
              totalDays: submission.total_days,
              leaveType: submission.LeaveType ? submission.LeaveType.type : null,
              description: submission.description,
              leaveAllowance: submission.LeaveAllowance ? submission.LeaveAllowance.total_days : null,
              status: submission.status,
              approver: submission.Approver ? submission.Approver.name : null,
              attachment: submission.attachment,
            };
          });
          res.status(200).json({
            count,
            submissions,
          });
        } else {
          res.status(200).json({
            count: 0,
            submissions: [],
          });
        }
      } catch (error) {
        console.error('Error while fetching submissions:', error);
        res.status(500).json({ error: 'Unable to fetch submissions' });
      }
    },

    cutiDitolak: async (req: Request, res: Response) => { 
      try {
        const { page, limit } = req.query;
        const sort_by = req.query.sort_by as string || 'asc';
        const sort_field = req.query.sort_field as string || 'id';
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const user_id = decoded.userId

    
        const submisssionCount = await LeaveSubmission.findAndCountAll({ where: { is_deleted: 0 } });
    
        const parsedPage = parseInt(page as string) || 1;
        const parsedLimit = parseInt(limit as string) || submisssionCount.count;
    
        // Validasi sort_by dan sort_field
        const validSortBy = ['asc', 'desc'];
        const isValidSortBy = validSortBy.includes(sort_by);
        const isValidSortField = typeof sort_field === 'string' && sort_field !== '';
    
        if (!isValidSortBy || !isValidSortField) {
          return res.status(400).json({ error: 'Invalid sort_by or sort_field' });
        }
    
        const offset = (parsedPage - 1) * parsedLimit;
    
        const options: FindOptions = {
          where: {
            is_deleted: 0,
            status: 'Ditolak',
            user_id: user_id
          },
          limit: parsedLimit,
          offset: offset,
          order: [[sort_field, sort_by]],
          include: [
            {
              model: User,
              attributes: ['name', 'position', 'department', 'telephone'],
            },
            {
              model: LeaveType,
              attributes: ['type'],
            },
            {
              model: LeaveAllowance,
              attributes: ['total_days'],
            },
            {
              model: User,
              as: 'Approver',
              attributes: ['name'],
            },
          ],
        };
    
        const { rows, count } = await LeaveSubmission.findAndCountAll(options);
    
        if (rows.length > 0) {
          const submissions = rows.map((submission: any) => {
            const formattedDate = submission.created_at ? format(new Date(submission.created_at), 'yyyy-MM-dd') : null;
    
            return {
              id: submission.id,
              name: submission.User ? submission.User.name : null,
              submissionDate: formattedDate,
              telephone: submission.User ? submission.User.telephone : null,
              emergencyCall: submission.emergency_call,
              position: submission.User ? submission.User.position : null,
              department: submission.User ? submission.User.department : null,
              startDate: submission.start_date,
              endDate: submission.end_date,
              totalDays: submission.total_days,
              leaveType: submission.LeaveType ? submission.LeaveType.type : null,
              description: submission.description,
              leaveAllowance: submission.LeaveAllowance ? submission.LeaveAllowance.total_days : null,
              status: submission.status,
              approver: submission.Approver ? submission.Approver.name : null,
              attachment: submission.attachment,
            };
          });
          res.status(200).json({
            count,
            submissions,
          });
        } else {
          res.status(200).json({
            count: 0,
            submissions: [],
          });
        } 
      } catch (error) {
        console.error('Error while fetching submissions:', error);
        res.status(500).json({ error: 'Unable to fetch submissions' });
      }
    },



    getLeaveHistory: async (req: Request, res: Response) => {
      try {
        const { month, year, page, limit } = req.query;
        const sort_by = req.query.sort_by as string || 'asc';
        const sort_field = req.query.sort_field as string || 'userId';
    
        // Validate query parameters
        if (typeof month !== 'string' || typeof year !== 'string') {
            return res.status(400).json({ error: 'Invalid query parameters' });
        }
    
        const monthNum = parseInt(month); // Convert month to number
        const yearNum = parseInt(year); // Convert year to number
    
        if (isNaN(monthNum) || isNaN(yearNum)) {
            return res.status(400).json({ error: 'Invalid query parameters' });
        }
    
        const startDate = new Date(yearNum, monthNum - 1, 1);
        const endDate = new Date(yearNum, monthNum, 0);
    
        // Query leave submissions from the database
        const leaveSubmissions: LeaveSubmission[] = await LeaveSubmission.findAll({
          where: {
              start_date: {
                  [Op.between]: [startDate, endDate]
              },
              is_deleted: 0
          },
          include: [{
              model: User,
              where: {
                  role: {
                      [Op.not]: 'owner'
                  }
              }
          }],
        });
    
        // Processed users
        const processedUsers: string[] = [];

        // Object to store leave history for each user
        const leaveHistory: { userId: number; name: string; data: number[] }[] = [];

        leaveSubmissions.forEach((submission: LeaveSubmission) => {
            const start = new Date(submission.start_date);
            const end = new Date(submission.end_date);

            const user = submission.User;

            if (user) {
                const userId = user.id;
                const userName = user.name;

                const status = submission.status?.toLowerCase() || 'pending';

                // Check if the user already exists in leaveHistory
                const existingUserIndex = leaveHistory.findIndex(entry => entry.userId === userId);
                if (existingUserIndex !== -1) {
                    // If exists, increment the corresponding status count
                    switch (status) {
                        case 'diterima':
                            leaveHistory[existingUserIndex].data[0]++;
                            break;
                        case 'ditolak':
                            leaveHistory[existingUserIndex].data[1]++;
                            break;
                        case 'pending':
                            leaveHistory[existingUserIndex].data[2]++;
                            break;
                        default:
                            break;
                    }
                } else {
                    // If not, add a new entry for the user
                    const newData: number[] = [0, 0, 0]; // [diterima, ditolak, pending]
                    switch (status) {
                        case 'diterima':
                            newData[0]++;
                            break;
                        case 'ditolak':
                            newData[1]++;
                            break;
                        case 'pending':
                            newData[2]++;
                            break;
                        default:
                            break;
                    }
                    leaveHistory.push({ userId, name: userName, data: newData });
                }

                // Mark user as processed
                processedUsers.push(userName);
            } else {
                console.error('Invalid user data:', submission.User);
            }
        });

        // Check users who didn't submit leave and add them to leaveHistory
        const allUsers = await User.findAll();
        allUsers.forEach(user => {
            if (!processedUsers.includes(user.name)) {
                leaveHistory.push({ userId: user.id, name: user.name, data: [0, 0, 0] });
            }
        });

        const updatedLeaveHistory = leaveHistory.map(entry => ({
          userId: entry.userId,
          name: entry.name,
          data: entry.data.map(val => val.toString()).join(',') // Convert numbers to strings and join with comma
        }));
    
        // Sorting
        if (typeof sort_field === 'string' && typeof sort_by === 'string') {
          if (sort_field === 'userId') {
              updatedLeaveHistory.sort((a, b) => {
                  const aValue = Number(a[sort_field]);
                  const bValue = Number(b[sort_field]);
                  return sort_by === 'asc' ? aValue - bValue : bValue - aValue;
              });
          } else if (sort_field === 'data') {
              updatedLeaveHistory.sort((a, b) => {
                  const aValue = a[sort_field].split(',').reduce((acc, val) => acc + parseInt(val), 0); // Split and sum values in the array
                  const bValue = b[sort_field].split(',').reduce((acc, val) => acc + parseInt(val), 0); // Split and sum values in the array
                  return sort_by === 'asc' ? aValue - bValue : bValue - aValue;
              });
          } else {
              console.error('Invalid sort field:', sort_field);
          }
        }
    
        // Pagination
        const pageNum = page ? parseInt(page as string) : 1;
        const limitNum = limit ? parseInt(limit as string) : leaveHistory.length;
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedLeaveHistory = updatedLeaveHistory.slice(startIndex, endIndex);
    
        res.status(200).json(paginatedLeaveHistory);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Unable to fetch leave history' });
      }
    },
    
    getLeaveHistoryEveryYear: async (req: Request, res: Response) => {
      try {
          const { year, page, limit } = req.query;
          const sort_by = req.query.sort_by as string || 'asc';
          const sort_field = req.query.sort_field as string || 'userId';
  
          // Validate query parameters
          if (typeof year !== 'string') {
              return res.status(400).json({ error: 'Invalid query parameters' });
          }
  
          const yearNum = parseInt(year); // Convert year to number
  
          if (isNaN(yearNum)) {
              return res.status(400).json({ error: 'Invalid query parameters' });
          }
  
          const startDate = new Date(yearNum, 0, 1); // January 1st of the given year
          const endDate = new Date(yearNum, 11, 31); // December 31st of the given year
  
          // Query leave submissions from the database
          const leaveSubmissions: LeaveSubmission[] = await LeaveSubmission.findAll({
              where: {
                  start_date: {
                      [Op.between]: [startDate, endDate]
                  },
                  is_deleted: 0
              },
              include: [{
                  model: User,
                  where: {
                      role: {
                          [Op.not]: 'owner'
                      }
                  }
              }]
          });
  
          // Processed users
          const processedUsers: string[] = [];
  
          // Object to store leave history for each user
          const leaveHistory: { userId: number; name: string; data: number[] }[] = [];
  
          leaveSubmissions.forEach((submission: LeaveSubmission) => {
              const user = submission.User;
  
              if (user) {
                  const userId = user.id;
                  const userName = user.name;
  
                  const status = submission.status?.toLowerCase() || 'pending';
  
                  // Check if the user already exists in leaveHistory
                  const existingUserIndex = leaveHistory.findIndex(entry => entry.userId === userId);
                  if (existingUserIndex !== -1) {
                      // If exists, increment the corresponding status count
                      switch (status) {
                          case 'diterima':
                              leaveHistory[existingUserIndex].data[0]++;
                              break;
                          case 'ditolak':
                              leaveHistory[existingUserIndex].data[1]++;
                              break;
                          case 'pending':
                              leaveHistory[existingUserIndex].data[2]++;
                              break;
                          default:
                              break;
                      }
                  } else {
                      // If not, add a new entry for the user
                      const newData: number[] = [0, 0, 0]; // [diterima, ditolak, pending]
                      switch (status) {
                          case 'diterima':
                              newData[0]++;
                              break;
                          case 'ditolak':
                              newData[1]++;
                              break;
                          case 'pending':
                              newData[2]++;
                              break;
                          default:
                              break;
                      }
                      leaveHistory.push({ userId, name: userName, data: newData });
                  }
  
                  // Mark user as processed
                  processedUsers.push(userName);
              } else {
                  console.error('Invalid user data:', submission.User);
              }
          });
  
          // Check users who didn't submit leave and add them to leaveHistory
          const allUsers = await User.findAll();
          allUsers.forEach(user => {
              if (!processedUsers.includes(user.name)) {
                  leaveHistory.push({ userId: user.id, name: user.name, data: [0, 0, 0] });
              }
          });
  
          const updatedLeaveHistory = leaveHistory.map(entry => ({
              userId: entry.userId,
              name: entry.name,
              data: entry.data.map(val => val.toString()).join(',') // Convert numbers to strings and join with comma
          }));
  
          // Sorting
          if (typeof sort_field === 'string' && typeof sort_by === 'string') {
            if (sort_field === 'userId') {
                updatedLeaveHistory.sort((a, b) => {
                    const aValue = Number(a[sort_field]);
                    const bValue = Number(b[sort_field]);
                    return sort_by === 'asc' ? aValue - bValue : bValue - aValue;
                });
            } else if (sort_field === 'data') {
                updatedLeaveHistory.sort((a, b) => {
                    const aValue = a[sort_field].split(',').reduce((acc, val) => acc + parseInt(val), 0); // Split and sum values in the array
                    const bValue = b[sort_field].split(',').reduce((acc, val) => acc + parseInt(val), 0); // Split and sum values in the array
                    return sort_by === 'asc' ? aValue - bValue : bValue - aValue;
                });
            } else {
                console.error('Invalid sort field:', sort_field);
            }
        }
  
          // Pagination
          const pageNum = page ? parseInt(page as string) : 1;
          const limitNum = limit ? parseInt(limit as string) : leaveHistory.length;
          const startIndex = (pageNum - 1) * limitNum;
          const endIndex = startIndex + limitNum;
          const paginatedLeaveHistory = updatedLeaveHistory.slice(startIndex, endIndex);
  
          res.status(200).json(paginatedLeaveHistory);
      } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Unable to fetch leave history' });
      }
    },
  
    
    getMonthlyLeaveChart: async (req: Request, res: Response) => {
      try {
        const { year, limit, page } = req.query;
        const sort_by = req.query.sort_by as string || 'asc';
        const sort_field = req.query.sort_field as string || 'month';
    
        // Validate query parameters
        if (typeof year !== 'string') {
          return res.status(400).json({ error: 'Invalid query parameters' });
        }
    
        const yearNum = parseInt(year);
    
        if (isNaN(yearNum)) {
          return res.status(400).json({ error: 'Invalid query parameters' });
        }
    
        const statuses = ["diterima", "ditolak", "pending"];
        const monthlyLeaveSummary: { [key: string]: number }[] = Array(12).fill(null).map(() => ({
          diterima: 0,
          ditolak: 0,
          pending: 0
        }));
    
        for (let month = 0; month < 12; month++) {
          const startDate = new Date(yearNum, month, 1);
          const endDate = new Date(yearNum, month + 1, 1);
          endDate.setDate(endDate.getDate() - 1);
    
          // Query leave submissions from the database
          const leaveSubmissions: LeaveSubmission[] = await LeaveSubmission.findAll({
            where: {
              start_date: {
                [Op.between]: [startDate, endDate]
              },
              is_deleted: 0
            }
          });
    
          // Count leave submissions by their status
          leaveSubmissions.forEach((submission: LeaveSubmission) => {
            const normalizedStatus = submission.status?.toLowerCase();
            if (normalizedStatus && statuses.includes(normalizedStatus)) {
              monthlyLeaveSummary[month][normalizedStatus]++;
            }
          });
        }
    
        const monthNames = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
    
        let response = monthNames.map((month, index) => ({
          month,
          data: [
            monthlyLeaveSummary[index].diterima,
            monthlyLeaveSummary[index].ditolak,
            monthlyLeaveSummary[index].pending
          ].join(', ')
        }));
    
        // Sorting
        if (sort_field && sort_by) {
          response = response.sort((a, b) => {
            if (sort_field === 'month') {
              if (sort_by === 'asc') {
                return monthNames.indexOf(a.month) - monthNames.indexOf(b.month);
              } else {
                return monthNames.indexOf(b.month) - monthNames.indexOf(a.month);
              }
            }
            return 0;
          });
        }
    
        // Pagination
        const limitNum = limit ? parseInt(limit as string) : response.length;
        const pageNum = page ? parseInt(page as string) : 1;
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedResponse = response.slice(startIndex, endIndex);
    
        res.status(200).json({
          year: yearNum,
          totalEntries: response.length,
          page: pageNum,
          limit: limitNum,
          monthlyLeaveSummary: paginatedResponse
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Unable to fetch leave submissions' });
      }
    },
    
    
    
    
} 

export default leaveSubmissionController