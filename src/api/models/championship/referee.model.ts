
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface RefereeAttributes {
  id: number;
  name: string;
  email: string;
  phone?: string;
  experience_years?: number;
  certification_level?: string;
  specialization?: string;
  availability_status: 'available' | 'busy' | 'unavailable';
  championship_id: number;
  created_at?: Date;
  updated_at?: Date;
}

interface RefereeCreationAttributes extends Optional<RefereeAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Referee extends Model<RefereeAttributes, RefereeCreationAttributes> implements RefereeAttributes {
  public id!: number;
  public name!: string;
  public email!: string;
  public phone?: string;
  public experience_years?: number;
  public certification_level?: string;
  public specialization?: string;
  public availability_status!: 'available' | 'busy' | 'unavailable';
  public championship_id!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Referee.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    experience_years: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    certification_level: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    specialization: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    availability_status: {
      type: DataTypes.ENUM('available', 'busy', 'unavailable'),
      allowNull: false,
      defaultValue: 'available',
    },
    championship_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'championships',
        key: 'id',
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'referees',
    timestamps: true,
    underscored: true,
  }
);

export { Referee, RefereeAttributes, RefereeCreationAttributes };
