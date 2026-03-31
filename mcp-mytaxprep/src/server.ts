import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { BrowserSession } from './browser/session.js';
import type { Logger } from './utils/logger.js';
import { AuthTools } from './tools/auth.tools.js';
import { ClientTools } from './tools/client.tools.js';
import { TaxDataTools } from './tools/tax-data.tools.js';
import { NavigationTools } from './tools/navigation.tools.js';

/**
 * Register all MCP tools on the server.
 */
export function registerTools(
  server: Server,
  session: BrowserSession,
  logger: Logger,
): void {
  const authTools = new AuthTools(session, logger);
  const clientTools = new ClientTools(session, logger);
  const taxDataTools = new TaxDataTools(session, logger);
  const navTools = new NavigationTools(session, logger);

  // ── Tool listing ──────────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'login',
        description: 'Login to MyTAXPrepOffice with username and password.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            username: { type: 'string' as const, description: 'MyTAXPrepOffice username' },
            password: { type: 'string' as const, description: 'MyTAXPrepOffice password' },
          },
          required: ['username', 'password'],
        },
      },
      {
        name: 'logout',
        description: 'Logout from MyTAXPrepOffice.',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      },
      {
        name: 'checkSession',
        description: 'Check if the browser is alive and the user is authenticated.',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      },
      {
        name: 'searchClient',
        description: 'Search for clients by name, SSN, or other criteria.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string' as const, description: 'Search query (name, SSN fragment, etc.)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'createClient',
        description: 'Create a new client in MyTAXPrepOffice.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            firstName: { type: 'string' as const, description: 'Client first name' },
            lastName: { type: 'string' as const, description: 'Client last name' },
            ssn: { type: 'string' as const, description: 'Social Security Number (XXX-XX-XXXX)' },
            dateOfBirth: { type: 'string' as const, description: 'Date of birth (MM/DD/YYYY)' },
            phone: { type: 'string' as const, description: 'Phone number' },
            email: { type: 'string' as const, description: 'Email address' },
            address: { type: 'string' as const, description: 'Street address' },
            city: { type: 'string' as const, description: 'City' },
            state: { type: 'string' as const, description: 'State (2-letter code)' },
            zip: { type: 'string' as const, description: 'ZIP code' },
            filingStatus: {
              type: 'string' as const,
              description: 'Filing status',
              enum: ['Single', 'Married Filing Jointly', 'Married Filing Separately', 'Head of Household', 'Qualifying Surviving Spouse'],
            },
          },
          required: ['firstName', 'lastName', 'ssn'],
        },
      },
      {
        name: 'readClientInfo',
        description: 'Read a client\'s information sheet (personal details, address, filing status).',
        inputSchema: {
          type: 'object' as const,
          properties: {
            clientName: { type: 'string' as const, description: 'Client name to search for' },
          },
          required: ['clientName'],
        },
      },
      {
        name: 'inputW2',
        description: 'Enter W-2 data for a client. Navigates to the client, then fills in W-2 boxes.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            clientName: { type: 'string' as const, description: 'Client name to find' },
            w2Data: {
              type: 'object' as const,
              description: 'W-2 data fields',
              properties: {
                employerEIN: { type: 'string' as const },
                employerName: { type: 'string' as const },
                employerAddress: { type: 'string' as const },
                employerCity: { type: 'string' as const },
                employerState: { type: 'string' as const },
                employerZip: { type: 'string' as const },
                employeeSSN: { type: 'string' as const },
                employeeName: { type: 'string' as const },
                box1: { type: 'string' as const, description: 'Wages, tips, other compensation' },
                box2: { type: 'string' as const, description: 'Federal income tax withheld' },
                box3: { type: 'string' as const, description: 'Social security wages' },
                box4: { type: 'string' as const, description: 'Social security tax withheld' },
                box5: { type: 'string' as const, description: 'Medicare wages and tips' },
                box6: { type: 'string' as const, description: 'Medicare tax withheld' },
                box16: { type: 'string' as const, description: 'State wages' },
                box17: { type: 'string' as const, description: 'State income tax' },
              },
            },
          },
          required: ['clientName', 'w2Data'],
        },
      },
      {
        name: 'readW2',
        description: 'Read existing W-2 data for a client.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            clientName: { type: 'string' as const, description: 'Client name to find' },
          },
          required: ['clientName'],
        },
      },
      {
        name: 'navigateTo',
        description: 'Navigate the browser to a named screen (dashboard, clients, newClient, returns, documents, settings) or a full URL.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            screen: {
              type: 'string' as const,
              description: 'Screen name or full URL. Named screens: dashboard, clients, newClient, returns, documents, settings.',
            },
          },
          required: ['screen'],
        },
      },
      {
        name: 'getCurrentScreen',
        description: 'Detect which screen the browser is currently showing.',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      },
      {
        name: 'takeScreenshot',
        description: 'Capture a screenshot of the current browser state.',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      },
    ],
  }));

  // ── Tool dispatch ─────────────────────────────────────────────────

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    logger.info(`Tool called: ${name}`, { args: args ? Object.keys(args) : [] });

    switch (name) {
      // Auth tools
      case 'login':
        return authTools.login(args as { username: string; password: string });
      case 'logout':
        return authTools.logout();
      case 'checkSession':
        return authTools.checkSession();

      // Client tools
      case 'searchClient':
        return clientTools.searchClient(args as { query: string });
      case 'createClient':
        return clientTools.createClient(args as any);
      case 'readClientInfo':
        return clientTools.readClientInfo(args as { clientName: string });

      // Tax data tools
      case 'inputW2':
        return taxDataTools.inputW2(args as any);
      case 'readW2':
        return taxDataTools.readW2(args as { clientName: string });

      // Navigation tools
      case 'navigateTo':
        return navTools.navigateTo(args as { screen: string });
      case 'getCurrentScreen':
        return navTools.getCurrentScreen();
      case 'takeScreenshot':
        return navTools.takeScreenshot();

      default:
        return {
          content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  });
}
