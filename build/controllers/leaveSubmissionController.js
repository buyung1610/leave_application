"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const leaveSubmissionModel_1 = __importDefault(require("../db/models/leaveSubmissionModel"));
const leaveAllowanceModel_1 = __importDefault(require("../db/models/leaveAllowanceModel"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_validator_1 = require("express-validator");
const sequelize_1 = require("sequelize");
const userModel_1 = __importDefault(require("../db/models/userModel"));
const leaveTypeModel_1 = __importDefault(require("../db/models/leaveTypeModel"));
const date_fns_1 = require("date-fns");
const leaveSubmissionController = {
    getAllSubmission: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const { page, limit, status, leave_type_id, user_id } = req.query;
            const sort_by = req.query.sort_by || 'asc';
            const sort_field = req.query.sort_field || 'id';
            const submissionCount = yield leaveSubmissionModel_1.default.findAndCountAll();
            const parsedPage = parseInt(page) || 1;
            const parsedLimit = parseInt(limit) || submissionCount.count;
            const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            // Verifikasi token dan ekstrak payload
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            // Mendapatkan position dari payload token
            const role = decoded.role;
            // Validasi sort_by dan sort_field
            const validSortBy = ['asc', 'desc'];
            const isValidSortBy = validSortBy.includes(sort_by);
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
            const options = {
                where: {
                    is_deleted: 0
                },
                limit: parsedLimit,
                offset: offset,
                order: [[sort_field, sort_by]],
                include: [
                    {
                        model: userModel_1.default,
                        attributes: ['name', 'position', 'department', 'telephone']
                    },
                    {
                        model: leaveTypeModel_1.default,
                        attributes: ['type']
                    },
                    {
                        model: leaveAllowanceModel_1.default,
                        attributes: ['total_days']
                    },
                    {
                        model: userModel_1.default,
                        as: 'Approver',
                        attributes: ['name'],
                    },
                ]
            };
            // Menambahkan kondisi where berdasarkan status jika status tersedia
            if (status && typeof status === 'string') {
                // Memisahkan nilai status yang dipisahkan oleh koma menjadi array
                const statusArray = status.split(',');
                // Menggunakan operator "in" untuk mencocokkan status dengan nilai dalam array
                options.where = { status: { [sequelize_1.Op.in]: statusArray } };
            }
            if (leave_type_id && typeof leave_type_id === 'string') {
                const leaveTypeArray = leave_type_id.split(',');
                options.where = { leave_type_id: { [sequelize_1.Op.in]: leaveTypeArray } };
            }
            if (role === 'hr') {
                if (user_id && typeof user_id === 'string') {
                    const userIdArray = user_id.split(',');
                    options.where = { user_id: { [sequelize_1.Op.in]: userIdArray } };
                }
            }
            // Mengambil semua data LeaveSubmission sesuai dengan pengaturan options
            const { rows, count } = yield leaveSubmissionModel_1.default.findAndCountAll(options);
            // const submission = await LeaveSubmission.findAndCountAll(options);
            // Membuat array baru hanya dengan nilai-nilai yang diinginkan
            const submissions = rows.map((submission) => {
                // Mengonversi tanggal ke string ISO 8601 dan mengambil bagian tanggal saja
                // const formattedDate = submission.created_at ? new Date (submission.created_at).toISOString().slice(0, 10) : null;
                const formattedDate = submission.created_at ? (0, date_fns_1.format)(new Date(submission.created_at), 'yyyy-MM-dd') : null;
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
        }
        catch (error) {
            // Menangani kesalahan jika terjadi
            console.error('Error while fetching submissions:', error);
            res.status(500).json({ error: 'Unable to fetch submissions' });
        }
    }),
    getSubmissionById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const submissionId = req.params.id;
            // Membuat objek pengaturan untuk pengambilan data berdasarkan ID
            const options = {
                where: {
                    id: submissionId,
                    is_deleted: 0
                },
                include: [
                    {
                        model: userModel_1.default,
                        attributes: ['name', 'position', 'department', 'telephone'],
                    },
                    {
                        model: leaveTypeModel_1.default,
                        attributes: ['type'],
                    },
                    {
                        model: leaveAllowanceModel_1.default,
                        attributes: ['total_days'],
                    },
                    {
                        model: userModel_1.default,
                        as: 'Approver',
                        attributes: ['name'],
                    },
                ],
            };
            const submission = yield leaveSubmissionModel_1.default.findOne(options);
            if (submission) {
                // Membuat objek respons dengan struktur yang diinginkan
                const formattedSubmission = {
                    id: submission.id,
                    name: submission.User ? submission.User.name : null,
                    submissionDate: submission.created_at ? (0, date_fns_1.format)(new Date(submission.created_at), 'yyyy-MM-dd') : null,
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
            }
            else {
                res.status(404).json({ error: 'Submission not found' });
            }
        }
        catch (error) {
            console.error('Error while fetching submission by id:', error);
            res.status(500).json({ error: 'Unable to fetch submission' });
        }
    }),
    getSubmissionLogin: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _b;
        try {
            const { page, limit, status } = req.query;
            const sort_by = req.query.sort_by || 'asc';
            const sort_field = req.query.sort_field || 'id';
            const token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const user_id = decoded.userId;
            const submisssionCount = yield leaveSubmissionModel_1.default.findAndCountAll({ where: { user_id: user_id, is_deleted: 0 } });
            const parsedPage = parseInt(page) || 1;
            const parsedLimit = parseInt(limit) || submisssionCount.count;
            // Validasi sort_by dan sort_field
            const validSortBy = ['asc', 'desc'];
            const isValidSortBy = validSortBy.includes(sort_by);
            const isValidSortField = typeof sort_field === 'string' && sort_field !== '';
            if (!isValidSortBy || !isValidSortField) {
                return res.status(400).json({ error: 'Invalid sort_by or sort_field' });
            }
            const offset = (parsedPage - 1) * parsedLimit;
            const options = {
                where: {
                    user_id: user_id,
                    is_deleted: 0
                },
                limit: parsedLimit,
                offset: offset,
                order: [[sort_field, sort_by]],
                include: [
                    {
                        model: userModel_1.default,
                        attributes: ['name', 'position', 'department', 'telephone'],
                    },
                    {
                        model: leaveTypeModel_1.default,
                        attributes: ['type'],
                    },
                    {
                        model: leaveAllowanceModel_1.default,
                        attributes: ['total_days'],
                    },
                    {
                        model: userModel_1.default,
                        as: 'Approver',
                        attributes: ['name'],
                    },
                ],
            };
            if (status && typeof status === 'string') {
                // Memisahkan nilai status yang dipisahkan oleh koma menjadi array
                const statusArray = status.split(',');
                // Menggunakan operator "in" untuk mencocokkan status dengan nilai dalam array
                options.where = { status: { [sequelize_1.Op.in]: statusArray } };
            }
            const submissions = yield leaveSubmissionModel_1.default.findAll(options);
            if (submissions.length > 0) {
                // Membuat array untuk menyimpan hasil pengolahan
                const { rows, count } = yield leaveSubmissionModel_1.default.findAndCountAll(options);
                const submissions = rows.map((submission) => {
                    // Mengonversi tanggal ke string ISO 8601 dan mengambil bagian tanggal saja
                    // const formattedDate = submission.created_at ? new Date (submission.created_at).toISOString().slice(0, 10) : null;
                    const formattedDate = submission.created_at ? (0, date_fns_1.format)(new Date(submission.created_at), 'yyyy-MM-dd') : null;
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
            }
            else {
                res.status(404).json({ error: 'Submissions not found' });
            }
        }
        catch (error) {
            console.error('Error while fetching submissions:', error);
            res.status(500).json({ error: 'Unable to fetch submissions' });
        }
    }),
    createSubmission: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _c;
        try {
            const { start_date, end_date, leave_type, emergency_call, description, attachment } = req.body;
            const token = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const user_id = decoded.userId;
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);
            const calculateWorkingDays = (start, end) => {
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
                const leaveAllowance = yield leaveAllowanceModel_1.default.findOne({ where: { user_id: user_id, is_deleted: 0 } });
                if (!leaveAllowance || leaveAllowance.total_days === 0) {
                    return res.status(401).json({ error: 'Jatah cuti tidak cukup' });
                }
            }
            // if (leave_type === 2 && numberOfDays > 1 && (!attachment || attachment.trim() === "")) {
            //   return res.status(400).json({ error: 'Attachment is required' });
            // }
            const leaveSubmission = yield leaveSubmissionModel_1.default.create({
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
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Unable to create leave submission' });
        }
    }),
    updateSubmission: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _d;
        try {
            const submissionId = req.params.id;
            const { start_date, end_date, leave_type, emergency_call, description } = req.body;
            const token = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const user_id = decoded.userId;
            const startDate = new Date(start_date);
            const endDate = new Date(end_date);
            const calculateWorkingDays = (start, end) => {
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
                const leaveAllowance = yield leaveAllowanceModel_1.default.findOne({ where: { user_id: user_id, is_deleted: 0 } });
                if (!leaveAllowance || leaveAllowance.total_days === 0) {
                    return res.status(401).json({ error: 'Jatah cuti tidak cukup' });
                }
            }
            const [updateSubmission] = yield leaveSubmissionModel_1.default.update({
                leave_type_id: leave_type,
                total_days: numberOfDays,
                start_date: start_date,
                end_date: end_date,
                emergency_call,
                description,
                updated_at: new Date(),
                updated_by: user_id
            }, { where: { id: submissionId, is_deleted: 0 } });
            if (updateSubmission === 0) {
                res.status(404).json({ error: 'Submission not found' });
            }
            else {
                res.status(200).json({ message: 'Submission data updated successfully' });
                // res.status(200).json(submission);
            }
        }
        catch (error) {
            console.error('Error while updating submission data:', error);
            res.status(500).json({ error: 'Unable to update submission data' });
        }
    }),
    acceptSubmission: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _e, _f;
        try {
            const submissionId = req.params.id;
            const token = (_e = req.headers.authorization) === null || _e === void 0 ? void 0 : _e.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const user_id = decoded.userId;
            const submission = yield leaveSubmissionModel_1.default.findOne({ where: { id: submissionId, is_deleted: 0 } });
            if (!submission) {
                return res.status(404).json({ error: 'Submission not found' });
            }
            else if (submission.status === 'Diterima') {
                return res.status(200).json({ error: 'Submission has already been accepted' });
            }
            else if (submission.status === 'Ditolak') {
                return res.status(200).json({ error: 'Submission has already been rejected' });
            }
            else if (submission.status === 'Pending') {
                const leaveAllowances = yield leaveAllowanceModel_1.default.findOne({ where: { user_id: submission.user_id, is_deleted: 0 } });
                if (!leaveAllowances) {
                    return res.status(500).json({ error: 'Leave allowance not found' });
                }
                const [updateSubmission] = yield leaveSubmissionModel_1.default.update({
                    status: 'Diterima',
                    approver_user_id: user_id,
                    // updatedAt: new Date(),
                    updated_by: user_id
                }, { where: { id: submissionId, is_deleted: 0 } });
                if (updateSubmission === 0) {
                    res.status(404).json({ error: 'Submission not found' });
                }
                if (submission.leave_type_id === 1) {
                    const userId = submission.user_id;
                    // Kurangi jatah cuti di leave_allowance
                    const leaveAllowance = yield leaveAllowanceModel_1.default.findOne({ where: { user_id: userId, is_deleted: 0 } });
                    if (!leaveAllowance) {
                        res.status(500).json({ error: 'Leave allowance not found' });
                        return;
                    }
                    yield leaveAllowance.update({ total_days: ((_f = leaveAllowance.total_days) !== null && _f !== void 0 ? _f : 0) - submission.total_days });
                }
                res.status(200).json({ message: 'User updated successfully' });
            }
        }
        catch (error) {
            console.error('Error while updating submission data:', error);
            res.status(500).json({ error: 'Unable to update submission data' });
        }
    }),
    rejectSubmission: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _g;
        try {
            const submissionId = req.params.id;
            const token = (_g = req.headers.authorization) === null || _g === void 0 ? void 0 : _g.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const user_id = decoded.userId;
            const submission = yield leaveSubmissionModel_1.default.findOne({ where: { id: submissionId, is_deleted: 0 } });
            if (!submission) {
                return res.status(404).json({ error: 'Submission not found' });
            }
            else if (submission.status === 'Diterima') {
                return res.status(200).json({ error: 'Submission has already been accepted' });
            }
            else if (submission.status === 'Ditolak') {
                return res.status(200).json({ error: 'Submission has already been rejected' });
            }
            else if (submission.status === 'Pending') {
                const [updateSubmission] = yield leaveSubmissionModel_1.default.update({
                    status: 'Ditolak',
                    approver_user_id: user_id,
                    // updated_at: new Date(),
                    updated_by: user_id
                }, { where: { id: submissionId, is_deleted: 0 } });
                if (updateSubmission === 0) {
                    res.status(404).json({ error: 'Submission not found' });
                }
                res.status(200).json({ message: 'User updated successfully' });
            }
        }
        catch (error) {
            console.error('Error while updating submission data:', error);
            res.status(500).json({ error: 'Unable to update submission data' });
        }
    }),
    softDeleteSubmission: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _h;
        try {
            const submissionId = req.params.id;
            const token = (_h = req.headers.authorization) === null || _h === void 0 ? void 0 : _h.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const userIdLogin = decoded.userId;
            const softDeletedRowsCount = yield leaveSubmissionModel_1.default.update({
                deleted_at: new Date(),
                deleted_by: userIdLogin,
                is_deleted: 1
            }, { where: { id: submissionId } });
            if (softDeletedRowsCount[0] === 0) {
                res.status(404).json({ error: 'User not found' });
            }
            else {
                res.status(200).json({ message: 'User deleted successfully' });
            }
        }
        catch (error) {
            console.error('Error while deleting user:', error);
            res.status(500).json({ error: 'Unable to delete user' });
        }
    }),
    uploadAttachment: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            return res.status(200).json({ filename: req.file.filename });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Failed to upload file' });
        }
    })
};
exports.default = leaveSubmissionController;
