import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ToastClient } from './clients/toast.js';
import { registerOrdersTools } from './tools/orders.js';
import { registerMenusTools } from './tools/menus.js';
import { registerEmployeesTools } from './tools/employees.js';
import { registerLaborTools } from './tools/labor.js';
import { registerRestaurantTools } from './tools/restaurant.js';
import { registerPaymentsTools } from './tools/payments.js';
import { registerInventoryTools } from './tools/inventory.js';
import { registerCustomersTools } from './tools/customers.js';
import { registerReportingTools } from './tools/reporting.js';
import { registerCashTools } from './tools/cash.js';

/**
 * Toast MCP Server - Complete restaurant POS/management platform integration
 */

interface ToastServerConfig {
  apiKey?: string;
  clientId: string;
  clientSecret: string;
  restaurantGuid?: string;
  environment?: 'production' | 'sandbox';
  readOnly?: boolean;
}

// Strict parse of TOAST_READ_ONLY (ADR-0002). Safe-by-default: unknown values warn
// and default to read-only, so a typo can never silently enable writes.
export function parseReadOnly(raw: string | undefined): { value: boolean; warning: string | null } {
  if (raw === undefined || raw === '' || raw === 'true') return { value: true, warning: null };
  if (raw === 'false') return { value: false, warning: null };
  return {
    value: true,
    warning: `[Toast MCP] TOAST_READ_ONLY=${JSON.stringify(raw)} is not "true" or "false" (case-sensitive — use lowercase); defaulting to read-only mode`,
  };
}

export class ToastMCPServer {
  private server: Server;
  private client: ToastClient;
  private tools: Map<string, any>;
  private readOnly: boolean;

  constructor(config: ToastServerConfig) {
    this.server = new Server(
      {
        name: 'toast-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Toast client
    this.client = new ToastClient({
      apiKey: config.apiKey || '',
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      restaurantGuid: config.restaurantGuid,
      environment: config.environment || 'production',
    });

    // Resolve read-only mode: explicit config wins; otherwise strict env parse (ADR-0002).
    if (config.readOnly !== undefined) {
      this.readOnly = config.readOnly;
    } else {
      const parsed = parseReadOnly(process.env.TOAST_READ_ONLY);
      if (parsed.warning) console.error(parsed.warning);
      this.readOnly = parsed.value;
    }

    // Register all tools from all modules
    this.tools = new Map();
    this.registerAllTools();

    // Set up request handlers
    this.setupHandlers();

    // Error handling
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private registerAllTools() {
    const toolModules = [
      registerOrdersTools(this.client),
      registerMenusTools(this.client),
      registerEmployeesTools(this.client),
      registerLaborTools(this.client),
      registerRestaurantTools(this.client),
      registerPaymentsTools(this.client),
      registerInventoryTools(this.client),
      registerCustomersTools(this.client),
      registerReportingTools(this.client),
      registerCashTools(this.client),
    ];

    const skipped: string[] = [];
    for (const tools of toolModules) {
      for (const tool of tools) {
        if (this.readOnly && (tool as { mutates?: boolean }).mutates === true) {
          skipped.push(tool.name);
          continue;
        }
        this.tools.set(tool.name, tool);
      }
    }

    const mode = this.readOnly ? 'read-only' : 'read-write';
    const suffix = skipped.length > 0 ? `, ${skipped.length} write tools skipped` : '';
    console.error(`[Toast MCP] Registered ${this.tools.size} tools (mode: ${mode}${suffix})`);
    if (skipped.length > 0) {
      // Named so a contributor who accidentally tags a read tool with mutates:true
      // can spot it in the log instead of debugging "tool not found" from the client.
      console.error(`[Toast MCP] Skipped (read-only): ${skipped.sort().join(', ')}`);
    }
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Array.from(this.tools.values()).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema.shape
            ? {
                type: 'object',
                properties: Object.entries(tool.inputSchema.shape).reduce(
                  (acc, [key, value]: [string, any]) => {
                    acc[key] = {
                      type: value._def?.typeName === 'ZodString' ? 'string' :
                            value._def?.typeName === 'ZodNumber' ? 'number' :
                            value._def?.typeName === 'ZodBoolean' ? 'boolean' :
                            value._def?.typeName === 'ZodArray' ? 'array' :
                            value._def?.typeName === 'ZodObject' ? 'object' :
                            value._def?.typeName === 'ZodEnum' ? 'string' :
                            'string',
                      description: value.description || '',
                      ...(value._def?.typeName === 'ZodEnum' && {
                        enum: value._def.values,
                      }),
                      ...(value.isOptional() && {
                        optional: true,
                      }),
                    };
                    return acc;
                  },
                  {} as Record<string, any>
                ),
                required: Object.entries(tool.inputSchema.shape)
                  .filter(([_, value]: [string, any]) => !value.isOptional())
                  .map(([key]) => key),
              }
            : tool.inputSchema,
        })),
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = this.tools.get(request.params.name);

      if (!tool) {
        throw new Error(`Unknown tool: ${request.params.name}`);
      }

      // Defense-in-depth: ADR-0002 gates at registration, but if a mutating
      // tool ever reaches this.tools while readOnly is true (config injected
      // after construction, future code path, mistagged tool), refuse the call.
      if (this.readOnly && (tool as { mutates?: boolean }).mutates === true) {
        throw new Error(`Tool '${tool.name}' is a write tool and TOAST_READ_ONLY is in effect`);
      }

      try {
        // Validate input
        const validatedArgs = tool.inputSchema.parse(request.params.arguments || {});

        // Execute tool
        const result = await tool.handler(validatedArgs);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid arguments: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[Toast MCP] Server running on stdio');
  }
}

export default ToastMCPServer;
