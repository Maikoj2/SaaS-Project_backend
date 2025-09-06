import validator from 'validator';
import { CustomError } from '../../errors';

export class SocialUrlValidator {
    static validateTwitterUrl(value: string): boolean {
        if (!value || value === '') return true;

        if (!validator.isURL(value, {
            protocols: ['http', 'https'],
            require_protocol: true
        })) {
            throw new CustomError('NOT_A_VALID_URL', 400, 'ValidationError');
        }

        const twitterRegex = /^https?:\/\/(www\.)?(twitter|x)\.com\//i;
        if (!twitterRegex.test(value)) {
            throw new CustomError('MUST_BE_TWITTER_URL', 400, 'ValidationError');
        }

        return true;
    }

    static validateFacebookUrl(value: string): boolean {
        if (!value || value === '') return true;

        if (!validator.isURL(value)) {
            throw new CustomError('NOT_A_VALID_URL', 400, 'ValidationError');
        }

        const facebookRegex = /^https?:\/\/(www\.)?facebook\.com\//i;
        if (!facebookRegex.test(value)) {
            throw new CustomError('MUST_BE_FACEBOOK_URL', 400, 'ValidationError');
        }

        return true;
    }

    static validateInstagramUrl(value: string): boolean {
        if (!value || value === '') return true;

        if (!validator.isURL(value)) {
            throw new CustomError('NOT_A_VALID_URL', 400, 'ValidationError');
        }

        const instagramRegex = /^https?:\/\/(www\.)?instagram\.com\//i;
        if (!instagramRegex.test(value)) {
            throw new CustomError('MUST_BE_INSTAGRAM_URL', 400, 'ValidationError');
        }

        return true;
    }

}