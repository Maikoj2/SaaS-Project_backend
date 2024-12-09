import validator from 'validator';
import { ValidationError } from '../../errors';

export class SocialUrlValidator {
    static validateTwitterUrl(value: string): boolean {
        if (!value || value === '') return true;

        if (!validator.isURL(value, {
            protocols: ['http', 'https'],
            require_protocol: true
        })) {
            throw new ValidationError('NOT_A_VALID_URL');
        }

        const twitterRegex = /^https?:\/\/(www\.)?(twitter|x)\.com\//i;
        if (!twitterRegex.test(value)) {
            throw new ValidationError('MUST_BE_TWITTER_URL');
        }

        return true;
    }

    static validateFacebookUrl(value: string): boolean {
        if (!value || value === '') return true;

        if (!validator.isURL(value)) {
            throw new ValidationError('NOT_A_VALID_URL');
        }

        const facebookRegex = /^https?:\/\/(www\.)?facebook\.com\//i;
        if (!facebookRegex.test(value)) {
            throw new ValidationError('MUST_BE_FACEBOOK_URL');
        }

        return true;
    }

    static validateInstagramUrl(value: string): boolean {
        if (!value || value === '') return true;

        if (!validator.isURL(value)) {
            throw new ValidationError('NOT_A_VALID_URL');
        }

        const instagramRegex = /^https?:\/\/(www\.)?instagram\.com\//i;
        if (!instagramRegex.test(value)) {
            throw new ValidationError('MUST_BE_INSTAGRAM_URL');
        }

        return true;
    }

}