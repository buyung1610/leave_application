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
  
          const monthNum = parseInt(month); // Konversi month menjadi number
          const yearNum = parseInt(year); // Konversi year menjadi number
  
          if (isNaN(monthNum) || isNaN(yearNum)) {
              return res.status(400).json({ error: 'Invalid query parameters' });
          }
  
          const startDate = new Date(yearNum, monthNum - 1, 1);
          const endDate = new Date(yearNum, monthNum, 0);
  
          // Query pengajuan cuti dari database
          const leaveSubmissions: LeaveSubmission[] = await LeaveSubmission.findAll({
              where: {
                  [Op.or]: [
                      { start_date: { [Op.between]: [startDate, endDate] } }, // Pengecekan untuk cuti yang dimulai dan berakhir di dalam bulan yang diminta
                      { start_date: { [Op.lt]: startDate }, end_date: { [Op.gte]: startDate } }, // Pengecekan untuk cuti yang dimulai sebelum bulan yang diminta dan berlanjut ke bulan tersebut
                      { start_date: { [Op.lt]: endDate }, end_date: { [Op.gte]: endDate } } // Pengecekan untuk cuti yang dimulai di bulan yang diminta dan berlanjut ke bulan berikutnya
                  ],
                  is_deleted: 0,
                  status: "diterima"
              },
              include: [User] // Sertakan model User untuk mendapatkan informasi pengguna
          });
  
          const calculateWorkingDays = (start: Date, end: Date): number => {
              let totalDays = 0;
              let currentDate = new Date(start);
  
              while (currentDate <= end) {
                  const dayOfWeek = currentDate.getDay();
                  if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude Sunday and Saturday
                      totalDays++;
                  }
                  currentDate.setDate(currentDate.getDate() + 1);
              }
  
              return totalDays;
          };
  
          // Array untuk menyimpan total cuti setiap bulan untuk setiap karyawan
          const leaveSummary: { userId: number; name: string; totalLeaveDays: number }[] = [];
  
          // Simpan daftar pengguna yang telah diproses
          const processedUsers: string[] = [];
  
          leaveSubmissions.forEach((submission: LeaveSubmission) => {
              const start = new Date(submission.start_date);
              const end = new Date(submission.end_date);
  
              const user = submission.User; // Dapatkan objek pengguna dari relasi
  
              if (user) { // Pastikan objek pengguna ada
                  const userId = user.id;
                  const userName = user.name;
  
                  let totalLeaveDays = 0;
  
                  if (start < startDate && end > endDate) {
                      totalLeaveDays = calculateWorkingDays(startDate, endDate);
                  } else if (start < startDate && end <= endDate) {
                      totalLeaveDays = calculateWorkingDays(startDate, end);
                  } else if (start >= startDate && end > endDate) {
                      totalLeaveDays = calculateWorkingDays(start, endDate);
                  } else {
                      totalLeaveDays = submission.total_days;
                  }
  
                  // Cek apakah pengguna sudah ada dalam leaveSummary
                  const existingUserIndex = leaveSummary.findIndex(summary => summary.name === userName);
                  if (existingUserIndex !== -1) {
                      // Jika sudah ada, tambahkan total cuti baru ke total cuti yang sudah ada
                      leaveSummary[existingUserIndex].totalLeaveDays += totalLeaveDays;
                  } else {
                      // Jika belum ada, tambahkan informasi cuti baru sebagai objek baru dalam array
                      leaveSummary.push({ userId, name: userName, totalLeaveDays });
                  }
  
                  // Tandai pengguna telah diproses
                  processedUsers.push(userName);
              } else {
                  console.error('Invalid user data:', submission.User);
              }
          });
  
          // Cek pengguna yang tidak memiliki cuti dan tambahkan ke leaveSummary
          const allUsers = await User.findAll(); // Ambil semua pengguna dari database
          allUsers.forEach(user => {
              if (!processedUsers.includes(user.name)) {
                  leaveSummary.push({ userId: user.id, name: user.name, totalLeaveDays: 0 });
              }
          });
  
          // Sorting
          if (typeof sort_field === 'string' && typeof sort_by === 'string') {
            if (sort_field === 'userId' || sort_field === 'totalLeaveDays') {
                leaveSummary.sort((a, b) => {
                    if (sort_by === 'asc') {
                        return a[sort_field] - b[sort_field];
                    } else {
                        return b[sort_field] - a[sort_field];
                    }
                });
            } else {
                console.error('Invalid sort field:', sort_field);
            }
          }
  
          // Pagination
          const pageNum = page ? parseInt(page as string) : 1;
          const limitNum = limit ? parseInt(limit as string) : leaveSummary.length;
          const startIndex = (pageNum - 1) * limitNum;
          const endIndex = startIndex + limitNum;
          const paginatedLeaveSummary = leaveSummary.slice(startIndex, endIndex);
  
          res.status(200).json(paginatedLeaveSummary);
      } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Unable to fetch total leave days' });
      }
    },
    //   try {
    //     const { page, limit, month, year } = req.query;
    //     const sort_by = req.query.sort_by as string || 'asc';
    //     const sort_field = req.query.sort_field as string || 'id';
    
    //     const submissionCount = await LeaveSubmission.findAndCountAll();
    
    //     const parsedPage = parseInt(page as string) || 1;
    //     const parsedLimit = parseInt(limit as string) || submissionCount.count;
    
    //     const offset = (parsedPage - 1) * parsedLimit;
    
    //     const startDate = new Date(Number(year), Number(month) - 1, 1);
    //     const endDate = new Date(Number(year), Number(month), 0);
    
    //     const leaveCounts = await LeaveSubmission.findAndCountAll({
    //       where: {
    //         start_date: {
    //           [Op.between]: [startDate, endDate]
    //         },
    //         is_deleted: 0,
    //         status: 'diterima'
    //       },
    //       order: [[sort_field, sort_by]],
    //       limit: parsedLimit,
    //       offset: offset
    //     });
    
    //     return res.status(200).json({ leaveCounts });
    //   } catch (error) {
    //     console.error(error);
    //     return res.status(500).json({ error: 'Unable to fetch user leave counts' });
    //   }
    // },
    
    getMonthlyLeaveChart: async (req: Request, res: Response) => {
      try {
        const { year, limit, page } = req.query;
        const sort_by = req.query.sort_by as string || 'asc';
        const sort_field = req.query.sort_field as string || 'month';
    
        // Validasi query parameter
        if (typeof year !== 'string') {
          return res.status(400).json({ error: 'Invalid query parameters' });
        }
    
        const yearNum = parseInt(year);
    
        if (isNaN(yearNum)) {
          return res.status(400).json({ error: 'Invalid query parameters' });
        }
    
        const calculateWorkingDays = (start: Date, end: Date): number => {
          let totalDays = 0;
          let currentDate = new Date(start);
    
          while (currentDate <= end) {
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Minggu, 6 = Sabtu
              totalDays++;
            } else if (currentDate.getDate() === 31) {
                totalDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
    
          return totalDays;
        };
    
        // Array untuk menyimpan total cuti setiap bulan
        const monthlyLeaveSummary = Array(12).fill(0);
    
        for (let month = 0; month < 12; month++) {
          const startDate = new Date(yearNum, month, 1);
          const endDate = new Date(yearNum, month + 1, 1);
          endDate.setDate(endDate.getDate() - 1);
    
          // Query pengajuan cuti dari database
          const leaveSubmissions: LeaveSubmission[] = await LeaveSubmission.findAll({
            where: {
              [Op.or]: [
                { start_date: { [Op.between]: [startDate, endDate] } },
                { start_date: { [Op.lt]: startDate }, end_date: { [Op.gte]: startDate } },
                { start_date: { [Op.lt]: endDate }, end_date: { [Op.gte]: endDate } }
              ],
              is_deleted: 0,
              status: "diterima"
            }
          });
    
          let totalLeaveDays = 0;
    
          leaveSubmissions.forEach((submission: LeaveSubmission) => {
            const start = new Date(submission.start_date);
            const end = new Date(submission.end_date);
    
            if (start < startDate && end > endDate) {
              totalLeaveDays += calculateWorkingDays(startDate, endDate);
            } else if (start < startDate && end <= endDate) {
              totalLeaveDays += calculateWorkingDays(startDate, end);
            } else if (start >= startDate && end > endDate) {
              totalLeaveDays += calculateWorkingDays(start, endDate);
            } else {
              totalLeaveDays += calculateWorkingDays(start, end);
            }
          });
    
          monthlyLeaveSummary[month] = totalLeaveDays;
        }
    
        const monthNames = [
          "Januari", "Februari", "Maret", "April", "Mei", "Juni",
          "Juli", "Agustus", "September", "Oktober", "November", "Desember"
        ];
    
        let response = monthNames.map((month, index) => ({
          month,
          totalLeaveDays: monthlyLeaveSummary[index]
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
            } else if (sort_field === 'totalLeaveDays') {
              if (sort_by === 'asc') {
                return a.totalLeaveDays - b.totalLeaveDays;
              } else {
                return b.totalLeaveDays - a.totalLeaveDays;
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
        res.status(500).json({ error: 'Unable to fetch total leave days' });
      }
    },
} 

export default leaveSubmissionController