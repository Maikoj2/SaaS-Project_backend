declare module 'mongo-tenant' {
    import { Schema } from 'mongoose';
    function mongoTenant(schema: Schema): void;
    export = mongoTenant;
} 