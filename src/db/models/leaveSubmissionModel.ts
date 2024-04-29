import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/dbConnection';

interface LeaveSubmissionAttributes {
  id?: number;
  user_id: number | null;
  leave_type_id: number | null;
  approver_user_id: number | null;
  total_days: number;
  start_date: Date;
  end_date: Date;
  emergency_call: string;
  description: string | null;
  status: 'accepted' | 'rejected' | 'onprocess' | null;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: number;
  updated_by: number | null;
  deleted_by: number | null;
}

class LeaveSubmission extends Model<LeaveSubmissionAttributes> implements LeaveSubmissionAttributes {
  public id!: number;
  public user_id!: number | null;
  public leave_type_id!: number | null;
  public approver_user_id!: number | null;
  public total_days!: number;
  public start_date!: Date;
  public end_date!: Date;
  public emergency_call!: string;
  public description!: string | null;
  public status!: 'accepted' | 'rejected' | 'onprocess' | null;
  public created_at!: Date;
  public updated_at!: Date | null;
  public deleted_at!: Date | null;
  public created_by!: number;
  public updated_by!: number | null;
  public deleted_by!: number | null;
}

LeaveSubmission.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
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
    leave_type_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'leave_types',
        key: 'id',
      },
    },
    approver_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    total_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    emergency_call: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('accepted', 'rejected', 'onprocess'),
      allowNull: false,
      defaultValue: 'onprocess',
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
    modelName: 'LeaveSubmission',
    tableName: 'leave_submissions',
    timestamps: false,
  }
);

export default LeaveSubmission;
