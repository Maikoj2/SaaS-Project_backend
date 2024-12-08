import  { compare, genSalt, hash } from 'bcryptjs';
import { AUTH_CONSTANTS } from '../constants/auth.constants';


export class PasswordUtil {
    public static async hashPassword(password: string): Promise<string> {
        const salt = await genSalt(AUTH_CONSTANTS.SALT_ROUNDS);
        return hash(password, salt);
    }

    public static async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return compare(plainPassword, hashedPassword);
    }
} 