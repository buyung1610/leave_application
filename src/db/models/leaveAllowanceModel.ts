import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/dbConnection';
import LeaveSubmission from './leaveSubmissionModel';

interface LeaveAllowanceAttributes {
  id?: number;
  user_id: number | null;
  total_days: number | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: number;
  updated_by: number | null;
  deleted_by: number | null;
}

class LeaveAllowance extends Model<LeaveAllowanceAttributes> implements LeaveAllowanceAttributes {
  public id!: number;
  public user_id!: number | null;
  public total_days!: number | null;
  public created_at!: Date;
  public updated_at!: Date | null;
  public deleted_at!: Date | null;
  public created_by!: number;
  public updated_by!: number | null;
  public deleted_by!: number | null;
  static total_days: any;
}

LeaveAllowance.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    total_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
      type: DataTypes.INTEGER,
      allowNull: false,
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
  },
  {
    sequelize,
    modelName: 'LeaveAllowance',
    tableName: 'leave_allowance',
    timestamps: false,
  }
);

export default LeaveAllowance;