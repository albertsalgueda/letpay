import { describe, it, expect } from 'vitest';

describe('MCP Server package', () => {
  it('loads without errors', async () => {
    const mod = await import('../src/index.js');
    expect(mod).toBeDefined();
  });
});
