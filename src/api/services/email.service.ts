import { Injectable } from '@decorators/di';
import { Logger } from '../config/logger/WinstonLogger';
import { AuthError } from '../errors';
// import nodemailer from 'nodemailer'; // dependent to send emails

interface ResetPasswordData {
    email: string;
    name: string;
    token: string;
}

interface VerificationEmailData {
    email: string;
    name: string;
    verificationCode: string;
    tenant: string;
    locale?: string;
}

@Injectable()
export class EmailService {
    // private transporter: nodemailer.Transporter;
    private readonly logger: Logger;
    // this.transporter = nodemailer.createTransport({
    //     host: process.env.SMTP_HOST,
    //     port: Number(process.env.SMTP_PORT),
    //     secure: process.env.SMTP_SECURE === 'true',
    //     auth: {
    //         user: process.env.SMTP_USER,
    //         pass: process.env.SMTP_PASS
    //     }
    // });

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

    async sendVerificationEmail(data: VerificationEmailData): Promise<void> {
        try {
            const { email, name, verificationCode, tenant, locale = 'es' } = data;
            const verificationUrl = `${process.env.FRONTEND_URL}/verify?code=${verificationCode}&tenant=${tenant}`;

            // // Leer la plantilla HTML
            // const templatePath = join(__dirname, `../templates/verification-${locale}.html`);
            // const template = readFileSync(templatePath, 'utf-8');
            
            // // Compilar la plantilla con los datos
            // const compiledTemplate = compile(template);
            // const html = compiledTemplate({
            //     name,
            //     verificationUrl,
            //     companyName: process.env.COMPANY_NAME
            // });

            // // Enviar el email
            // await this.transporter.sendMail({
            //     from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            //     to: email,
            //     subject: locale === 'es' ? 'Verifica tu email' : 'Verify your email',
            //     html
            // });

            // this.logger.info('Verification email sent successfully', {
            //     to: email,
            //     tenant
            // });
            this.logger.info('Simulando envío de email de verificación:', {
                to: email,
                locale,
                tenant,
                verificationLink: verificationUrl
            });
            
        } catch (error) {
            this.logger.error('Error sending verification email:', error);
            throw new AuthError('Error sending verification email', 500);
        }
    
    }
} 