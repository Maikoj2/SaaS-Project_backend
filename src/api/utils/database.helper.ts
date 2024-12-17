import { AuthError } from '../errors/AuthError';
import { Model, Types } from 'mongoose';
import { ITenantDocument, ITenantModel } from '../interfaces/model.interface';
import { PaginationOptions } from '../interfaces';
import { Logger } from '../config/logger/WinstonLogger';

interface FindOptions {
    deleted?: boolean;
    select?: string[];
    throwError?: boolean;
    errorMessage?: string;
}

interface UpdateOptions extends FindOptions {
    new?: boolean;
    runValidators?: boolean;
}

export class DatabaseHelper {
    private static logger = new Logger();

    static async find<T extends ITenantDocument>(
        model: Model<T>,
        query: Record<string, any>,
        options: FindOptions = {}
    ): Promise<T[]>{
        const {
            select = [],
            deleted = false,
            throwError = false,
            errorMessage = 'Documents not found'
        } = options;
    
        try {
            const docQuery = model.find(query);
            
            if (select.length > 0) {
                docQuery.select(select);
            }
    
            const docs = await docQuery;
            
            if (!docs.length && throwError) {
                throw new AuthError(errorMessage, 404);
            }
    
            return docs;
        } catch (error) {
            if (error instanceof AuthError) throw error;
            throw new AuthError('Database error', 500);
        }
    }

    static async findById<T extends ITenantDocument>(
        model: ITenantModel<T>,
        id: string,
        tenant: string,
        options: FindOptions = {}
    ): Promise<T | null> {
        return this.findOne(model, tenant, { _id: new Types.ObjectId(id), deleted: options.deleted }, options);
    }

    static async findOne<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        query: Record<string, any>,
        options: FindOptions = {}
    ): Promise<T | null> {
        const {
            select = [],
            throwError = false,
            errorMessage = 'Document not found'
        } = options;

        try {
            
            const docQuery = model.byTenant(tenant).findOne(query);
            if (select.length > 0) docQuery.select(select);
            
            const doc = await docQuery;
            
            if (!doc && throwError) {
                this.logger.warn('Document not found:', { model: model.modelName, tenant, query });
                throw new AuthError(errorMessage, 404);
            }
            
            this.logger.info('Document found:', { model: model.modelName, id: doc?._id });
            return doc;
        } catch (error) {
            if (error instanceof AuthError) throw error;
            throw new AuthError('Database error', 500);
        }
    }

    static async update<T extends ITenantDocument>(
        model: ITenantModel<T>,
        id: string,
        tenant: string,
        updateData: Partial<T>,
        options: UpdateOptions = {}
    ): Promise<T | null> {
        const {
            select = [],
            throwError = true,
            errorMessage = 'Document not found',
            runValidators = true
        } = options;

        try {
    
            const doc = await model.byTenant(tenant)
                .findByIdAndUpdate(
                    id,
                    updateData,
                    {
                        new: true,
                        runValidators,
                        select: select.length > 0 ? select : undefined
                    }
                );

            if (!doc && throwError) {
                this.logger.warn('Document not found for update:', { 
                    model: model.modelName, 
                    id, 
                    tenant 
                });
                throw new AuthError(errorMessage, 404);
            }
            
            return doc;
        } catch (error) {
            this.logger.error('Error updating document:', { 
                error, 
                model: model.modelName, 
                id, 
                tenant 
            });
            
            if (error instanceof AuthError) throw error;
            throw new AuthError(
                error instanceof Error ? error.message : 'Error updating document',
                500
            );
        }
    }

    static async create<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        data: Partial<T>
    ): Promise<T> {
        try {
            return await model.byTenant(tenant).create(data);
        } catch (error) {
            throw new AuthError('Error creating document', 500);
        }
    }

    static async delete<T extends ITenantDocument>(
        model: ITenantModel<T>,
        id: string,
        tenant: string,
        options: FindOptions = {}
    ): Promise<T | null> {
        const { throwError = true, errorMessage = 'Document not found' } = options;

        try {
            const doc = await model.byTenant(tenant).findByIdAndDelete(id);
            if (!doc && throwError) throw new AuthError(errorMessage, 404);
            return doc;
        } catch (error) {
            if (error instanceof AuthError) throw error;
            throw new AuthError('Database error', 500);
        }
    }

    static async exists<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        query: Record<string, any>
    ): Promise<boolean> {
        try {
            const count = await model.byTenant(tenant).countDocuments(query);
            return count > 0;
        } catch (error) {
            throw new AuthError('Database error', 500);
        }
    }

    static async findOneAndUpdate<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        query: Record<string, any>,
        update: Record<string, any>,
        options: Record<string, any> = {}
    ): Promise<T | null> {
        try {
            return await model.byTenant(tenant)
                .findOneAndUpdate(query, update, options);
        } catch (error) {
            throw new AuthError('Database error', 500);
        }
    }

    static async getItems<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        query: Record<string, any>,
        options: PaginationOptions = {}
    ): Promise<{
        docs: T[];
        totalDocs: number;
        limit: number;
        page: number;
        totalPages: number;
    }> {
        try {
            const {
                page = 1,
                limit = 10,
                sort = { createdAt: -1 },
                select = []
            } = options;

            const paginateOptions = {
                page,
                limit,
                sort,
                select: select.join(' '),
                lean: true
            };

            const result = await model.byTenant(tenant).paginate(query, paginateOptions);
            console.log('Result:', result);
            return {
                docs: result.docs,
                totalDocs: result.totalDocs || 0,
                limit: result.limit || limit,
                page: result.page || page,
                totalPages: result.totalPages || 0
            };
        } catch (error) {
            throw new AuthError(
                error instanceof Error ? error.message : 'Error getting items',
                422
            );
        }
    }
} 