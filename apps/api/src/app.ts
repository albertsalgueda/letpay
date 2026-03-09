import { Hono } from 'hono';

export const app = new Hono();

app.get('/', (c) => c.json({ name: 'letpay-api', status: 'ok' }));
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));
