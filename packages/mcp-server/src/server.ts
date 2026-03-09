import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { LetPayApiClient } from './api-client';
import { balanceTool } from './tools/balance';
import { payTool } from './tools/pay';
import { historyTool } from './tools/history';
import { requestTopupTool } from './tools/request-topup';

const tools = [balanceTool, payTool, historyTool, requestTopupTool];

export function createMcpServer(apiClient: LetPayApiClient) {
  const server = new Server(
    { name: 'letpay-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((t) => t.name === request.params.name);
    if (!tool) {
      return { content: [{ type: 'text' as const, text: `Unknown tool: ${request.params.name}` }], isError: true };
    }

    try {
      const result = await tool.handler(apiClient, request.params.arguments as any);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true };
    }
  });

  return server;
}

export async function startStdioServer(apiClient: LetPayApiClient) {
  const server = createMcpServer(apiClient);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
