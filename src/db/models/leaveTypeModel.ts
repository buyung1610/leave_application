import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/dbConnection';

interface LeaveTypeAttributes {
  id?: number;
  type: string;
  is_emergency: number;
  max_days: number | null;
  created_at: Date | null;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: number | null;
  updated_by: number | null;
  deleted_by: number | null;
  is_deleted?: number;
}

class LeaveType extends Model<LeaveTypeAttributes> implements LeaveTypeAttributes {
  public id!: number;
  public type!: string;
  public is_emergency!: number;
  public max_days!: number | null;
  public created_at!: Date | null;
  public updated_at!: Date | null;
  public deleted_at!: Date | null;
  public created_by!: number | null;
  public updated_by!: number | null;
  public deleted_by!: number | null;
  public is_deleted!: number;
}

LeaveType.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_emergency: {
      type: DataTypes.TINYINT,
      allowNull: false,
    },
    max_days: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    modelName: 'LeaveType',
    tableName: 'leave_types',
    timestamps: false,
  }
);

export default LeaveType;
