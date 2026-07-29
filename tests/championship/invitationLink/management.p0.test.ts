import { Types } from 'mongoose';
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

vi.mock('../../../src/api/config', () => ({
    env: {
        IMAGE_NO_FOUND: null,
        NODE_ENV: 'test',
    },
    Logger: class {
        info() {}
        error() {}
        warn() {}
        debug() {}
    },
}));

vi.mock('../../../src/api/config/logger/WinstonLogger', () => ({
    Logger: class {
        info() {}
        error() {}
        warn() {}
        debug() {}
    },
}));

vi.mock('../../../src/api/plugin/mercadopago', () => ({
    generate_link: vi.fn(),
    getPaymentDetails: vi.fn(),
}));

vi.mock('../../../src/api/services/email/email.service', () => ({
    EmailService: class {
        sendTemporaryPasswordEmail = vi.fn();
    },
}));

import { InvitationLinkController } from '../../../src/api/controllers/championship/invitationLink.controller';
import type { IUserCustomRequest } from '../../../src/api/interfaces';
import InvitationLink from '../../../src/api/models/mongoose/championship/invitationLink';
import { InvitationLinkService } from '../../../src/api/services/championship/invitationLink.service';
import { RegistrationService } from '../../../src/api/services/championship/register.service';
import { DatabaseHelper } from '../../../src/api/utils/database.helper';

interface StoredLink {
    _id: Types.ObjectId;
    tenant: string;
    championshipId: Types.ObjectId;
    championshipName: string;
    code: string;
    expiresAt: Date;
    maxUses: number;
    usedCount: number;
    isActive: boolean;
}

const FIXED_NOW = new Date('2026-07-29T12:00:00.000Z');
const FUTURE = new Date('2026-08-01T12:00:00.000Z');
const PAST = new Date('2026-07-29T11:59:59.999Z');

function createLink(
    tenant: string,
    overrides: Partial<StoredLink> = {},
): StoredLink {
    return {
        _id: new Types.ObjectId(),
        tenant,
        championshipId: new Types.ObjectId(),
        championshipName: `Championship ${tenant}`,
        code: `code-${tenant}-${Math.random()}`,
        expiresAt: FUTURE,
        maxUses: 10,
        usedCount: 3,
        isActive: true,
        ...overrides,
    };
}

function modelName(model: unknown): string {
    return (model as { modelName?: string }).modelName ?? '';
}

function installDatabase(links: StoredLink[]) {
    vi.spyOn(DatabaseHelper, 'findOne').mockImplementation(
        async (
            model: any,
            tenant: string,
            query: Record<string, any>,
        ) => {
            if (modelName(model) !== modelName(InvitationLink)) {
                return null;
            }

            const link = links.find(
                (candidate) =>
                    candidate.tenant === tenant &&
                    (!query.championshipId ||
                        candidate.championshipId.toString() ===
                            query.championshipId.toString()) &&
                    (!query.code || candidate.code === query.code) &&
                    (query.isActive === undefined ||
                        candidate.isActive === query.isActive),
            );

            return link ? ({ ...link } as any) : null;
        },
    );

    vi.spyOn(DatabaseHelper, 'findOneAndUpdate').mockImplementation(
        async (
            model: any,
            tenant: string,
            query: Record<string, any>,
            update: Record<string, any>,
        ) => {
            if (modelName(model) !== modelName(InvitationLink)) {
                return null;
            }

            const link = links.find(
                (candidate) =>
                    candidate.tenant === tenant &&
                    (!query.championshipId ||
                        candidate.championshipId.toString() ===
                            query.championshipId.toString()) &&
                    (!query.code || candidate.code === query.code) &&
                    (query.isActive === undefined ||
                        candidate.isActive === query.isActive) &&
                    (!query.expiresAt ||
                        candidate.expiresAt >
                            (query.expiresAt.$gt as Date)) &&
                    (!query.$expr ||
                        candidate.usedCount < candidate.maxUses),
            );

            if (!link) return null;

            if (typeof update.isActive === 'boolean') {
                link.isActive = update.isActive;
            }
            if (update.$inc?.usedCount) {
                link.usedCount += update.$inc.usedCount;
            }

            return { ...link } as any;
        },
    );

    vi.spyOn(DatabaseHelper, 'getItemsWithRelations').mockImplementation(
        async (
            model: any,
            tenant: string,
            query: Record<string, any>,
            options: Record<string, any> = {},
        ) => {
            expect(modelName(model)).toBe(modelName(InvitationLink));
            expect(query).toEqual({});

            const tenantLinks = links.filter(
                (candidate) => candidate.tenant === tenant,
            );
            const page = options.page || 1;
            const limit = options.limit || 10;
            const start = (page - 1) * limit;
            const docs = tenantLinks
                .slice(start, start + limit)
                .map((link) => ({
                    championshipId: {
                        _id: link.championshipId,
                        name: link.championshipName,
                    },
                    expiresAt: link.expiresAt,
                    maxUses: link.maxUses,
                    usedCount: link.usedCount,
                    isActive: link.isActive,
                    code: link.code,
                }));

            return {
                docs,
                totalDocs: tenantLinks.length,
                limit,
                page,
                totalPages: Math.ceil(tenantLinks.length / limit),
            } as any;
        },
    );
}

function responseDouble() {
    const json = vi.fn();
    const status = vi.fn().mockReturnThis();
    return {
        response: { status, json },
        status,
        json,
    };
}

describe('P0 - InvitationLink management', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(FIXED_NOW);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('P0.1 returns complete stats for an active non-expired link', async () => {
        const link = createLink('tenant-a', {
            code: 'stats-code',
            maxUses: 10,
            usedCount: 3,
        });
        installDatabase([link]);

        const stats = await new InvitationLinkService().getLinkStats(
            'tenant-a',
            link.championshipId.toString(),
        );

        expect(stats).toEqual({
            usedCount: 3,
            maxUses: 10,
            remainingUses: 7,
            expiresAt: FUTURE,
            isActive: true,
            code: 'stats-code',
        });
    });

    it('P0.2 never exposes a negative remainingUses value', async () => {
        const link = createLink('tenant-a', {
            maxUses: 5,
            usedCount: 7,
        });
        installDatabase([link]);

        const stats = await new InvitationLinkService().getLinkStats(
            'tenant-a',
            link.championshipId.toString(),
        );

        expect(stats?.remainingUses).toBe(0);
    });

    describe('P0.3 stats represent the current isActive document', () => {
        it('returns null when no link exists', async () => {
            installDatabase([]);

            await expect(
                new InvitationLinkService().getLinkStats(
                    'tenant-a',
                    new Types.ObjectId().toString(),
                ),
            ).resolves.toBeNull();
        });

        it('returns null for an inactive link', async () => {
            const link = createLink('tenant-a', { isActive: false });
            installDatabase([link]);

            await expect(
                new InvitationLinkService().getLinkStats(
                    'tenant-a',
                    link.championshipId.toString(),
                ),
            ).resolves.toBeNull();
        });

        it('returns stats for an active but expired link', async () => {
            const link = createLink('tenant-a', { expiresAt: PAST });
            installDatabase([link]);

            const stats = await new InvitationLinkService().getLinkStats(
                'tenant-a',
                link.championshipId.toString(),
            );

            expect(stats).toMatchObject({
                code: link.code,
                isActive: true,
                expiresAt: PAST,
            });
        });

        it('returns stats for an active but exhausted link', async () => {
            const link = createLink('tenant-a', {
                maxUses: 5,
                usedCount: 5,
            });
            installDatabase([link]);

            const stats = await new InvitationLinkService().getLinkStats(
                'tenant-a',
                link.championshipId.toString(),
            );

            expect(stats).toMatchObject({
                code: link.code,
                usedCount: 5,
                maxUses: 5,
                remainingUses: 0,
            });
        });
    });

    it('P0.4 deactivates a link and blocks subsequent use and registration validation', async () => {
        const link = createLink('tenant-a', { code: 'deactivate-code' });
        installDatabase([link]);
        const invitationService = new InvitationLinkService();

        const deactivated = await invitationService.deactivateLink(
            'tenant-a',
            link.championshipId.toString(),
        );

        expect(deactivated).toMatchObject({ isActive: false });
        expect(link.isActive).toBe(false);
        await expect(
            invitationService.validateAndUpdateUsage(
                'tenant-a',
                link.code,
            ),
        ).rejects.toThrow('no longer active');
        await expect(
            new RegistrationService().validateInitialRegistration(
                'tenant-a',
                link.code,
            ),
        ).rejects.toThrow('no longer active');
        expect(link.usedCount).toBe(3);
    });

    it('P0.5 is idempotent: a second deactivation returns null and keeps the link inactive', async () => {
        const link = createLink('tenant-a');
        installDatabase([link]);
        const service = new InvitationLinkService();

        await expect(
            service.deactivateLink(
                'tenant-a',
                link.championshipId.toString(),
            ),
        ).resolves.toMatchObject({ isActive: false });
        await expect(
            service.deactivateLink(
                'tenant-a',
                link.championshipId.toString(),
            ),
        ).resolves.toBeNull();
        expect(link.isActive).toBe(false);
    });

    it('P0.6 does not expose tenant A stats to tenant B', async () => {
        const link = createLink('tenant-a', { code: 'tenant-a-secret' });
        installDatabase([link]);

        const stats = await new InvitationLinkService().getLinkStats(
            'tenant-b',
            link.championshipId.toString(),
        );

        expect(stats).toBeNull();
        expect(JSON.stringify(stats)).not.toContain('tenant-a-secret');
    });

    it('P0.7 does not let tenant B deactivate tenant A link', async () => {
        const link = createLink('tenant-a');
        installDatabase([link]);

        const result = await new InvitationLinkService().deactivateLink(
            'tenant-b',
            link.championshipId.toString(),
        );

        expect(result).toBeNull();
        expect(link.isActive).toBe(true);
    });

    it('P0.8 isolates getAllLinks by tenant and preserves pagination', async () => {
        const links = [
            createLink('tenant-a', { code: 'a-1' }),
            createLink('tenant-a', { code: 'a-2' }),
            createLink('tenant-b', { code: 'b-1' }),
        ];
        installDatabase(links);
        const service = new InvitationLinkService();

        const tenantA = await service.getAllLinks('tenant-a', {
            page: 1,
            limit: 1,
        });
        const tenantB = await service.getAllLinks('tenant-b', {
            page: 1,
            limit: 10,
        });

        expect(tenantA.docs.map((link: any) => link.code)).toEqual(['a-1']);
        expect(tenantA.totalDocs).toBe(2);
        expect(tenantA.totalPages).toBe(2);
        expect(tenantB.docs.map((link: any) => link.code)).toEqual(['b-1']);
        expect(tenantB.totalDocs).toBe(1);
    });

    it('P0.9 requests only the public management fields and Championship relation', async () => {
        const link = createLink('tenant-a');
        installDatabase([link]);

        const result = await new InvitationLinkService().getAllLinks(
            'tenant-a',
            { page: 1, limit: 10 },
        );

        expect(DatabaseHelper.getItemsWithRelations).toHaveBeenCalledWith(
            InvitationLink,
            'tenant-a',
            {},
            expect.objectContaining({
                select: [
                    'championshipId',
                    'expiresAt',
                    'maxUses',
                    'usedCount',
                    'isActive',
                    'code',
                ],
            }),
            {
                nested: [
                    {
                        path: 'championshipId',
                        select: 'name',
                    },
                ],
            },
        );
        expect(Object.keys(result.docs[0]).sort()).toEqual(
            [
                'championshipId',
                'expiresAt',
                'maxUses',
                'usedCount',
                'isActive',
                'code',
            ].sort(),
        );
        expect(result.docs[0].championshipId).toMatchObject({
            _id: link.championshipId,
            name: link.championshipName,
        });
    });

    it('P0.10 keeps active, inactive, expired, and exhausted links in administrative history', async () => {
        const links = [
            createLink('tenant-a', { code: 'active' }),
            createLink('tenant-a', {
                code: 'inactive',
                isActive: false,
            }),
            createLink('tenant-a', { code: 'expired', expiresAt: PAST }),
            createLink('tenant-a', {
                code: 'exhausted',
                maxUses: 1,
                usedCount: 1,
            }),
        ];
        installDatabase(links);

        const result = await new InvitationLinkService().getAllLinks(
            'tenant-a',
            { page: 1, limit: 10 },
        );

        expect(result.docs.map((link: any) => link.code)).toEqual([
            'active',
            'inactive',
            'expired',
            'exhausted',
        ]);
    });

    describe('controller contracts', () => {
        it('returns existing stats as HTTP 200 without a wrapper', async () => {
            const controller = new InvitationLinkController();
            const stats = {
                usedCount: 3,
                maxUses: 10,
                remainingUses: 7,
                expiresAt: FUTURE,
                isActive: true,
                code: 'stats-code',
            };
            Object.assign(controller as object, {
                invitationLinkService: {
                    getLinkStats: vi.fn().mockResolvedValue(stats),
                },
            });
            const { response, status, json } = responseDouble();

            await controller.getLinkStats(
                {
                    clientAccount: 'tenant-a',
                    params: { championshipId: 'championship-a' },
                } as unknown as IUserCustomRequest,
                response as never,
            );

            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(stats);
        });

        it('returns HTTP 200 with null when stats do not exist', async () => {
            const controller = new InvitationLinkController();
            Object.assign(controller as object, {
                invitationLinkService: {
                    getLinkStats: vi.fn().mockResolvedValue(null),
                },
            });
            const { response, status, json } = responseDouble();

            await controller.getLinkStats(
                {
                    clientAccount: 'tenant-a',
                    params: { championshipId: 'missing' },
                } as unknown as IUserCustomRequest,
                response as never,
            );

            expect(status).toHaveBeenCalledWith(200);
            expect(json).toHaveBeenCalledWith(null);
        });

        it('returns HTTP 200 after deactivation', async () => {
            const controller = new InvitationLinkController();
            const deactivateLink = vi.fn().mockResolvedValue({
                isActive: false,
            });
            Object.assign(controller as object, {
                invitationLinkService: { deactivateLink },
            });
            const { response, status } = responseDouble();

            await controller.deactivateLink(
                {
                    clientAccount: 'tenant-a',
                    params: { championshipId: 'championship-a' },
                } as unknown as IUserCustomRequest,
                response as never,
            );

            expect(deactivateLink).toHaveBeenCalledWith(
                'tenant-a',
                'championship-a',
            );
            expect(status).toHaveBeenCalledWith(200);
        });

        it('keeps HTTP deactivation idempotent when tenant has no matching link', async () => {
            const controller = new InvitationLinkController();
            const deactivateLink = vi.fn().mockResolvedValue(null);
            Object.assign(controller as object, {
                invitationLinkService: { deactivateLink },
            });
            const { response, status } = responseDouble();

            await controller.deactivateLink(
                {
                    clientAccount: 'tenant-b',
                    params: { championshipId: 'championship-a' },
                } as unknown as IUserCustomRequest,
                response as never,
            );

            expect(status).toHaveBeenCalledWith(200);
        });
    });
});
