"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const dbConnection_1 = __importDefault(require("../../config/dbConnection"));
class LeaveAllowance extends sequelize_1.Model {
}
LeaveAllowance.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
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
    total_days: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
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
    modelName: 'LeaveAllowance',
    tableName: 'leave_allowance',
    timestamps: false,
});
exports.default = LeaveAllowance;
