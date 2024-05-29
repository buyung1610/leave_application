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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const userModel_1 = __importDefault(require("../db/models/userModel"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const leaveAllowanceModel_1 = __importDefault(require("../db/models/leaveAllowanceModel"));
const express_validator_1 = require("express-validator");
const date_fns_1 = require("date-fns");
const userController = {
    getAllUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { page, limit } = req.query;
            const sort_by = req.query.sort_by || 'asc';
            const sort_field = req.query.sort_field || "id";
            console.log(sort_field);
            const user = yield userModel_1.default.findAndCountAll();
            const parsedPage = parseInt(page) || 1;
            const parsedLimit = parseInt(limit) || user.count;
            // Validasi sort_by dan sort_field
            const validSortBy = ['asc', 'desc'];
            const isValidSortBy = validSortBy.includes(sort_by);
            const isValidSortField = typeof sort_field === 'string' && sort_field !== ''; // Memastikan sort_field ada dan tidak kosong
            if (!isValidSortBy || !isValidSortField) {
                return res.status(400).json({ error: 'Invalid sort_by or sort_field' });
            }
            const offset = (parsedPage - 1) * parsedLimit;
            let order = [];
            if (isValidSortField) {
                if (sort_field === 'total_days') {
                    // Jika sort_field adalah 'total_days', order akan diganti
                    order = [[{ model: leaveAllowanceModel_1.default, as: 'leaveAllowance' }, sort_field, sort_by]];
                }
                else {
                    // Jika sort_field bukan 'total_days', gunakan sort_field yang diberikan pengguna
                    order = [[sort_field, sort_by]];
                }
            }
            const users = yield userModel_1.default.findAndCountAll({
                where: {
                    is_deleted: 0
                },
                limit: parsedLimit,
                offset: offset,
                order: order,
                include: [
                    {
                        model: leaveAllowanceModel_1.default,
                        as: 'leaveAllowance',
                        attributes: ['total_days']
                    }
                ],
                raw: true
            });
            const modifiedUsers = users.rows.map((user) => {
                // Buat salinan objek user tanpa properti leaveAllowance.total_days
                const { 'leaveAllowance.total_days': total_days } = user, userWithoutLeaveAllowance = __rest(user, ['leaveAllowance.total_days']);
                // Format created_at dan updated_at menggunakan date-fns
                const formattedCreatedAt = user.created_at ? (0, date_fns_1.format)(new Date(user.created_at), 'yyyy-MM-dd HH:mm:ss') : null;
                const formattedUpdatedAt = user.updated_at ? (0, date_fns_1.format)(new Date(user.updated_at), 'yyyy-MM-dd HH:mm:ss') : null;
                return Object.assign(Object.assign({}, userWithoutLeaveAllowance), { total_days: total_days, created_at: formattedCreatedAt, updated_at: formattedUpdatedAt // Tambahkan formatted updated_at
                 });
            });
            const totalPages = Math.ceil(users.count / parsedLimit);
            res.status(200).json({
                count: user.count,
                users: modifiedUsers,
                currentPage: parsedPage,
                totalPages: totalPages
            });
        }
        catch (error) {
            console.error('Error while fetching users:', error);
            res.status(500).json({ error: 'Unable to fetch users' });
        }
    }),
    // Method untuk membuat pengguna baru
    createUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const { name, email, role, position, department, telephone, join_date, gender } = req.body;
            const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const user_id = decoded.userId;
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }
            // Mengecek apakah email sudah ada di dalam database
            const existingUser = yield userModel_1.default.findOne({ where: { email: email } });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            // Hash password menggunakan bcrypt
            const hashedPassword = yield bcrypt_1.default.hash('1234', 10);
            // Membuat pengguna baru dengan password yang di-hash
            const newUser = yield userModel_1.default.create({
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
            }
            else if (diffMonths >= 60) {
                leaveAllowance = 16;
            }
            else if (diffMonths >= 48) {
                leaveAllowance = 15;
            }
            else if (diffMonths >= 36) {
                leaveAllowance = 14;
            }
            else if (diffMonths >= 24) {
                leaveAllowance = 13;
            }
            else if (diffMonths >= 12) {
                leaveAllowance = 12;
            }
            else {
                leaveAllowance = 0;
            }
            // Membuat data jatah cuti untuk pengguna baru
            const newLeaveAllowance = yield leaveAllowanceModel_1.default.create({
                user_id: newUser.id, // Menggunakan ID pengguna yang baru dibuat
                total_days: leaveAllowance,
                created_at: new Date(),
                created_by: user_id,
                is_deleted: 0
            });
            res.status(201).json({ message: 'User created successfully', user: newUser });
        }
        catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }),
    getUserById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.params.id;
            // Retrieve user data by ID, including associated LeaveAllowance
            const user = yield userModel_1.default.findByPk(userId, {
                include: {
                    model: leaveAllowanceModel_1.default,
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
            const { 'leaveAllowance.total_days': totalDays } = user, userWithoutLeaveance = __rest(user, ['leaveAllowance.total_days']);
            // Construct the response object
            const response = Object.assign(Object.assign({}, userWithoutLeaveance), { // Include all user properties except leaveAllowance
                total_days // Include total_days directly
             });
            // Send the response
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error while fetching user by id:', error);
            res.status(500).json({ error: 'Unable to fetch user' });
        }
    }),
    updateUserData: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _b;
        try {
            const userIdParams = req.params.id;
            const { name, email, position, department, telephone, join_date, gender, role } = req.body;
            const token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const user_id = decoded.userId;
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }
            const user = yield userModel_1.default.findByPk(userIdParams);
            if (!user || user.is_deleted === 1) {
                return res.status(404).json({ error: 'User not found' });
            }
            const [updatedRowsCount] = yield userModel_1.default.update({
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
            }, { where: { id: userIdParams } });
            if (updatedRowsCount === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            // Hitung jatah cuti berdasarkan perbedaan bulan antara join_date dan tanggal saat ini
            const joinDate = new Date(join_date); // Konversi join_date ke objek Date
            const currentDate = new Date();
            const diffYears = currentDate.getFullYear() - joinDate.getFullYear();
            const diffMonths = diffYears * 12 + (currentDate.getMonth() - joinDate.getMonth());
            let leaveAllowance = 0;
            if (diffMonths >= 72) {
                leaveAllowance = 17;
            }
            else if (diffMonths >= 60) {
                leaveAllowance = 16;
            }
            else if (diffMonths >= 48) {
                leaveAllowance = 15;
            }
            else if (diffMonths >= 36) {
                leaveAllowance = 14;
            }
            else if (diffMonths >= 24) {
                leaveAllowance = 13;
            }
            else if (diffMonths >= 12) {
                leaveAllowance = 12;
            }
            else {
                leaveAllowance = 0;
            }
            // Simpan data jatah cuti untuk pengguna yang diperbarui
            const newLeaveAllowance = yield leaveAllowanceModel_1.default.update({
                total_days: leaveAllowance,
                updated_at: new Date(),
                updated_by: user_id,
            }, { where: { id: userIdParams } });
            res.status(200).json({ message: 'User data updated successfully' });
        }
        catch (error) {
            console.error('Error while updating user data:', error);
            res.status(500).json({ error: 'Unable to update user data' });
        }
    }),
    deleteUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const userId = req.params.id;
            const deletedLeaveAllowance = yield leaveAllowanceModel_1.default.destroy({ where: { user_id: userId } });
            const deletedUpdate = yield userModel_1.default.update({
                updated_by: null,
                created_by: null
            }, { where: { id: userId } });
            const deletedRowsCount = yield userModel_1.default.destroy({ where: { id: userId } });
            if (deletedRowsCount === 0) {
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
    softDeleteUser: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _c;
        try {
            const userId = req.params.id;
            const token = (_c = req.headers.authorization) === null || _c === void 0 ? void 0 : _c.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const userIdLogin = decoded.userId;
            const softDeletedLeaveAllowanceRowsCount = yield leaveAllowanceModel_1.default.update({
                deleted_at: new Date(),
                deleted_by: userIdLogin,
                is_deleted: 1
            }, { where: { id: userId } });
            const softDeletedRowsCount = yield userModel_1.default.update({
                deleted_at: new Date(),
                deleted_by: userIdLogin,
                is_deleted: 1
            }, { where: { id: userId } });
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
    getUserProfil: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _d;
        try {
            const token = (_d = req.headers.authorization) === null || _d === void 0 ? void 0 : _d.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const user_id = decoded.userId;
            // Temukan pengguna berdasarkan ID yang didekodekan dari token
            const user = yield userModel_1.default.findByPk(user_id, {
                include: {
                    model: leaveAllowanceModel_1.default,
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
            const { 'leaveAllowance.total_days': totalDays } = user, userWithoutLeaveance = __rest(user, ['leaveAllowance.total_days']);
            // Construct the response object
            const response = Object.assign(Object.assign({}, userWithoutLeaveance), { // Include all user properties except leaveAllowance
                total_days // Include total_days directly
             });
            // Send the response
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error verifying token:', error);
            return res.status(401).json({ error: 'Invalid token' });
        }
    }),
    updateProfil: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _e;
        try {
            const { name, email, telephone, } = req.body;
            const token = (_e = req.headers.authorization) === null || _e === void 0 ? void 0 : _e.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const user_id = decoded.userId;
            const errors = (0, express_validator_1.validationResult)(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ errors: errors.array() });
                return;
            }
            const user = yield userModel_1.default.findByPk(user_id);
            // If user not found
            if (!user || user.is_deleted === 1) {
                return res.status(404).json({ error: 'User not found' });
            }
            // Update data pengguna
            const [updatedRowsCount] = yield userModel_1.default.update({
                name,
                email,
                telephone,
                updated_at: new Date(),
                updated_by: user_id,
            }, { where: { id: user_id } } // Pindahkan where ke opsi update
            );
            if (updatedRowsCount === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            // Hitung jatah cuti berdasarkan perbedaan bulan antara join_date dan tanggal saat ini
            // Perbarui data jatah cuti untuk pengguna yang diperbarui
            res.status(200).json({ message: 'User data updated successfully' });
        }
        catch (error) {
            console.error('Error while updating user data:', error);
            res.status(500).json({ error: 'Unable to update user data' });
        }
    }),
};
exports.default = userController;
