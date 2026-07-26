import { UploadApiResponse } from 'cloudinary';

import { CustomError } from '../../errors';

import { ITenantDocument, ITenantModel } from '../../interfaces';
import { Types } from 'mongoose';
import { DatabaseHelper } from '../../utils/database.helper';
import cloudinary from '../../config/cloudinary/cloudinary';

interface UploadImageOptions {
    folder: string;
    fileName?: string;
}

interface UploadImageResult {
    url: string;
    publicId: string;
}

export class UploadService {
    async uploadImage(
        file: Express.Multer.File,
        options: UploadImageOptions
    ): Promise<UploadImageResult> {
        if (!file) {
            throw new CustomError(
                'Image file is required',
                400,
                'UploadServiceError'
            );
        }

        const result = await this.uploadBufferToCloudinary(
            file.buffer,
            options.folder,
            options.fileName
        );

        return {
            url: result.secure_url,
            publicId: result.public_id,
        };
    }

    async deleteImage(publicId?: string): Promise<void> {
        if (!publicId) return;

        await cloudinary.uploader.destroy(publicId);
    }

    async uploadFileToModel<T extends ITenantDocument>(
        model: ITenantModel<T>,
        id: string,
        tenant: string,
        file: Express.Multer.File,
        type: 'logo' | 'banner' | 'avatar'
    ) {

        const modelDoc = await DatabaseHelper.findOne(
            model,
            tenant,
            {
                _id: new Types.ObjectId(id),
            }
        );

        if (!modelDoc) {
            throw new CustomError(`${model} not found`, 404, 'UploadServiceError');
        }


        const typePreviousPublicId: Record<string, string | undefined> = {
            logo: modelDoc.logo?.publicId,
            banner: modelDoc.banner?.publicId,
            avatar: modelDoc.avatar?.publicId,
        };

        const previousPublicId = typePreviousPublicId[type];

        const image = await this.uploadImage(file, { folder: `tenants/${tenant}/${model.collection.name}/${id}/${type}` });

        if (!image) {
            throw new CustomError(
                `Error uploading ${type}`,
                500,
                'UploadServiceError'
            );
        }

        const updatedModel = await DatabaseHelper.findOneAndUpdate(
            model,
            tenant,
            {
                _id: new Types.ObjectId(id),
            },
            {
                $set: {
                    [type]: image,
                },
            },
            {
                new: true,
            }
        );
        if (!updatedModel) {
            throw new CustomError(
                `Error updating ${type}`,
                500,
                'UploadServiceError'
            );
        }

        if (previousPublicId && previousPublicId !== image.publicId) {
            await this.deleteImage(previousPublicId);
        }

        return image;
    }

    private uploadBufferToCloudinary(
        buffer: Buffer,
        folder: string,
        fileName?: string
    ): Promise<UploadApiResponse> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    public_id: fileName,
                    resource_type: 'image',
                    overwrite: true,
                },
                (error, result) => {
                    if (error || !result) {
                        return reject(
                            new CustomError(
                                error?.message || 'Error uploading image',
                                500,
                                'UploadServiceError'
                            )
                        );
                    }

                    resolve(result);
                }
            );

            uploadStream.end(buffer);
        });
    }
}


