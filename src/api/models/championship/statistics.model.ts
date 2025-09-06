
import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../../config/database';

interface StatisticsAttributes {
  id: number;
  player_id: number;
  match_id: number;
  points_scored: number;
  assists: number;
  blocks: number;
  serves: number;
  successful_serves: number;
  receptions: number;
  successful_receptions: number;
  attacks: number;
  successful_attacks: number;
  errors: number;
  minutes_played: number;
  created_at?: Date;
  updated_at?: Date;
}

interface StatisticsCreationAttributes extends Optional<StatisticsAttributes, 'id' | 'created_at' | 'updated_at'> {}

class Statistics extends Model<StatisticsAttributes, StatisticsCreationAttributes> implements StatisticsAttributes {
  public id!: number;
  public player_id!: number;
  public match_id!: number;
  public points_scored!: number;
  public assists!: number;
  public blocks!: number;
  public serves!: number;
  public successful_serves!: number;
  public receptions!: number;
  public successful_receptions!: number;
  public attacks!: number;
  public successful_attacks!: number;
  public errors!: number;
  public minutes_played!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Statistics.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    player_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'players',
        key: 'id',
      },
    },
    match_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'matches',
        key: 'id',
      },
    },
    points_scored: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    assists: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    blocks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    serves: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    successful_serves: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    receptions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    successful_receptions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    attacks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    successful_attacks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    errors: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    minutes_played: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
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
    tableName: 'statistics',
    timestamps: true,
    underscored: true,
  }
);

export { Statistics, StatisticsAttributes, StatisticsCreationAttributes };
