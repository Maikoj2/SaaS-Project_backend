import { NextFunction, Response } from 'express';
import { parse } from 'psl';

import { Logger } from '../../config/logger';
import { IUserCustomRequest } from '../../interfaces';
import { ApiResponse } from '../../responses';

const getExpeditiousCache = require('express-expeditious');
const redisEngine = require('expeditious-engine-redis');

const tenantCaches: Map<string, any> = new Map();
const logger = new Logger();

const parseDomain = (data: RegExpExecArray) => {
    try {
        return data[1]
    } catch (error) {
        logger.error('Error parsing domain:', error);
        return null;
    }
}

const checkDomain = async (req: IUserCustomRequest, res: Response, next: NextFunction) => {
    try {
        const origin = req.get('origin');

        if (!origin) {
            return res.status(400).json(
                ApiResponse.error('The origin must be specified for determining the tenant ')
            )
        }
        const re = /^(?:https?:)?(?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/ig;
        const result = re.exec(origin);
        const rawDomain = result ? parseDomain(result) : null;
        const clean = rawDomain ? parse(rawDomain) : null;
        const subDomain = (clean && 'subdomain' in clean) ? clean.subdomain : null;

        if (!subDomain) {
            return res.status(400).json(
                ApiResponse.error('The subdomain must be specified for determining the tenant ')
            )
        }

        req.clientAccount = subDomain;
        logger.debug('Domain check completed', {
            origin,
            clientAccount: req.clientAccount
        });

        next();
    } catch (error) {
        logger.error('Error processing clientAccount:', error);
        req.clientAccount = undefined;
        res.status(500).json(
            ApiResponse.error('internal server error to process the indenfy request ')
        )
    }
}

const checkTenant = async (req: IUserCustomRequest, res: Response, next: NextFunction) => {
    try {
        const tenant = req.clientAccount
        if (!tenant) {
            return res.status(400).json(
                ApiResponse.error('The tenant must be specified for determining the tenant ')
            )
        }
        if (process.env.USE_REDIS === 'true') {
            // if not exist a istance id reddis cache create a instance

            if (!tenantCaches.has(tenant)) {
                logger.info('Initializing Redis cache for tenant:', tenant);
                const tenantCacheInstance = getExpeditiousCache({
                    namespace: tenant,
                    defaultTld: '5 Minutes',
                    sessionAware: false,
                    engine: redisEngine({
                        host: process.env.REDIS_HOST,
                        port: process.env.REDIS_PORT
                    })
                })
                tenantCacheInstance.withNamespace(tenant)
                    .withTtlForStatus('1 minute', 404)

                tenantCaches.set(tenant, tenantCacheInstance)
            }
            const cacheMiddleware = tenantCaches.get(tenant)
            return cacheMiddleware(req, res, next);
        }
        next()
    } catch (error) {
        logger.error('Error checking tenant:', error);
        next()
    }
}

export default {
    checkDomain,
    checkTenant
}