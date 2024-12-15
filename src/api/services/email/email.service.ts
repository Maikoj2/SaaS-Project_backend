import { Injectable } from '@decorators/di';
import { Logger } from '../../config/logger/WinstonLogger';
import { AuthError } from '../../errors/AuthError';
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

interface RegistrationEmailData {
    email: string;
    name: string;
    locale: string;
    tenant: string;
    verificationCode: string;
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
                resetLink: `https://your-domain.com/reset-password?urlId=${data.token}`
            });
            
        } catch (error) {
            this.logger.error('Error enviando email:', error);
            throw error;
        }
    }

    async sendVerificationEmail(data: VerificationEmailData): Promise<void> {
        try {
            const { email, name, verificationCode, tenant, locale = 'es' } = data;
            const verificationLink = `https://your-frontend-url.com/verify/${tenant}/${verificationCode}`;

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
                verificationLink: verificationLink
            });
            
        } catch (error) {
            this.logger.error('Error sending verification email:', error);
            throw new AuthError('Error sending verification email', 500);
        }
    
    }

    public async sendRegistrationEmail(data: RegistrationEmailData): Promise<void> {
        try {
            this.logger.info('Sending registration email:', {
                to: data.email,
                tenant: data.tenant,
                locale: data.locale
            });

            // Simular envío de email (reemplazar con tu implementación real)
            const emailData = {
                locale: data.locale,
                tenant: data.tenant,
                timestamp: new Date().toISOString(),
                to: data.email,
                verificationLink: `https://your-frontend-url.com/verify/${data.tenant}/${data.verificationCode}`
            };

            // Log para desarrollo
            this.logger.info('Simulando envío de email de registro:', emailData);

            // Aquí implementarías el envío real del email
            // Ejemplo con nodemailer u otro servicio de email
            /*
            await this.emailProvider.send({
                to: data.email,
                subject: 'Welcome to Our Platform',
                template: 'registration',
                context: {
                    name: data.name,
                    verificationLink: emailData.verificationLink
                }
            });
            */

        } catch (error) {
            this.logger.error('Error sending registration email:', error);
            throw error;
        }
    }
} 