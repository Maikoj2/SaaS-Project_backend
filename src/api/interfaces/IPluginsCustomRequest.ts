import { Request } from 'express';
import { IPluginDocument } from '../models';
import { IUserDocument } from '../models/mongoose/user/User';


export interface IPluginsCustomRequest extends Request {
    // Usuario y autenticación
    user?: IUserDocument;
    clientAccount?: string;
    tenant?: string;
    token?: string;

    // Identificadores
    id?: string;
    _id?: string;
    pluginId?: string;

    // Roles y permisos
    role?: 'admin' | 'manager' | 'viewer';
    permissions?: string[];

    // Estado del plugin
    active?: boolean;
    version?: string;
    
    // Configuración
    settings?: Record<string, any>;
    config?: {
        enabled: boolean;
        options?: Record<string, any>;
    };

    // Eventos y acciones
    action?: string;
    eventType?: string;
    
    // Utilidades
    getLocale?: () => string;
    parentAccount?: string;
} 