import { Document, Model, PaginateOptions, PaginateResult, Query, Types } from 'mongoose';
import { ITenantDocument, ITenantModel } from '../interfaces/model.interface';
import { PaginationOptions } from '../interfaces';
import { Logger } from '../config/logger/WinstonLogger';
import { Request } from 'express';
import { FindOptions, UpdateOptions, PopulateOptions } from '../interfaces/IhelperDatabase';
import { CustomError } from '../errors';
import { ClientSession } from 'mongoose';



export class DatabaseHelper {
    private static logger = new Logger();

    static async find<T extends ITenantDocument>(
        model: Model<T>,
        query: Record<string, any>,
        options: FindOptions = {}
    ): Promise<T[]> {
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
                throw new CustomError(errorMessage, 404, 'DatabaseError');
            }

            return docs;
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw new CustomError(error instanceof Error ? error.message : 'Database error', 500, 'DatabaseError');
        }
    }

    static async findById<T extends ITenantDocument>(
        model: ITenantModel<T>,
        id: string,
        tenant: string,
        options: FindOptions = {},
        session?: ClientSession
    ): Promise<T | null> {
        return this.findOne(model, tenant, { _id: new Types.ObjectId(id), deleted: options.deleted }, options, session);
    }

    static async findOne<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        query: Record<string, any>,
        options: FindOptions = {},
        session?: ClientSession
    ): Promise<T | null> {
        const {
            select = [],
            throwError = false,
            errorMessage = 'Document not found'
        } = options;

        try {

            const docQuery = model.byTenant(tenant).findOne(query).session(session || null);
            if (select.length > 0) docQuery.select(select);

            const doc = await docQuery;

            if (!doc && throwError) {
                this.logger.warn('Document not found:', { model: model.modelName, tenant, query });
                throw new CustomError(errorMessage, 404, 'DatabaseError');
            }

            this.logger.info('Document found:', { model: model.modelName, id: doc?._id });
            return doc;
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw new CustomError(error instanceof Error ? error.message : 'Database error', 500, 'DatabaseError');
        }
    }

    static update = async <T extends ITenantDocument>(
        model: ITenantModel<T>,
        id: string,
        tenant: string,
        updateData: Partial<T>,
        options: UpdateOptions = {},
        session?: ClientSession
    ): Promise<T | null> => {
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
                        select: select.length > 0 ? select.join(' ') : undefined,
                        session: session || null
                    }
                );

            if (!doc && throwError) {
                this.logger.warn('Document not found for update:', {
                    model: model.modelName,
                    id,
                    tenant
                });
                throw new CustomError(errorMessage, 404, 'DatabaseError');
            }

            return doc;
        } catch (error) {
            this.logger.error('Error updating document:', {
                error,
                model: model.modelName,
                id,
                tenant
            });

            if (error instanceof CustomError) throw error;
            throw new CustomError(
                error instanceof Error ? error.message : 'Error updating document',
                500,
                'DatabaseError'
            );
        }
    }

    static async create<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        data: Partial<T>,
        session?: ClientSession
    ): Promise<T> {
        try {
            const options = session ? { session } : {};
            const doc = await model.byTenant(tenant).create([data], options);
            return doc[0];
        } catch (error) {
            this.logger.error('Error creating document:', {
                error,
                data
            });
            throw error;
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
            if (!doc && throwError) throw new CustomError(errorMessage, 404, 'DatabaseError');
            return doc;
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw new CustomError(error instanceof Error ? error.message : 'Database error', 500, 'DatabaseError');
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
            throw new CustomError(error instanceof Error ? error.message : 'Database error', 500, 'DatabaseError');
        }
    }

    static async findOneAndUpdate<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        query: Record<string, any>,
        update: Record<string, any>,
        options: Record<string, any> = {},
        session?: ClientSession
    ): Promise<T | null> {
        try {
            return await model.byTenant(tenant)
                .findOneAndUpdate(query, update, options).session(session || null);
        } catch (error) {
            throw new CustomError(error instanceof Error ? error.message : 'Database error', 500, 'DatabaseError');
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
                order = -1,
                select = []  
            } = options;



            const paginateOptions = {
                page,
                limit,
                sort,
                order,
                select: select.join(' '),
                lean: true

            };

            const result = await model.byTenant(tenant).paginate(query, paginateOptions);
            return this.cleanPaginationID(result);
        } catch (error) {
            throw new CustomError(
                error instanceof Error ? error.message : 'Error getting items',
                422,
                'DatabaseError'
            );
        }
    }

    static async count<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        query: Record<string, any>,
        session?: ClientSession
    ): Promise<number> {
        try {
            const count = await model.byTenant(tenant).countDocuments(query).session(session || null);
            return count;
        } catch (error) {
            throw new CustomError(
                error instanceof Error ? error.message : 'Error counting documents',
                500,
                'DatabaseError'
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
            throw new CustomError(error instanceof Error ? error.message : 'Error getting items', 422, 'DatabaseError');
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
        },
        session?: ClientSession
    ): Promise<PaginateResult<T>> {
        try {
            const {
                page = 1,
                limit = 10,
                sort = { createdAt: -1 },
                select = []
            } = options;
            const querySession = model.byTenant(tenant).find(query).session(session || null)
            const paginateOptions: PaginateOptions = {
                page,
                limit,
                sort,
                select: select.length > 0 ? select.join(' ') : undefined,
                lean: true,
                populate: [],
            };

            if (relations) {
                paginateOptions.populate = [
                    ...(relations.basic?.map(path => ({ path })) || []),
                    ...(relations.nested || [])
                ];
            }
            const result = await model.paginate(querySession, paginateOptions);
            return this.cleanPaginationID(result);
        } catch (error) {
            throw new CustomError(
                error instanceof Error ? error.message : 'Error getting items',
                422,
                'DatabaseError'
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
        options: FindOptions = {},
        session?: ClientSession
    ): Promise<T | null> {
        const {
            select = [],
            throwError = false,
            errorMessage = 'Document not found'
        } = options;

        try {
            let docQuery: Query<T | null, T> = model.byTenant(tenant).findOne(query).session(session || null);

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
                throw new CustomError(errorMessage, 404, 'DatabaseError');
            }

            this.logger.info('Document found:', {
                model: model.modelName,
                id: doc?._id
            });
            return doc;
        } catch (error) {
            if (error instanceof CustomError) throw error;
            throw new CustomError(error instanceof Error ? error.message : 'Database error', 500, 'DatabaseError');
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
    ): Promise<T> {
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
            throw new CustomError(
                error instanceof Error ? error.message : 'Error creating document',
                422,
                'DatabaseError'
            );
        }
    }

    static async saveDocumentsIndividually<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        documents: T[],
        session: ClientSession
    ): Promise<T[]> {
        const savedDocs: T[] = [];
        
        for (const doc of documents) {
            try {
                const TenantModel = model.byTenant(tenant); 
                const newDoc = new TenantModel(doc);
                await newDoc.save({ session });
                savedDocs.push(newDoc);
            } catch (error) {
                await session.abortTransaction();
                throw new CustomError(
                    `Error guardando documento: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                    500,
                    'DocumentSaveError',

                );
            }
        }
        
        return savedDocs;
    }

    static async deleteMany<T extends ITenantDocument>(
        model: ITenantModel<T>,
        tenant: string,
        query: Record<string, any>
    ): Promise<number> {
        try {

            const result = await model.byTenant(tenant).deleteMany(query);
            this.logger.info('Documents deleted:', { model: model.modelName, count: result.deletedCount });
            return result.deletedCount || 0;
        } catch (error) {
            this.logger.error('Error deleting documents:', { error, model: model.modelName });
            throw new CustomError(
                error instanceof Error ? error.message : 'Error deleting documents',
                500,
                'DatabaseError'
            );
        }
    }


    /**
     * empty the fields __v and id of the pagination results
     */
    private static cleanPaginationID<T extends Document>(items: PaginateResult<T>): PaginateResult<T> {
        items.docs = items.docs.map(item => {
            if (item && typeof item.toObject === 'function') {
                const doc = item.toObject();
                delete doc.__v;
                delete doc.id;
                return doc;
            }
            return item;
        });
        return items;
    }

}