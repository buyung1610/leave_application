import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/dbConnection';
import User from './userModel';
import LeaveType from './leaveTypeModel';
import LeaveAllowance from './leaveAllowanceModel';

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
  attachment: string | null;
  status: 'Diterima' | 'Ditolak' | 'Pending' | null;
  created_at: Date | null;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: number | null;
  updated_by: number | null;
  deleted_by: number | null;
  is_deleted?: number;
}

class LeaveSubmission extends Model<LeaveSubmissionAttributes> implements LeaveSubmissionAttributes {
  map(arg0: (submission: any) => { id: any; name: any; submissionDate: string | null; telephone: any; emergencyCall: any; position: any; department: any; startDate: any; endDate: any; totalDays: any; leaveType: any; description: any; leaveAllowance: any; status: any; approver: any; }) {
    throw new Error("Method not implemented.");
  }
  public id!: number;
  public user_id!: number | null;
  public leave_type_id!: number | null;
  public approver_user_id!: number | null;
  public total_days!: number;
  public start_date!: Date;
  public end_date!: Date;
  public emergency_call!: string;
  public description!: string | null;
  public attachment!: string | null;
  public status!: 'Diterima' | 'Ditolak' | 'Pending' | null;
  public created_at!: Date | null;
  public updated_at!: Date | null;
  public deleted_at!: Date | null;
  public created_by!: number | null;
  public updated_by!: number | null;
  public deleted_by!: number | null;
  public is_deleted!: number;
  User: any;
  LeaveType: any;
  LeaveAllowance: any;
  Approver: any;
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
    attachment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Diterima', 'Ditolak', 'Pending'),
      allowNull: false,
      defaultValue: 'Pending',
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
  },
  {
    sequelize,
    modelName: 'LeaveSubmission',
    tableName: 'leave_submissions',
    timestamps: false,
  }
);

LeaveSubmission.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(LeaveSubmission, { foreignKey: 'user_id' });

LeaveSubmission.belongsTo(LeaveType, { foreignKey: 'leave_type_id' });
LeaveType.hasMany(LeaveSubmission, { foreignKey: 'leave_type_id' });

// Manual association
LeaveSubmission.belongsTo(LeaveAllowance, { foreignKey: 'user_id', targetKey: 'user_id' });
LeaveAllowance.hasMany(LeaveSubmission, { foreignKey: 'user_id' });

LeaveSubmission.belongsTo(User, { foreignKey: 'approver_user_id', as: 'Approver' });
User.hasMany(LeaveSubmission, { foreignKey: 'approver_user_id' });

export default LeaveSubmission;