import { Controller, Delete, Get, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { validate as isUuid } from 'uuid';
import { SkipTenantTransaction } from '../common/skip-tenant-transaction.decorator';
import { McpApiKeyAuthGuard } from './auth/mcp-api-key-auth.guard';
import { AiToolRegistry } from './ai-tool.registry';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';
import { AiExecutionContext } from './ai.types';

@Controller('ai/mcp')
@SkipTenantTransaction()
export class AiMcpController {
  constructor(
    private readonly toolRegistry: AiToolRegistry,
    private readonly tenantExecutor: AiTenantExecutionService,
  ) {}

  private requireTenantId(req: Request): string {
    const tenantId = (req as any)?.tenant?.id;
    if (typeof tenantId !== 'string' || tenantId.trim() === '' || !isUuid(tenantId)) {
      throw new UnauthorizedException('Invalid tenant context.');
    }
    return tenantId;
  }

  private buildContext(req: Request): AiExecutionContext {
    return {
      tenantId: this.requireTenantId(req),
      userId: String((req as any)?.user?.sub || ''),
      isPlatformHost: (req as any)?.isPlatformHost === true,
      surface: 'mcp',
      authMethod: 'api_key',
      requestId: (req as any)?.id ?? null,
      aiApiKeyId: (req as any)?.user?.aiApiKeyId ?? null,
    };
  }

  @Post()
  @UseGuards(McpApiKeyAuthGuard)
  async handlePost(@Req() req: Request, @Res() res: Response) {
    const context = this.buildContext(req);

    const server = new McpServer({
      name: 'kanap-mcp',
      version: '1.0.0',
    });

    // Register tools
    const toolDefs = await this.tenantExecutor.runWithContext(context, async (ctx) => {
      return this.toolRegistry.getToolJsonSchemas(ctx);
    });

    for (const toolDef of toolDefs) {
      server.tool(
        toolDef.name,
        toolDef.description,
        toolDef.parameters as any,
        async (args: any) => {
          const result = await this.tenantExecutor.runWithContext(context, async (ctx) => {
            return this.toolRegistry.execute(ctx, toolDef.name, args);
          });
          return {
            content: [{ type: 'text' as const, text: JSON.stringify(result) }],
          };
        },
      );
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
    });

    res.on('close', () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  @Get()
  handleGet(@Res() res: Response) {
    res.status(405).json({ error: 'SSE transport not supported. Use POST with Streamable HTTP.' });
  }

  @Delete()
  handleDelete(@Res() res: Response) {
    res.status(405).json({ error: 'Session cleanup not supported in stateless mode.' });
  }
}
