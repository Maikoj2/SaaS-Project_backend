import mongoose from 'mongoose';
import {  CustomError } from '../errors';


export class MongooseHelper {
    public static async validateId(id: string, convertToObject = false): Promise<string | mongoose.Types.ObjectId> {
        try {
            const isValidId = mongoose.Types.ObjectId.isValid(id);
            
            if (!isValidId) {
                throw new CustomError('ID_MALFORMED', 422, 'ValidationError');
            }

            return convertToObject ? new mongoose.Types.ObjectId(id) : id;
        } catch (error) {
            throw new CustomError('ID_MALFORMED', 422, 'ValidationError');
        }
    }
} 