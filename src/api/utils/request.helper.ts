import { Request } from 'express';
import * as UAParser from 'ua-parser-js';

export class RequestHelper {
    static getIP(req: Request): string {
        return req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress || 
               'Unknown';
    }

    static getBrowserInfo(req: Request): string {
        const ua = new UAParser.UAParser(req.headers['user-agent'] as string);
        const browser = ua.getBrowser();
        const os = ua.getOS();
        return `${browser.name}/${browser.version} (${os.name} ${os.version})`;
    }

    static getCountry(req: Request): string {
        // Puedes usar el header 'cf-ipcountry' si usas Cloudflare
        // o implementar tu propia lógica de geolocalización
        return req.headers['cf-ipcountry']?.toString() || 
               req.headers['x-country-code']?.toString() || 
               'Unknown';
    }
} 