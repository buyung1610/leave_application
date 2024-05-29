"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const dbConnection_1 = __importDefault(require("../../config/dbConnection"));
const leaveAllowanceModel_1 = __importDefault(require("./leaveAllowanceModel"));
class User extends sequelize_1.Model {
    roles(roles) {
        throw new Error('Method not implemented.');
    }
    // Static method untuk menginisialisasi model dan asosiasi
    static initializeAssociations() {
        this.hasOne(leaveAllowanceModel_1.default, {
            foreignKey: 'user_id', // Assuming the foreign key in LeaveAllowance is user_id
            as: 'leaveAllowance' // Define an alias for the association
        });
    }
}
User.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    role: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    position: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    department: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    telephone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    join_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    gender: {
        type: sequelize_1.DataTypes.ENUM('male', 'female', 'other'),
        allowNull: false,
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
    resetToken: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    resetTokenExpires: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: dbConnection_1.default,
    modelName: 'User',
    tableName: 'users',
    timestamps: false,
});
// User.hasMany(LeaveSubmission, { foreignKey: 'user_id' });
exports.default = User;
