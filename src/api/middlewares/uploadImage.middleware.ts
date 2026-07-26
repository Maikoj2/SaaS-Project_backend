import multer from 'multer';
import { Request } from 'express';
import { CustomError } from '../errors';

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

const storage = multer.memoryStorage();

const fileFilter = (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(
            new CustomError(
                'Invalid file type. Only JPEG, PNG and WEBP images are allowed',
                400,
                'UploadImageMiddlewareError'
            )
        );
    }

    cb(null, true);
};

export const uploadLogoImage = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
    },
});

export const uploadBannerImage = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
});