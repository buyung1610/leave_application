"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.verifyToken = void 0;
const jsonwebtoken_1 = __importStar(require("jsonwebtoken"));
const verifyToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const secretKey = process.env.JWT_SECRET || 'your_secret_key';
        jsonwebtoken_1.default.verify(token, secretKey, (err, decodedToken) => {
            if (err) {
                if (err instanceof jsonwebtoken_1.TokenExpiredError) {
                    return res.status(401).json({ error: 'Token expired' });
                }
                return res.status(401).json({ error: 'Invalid token' });
            }
            // Lanjutkan permintaan ke middleware atau rute berikutnya
            next();
        });
    }
    catch (error) {
        console.error('Error verifying token:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.verifyToken = verifyToken;
const authorize = (roles) => {
    return (req, res, next) => {
        var _a;
        // Mengambil token dari header Authorization
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }
        try {
            // Verifikasi token dan ekstrak payload
            const decoded = jsonwebtoken_1.default.verify(token, 'your_secret_key');
            // Mendapatkan position dari payload token
            const position = decoded.role;
            // Memeriksa apakah position termasuk dalam roles yang diizinkan
            if (position && roles.includes(position)) {
                return next();
            }
            else {
                return res.status(403).json({ error: 'Access denied: the employee role cannot access this resource.' });
            }
        }
        catch (error) {
            return res.status(403).json({ message: 'Invalid token' });
        }
    };
};
exports.authorize = authorize;
