"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const dbConnection_1 = __importDefault(require("../../config/dbConnection"));
const userModel_1 = __importDefault(require("./userModel"));
const leaveTypeModel_1 = __importDefault(require("./leaveTypeModel"));
const leaveAllowanceModel_1 = __importDefault(require("./leaveAllowanceModel"));
class LeaveSubmission extends sequelize_1.Model {
    map(arg0) {
        throw new Error("Method not implemented.");
    }
}
LeaveSubmission.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    leave_type_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'leave_types',
            key: 'id',
        },
    },
    approver_user_id: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    total_days: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    start_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    end_date: {
        type: sequelize_1.DataTypes.DATEONLY,
        allowNull: false,
    },
    emergency_call: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    attachment: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('Diterima', 'Ditolak', 'Pending'),
        allowNull: false,
        defaultValue: 'Pending',
    },
    created_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    updated_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    deleted_at: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    created_by: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    updated_by: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    deleted_by: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    is_deleted: {
        type: sequelize_1.DataTypes.TINYINT,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
}, {
    sequelize: dbConnection_1.default,
    modelName: 'LeaveSubmission',
    tableName: 'leave_submissions',
    timestamps: false,
});
LeaveSubmission.belongsTo(userModel_1.default, { foreignKey: 'user_id' });
userModel_1.default.hasMany(LeaveSubmission, { foreignKey: 'user_id' });
LeaveSubmission.belongsTo(leaveTypeModel_1.default, { foreignKey: 'leave_type_id' });
leaveTypeModel_1.default.hasMany(LeaveSubmission, { foreignKey: 'leave_type_id' });
// Manual association
LeaveSubmission.belongsTo(leaveAllowanceModel_1.default, { foreignKey: 'user_id', targetKey: 'user_id' });
leaveAllowanceModel_1.default.hasMany(LeaveSubmission, { foreignKey: 'user_id' });
LeaveSubmission.belongsTo(userModel_1.default, { foreignKey: 'approver_user_id', as: 'Approver' });
userModel_1.default.hasMany(LeaveSubmission, { foreignKey: 'approver_user_id' });
exports.default = LeaveSubmission;
