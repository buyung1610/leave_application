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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cron = __importStar(require("cron"));
const userModel_1 = __importDefault(require("../db/models/userModel"));
const leaveAllowanceModel_1 = __importDefault(require("../db/models/leaveAllowanceModel"));
const job = new cron.CronJob('0 0 0 1 1 *', () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const usersWithLeaveAllowance = yield userModel_1.default.findAll({
            include: [leaveAllowanceModel_1.default],
        });
        for (const user of usersWithLeaveAllowance) {
            const joinDate = new Date(user.join_date);
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
            yield leaveAllowanceModel_1.default.update({ total_days: leaveAllowance }, { where: { user_id: user.id } });
        }
        console.log('Sisa cuti tahunan berhasil diperbarui');
    }
    catch (error) {
        console.error('Error:', error);
    }
}));
job.start();
