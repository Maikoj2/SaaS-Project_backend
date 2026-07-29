import { bootstrap } from './bootstrap';

bootstrap().catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
});