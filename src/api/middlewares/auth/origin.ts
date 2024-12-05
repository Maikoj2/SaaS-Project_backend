import { NextFunction, Request, Response } from 'express';
import { parse } from 'psl';
import { CustomRequests } from '../../interfaces';
import { Logger } from '../../config/logger';

const getExpeditiousCache = require('express-expeditious');
const redisEngine = require('expeditious-engine-redis');

let cache: any = null;
const logger = new Logger();

const parseDomain = (data: RegExpExecArray) => {    
    try {
        return data[1]
    } catch (error) {
        logger.error('Error parsing domain:', error);
        return null;
    }
}

const checkDomain = async (req: CustomRequests, res: Response, next: NextFunction) => {
    try {
        const origin = req.get('origin');
        
        const re = /^(?:https?:)?(?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/ig;
        if (!origin) throw new Error('The origin must be specified');
        
        const result = re.exec(origin);
        const rawDomain = result ? parseDomain(result) : null;
        const clean = rawDomain ? parse(rawDomain) : null;

        (clean && 'subdomain' in clean) ?
            req.clientAccount = clean.subdomain || null : req.clientAccount = null;
            
        logger.debug('Domain check completed', { 
            origin, 
            clientAccount: req.clientAccount 
        });
        next();
    } catch (error) {
        logger.error('Error processing clientAccount:', error);
        req.clientAccount = null;
        next();
    }
}

const checkTenant = async (req: CustomRequests, res: Response, next: NextFunction) => {
    try {
        if (process.env.USE_REDIS === 'true') {
            if (!cache) {
                logger.info('Initializing Redis cache for tenant:', req.clientAccount);
                cache = getExpeditiousCache({
                    namespace: req.clientAccount,
                    defaultTld: '5 Minutes',
                    sessionAware: false,
                    engine: redisEngine({
                        host: process.env.REDIS_HOST,
                        port: process.env.REDIS_PORT
                    })
                })
                cache.withNamespace(req.clientAccount)
                    .withTtlForStatus('1 minute', 404)
            }
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