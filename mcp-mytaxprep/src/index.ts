import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Logger } from './utils/logger.js';
import { BrowserSession } from './browser/session.js';
import { registerTools } from './server.js';

async function main(): Promise<void> {
  // ── Initialize logger ───────────────────────────────────────────
  const logLevel = (process.env.LOG_LEVEL ?? 'info') as 'debug' | 'info' | 'warn' | 'error';
  const logger = new Logger(logLevel);
  logger.info('Starting MCP MyTAXPrep server', { logLevel });

  // ── Initialize browser session ──────────────────────────────────
  const headless = process.env.BROWSER_HEADLESS === 'true';
  const session = new BrowserSession(logger, headless);

  // Launch browser eagerly so it's ready when first tool is called
  try {
    await session.launch();
    logger.info('Browser session initialized');
  } catch (error) {
    logger.error('Failed to launch browser', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Continue anyway - tools will retry on first use
  }

  // ── Create MCP server ──────────────────────────────────────────
  const server = new Server(
    {
      name: 'mcp-mytaxprep',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register all tools
  registerTools(server, session, logger);
  logger.info('MCP tools registered');

  // ── Connect via stdio transport ─────────────────────────────────
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('MCP server connected via stdio transport');

  // ── Graceful shutdown ───────────────────────────────────────────
  const shutdown = async () => {
    logger.info('Shutting down MCP server');
    await session.close();
    await server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
