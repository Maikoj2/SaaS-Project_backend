import { AuthError } from '../errors/AuthError';
import { Document, Model, PaginateOptions, PaginateResult, Query, Types } from 'mongoose';
import { ITenantDocument, ITenantModel } from '../interfaces/model.interface';
import { PaginationOptions } from '../interfaces';
import { Logger } from '../config/logger/WinstonLogger';
import { Request } from 'express';
import { FindOptions, UpdateOptions, PopulateOptions, QueryOptions } from '../interfaces/IhelperDatabase';



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
    ): Promise<PaginateResult<T>> {
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
            return this.cleanPaginationID(result);
        } catch (error) {
            throw new AuthError(
                error instanceof Error ? error.message : 'Error getting items',
                422
            );
        }
    }

    /**
     * Get items without tenant
     */
    static async getWithOutTenant<T extends Document>(
        req: Request,
        model: Model<T> & { paginate: any },
        query: Record<string, any>
    ): Promise<PaginateResult<T>> {
        try {
            const options: PaginateOptions = {
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10,
                sort: { createdAt: -1 },
                select: '-__v'
            };

            const result = await model.paginate(query, options);
            return this.cleanPaginationID(result);
        } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Error getting items');
        }
    }

    /**
     * Find all with relations
     */
    static async getItemsWithRelations<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        query: Record<string, any>,
        options: PaginationOptions = {},
        relations?: {
            basic?: string[];
            nested?: PopulateOptions[];
        }
    ): Promise<PaginateResult<T>> {
        try {
            const {
                page = 1,
                limit = 10,
                sort = { createdAt: -1 },
                select = []
            } = options;
    
            const paginateOptions: PaginateOptions = {
                page,
                limit,
                sort,
                select: select.join(' '),
                lean: true,
                populate: []
            };
    
            if (relations) {
                paginateOptions.populate = [
                    ...(relations.basic?.map(path => ({ path })) || []),
                    ...(relations.nested || [])
                ];
            }
    
            const result = await model.byTenant(tenant).paginate(query, paginateOptions);
            console.log('Result:', result);
            
            return this.cleanPaginationID(result);
        } catch (error) {
            throw new AuthError(
                error instanceof Error ? error.message : 'Error getting items',
                422
            );
        }
    }

    /**
     * Find one with relations
     */
    static async findOneWithRelations<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        query: Record<string, any>,
        relations: {
            basic?: string[];
            nested?: PopulateOptions[];
        },
        options: FindOptions = {}
    ): Promise<T | null> {
        const {
            select = [],
            throwError = false,
            errorMessage = 'Document not found'
        } = options;

        try {
            let docQuery: Query<T | null, T> = model.byTenant(tenant).findOne(query);

            // Aplicar select si existe
            if (select.length > 0) {
                docQuery = docQuery.select(select.join(' '));
            }

            // Populate básico
            if (relations.basic?.length) {
                docQuery = docQuery.populate(relations.basic);
            }

            // Populate anidado
            if (relations.nested?.length) {
                relations.nested.forEach(populate => {
                    docQuery = docQuery.populate(populate);
                });
            }

            const doc = await docQuery.exec();

            if (!doc && throwError) {
                this.logger.warn('Document not found:', {
                    model: model.modelName,
                    tenant,
                    query
                });
                throw new AuthError(errorMessage, 404);
            }

            this.logger.info('Document found:', {
                model: model.modelName,
                id: doc?._id
            });
            return doc;
        } catch (error) {
            if (error instanceof AuthError) throw error;
            throw new AuthError('Database error', 500);
        }
    }

    static async createWithRelations<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        data: Partial<T>,
        relations?: {
            basic?: string[];
            nested?: PopulateOptions[];
        }
    ): Promise<T > {
        try {
            const doc = await model.byTenant(tenant).create(data);
    
            if (relations) {
                const docWithRelations = await model.byTenant(tenant)
                    .findById(doc._id)
                    .populate([
                        ...(relations.basic?.map(path => ({ path })) || []),
                        ...(relations.nested || [])
                    ]);
                return docWithRelations as T;
            }
    
            return doc;
        } catch (error) {
            throw new AuthError(
                error instanceof Error ? error.message : 'Error creating document',
                422
            );
        }
    }


    /**
     * empty the fields __v and id of the pagination results
     */
    private static cleanPaginationID<T extends Document>(items: PaginateResult<T>): PaginateResult<T> {
        items.docs = items.docs.map(item => {
            const doc = item.toObject();
            delete doc.__v;
            delete doc.id;
            return doc;
        });
        return items;
    }
}