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
const leaveTypeModel_1 = __importDefault(require("../db/models/leaveTypeModel"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const leaveTypeController = {
    getAll: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            let whereClause = {}; // Inisialisasi klausa where untuk query findAll
            // Periksa apakah query parameter is_emergency ada dalam req.query
            if (req.query.is_emergency !== undefined) {
                const is_emergency = req.query.is_emergency;
                whereClause.is_emergency = is_emergency; // Konversi nilai string menjadi boolean
            }
            const types = yield leaveTypeModel_1.default.findAll({ where: whereClause });
            res.status(200).json(types);
        }
        catch (error) {
            // Menangani kesalahan jika terjadi
            console.error('Error while fetching users:', error);
            res.status(500).json({ error: 'Unable to fetch users' });
        }
    }),
    createLeaveType: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const { type, is_emergency } = req.body;
            const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const user_id = decoded.userId;
            const leaveType = yield leaveTypeModel_1.default.create({
                type,
                is_emergency,
                created_at: new Date(),
                created_by: user_id
            });
            res.status(201).json({ message: 'leave type created successfully' });
        }
        catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }),
    updateLeaveType: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _b;
        try {
            const leaveTypeId = req.params;
            const { type, is_emergency } = req.body;
            const token = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(' ')[1];
            if (!token) {
                return res.status(401).json({ error: 'No token provided' });
            }
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            const user_id = decoded.userId;
            // Lakukan update data pengguna
            const [updatedRowsCount] = yield leaveTypeModel_1.default.update({
                type,
                is_emergency,
                updated_at: new Date(),
                updated_by: user_id
            }, { where: { id: leaveTypeId } });
            if (updatedRowsCount === 0) {
                res.status(404).json({ error: 'Leave type not found' });
            }
            else {
                res.status(200).json({ message: 'Leave type data updated successfully' });
            }
        }
        catch (error) {
            console.error('Error while updating leave type :', error);
            res.status(500).json({ error: 'Unable to update leave type' });
        }
    }),
    deleteLeavetype: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const leaveTypeId = req.params.id;
            // Hapus pengguna
            const deletedRowsCount = yield leaveTypeModel_1.default.destroy({ where: { id: leaveTypeId } });
            if (deletedRowsCount === 0) {
                res.status(404).json({ error: 'Leave type not found' });
            }
            else {
                res.status(200).json({ message: 'Leave type deleted successfully' });
            }
        }
        catch (error) {
            console.error('Error while deleting leave type:', error);
            res.status(500).json({ error: 'Unable to delete leave type' });
        }
    })
};
exports.default = leaveTypeController;
