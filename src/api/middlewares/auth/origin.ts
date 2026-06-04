import { NextFunction, Response } from 'express';
import { parse } from 'psl';

import { Logger } from '../../config/logger';
import { ICustomRequest } from '../../interfaces';
import { env } from '../../config/env.config';

const getExpeditiousCache = require('express-expeditious');
const redisEngine = require('expeditious-engine-redis');

let cache: any = null;
const logger = new Logger();

const SYSTEM_SUBDOMAINS = new Set(
    (env.SYSTEM_SUBDOMAINS || 'api,www,admin,assets,static,app')
        .split(',')
        .map((s) => s.trim().toLowerCase())
);

const getSubdomain = (host: string | undefined): string | undefined => {
    if (!host) return undefined;

    // Clean port
    const hostname = host.split(':')[0].trim().toLowerCase();

    // Check if it is an IP address
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (ipRegex.test(hostname)) {
        return undefined;
    }

    // Fallback for localhost / local developments
    if (hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
        const parts = hostname.split('.');
        if (parts.length > 2) {
            return parts.slice(0, -2).join('.');
        }
        return undefined;
    }

    // Use psl for standard domains
    try {
        const parsed = parse(hostname);
        if (parsed && 'subdomain' in parsed && parsed.subdomain) {
            return parsed.subdomain;
        }
    } catch (error) {
        logger.error('PSL parsing error:', {
            name: error instanceof Error ? error.name : 'Error',
            message: error instanceof Error ? error.message : String(error)
        });
    }

    return undefined;
};

const checkDomain = async (req: ICustomRequest, res: Response, next: NextFunction) => {
    try {
        let tenant: string | undefined = undefined;

        // Priority 1: X-Tenant-ID or X-Tenant headers
        const headerTenant = (req.get('x-tenant-id') || req.get('x-tenant'))?.trim();

        // Priority 2: Host / Subdomain
        const hostHeader = req.get('host');
        const hostSubdomain = getSubdomain(hostHeader);

        // Check for header vs host mismatch
        if (headerTenant && hostSubdomain && !SYSTEM_SUBDOMAINS.has(hostSubdomain)) {
            if (headerTenant.toLowerCase() !== hostSubdomain.toLowerCase()) {
                return res.status(400).json({
                    success: false,
                    message: 'Tenant mismatch between header and host domain'
                });
            }
        }

        if (headerTenant) {
            tenant = headerTenant;
        } else if (hostSubdomain && !SYSTEM_SUBDOMAINS.has(hostSubdomain)) {
            tenant = hostSubdomain;
        } else {
            // Priority 3: Path parameters fallback (only for special public routes)
            const pathSegments = req.path.split('/');

            // Look for /verify/:tenant/:code
            const verifyIndex = pathSegments.indexOf('verify');
            if (verifyIndex !== -1 && verifyIndex + 1 < pathSegments.length) {
                tenant = pathSegments[verifyIndex + 1];
            }

            // Look for /reset-password/:tenant/:token
            const resetIndex = pathSegments.indexOf('reset-password');
            if (resetIndex !== -1 && resetIndex + 1 < pathSegments.length) {
                tenant = pathSegments[resetIndex + 1];
            }
        }

        // Validate resolved tenant
        if (!tenant || tenant.trim() === '' || SYSTEM_SUBDOMAINS.has(tenant.toLowerCase())) {
            throw new Error('Tenant not found');
        }

        req.clientAccount = tenant;

        logger.debug('Domain check completed successfully', {
            tenant: req.clientAccount
        });

        next();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid or missing tenant origin';
        logger.error('Error processing clientAccount:', {
            name: error instanceof Error ? error.name : 'Error',
            message
        });
        req.clientAccount = undefined;
        return res.status(403).json({
            success: false,
            message: 'Invalid or missing tenant origin'
        });
    }
};

const checkTenant = async (req: ICustomRequest, res: Response, next: NextFunction) => {
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