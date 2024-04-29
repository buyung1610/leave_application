import { DataTypes, Model } from 'sequelize';
import sequelize from '../../config/dbConnection';

interface LeaveTypeAttributes {
  id?: number;
  type: string;
  is_emergency: boolean;
  created_at: Date;
  updated_at: Date | null;
  deleted_at: Date | null;
  created_by: number;
  updated_by: number | null;
  deleted_by: number | null;
}

class LeaveType extends Model<LeaveTypeAttributes> implements LeaveTypeAttributes {
  public id!: number;
  public type!: string;
  public is_emergency!: boolean;
  public created_at!: Date;
  public updated_at!: Date | null;
  public deleted_at!: Date | null;
  public created_by!: number;
  public updated_by!: number | null;
  public deleted_by!: number | null;
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
      type: DataTypes.BOOLEAN,
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
    modelName: 'LeaveType',
    tableName: 'leave_types',
    timestamps: false,
  }
);

export default LeaveType;
