import { Hono } from 'hono';

export const healthRoutes = new Hono();

healthRoutes.get('/', (c) => c.json({ name: 'letpay-api', status: 'ok' }));
healthRoutes.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
