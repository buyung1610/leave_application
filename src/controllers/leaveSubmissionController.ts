import { Request, Response, response } from "express";
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
import XLSX from 'xlsx';
import AppConstants from "../AppConstants";


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
            return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
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
            return res.status(400).json({ error: AppConstants.ErrorMessages.Other.INVALID_SORT });
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
    
          if (role === AppConstants.Role.HR) {
            if (user_id && typeof user_id === 'string') {
              const userIdArray = user_id.split(',');
              options.where = {
                ...options.where,
                user_id: { [Op.in]: userIdArray }
              };
            }
          }

          if (role === AppConstants.Role.HR) {
            if (user_id && typeof user_id === 'string') {
                const userIdArray = user_id.split(',');
                options.where = {
                    ...options.where,
                    user_id: { [Op.in]: userIdArray }
                };
            }

            if (status === AppConstants.Status.PENDING) {
                // Menambahkan kondisi where pada include User
                if (Array.isArray(options.include)) {
                    const userInclude = options.include.find(
                        (include): include is Includeable & { model: typeof User, where?: any } =>
                            typeof include === 'object' && 'model' in include && include.model === User
                    );

                    if (userInclude) {
                        userInclude.where = {
                            ...userInclude.where,
                            role: { [Op.ne]: AppConstants.Role.HR }
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
          console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
          res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
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
          res.status(404).json({ error: AppConstants.ErrorMessages.Submission.SUBMISSION_NOT_FOUND });
        }
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    getSubmissionLogin: async (req: Request, res: Response) => {
      try {
        const { page, limit, status } = req.query;
        const sort_by = req.query.sort_by as string || 'asc';
        const sort_field = req.query.sort_field as string || 'id';
        const token = req.headers.authorization?.split(' ')[1];
    
        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
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
          return res.status(400).json({ error: AppConstants.ErrorMessages.Other.INVALID_SORT });
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
          res.status(404).json({ error: AppConstants.ErrorMessages.Submission.SUBMISSION_NOT_FOUND });
        }
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    createSubmission: async (req: Request, res: Response) => {
      try {
        const { start_date, end_date, leave_type, emergency_call, description, attachment, force_submit } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
    
        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
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
            if (dayOfWeek !== 0 && dayOfWeek !== 6 || currentDate.getDate() === 31) {
              totalDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
    
          return totalDays;
        };
    
        const numberOfDays = calculateWorkingDays(startDate, endDate);
        const leaveType = await LeaveType.findOne({ where: { id: leave_type, is_deleted: 0 }})
        const leaveAllowance = await LeaveAllowance.findOne({ where: { user_id: user_id, is_deleted: 0 } });

        if (!leaveType) {
          return res.status(404).json({ error: AppConstants.ErrorMessages.LeaveType.NOT_FOUND });
        }

        if (!leaveAllowance) {
          return res.status(404).json({ error: AppConstants.ErrorMessages.LeaveAllowance.LEAVE_ALLOWANCE_NOT_FOUND });
        }

        if (leaveAllowance.total_days === null) {
          return res.status(404).json({ error: AppConstants.ErrorMessages.LeaveAllowance.LEAVE_ALLOWANCE_NOT_FOUND });
        }

        let reductionAmount = 0

        if (leave_type === 1 || leave_type === "1") {
          if (leaveAllowance.total_days === 0 || leaveAllowance.total_days < numberOfDays) {
            if (!force_submit) {
              return res.status(401).json({ error: AppConstants.ErrorMessages.LeaveAllowance.JATAH_CUTI_TIDAK_CUKUP });
            }
          }
          reductionAmount = numberOfDays;
        }
    
        if (leaveType?.is_emergency === 1) {
          const leaveTypeTotalDays = leaveType.total_days ?? 0;
          const extraDay = numberOfDays - leaveTypeTotalDays;
          if (leaveAllowance.total_days < extraDay) {
            if (!force_submit) {
              return res.status(401).json({ error: AppConstants.ErrorMessages.LeaveAllowance.JATAH_CUTI_TIDAK_CUKUP });
            }
          }
          reductionAmount = extraDay;
        }

        const leaveSubmission = await LeaveSubmission.create({
          user_id: user_id,
          leave_type_id: leave_type,
          total_days: numberOfDays,
          reduction_amount: reductionAmount,
          start_date: start_date,
          end_date: end_date,
          emergency_call: emergency_call,
          description: description,
          created_at: new Date(),
          created_by: user_id,
          is_deleted: 0,
          attachment: attachment
        });
    
        return res.status(201).json({ message: AppConstants.ErrorMessages.Submission.SUBMISSIONS_CREATED_SUCCES });
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    createEmployeeSubmission: async (req: Request, res: Response) => {
      try {
        const userIdParams = req.params.id
        const user: any = await User.findByPk(userIdParams)
        if (!user) {
          return res.status(404).json({ error: AppConstants.ErrorMessages.User.USER_NOT_FOUND });
        }
        const userIdParamsInt = parseInt(req.params.id)

        const { start_date, end_date, leave_type, emergency_call, description, attachment, force_submit } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
    
        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
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
            if (dayOfWeek !== 0 && dayOfWeek !== 6 || currentDate.getDate() === 31) {
              totalDays++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }
    
          return totalDays;
        };
    
        const numberOfDays = calculateWorkingDays(startDate, endDate);
        const leaveType = await LeaveType.findOne({ where: { id: leave_type, is_deleted: 0 }})
        const leaveAllowance = await LeaveAllowance.findOne({ where: { user_id: userIdParams, is_deleted: 0 } });

        if (!leaveType) {
          return res.status(404).json({ error: AppConstants.ErrorMessages.LeaveType.NOT_FOUND });
        }

        if (!leaveAllowance) {
          return res.status(404).json({ error: AppConstants.ErrorMessages.LeaveAllowance.LEAVE_ALLOWANCE_NOT_FOUND });
        }

        if (leaveAllowance.total_days === null) {
          return res.status(404).json({ error: AppConstants.ErrorMessages.LeaveAllowance.LEAVE_ALLOWANCE_NOT_FOUND });
        }

        let reductionAmount = 0

        if (leave_type === 1 || leave_type === "1") {
          if (leaveAllowance.total_days === 0 || leaveAllowance.total_days < numberOfDays) {
            if (!force_submit) {
              return res.status(401).json({ error: AppConstants.ErrorMessages.LeaveAllowance.JATAH_CUTI_TIDAK_CUKUP });
            }
          }
          reductionAmount = numberOfDays;
        }
    
        if (leaveType?.is_emergency === 1) {
          const leaveTypeTotalDays = leaveType.total_days ?? 0;
          const extraDay = numberOfDays - leaveTypeTotalDays;
          if (leaveAllowance.total_days < extraDay) {
            if (!force_submit) {
              return res.status(401).json({ error: AppConstants.ErrorMessages.LeaveAllowance.JATAH_CUTI_TIDAK_CUKUP });
            }
          }
          reductionAmount = extraDay;
        }

        const leaveSubmission = await LeaveSubmission.create({
          user_id: userIdParamsInt,
          leave_type_id: leave_type,
          total_days: numberOfDays,
          reduction_amount: reductionAmount,
          start_date: start_date,
          end_date: end_date,
          emergency_call: emergency_call,
          description: description,
          created_at: new Date(),
          created_by: user_id,
          is_deleted: 0,
          attachment: attachment,
          status: 'Diterima'
        });

        
        await leaveAllowance.update({ total_days: leaveAllowance.total_days - reductionAmount })
    
        return res.status(201).json({ message: AppConstants.ErrorMessages.Submission.SUBMISSIONS_CREATED_SUCCES });
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },
    
    updateSubmission: async (req: Request, res: Response) => {
      try {
        const submissionId = req.params.id;
        const { start_date, end_date, leave_type, emergency_call, description, attachment, force_submit } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
    
        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
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
        const leaveType = await LeaveType.findOne({ where: { id: leave_type, is_deleted: 0 }})
        const leaveAllowance = await LeaveAllowance.findOne({ where: { user_id: user_id, is_deleted: 0 } });
    
        if (!leaveAllowance) {
          return res.status(404).json({ error: AppConstants.ErrorMessages.LeaveAllowance.LEAVE_ALLOWANCE_NOT_FOUND });
        }

        if (leaveAllowance.total_days === null) {
          return res.status(404).json({ error: AppConstants.ErrorMessages.LeaveAllowance.LEAVE_ALLOWANCE_NOT_FOUND });
        }

        let reductionAmount = 0
        if (leave_type === 1 || leave_type === "1") {
          if (leaveAllowance.total_days === null || leaveAllowance.total_days === 0 || leaveAllowance.total_days < numberOfDays) {
            if (!force_submit) {
              return res.status(401).json({ error: AppConstants.ErrorMessages.LeaveAllowance.JATAH_CUTI_TIDAK_CUKUP });
            }
          }
          reductionAmount = numberOfDays
        } 

        if (leaveType?.is_emergency === 1) {
          const leaveTypeTotalDays = leaveType.total_days ?? 0;
          const extraDay = numberOfDays - leaveTypeTotalDays;
          if (leaveAllowance.total_days < extraDay) {
            if (!force_submit) {
              return res.status(401).json({ error: AppConstants.ErrorMessages.LeaveAllowance.JATAH_CUTI_TIDAK_CUKUP });
            }
          }
          reductionAmount = extraDay
        }
        
        const [updateSubmission] = await LeaveSubmission.update({
            leave_type_id: leave_type,
            total_days: numberOfDays,
            reduction_amount: reductionAmount,
            start_date: start_date,
            end_date: end_date,
            emergency_call,
            description,
            updated_at: new Date(),
            updated_by: user_id,
            attachment: attachment
          },{ where: { id: submissionId, is_deleted: 0, status: AppConstants.Status.PENDING } }
        );
    
        if (updateSubmission === 0) {
          res.status(404).json({ error: AppConstants.ErrorMessages.Submission.SUBMISSION_NOT_FOUND });
        } else {
          res.status(200).json({ message: AppConstants.ErrorMessages.Submission.SUBMISSIONS_UPDATE_SUCCES });
          // res.status(200).json(submission);
        }
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    acceptSubmission: async (req: Request, res: Response) => {
      try {
        const submissionId = req.params.id;
        const reduction_amount = req.body.reduction_amount;
        const token = req.headers.authorization?.split(' ')[1];
    
        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
        }
    
        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const user_id = decoded.userId;
    
        const submission = await LeaveSubmission.findOne({ where: { id: submissionId, is_deleted: 0 } });
    
        if (!submission) {
          return res.status(404).json({ error: AppConstants.ErrorMessages.Submission.SUBMISSION_NOT_FOUND });
        }
    
        if (submission.status === AppConstants.Status.DITERIMA) {
          return res.status(200).json({ error: AppConstants.ErrorMessages.Submission.SUBMISSION_ALREADY_ACCEPTED });
        }
    
        if (submission.status === AppConstants.Status.DITOLAK) {
          return res.status(200).json({ error: AppConstants.ErrorMessages.Submission.SUBMISSION_ALREADY_REJECTED });
        }
    
        if (submission.status === AppConstants.Status.PENDING) {
          const leaveAllowances = await LeaveAllowance.findOne({ where: { user_id: submission.user_id, is_deleted: 0 } });
    
          if (!leaveAllowances) {
            return res.status(500).json({ error: AppConstants.ErrorMessages.LeaveAllowance.LEAVE_ALLOWANCE_NOT_FOUND });
          }
    
          let reductionAmount;
    
          if (submission.leave_type_id === 2) {
            const [updateSubmission] = await LeaveSubmission.update({
              reduction_amount: reduction_amount,
              status: 'Diterima',
              approver_user_id: user_id,
            }, { where: { id: submissionId, is_deleted: 0 } });
    
            if (updateSubmission === 0) {
              return res.status(404).json({ error: AppConstants.ErrorMessages.Submission.SUBMISSION_NOT_FOUND });
            }
    
            reductionAmount = reduction_amount;
          } else {
            const [updateSubmission] = await LeaveSubmission.update({
              status: 'Diterima',
              approver_user_id: user_id,
            }, { where: { id: submissionId, is_deleted: 0 } });
    
            if (updateSubmission === 0) {
              return res.status(404).json({ error: AppConstants.ErrorMessages.Submission.SUBMISSION_NOT_FOUND });
            }
    
            reductionAmount = submission.reduction_amount;
          }
    
          const userId = submission.user_id;
          const leaveAllowance = await LeaveAllowance.findOne({ where: { user_id: userId, is_deleted: 0 } });
    
          if (!leaveAllowance) {
            return res.status(500).json({ error: AppConstants.ErrorMessages.LeaveAllowance.LEAVE_ALLOWANCE_NOT_FOUND });
          }
    
          if (leaveAllowance.total_days === null) {
            return res.status(404).json({ error: AppConstants.ErrorMessages.LeaveAllowance.LEAVE_ALLOWANCE_NOT_FOUND });
          }
    
          await leaveAllowance.update({ total_days: leaveAllowance.total_days - reductionAmount });
    
          return res.status(200).json({ message: AppConstants.ErrorMessages.Submission.SUBMISSIONS_UPDATE_SUCCES });
        }
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        return res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },
    

    rejectSubmission: async (req: Request, res: Response) => {
      try {
        const submissionId = req.params.id
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
        }

        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const user_id = decoded.userId;

        const submission = await LeaveSubmission.findOne({ where: { id: submissionId, is_deleted: 0 } });

        if (!submission) {
          return res.status(404).json({ error: AppConstants.ErrorMessages.Submission.SUBMISSION_NOT_FOUND });
        } else if (submission.status === AppConstants.Status.DITERIMA) {
          return res.status(200).json({ error: AppConstants.ErrorMessages.Submission.SUBMISSION_ALREADY_ACCEPTED });
        } else if (submission.status === AppConstants.Status.DITOLAK) {
          return res.status(200).json({ error: AppConstants.ErrorMessages.Submission.SUBMISSION_ALREADY_REJECTED });
        } else if (submission.status === AppConstants.Status.PENDING) {

          const [updateSubmission] = await LeaveSubmission.update({
            status: 'Ditolak',
            approver_user_id: user_id,
          }, {where: { id: submissionId, is_deleted: 0 }})
  
          if (updateSubmission === 0) {
            res.status(404).json({ error: AppConstants.ErrorMessages.Submission.SUBMISSION_NOT_FOUND });
          } 
  
          res.status(200).json({ message: AppConstants.ErrorMessages.Submission.SUBMISSIONS_UPDATE_SUCCES });

        }
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    softDeleteSubmission: async (req: Request, res: Response) => {
      try {
        const submissionId = req.params.id;
  
        const token = req.headers.authorization?.split(' ')[1];
  
        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
        }
  
        const decoded = jwt.verify(token, 'your_secret_key') as { userId: number };
        const userIdLogin = decoded.userId;
  
        const softDeletedRowsCount = await LeaveSubmission.update({ 
          deleted_at: new Date(),
          deleted_by: userIdLogin,
          is_deleted: 1
        }, { where: { id: submissionId } });
    
        if (softDeletedRowsCount[0] === 0) {
          res.status(404).json({ error:AppConstants.ErrorMessages.Submission.SUBMISSION_NOT_FOUND });
        } else {
          res.status(200).json({ message: AppConstants.ErrorMessages.Submission.SUBMISSION_DELETE_SUCCES });
        }
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },



    uploadAttachment: async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: AppConstants.ErrorMessages.Attachment.NO_FILE });
        }
    
        return res.status(200).json({ filename: req.file.filename });
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
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
                return res.status(404).json({ error: AppConstants.ErrorMessages.Submission.SUBMISSION_NOT_FOUND });
            }
    
            // Jika ada file baru di-upload
            if (req.file) {
                // Dapatkan path file lama jika ada
                const oldFilePath = submission.attachment;
                
                if (!process.env.UPLOAD) {
                  return res.status(500).json({ error: AppConstants.ErrorMessages.Attachment.UPLOAD_DIRECTORY_NOT_DEFINED });
                }
                
                const filePath = path.join(__dirname, process.env.UPLOAD);
                // Hapus file lama jika ada
                if (oldFilePath) {
                    const oldFileFullPath = path.join(filePath , oldFilePath);
                    fs.unlink(oldFileFullPath, (err: any) => {
                        if (err) {
                            console.error(AppConstants.ErrorMessages.Attachment.ERROR_DELETING_FILE, err);
                        }
                    });
                }
    
                return res.status(200).json({ message: AppConstants.ErrorMessages.Attachment.UPDATE_SUCCES, filename: req.file.filename });
            } else {
                return res.status(400).json({ error: AppConstants.ErrorMessages.Attachment.NO_FILE});
            }
        } catch (error) {
          console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
          res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
        }
    },

    getAttachment: async (req: Request, res: Response) => {
        try {
            const { filename } = req.params;

            if (!process.env.UPLOAD) {
              return res.status(500).json({ error: AppConstants.ErrorMessages.Attachment.UPLOAD_DIRECTORY_NOT_DEFINED });
            }
            
            const filePath = path.join(__dirname, process.env.UPLOAD, filename);
      
            res.sendFile(filePath, (err) => {
              if (err) {
                console.error(AppConstants.ErrorMessages.Attachment.ERROR_SENDING_FILE, err);
                res.status(404).json({ error: AppConstants.ErrorMessages.Attachment.NOT_FOUND });
              }
            });
        } catch (error) {
          console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
          res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
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
          return res.status(400).json({ error: AppConstants.ErrorMessages.Other.INVALID_SORT });
        }
    
        const offset = (parsedPage - 1) * parsedLimit;

        const today = new Date();
        const formattedToday = format(today, 'yyyy-MM-dd');

        const options: FindOptions = {
          where: {
            is_deleted: 0,
            status: AppConstants.Status.DITERIMA,
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
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
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
        const token = req.headers.authorization?.split(' ')[1];
    
        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
        }
      
        const decoded = jwt.verify(token, 'your_secret_key') as { role: string };
         
        const role = decoded.role;
    
        const validSortBy = ['asc', 'desc'];
        const isValidSortBy = validSortBy.includes(sort_by);
        const isValidSortField = typeof sort_field === 'string' && sort_field !== '';
    
        if (!isValidSortBy || !isValidSortField) {
          return res.status(400).json({ error: AppConstants.ErrorMessages.Other.INVALID_SORT });
        }
    
        const offset = (parsedPage - 1) * parsedLimit;
    
        const options: FindOptions = {
          where: {
            is_deleted: 0,
            status: AppConstants.Status.PENDING,
          },
          limit: parsedLimit,
          offset: offset,
          order: [[sort_field, sort_by]],
          include: [
            {
              model: User,
              attributes: ['name', 'position', 'department', 'telephone', 'role'],
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

        if (role === AppConstants.Role.HR) {
              // Menambahkan kondisi where pada include User
              if (Array.isArray(options.include)) {
                  const userInclude = options.include.find(
                      (include): include is Includeable & { model: typeof User, where?: any } =>
                          typeof include === 'object' && 'model' in include && include.model === User
                  );

                  if (userInclude) {
                      userInclude.where = {
                          ...userInclude.where,
                          role: { [Op.ne]: AppConstants.Role.HR }
                      };
                  }
              }
          
        }
    
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
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    cutiDiterima: async (req: Request, res: Response) => {
      try {
        const { page, limit } = req.query;
        const sort_by = req.query.sort_by as string || 'asc';
        const sort_field = req.query.sort_field as string || 'id';
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
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
          return res.status(400).json({ error: AppConstants.ErrorMessages.Other.INVALID_SORT });
        }
    
        const offset = (parsedPage - 1) * parsedLimit;
    
        const options: FindOptions = {
          where: {
            is_deleted: 0,
            status: AppConstants.Status.DITERIMA,
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
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    cutiDitolak: async (req: Request, res: Response) => { 
      try {
        const { page, limit } = req.query;
        const sort_by = req.query.sort_by as string || 'asc';
        const sort_field = req.query.sort_field as string || 'id';
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
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
          return res.status(400).json({ error: AppConstants.ErrorMessages.Other.INVALID_SORT });
        }
    
        const offset = (parsedPage - 1) * parsedLimit;
    
        const options: FindOptions = {
          where: {
            is_deleted: 0,
            status: AppConstants.Status.DITOLAK,
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
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },


    getLeaveStats: async (req: Request, res: Response) => {
      try {
        const { month, year } = req.query;

        if (typeof month !== 'string' || !year) {
          return res.status(400).json({ error: AppConstants.ErrorMessages.Submission.INVALID_MONTH_OR_YEAR });
        }

        const token = req.headers.authorization?.split(' ')[1];
    
        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
        }
    
        // Verifikasi token dan ekstrak payload
        const decoded = jwt.verify(token, 'your_secret_key') as { role: string };
        const role = decoded.role;
    
        // if (role !== 'hr') {
        //   return res.status(403).json({ error: 'Access denied' });
        // }
    
        // Validasi bulan dan tahun
        let startDate, endDate;
        let startLeaveDate, endLeaveDate;
        if (parseInt(month) === 0) {
          startDate = new Date(`${year}-01-01`);
          endDate = new Date(`${year}-12-31`);

          startLeaveDate = new Date(`${year}-01-01`);
          endLeaveDate = new Date(`${year}-12-31`);
        } else {
          startDate = new Date(`${year}-${month}-01`);
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);

          startLeaveDate = new Date(`${year}-01-01`);
          endLeaveDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
        }
    
        const leaveStats = await User.findAll({
          attributes: [
            'id',
            'name',
            'join_date',
            [Sequelize.literal(`(
              SELECT COUNT(*)
              FROM leave_submissions AS b
              WHERE b.is_deleted = 0
              AND b.start_date BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
              AND b.user_id = User.id
            )`), 'total_cuti'],
            [Sequelize.literal(`(
              SELECT COUNT(*)
              FROM leave_submissions AS b
              WHERE b.is_deleted = 0
              AND b.status = 'diterima'
              AND b.start_date BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
              AND b.user_id = User.id
            )`), 'cuti_diterima'],
            [Sequelize.literal(`(
              SELECT COUNT(*)
              FROM leave_submissions AS b
              WHERE b.is_deleted = 0
              AND b.status = 'ditolak'
              AND b.start_date BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
              AND b.user_id = User.id
            )`), 'cuti_ditolak'],
            [Sequelize.literal(`(
              SELECT COUNT(*)
              FROM leave_submissions AS b
              WHERE b.is_deleted = 0
              AND b.status = 'pending'
              AND b.start_date BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
              AND b.user_id = User.id
            )`), 'cuti_pending'],
            [Sequelize.literal(`(
              SELECT SUM(b.reduction_amount)
              FROM leave_submissions AS b
              WHERE b.is_deleted = 0
              AND b.status = 'diterima'
              AND b.start_date BETWEEN '${startLeaveDate.toISOString()}' AND '${endLeaveDate.toISOString()}'   
              AND b.user_id = User.id
            )`), 'jumlah_hari_cuti'],
            [Sequelize.literal(`(
              SELECT SUM(c.total_days_copy)
              FROM leave_allowance AS c
              WHERE c.is_deleted = 0 
              AND c.user_id = User.id
            )`), 'sisa_cuti'],
          ],
          where: {
            role: {
                [Op.ne]: 'owner'
            },
          },
        });
        
    
        const formattedStats = leaveStats.map((stat: any) => {
          const jumlahHariCuti = stat.get("jumlah_hari_cuti");
          const hitunganSisaCuti = stat.get("sisa_cuti")
          const jumlahHariCutInt = jumlahHariCuti ? parseInt(jumlahHariCuti, 10) : 0;
          const hitunganSisaCutiInt = hitunganSisaCuti ? parseInt(hitunganSisaCuti, 10) : 0;

          const sisaCuti = hitunganSisaCutiInt - jumlahHariCutInt
        
          return {
            id: stat.id,
            name: stat.name,
            joinDate: stat.join_date,
            totalCuti: stat.get('total_cuti'),
            cutiDiterima: stat.get('cuti_diterima'),
            cutiDitolak: stat.get('cuti_ditolak'),
            cutiPending: stat.get('cuti_pending'),
            jumlahHariCuti: jumlahHariCutInt,
            sisaCuti: sisaCuti,
          };
        });
    
        res.status(200).json({
          month,
          year,
          stats: formattedStats,
        });
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    },

    downloadLeaveStats: async (req: Request, res: Response) => {
      try {
        const { month, year } = req.query;
    
        if (typeof month !== 'string' || !year) {
          return res.status(400).json({ error: AppConstants.ErrorMessages.Submission.INVALID_MONTH_OR_YEAR });
        }
    
        const token = req.headers.authorization?.split(' ')[1];
    
        if (!token) {
          return res.status(401).json({ error: AppConstants.ErrorMessages.Other.NO_TOKEN });
        }
    
        const decoded = jwt.verify(token, 'your_secret_key') as { role: string };
        const role = decoded.role;
    
        let filename
        let startDate, endDate;
        let startLeaveDate, endLeaveDate;
        if (parseInt(month) === 0) {
          startDate = new Date(`${year}-01-01`);
          endDate = new Date(`${year}-12-31`);

          startLeaveDate = new Date(`${year}-01-01`);
          endLeaveDate = new Date(`${year}-12-31`);

          filename = year
        } else {
          startDate = new Date(`${year}-${month}-01`);
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);

          startLeaveDate = new Date(`${year}-01-01`);
          endLeaveDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);

          filename = `${month}_${year}`
        }
    
        const leaveStats = await User.findAll({
          attributes: [
            'id',
            'name',
            'join_date',
            [Sequelize.literal(`(
              SELECT COUNT(*)
              FROM leave_submissions AS b
              WHERE b.is_deleted = 0
              AND b.start_date BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
              AND b.user_id = User.id
            )`), 'total_cuti'],
            [Sequelize.literal(`(
              SELECT COUNT(*)
              FROM leave_submissions AS b
              WHERE b.is_deleted = 0
              AND b.status = 'diterima'
              AND b.start_date BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
              AND b.user_id = User.id
            )`), 'cuti_diterima'],
            [Sequelize.literal(`(
              SELECT COUNT(*)
              FROM leave_submissions AS b
              WHERE b.is_deleted = 0
              AND b.status = 'ditolak'
              AND b.start_date BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
              AND b.user_id = User.id
            )`), 'cuti_ditolak'],
            [Sequelize.literal(`(
              SELECT COUNT(*)
              FROM leave_submissions AS b
              WHERE b.is_deleted = 0
              AND b.status = 'pending'
              AND b.start_date BETWEEN '${startDate.toISOString()}' AND '${endDate.toISOString()}'
              AND b.user_id = User.id
            )`), 'cuti_pending'],
            [Sequelize.literal(`(
              SELECT SUM(b.reduction_amount)
              FROM leave_submissions AS b
              WHERE b.is_deleted = 0
              AND b.status = 'diterima'
              AND b.start_date BETWEEN '${startLeaveDate.toISOString()}' AND '${endLeaveDate.toISOString()}'
              AND b.user_id = User.id
            )`), 'jumlah_hari_cuti'],
            [Sequelize.literal(`(
              SELECT SUM(c.total_days_copy)
              FROM leave_allowance AS c
              WHERE c.is_deleted = 0
              AND c.user_id = User.id
            )`), 'sisa_cuti'],
          ],
          where: {
            role: {
              [Op.ne]: 'owner'
            },
          },
        });
    
        const formattedStats = leaveStats.map((stat: any) => {
          const jumlahHariCuti = stat.get("jumlah_hari_cuti");
          const hitunganSisaCuti = stat.get("sisa_cuti");
          const jumlahHariCutInt = jumlahHariCuti ? parseInt(jumlahHariCuti, 10) : 0;
          const hitunganSisaCutiInt = hitunganSisaCuti ? parseInt(hitunganSisaCuti, 10) : 0;
    
          const sisaCuti = hitunganSisaCutiInt - jumlahHariCutInt;
    
          return {
            "Nama": stat.name,
            "Total Cuti": stat.get('total_cuti'),
            "Cuti Diterima": stat.get('cuti_diterima'),
            "Cuti Ditolak": stat.get('cuti_ditolak'),
            "Cuti Pending": stat.get('cuti_pending'),
            "Sisa Cuti": sisaCuti,
          };
        });
    
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(formattedStats);
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'LeaveStats');

        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
    
        res.setHeader('Content-Disposition', `attachment; filename=histori_pengajuan_cuti_${filename}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
      } catch (error) {
        console.error(AppConstants.ErrorMessages.Other.ERROR_DETAIL, error);
        res.status(500).json({ error: AppConstants.ErrorMessages.Other.INTERNAL_SERVER_ERROR });
      }
    }

} 

export default leaveSubmissionController