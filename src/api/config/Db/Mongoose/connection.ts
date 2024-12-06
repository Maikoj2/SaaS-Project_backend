import mongoose from 'mongoose';
import { Injectable } from '@decorators/di';
import { Logger } from '../../logger';
import { env } from '../../env.config';


@Injectable()
export class DatabaseConnection {
    private readonly logger: Logger;
    private readonly DB_URI: string;
    private readonly DB_NAME: string;
    private readonly options: mongoose.ConnectOptions;

    constructor() {
        this.logger = new Logger();
        this.DB_URI = env.DB_URI || 'mongodb://localhost:27017';
        this.DB_NAME = env.DB_NAME || 'default_db';
        this.options = {
            dbName: this.DB_NAME,
            maxPoolSize: 10,
            minPoolSize: 5,
            socketTimeoutMS: 45000,
            serverSelectionTimeoutMS: 5000,
            retryWrites: true,
            retryReads: true
        };

        this.setupConnectionHandlers();
    }

    private validateEnvironment(): void {
        if (!this.DB_URI) {
            throw new Error('Database URI is missing in environment variables');
        }
    }

    private setupConnectionHandlers(): void {
        mongoose.connection.on('connected', () => {
            this.logger.info('MongoDB connection established successfully');
        });

        mongoose.connection.on('error', (error) => {
            this.logger.error('MongoDB connection error:', error);
        });

        mongoose.connection.on('disconnected', () => {
            this.logger.warn('MongoDB connection disconnected');
        });

        process.on('SIGINT', async () => {
            await this.closeConnection();
            process.exit(0);
        });
    }

    public async connect(): Promise<void> {
        try {
            this.validateEnvironment();

            await mongoose.connect(this.DB_URI, this.options);
            this.logger.info(`Connected to MongoDB database: ${this.DB_NAME}`);
        } catch (error) {
            this.logger.error('Error connecting to MongoDB:', error);
            throw error;
        }
    }

    public async closeConnection(): Promise<void> {
        try {
            await mongoose.connection.close();
            this.logger.info('MongoDB connection closed successfully');
        } catch (error) {
            this.logger.error('Error closing MongoDB connection:', error);
            throw error;
        }
    }

    public getConnection(): mongoose.Connection {
        return mongoose.connection;
    }
}

// Singleton instance
export const databaseConnection = new DatabaseConnection();