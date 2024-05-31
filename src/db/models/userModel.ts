import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/dbConnection';
import LeaveAllowance from './leaveAllowanceModel';
import LeaveSubmission from './leaveSubmissionModel';

interface UserAttributes {
  id?: number;
  name: string;
  email: string;
  password: string;
  role: string;
  position: string;
  department: string;
  telephone?: string;
  join_date: Date;
  gender: 'male' | 'female' | 'other';
  created_at: Date | null;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: number | null;
  updated_by: number | null;
  deleted_by: number | null;
  is_deleted?: number;
  resetToken: string | null;
  resetTokenExpires: Date | null;
}

class User extends Model<UserAttributes> implements UserAttributes {
  roles(roles: any) {
      throw new Error('Method not implemented.');
  }
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: string;
  public position!: string;
  public department!: string;
  public telephone!: string;
  public join_date!: Date;
  public gender!: 'male' | 'female' | 'other';
  public created_at!: Date | null;
  public updated_at!: Date | null;
  public deleted_at!: Date | null;
  public created_by!: number | null;
  public updated_by!: number | null;
  public deleted_by!: number | null;
  public is_deleted!: number;
  public resetToken!: string | null;
  public resetTokenExpires!: Date | null;

  public readonly leaveAllowance?: LeaveAllowance; // Optional association

  // Static method untuk menginisialisasi model dan asosiasi
  public static initializeAssociations() {
    this.hasOne(LeaveAllowance, {
      foreignKey: 'user_id', // Assuming the foreign key in LeaveAllowance is user_id
      as: 'leaveAllowance' // Define an alias for the association
    });
  }
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    position: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    department: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    telephone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    join_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'other'),
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    updated_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    deleted_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    is_deleted: {
      type: DataTypes.TINYINT,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: false,
  }
);

export default User;

