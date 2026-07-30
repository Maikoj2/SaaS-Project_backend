import express, {
    type ErrorRequestHandler,
    type Request,
    type RequestHandler,
    type Response,
} from 'express';
import request from 'supertest';
import { Types } from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/api/config', () => ({
    env: {},
    Logger: class {
        error() {}
        info() {}
        warn() {}
        debug() {}
    },
}));

vi.mock('../../src/api/config/cloudinary/cloudinary', () => ({
    default: {
        uploader: {
            destroy: vi.fn(),
            upload_stream: vi.fn(),
        },
    },
}));

import { ChampionshipsRoutes } from '../../src/api/constants/apiRoutes/championship/championshipsRoutes';
import { CustomError } from '../../src/api/errors';
import {
    uploadBannerImage,
    uploadLogoImage,
} from '../../src/api/middlewares/uploadImage.middleware';
import Championship from '../../src/api/models/mongoose/championship/championship';
import { UploadService } from '../../src/api/services/upload/upload.service';
import { DatabaseHelper } from '../../src/api/utils/database.helper';

const TENANT = 'tenant-a';
const OTHER_TENANT = 'tenant-b';
const championshipId = new Types.ObjectId();
const previousLogo = {
    url: 'https://images.example/old-logo.webp',
    publicId: 'championship/old-logo',
};
const previousBanner = {
    url: 'https://images.example/old-banner.webp',
    publicId: 'championship/old-banner',
};
const newLogo = {
    url: 'https://images.example/new-logo.webp',
    publicId: 'championship/new-logo',
};
const newBanner = {
    url: 'https://images.example/new-banner.webp',
    publicId: 'championship/new-banner',
};
const imageFile = {
    buffer: Buffer.from('valid-image'),
    mimetype: 'image/webp',
    originalname: '../untrusted-name.webp',
} as Express.Multer.File;

function uploadApp(
    middleware: RequestHandler,
    fieldName = 'image',
) {
    const app = express();
    app.patch(
        '/upload',
        middleware,
        (req: Request, res: Response) => {
            res.status(200).json({
                fieldName: req.file?.fieldname,
                expectedFieldName: fieldName,
            });
        },
    );
    app.use(((error, _req, res, _next) => {
        const status =
            error instanceof CustomError ? error.statusCode : 400;
        res.status(status).json({ message: error.message });
    }) as ErrorRequestHandler);
    return app;
}

function installChampionshipDatabase(options: {
    tenant?: string;
    exists?: boolean;
    updateSucceeds?: boolean;
} = {}) {
    const tenant = options.tenant ?? TENANT;
    const championship = {
        _id: championshipId,
        logo: previousLogo,
        banner: previousBanner,
    };
    vi.spyOn(DatabaseHelper, 'findOne').mockImplementation(
        async (_model, requestedTenant) =>
            requestedTenant === tenant && options.exists !== false
                ? (championship as never)
                : null,
    );
    vi.spyOn(DatabaseHelper, 'findOneAndUpdate').mockImplementation(
        async (_model, requestedTenant, _query, update) => {
            if (
                requestedTenant !== tenant ||
                options.updateSucceeds === false
            ) {
                return null;
            }
            return {
                ...championship,
                ...('$set' in update ? update.$set : update),
            } as never;
        },
    );
    return championship;
}

describe('P0 - Championship image update contract', () => {
    afterEach(() => vi.restoreAllMocks());

    it('uses independent Championship logo and banner endpoints', () => {
        expect(ChampionshipsRoutes.CHAMPIONSHIPS_UPLOAD_LOGO).toBe(
            '/:championshipId/logo',
        );
        expect(ChampionshipsRoutes.CHAMPIONSHIPS_UPLOAD_BANNER).toBe(
            '/:championshipId/banner',
        );
    });

    it('updates only the logo reference', async () => {
        installChampionshipDatabase();
        const service = new UploadService();
        vi.spyOn(service, 'uploadImage').mockResolvedValue(newLogo);
        vi.spyOn(service, 'deleteImage').mockResolvedValue();

        const result = await service.uploadFileToModel(
            Championship,
            championshipId.toString(),
            TENANT,
            imageFile,
            'logo',
        );

        expect(result).toEqual(newLogo);
        expect(DatabaseHelper.findOneAndUpdate).toHaveBeenCalledWith(
            Championship,
            TENANT,
            { _id: championshipId },
            { $set: { logo: newLogo } },
            { new: true },
        );
    });

    it('updates only the banner reference', async () => {
        installChampionshipDatabase();
        const service = new UploadService();
        vi.spyOn(service, 'uploadImage').mockResolvedValue(newBanner);
        vi.spyOn(service, 'deleteImage').mockResolvedValue();

        const result = await service.uploadFileToModel(
            Championship,
            championshipId.toString(),
            TENANT,
            imageFile,
            'banner',
        );

        expect(result).toEqual(newBanner);
        expect(DatabaseHelper.findOneAndUpdate).toHaveBeenCalledWith(
            Championship,
            TENANT,
            { _id: championshipId },
            { $set: { banner: newBanner } },
            { new: true },
        );
    });

    it('rejects a missing Championship before uploading', async () => {
        installChampionshipDatabase({ exists: false });
        const service = new UploadService();
        const uploadImage = vi.spyOn(service, 'uploadImage');

        await expect(
            service.uploadFileToModel(
                Championship,
                championshipId.toString(),
                TENANT,
                imageFile,
                'logo',
            ),
        ).rejects.toMatchObject({ statusCode: 404 });
        expect(uploadImage).not.toHaveBeenCalled();
    });

    it('does not update a Championship from another tenant', async () => {
        installChampionshipDatabase();
        const service = new UploadService();
        const uploadImage = vi.spyOn(service, 'uploadImage');

        await expect(
            service.uploadFileToModel(
                Championship,
                championshipId.toString(),
                OTHER_TENANT,
                imageFile,
                'banner',
            ),
        ).rejects.toMatchObject({ statusCode: 404 });
        expect(uploadImage).not.toHaveBeenCalled();
        expect(DatabaseHelper.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('rejects a missing file', async () => {
        const service = new UploadService();
        await expect(
            service.uploadImage(undefined as unknown as Express.Multer.File, {
                folder: 'test',
            }),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it.each([
        ['image/jpeg', 'image.jpg'],
        ['image/png', 'image.png'],
        ['image/webp', 'image.webp'],
    ])('accepts supported MIME %s', async (contentType, filename) => {
        const response = await request(
            uploadApp(uploadLogoImage.single('image')),
        )
            .patch('/upload')
            .attach('image', Buffer.from('image'), {
                filename,
                contentType,
            });

        expect(response.status).toBe(200);
        expect(response.body.fieldName).toBe('image');
    });

    it('rejects an unsupported MIME type', async () => {
        const response = await request(
            uploadApp(uploadLogoImage.single('image')),
        )
            .patch('/upload')
            .attach('image', Buffer.from('not-an-image'), {
                filename: 'payload.txt',
                contentType: 'text/plain',
            });

        expect(response.status).toBe(400);
    });

    it('rejects a logo larger than 2 MB', async () => {
        const response = await request(
            uploadApp(uploadLogoImage.single('image')),
        )
            .patch('/upload')
            .attach('image', Buffer.alloc(2 * 1024 * 1024 + 1), {
                filename: 'large-logo.png',
                contentType: 'image/png',
            });

        expect(response.status).not.toBe(200);
    });

    it('accepts a banner between 2 MB and its 5 MB limit', async () => {
        const response = await request(
            uploadApp(uploadBannerImage.single('image')),
        )
            .patch('/upload')
            .attach('image', Buffer.alloc(3 * 1024 * 1024), {
                filename: 'banner.png',
                contentType: 'image/png',
            });

        expect(response.status).toBe(200);
    });

    it('rejects a banner larger than 5 MB', async () => {
        const response = await request(
            uploadApp(uploadBannerImage.single('image')),
        )
            .patch('/upload')
            .attach('image', Buffer.alloc(5 * 1024 * 1024 + 1), {
                filename: 'large-banner.png',
                contentType: 'image/png',
            });

        expect(response.status).not.toBe(200);
    });

    it('rejects arbitrary multipart file fields', async () => {
        const response = await request(
            uploadApp(uploadLogoImage.single('image')),
        )
            .patch('/upload')
            .attach('logo', Buffer.from('image'), {
                filename: 'logo.png',
                contentType: 'image/png',
            });

        expect(response.status).not.toBe(200);
    });

    it('keeps the previous reference when upload fails', async () => {
        installChampionshipDatabase();
        const service = new UploadService();
        vi.spyOn(service, 'uploadImage').mockRejectedValue(
            new CustomError('Upload failed', 500, 'UploadServiceError'),
        );
        const deleteImage = vi.spyOn(service, 'deleteImage');

        await expect(
            service.uploadFileToModel(
                Championship,
                championshipId.toString(),
                TENANT,
                imageFile,
                'logo',
            ),
        ).rejects.toThrow('Upload failed');
        expect(DatabaseHelper.findOneAndUpdate).not.toHaveBeenCalled();
        expect(deleteImage).not.toHaveBeenCalled();
    });

    it('deletes the newly uploaded image when the DB update fails', async () => {
        installChampionshipDatabase({ updateSucceeds: false });
        const service = new UploadService();
        vi.spyOn(service, 'uploadImage').mockResolvedValue(newLogo);
        const deleteImage = vi.spyOn(service, 'deleteImage').mockResolvedValue();

        await expect(
            service.uploadFileToModel(
                Championship,
                championshipId.toString(),
                TENANT,
                imageFile,
                'logo',
            ),
        ).rejects.toThrow('Error updating logo');
        expect(deleteImage).toHaveBeenCalledWith(newLogo.publicId);
    });

    it('keeps the new persisted image when old-image cleanup fails', async () => {
        installChampionshipDatabase();
        const service = new UploadService();
        vi.spyOn(service, 'uploadImage').mockResolvedValue(newLogo);
        vi.spyOn(service, 'deleteImage').mockRejectedValue(
            new Error('Cloudinary cleanup failed'),
        );

        await expect(
            service.uploadFileToModel(
                Championship,
                championshipId.toString(),
                TENANT,
                imageFile,
                'logo',
            ),
        ).resolves.toEqual(newLogo);
    });
});
