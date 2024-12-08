export class PasswordValidator {
    private static readonly MIN_LENGTH = 8;
    private static readonly REGEX = {
        UPPERCASE: /[A-Z]/,
        LOWERCASE: /[a-z]/,
        NUMBERS: /[0-9]/,
        SPECIAL: /[!@#$%^&*(),.?":{}|<>]/
    };

    public static validate(password: string): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (password.length < this.MIN_LENGTH) {
            errors.push(`Password must have at least ${this.MIN_LENGTH} characters`);
        }

        if (!this.REGEX.UPPERCASE.test(password)) {
            errors.push('Password must have at least one uppercase letter');
        }

        if (!this.REGEX.LOWERCASE.test(password)) {
            errors.push('Password must have at least one lowercase letter');
        }

        if (!this.REGEX.NUMBERS.test(password)) {
            errors.push('Password must have at least one number');
        }

        if (!this.REGEX.SPECIAL.test(password)) {
            errors.push('Password must have at least one special character');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
} 