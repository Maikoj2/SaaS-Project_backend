import mongoose from 'mongoose';
import { AuthError } from '../errors/AuthError';

export class MongooseHelper {
    public static async validateId(id: string, convertToObject = false): Promise<string | mongoose.Types.ObjectId> {
        try {
            const isValidId = mongoose.Types.ObjectId.isValid(id);
            
            if (!isValidId) {
                throw new AuthError('ID_MALFORMED', 422);
            }

            return convertToObject ? new mongoose.Types.ObjectId(id) : id;
        } catch (error) {
            throw new AuthError('ID_MALFORMED', 422);
        }
    }
} 