#!/usr/bin/env node
import { LetPayApiClient } from '../api-client';
import { startStdioServer } from '../server';

const apiKey = process.env.LETPAY_API_KEY;
const apiUrl = process.env.LETPAY_API_URL ?? 'http://localhost:3001';

if (!apiKey) {
  console.error('Error: LETPAY_API_KEY environment variable is required');
  console.error('Usage: LETPAY_API_KEY=lp_sk_... npx @letpay/mcp-server');
  process.exit(1);
}

const client = new LetPayApiClient({ baseUrl: apiUrl, apiKey });
startStdioServer(client).catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
