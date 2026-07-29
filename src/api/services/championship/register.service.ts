
import { Logger } from '../../config/logger/WinstonLogger';
import ChampionshipConfiguration, { IConfigurationDocument } from '../../models/mongoose/championship/configuration';
import InvitationLink, { IInvitationLink } from '../../models/mongoose/championship/invitationLink';
import Registration, { IRegistrationDocument } from '../../models/mongoose/championship/registration';

import { DatabaseHelper } from '../../utils/database.helper';
import { PaymentResponse } from 'mercadopago/dist/clients/payment/commonTypes';
import Team, { ITeamDocument } from '../../models/mongoose/championship/team';
import { CustomError } from '../../errors';
import { generate_link, getPaymentDetails } from '../../plugin/mercadopago';
import { Types } from 'mongoose';
import Player, { BeachVolleyballPosition, EPSProvider, IndoorVolleyballPosition } from '../../models/mongoose/championship/player';
import { User } from '../../models';
import { PasswordUtil } from '../../utils';
import { EmailService } from '../email/email.service';
import { env } from '../../config';
import { validateCompetitionRulesForTeam } from '../../domain/championship/rules/competitionRules.validator';
import { validateChampionshipTeamCapacity } from '../../domain/championship/rules/championshipCapacity.validator';
import Championship, { Image } from '../../models/mongoose/championship/championship';
import {
    ChampionshipStatus,
    ChampionshipStatusValue,
} from '../../constants/championship.constants';

const REGISTRATION_CHAMPIONSHIP_STATUS: ChampionshipStatusValue =
    ChampionshipStatus[1];
export interface PayerData {
    name: string;
    surname?: string;
    email: string;
    phone?: string;
    phoneNumber?: string;
    areaCode?: string;
    address?: string;
}
export interface PublicPlayerRegistrationData {
    nie: string;
    name: string;
    lastName?: string;
    email: string;
    phone?: string;
    gender: 'male' | 'female';
    dateOfBirth?: Date;
    position: IndoorVolleyballPosition | BeachVolleyballPosition;
    eps: EPSProvider;
    number?: number;
    clubId?: Types.ObjectId;
    dummy?: boolean;
}

export interface PublicTeamRegistrationData {
    team: {
        name: string;
        logo?: Image;
        categoryId?: string;
        captainEmail?: string;
    };
    players: PublicPlayerRegistrationData[];
    payerData: PayerData;
}

// import InvitationLink from '../../models/mongoose/championship/invitationLink';

export class RegistrationService {
    // private notificationService: NotificationService;
    private logger: Logger;
    private emailService: EmailService;

    constructor() {
        // this.notificationService = new NotificationService();
        this.logger = new Logger();
        this.emailService = new EmailService();
    }

    async registerWithInvitation(
        tenant: string,
        code: string,
        registrationData: IRegistrationDocument,
        payerData: PayerData
    ): Promise<any> {
        let registration: IRegistrationDocument | undefined;

        try {
            const { invitationLink, configuration } = await this.validateInitialRegistration(tenant, code);


            const existTeam = await DatabaseHelper.findOne(
                Team,
                tenant,
                { _id: registrationData.teamId }

            );

            if (!existTeam) {
                throw new CustomError(
                    'The payment cannot be created team not found',
                    404,
                    'RegistrationServiceError'
                );
            }

            const existRegistration = await DatabaseHelper.findOne(
                Registration,
                tenant,
                { teamId: registrationData.teamId }
            );

            if (existRegistration) {
                throw new CustomError(
                    'Registration already exists',
                    400,
                    'RegistrationServiceError'
                );
            }

            registration = await DatabaseHelper.create(
                Registration,
                tenant,
                {
                    championshipId: invitationLink.championshipId,
                    teamId: registrationData.teamId as any,
                    registrationDate: new Date(),
                    registrationStatus: 'pending',
                    feePaid: false,
                    registrationDeadline: configuration.registrationDeadline,
                }
            );

            const paymentData = {
                price: Number(configuration.registrationFee),
                description: `Inscripción al campeonato - Equipo ${existTeam.name}`,
                track: registration._id.toString(),
                currency: configuration.currency
            };

            const fullName = payerData.name?.trim() || '';
            const [firstName, ...lastNameParts] = fullName.split(' ');

            const payer = {
                role: 'admin',
                name: firstName,
                surname: payerData.surname || lastNameParts.join(' '),
                email: payerData.email,
                areaCode: payerData.areaCode || '57',
                phoneNumber: payerData.phoneNumber || payerData.phone,
                address: payerData.address || '',
            };

            const paymentLink = await generate_link(
                {},
                null,
                paymentData,
                tenant,
                payer
            );

            if (!paymentLink || paymentLink.error) {
                throw new CustomError(
                    'Error generating payment link',
                    500,
                    'RegistrationServiceError'
                );
            }

            return {
                registration,
                paymentLink
            };

        } catch (error) {
            this.logger.error('Error in registration:', error);
            if (registration) {
                await DatabaseHelper.delete(
                    Registration,
                    registration._id.toString(),
                    tenant
                );
            }

            throw new CustomError(
                error instanceof Error
                    ? error.message
                    : 'Error in registration',
                500,
                'RegistrationServiceError'
            );
        }
    }
    async registerTeamUsersAndPlayersWithInvitation(
        tenant: string,
        code: string,
        data: PublicTeamRegistrationData
    ): Promise<any> {
        const createdUsers: any[] = [];
        const createdPlayers: any[] = [];
        const createdCredentials: {
            email: string;
            name: string;
            temporaryPassword: string;
        }[] = [];

        let createdTeam: any;
        let registration: IRegistrationDocument | undefined;

        try {
            const { invitationLink, configuration } =
                await this.validateInitialRegistration(tenant, code);

            const championshipId = invitationLink.championshipId;
            await validateChampionshipTeamCapacity(
                tenant,
                championshipId,
                configuration.maxTeams,
                'RegistrationServiceError'
            );

            if (!data.team?.name) {
                throw new CustomError(
                    'Team name is required',
                    400,
                    'RegistrationServiceError'
                );
            }

            if (!data.players || data.players.length === 0) {
                throw new CustomError(
                    'At least one player is required',
                    400,
                    'RegistrationServiceError'
                );
            }

            const competitionRules = configuration.competitionRules;


            if (competitionRules) {
                validateCompetitionRulesForTeam({
                    competitionRules,
                    players: data.players,
                    categoryId: data.team.categoryId,
                    errorSource: 'RegistrationServiceError',
                });
            }

            if (competitionRules?.categories?.enabled) {
                const categoryExists = competitionRules.categories.list.some(
                    (category: any) => category.id === data.team.categoryId
                );

                if (!categoryExists) {
                    throw new CustomError(
                        'Invalid category for this championship',
                        400,
                        'RegistrationServiceError'
                    );
                }
            }

            const existingTeam = await DatabaseHelper.findOne(
                Team,
                tenant,
                {
                    championshipId,
                    name: data.team.name,
                }
            );

            if (existingTeam) {
                throw new CustomError(
                    'A team with this name already exists in this championship',
                    400,
                    'RegistrationServiceError'
                );
            }

            for (const playerData of data.players) {
                const existingUserByEmail = await DatabaseHelper.findOne(
                    User,
                    tenant,
                    {
                        email: playerData.email.toLowerCase(),
                    }
                );

                if (existingUserByEmail) {
                    throw new CustomError(
                        `A user with email ${playerData.email} already exists`,
                        400,
                        'RegistrationServiceError'
                    );
                }

                if (playerData.nie) {
                    const existingUserByNie = await DatabaseHelper.findOne(
                        User,
                        tenant,
                        {
                            nie: playerData.nie.trim().toUpperCase(),
                        }
                    );

                    if (existingUserByNie) {
                        throw new CustomError(
                            `A user with NIE ${playerData.nie} already exists`,
                            400,
                            'RegistrationServiceError'
                        );
                    }
                }
            }

            for (const playerData of data.players) {
                const temporaryPassword = this.generateTemporaryPassword();


                const hashedPassword = await PasswordUtil.hashPassword(temporaryPassword);
                const normalizedNIE = playerData.nie?.trim().toUpperCase();

                const userPayload: Record<string, any> = {
                    name: playerData.name,
                    lastName: playerData.lastName,
                    email: playerData.email.toLowerCase(),
                    phone: playerData.phone,
                    password: hashedPassword,
                    role: 'team_member',
                    verified: true,
                    mustChangePassword: true,
                    createFromRegistration: true,
                    dummy: playerData.dummy ?? false,
                    stepper: [],
                    tag: [],
                    socialNetwork: [],
                };

                if (normalizedNIE) {
                    userPayload.nie = normalizedNIE;
                }
                const user = await DatabaseHelper.create(User, tenant, userPayload);

                createdUsers.push(user);

                const player = await DatabaseHelper.create(
                    Player,
                    tenant,
                    {
                        userId: user._id,
                        clubId: playerData.clubId,
                        position: playerData.position,
                        eps: playerData.eps,
                        gender: playerData.gender,
                        dateOfBirth: playerData.dateOfBirth,
                        number: playerData.number,
                        status: 'active',
                        isIndependent: !playerData.clubId,
                        isTeamMember: true,
                        memberSince: new Date(),
                        lastActive: new Date(),
                    }
                );

                createdPlayers.push(player);

                createdCredentials.push({
                    email: playerData.email,
                    name: `${playerData.name} ${playerData.lastName || ''}`.trim(),
                    temporaryPassword,
                });
            }

            const captain = data.team.captainEmail
                ? createdPlayers.find((player) => {
                    const user = createdUsers.find(
                        (createdUser) =>
                            createdUser._id.toString() ===
                            player.userId.toString()
                    );

                    return (
                        user?.email?.toLowerCase() ===
                        data.team.captainEmail?.toLowerCase()
                    );
                })
                : createdPlayers[0];

            createdTeam = await DatabaseHelper.create(
                Team,
                tenant,
                {
                    championshipId,
                    name: data.team.name,
                    logo: data.team.logo! || {
                        url: env.IMAGE_NO_FOUND || null,
                        publicId: null,
                    },
                    categoryId: data.team.categoryId,
                    players: createdPlayers.map((player) => player._id),
                    captainId: captain?._id,
                    registrations: [],
                    participationHistory: [
                        {
                            championshipId,
                            year: new Date().getFullYear(),
                            position: 0,
                        },
                    ],
                    registrationType: 'public_link',
                    status: 'pending',
                }
            );

            registration = await DatabaseHelper.create(
                Registration,
                tenant,
                {
                    championshipId,
                    teamId: createdTeam._id,
                    registrationDate: new Date(),
                    registrationStatus: 'pending',
                    feePaid: false,
                    registrationDeadline: configuration.registrationDeadline,
                }
            );

            await DatabaseHelper.update(
                Team,
                createdTeam._id.toString(),
                tenant,
                {
                    registrations: [registration._id],
                }
            );

            const paymentData = {
                price: Number(configuration.registrationFee),
                description: `Inscripción al campeonato - Equipo ${createdTeam.name}`,
                track: registration._id.toString(),
                currency: configuration.currency,
            };

            const fullName = data.payerData.name?.trim() || '';
            const [firstName, ...lastNameParts] = fullName.split(' ');

            const payer = {
                role: 'admin',
                name: firstName,
                surname:
                    data.payerData.surname || lastNameParts.join(' '),
                email: data.payerData.email,
                areaCode: data.payerData.areaCode || '57',
                phoneNumber:
                    data.payerData.phoneNumber || data.payerData.phone,
                address: data.payerData.address || '',
            };

            const paymentLink = await generate_link(
                {},
                null,
                paymentData,
                tenant,
                payer
            );

            if (!paymentLink || paymentLink.error) {
                throw new CustomError(
                    'Error generating payment link',
                    500,
                    'RegistrationServiceError'
                );
            }

            for (const credential of createdCredentials) {
                await this.emailService.sendTemporaryPasswordEmail({
                    email: credential.email,
                    name: credential.name,
                    temporaryPassword: credential.temporaryPassword,
                    tenant,
                    locale: 'es',
                });
            }

            const consumedInvitationLink =
                await DatabaseHelper.findOneAndUpdate(
                    InvitationLink,
                    tenant,
                    {
                        code,
                        isActive: true,
                        expiresAt: { $gt: new Date() },
                        $expr: {
                            $lt: ['$usedCount', '$maxUses'],
                        },
                    },
                    {
                        $inc: {
                            usedCount: 1,
                        },
                    },
                    { new: true }
                );

            if (
                !consumedInvitationLink ||
                consumedInvitationLink.usedCount >
                    consumedInvitationLink.maxUses
            ) {
                // The conditional update cannot overflow in MongoDB. Keep the
                // compensation as a defensive guard for non-atomic adapters.
                if (
                    consumedInvitationLink &&
                    consumedInvitationLink.usedCount >
                        consumedInvitationLink.maxUses
                ) {
                    await DatabaseHelper.findOneAndUpdate(
                        InvitationLink,
                        tenant,
                        {
                            code,
                            usedCount: consumedInvitationLink.usedCount,
                        },
                        {
                            $inc: {
                                usedCount: -1,
                            },
                        }
                    );
                }

                throw new CustomError(
                    'Invitation link is no longer available',
                    400,
                    'RegistrationServiceError'
                );
            }

            return {
                team: createdTeam,
                players: createdPlayers,
                registration,
                paymentLink,
                ...(env.NODE_ENV !== "production" && {
                    credentials: createdCredentials
                }),
            };
        } catch (error) {
            this.logger.error(
                'Error in public team registration:',
                error
            );

            if (registration) {
                await DatabaseHelper.delete(
                    Registration,
                    registration._id.toString(),
                    tenant
                );
            }

            if (createdTeam) {
                await DatabaseHelper.delete(
                    Team,
                    createdTeam._id.toString(),
                    tenant
                );
            }

            for (const player of createdPlayers) {
                await DatabaseHelper.delete(
                    Player,
                    player._id.toString(),
                    tenant
                );
            }

            for (const user of createdUsers) {
                await DatabaseHelper.delete(
                    User,
                    user._id.toString(),
                    tenant
                );
            }

            throw new CustomError(
                error instanceof Error
                    ? error.message
                    : 'Error registering team with players',
                500,
                'RegistrationServiceError'
            );
        }
    }

    public async validateInitialRegistration(
        tenant: string,
        code: string
    ): Promise<{ invitationLink: IInvitationLink; configuration: IConfigurationDocument }> {
        // 1. Validar el código de invitación
        const invitationLink = await DatabaseHelper.findOne(
            InvitationLink,
            tenant,
            { code: code },
            {
                select: [
                    'code',
                    'championshipId',
                    'isActive',
                    'maxUses',
                    'usedCount',
                    'expiresAt',
                ]
            }
        );

        if (!invitationLink) {
            throw new CustomError(
                'Invitation link not found',
                404,
                'RegistrationServiceError'
            );
        }

        if (!invitationLink.isActive) {
            throw new CustomError(
                'Invitation link is no longer active',
                400,
                'RegistrationServiceError'
            );
        }

        if (invitationLink.expiresAt.getTime() <= Date.now()) {
            throw new CustomError(
                'Invitation link has expired',
                400,
                'RegistrationServiceError'
            );
        }

        // 2. Verificar límite de usos
        if (invitationLink.usedCount >= invitationLink.maxUses) {
            throw new CustomError(
                'Invitation link has reached maximum uses',
                400,
                'RegistrationServiceError'
            );
        }

        // 3. Verificar que el campeonato siga aceptando inscripciones
        const championship = await DatabaseHelper.findOne(
            Championship,
            tenant,
            { _id: invitationLink.championshipId }
        );

        if (!championship) {
            throw new CustomError(
                'Championship not found',
                404,
                'RegistrationServiceError'
            );
        }

        if (championship.status !== REGISTRATION_CHAMPIONSHIP_STATUS) {
            throw new CustomError(
                'Championship is not accepting registrations',
                400,
                'RegistrationServiceError'
            );
        }

        // 4. Obtener configuración del campeonato
        const configuration = await DatabaseHelper.findOne(
            ChampionshipConfiguration,
            tenant,
            { championshipId: invitationLink.championshipId }
        );

        if (!configuration) {
            throw new CustomError('Championship configuration not found', 404, 'RegistrationServiceError');
        }

        // 5. Validar fecha límite
        if (new Date() > configuration.registrationDeadline) {
            throw new CustomError('Registration deadline has passed');
        }

        return { invitationLink, configuration };
    }



    async getRegistrationStatus(
        tenant: string,
        registrationId: string
    ): Promise<IRegistrationDocument> {
        const registration = await DatabaseHelper.findById(
            Registration,
            registrationId,
            tenant
        );

        if (!registration) {
            throw new CustomError('Registration not found', 404, 'RegistrationServiceError');
        }

        return registration;
    }

    async updateRegistrationStatus(tenant: string, updateData: { registrationId: string, status: 'pending' | 'confirmed' | 'rejected', transactionId: string }): Promise<void> {
        try {
            const { registrationId, status, transactionId } = updateData;

            const result = await DatabaseHelper.update(
                Registration,
                registrationId,
                tenant,
                { registrationStatus: status, paymentDate: new Date(), feePaid: true, transactionId: transactionId }
            );

            if (!result) {
                throw new Error('No se pudo actualizar el estado del registro');
            }

            this.logger.info('Estado del registro actualizado exitosamente', {
                registrationId,
                status,
                transactionId
            });
        } catch (error) {
            this.logger.error('Error actualizando el estado del registro', { error });
            throw new CustomError(
                `Error actualizando el estado del registro: ${error}`,
                500,
                'DatabaseError'
            );
        }

    }

    async getPaymentDetails(tenant: string, paymentId: string): Promise<PaymentResponse> {
        return getPaymentDetails(tenant, paymentId);
    }

    async deleteRegistrationId(registrationId: string, tenant: string): Promise<void> {
        await DatabaseHelper.delete(Registration, tenant, registrationId);
    }

    private generateTemporaryPassword(length = 10): string {
        const chars =
            'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$';

        let password = '';

        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return password;
    }

}
