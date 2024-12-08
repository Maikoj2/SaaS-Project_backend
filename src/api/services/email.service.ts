import { Injectable } from '@decorators/di';
import { Logger } from '../config/logger/WinstonLogger';

interface ResetPasswordData {
    email: string;
    name: string;
    token: string;
}

@Injectable()
export class EmailService {
    private readonly logger: Logger;

    constructor() {
        this.logger = new Logger();
    }

    public async sendResetPasswordEmail(
        locale: string,
        data: ResetPasswordData,
        tenant: string
    ): Promise<void> {
        try {
            // TODO: Implementar el envío real de email
            this.logger.info('Simulando envío de email de reset password:', {
                to: data.email,
                locale,
                tenant,
                resetLink: `https://your-domain.com/reset-password?token=${data.token}`
            });
            
        } catch (error) {
            this.logger.error('Error enviando email:', error);
            throw error;
        }
    }
} 