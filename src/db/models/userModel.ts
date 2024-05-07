import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/dbConnection';
import LeaveAllowance from './leaveAllowanceModel';

interface UserAttributes {
  id?: number;
  name: string;
  email: string;
  password: string;
  position: string;
  department: string;
  telephone?: string;
  join_date: Date;
  gender: 'male' | 'female' | 'other';
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: number | null;
  updated_by: number | null;
  deleted_by: number | null;
}

class User extends Model<UserAttributes> implements UserAttributes {
  public id!: number;
  public name!: string;
  public email!: string;
  public password!: string;
  public position!: string;
  public department!: string;
  public telephone!: string;
  public join_date!: Date;
  public gender!: 'male' | 'female' | 'other';
  public created_at!: Date;
  public updated_at!: Date | null;
  public deleted_at!: Date | null;
  public created_by!: number | null;
  public updated_by!: number | null;
  public deleted_by!: number | null;

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
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    updated_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    deleted_by: {
      type: DataTypes.INTEGER.UNSIGNED,
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

