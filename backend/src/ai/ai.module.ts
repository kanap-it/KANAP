import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationsModule } from '../applications/applications.module';
import { AuditModule } from '../audit/audit.module';
import { AssetsModule } from '../assets/assets.module';
import { Subscription } from '../billing/subscription.entity';
import { BillingModule } from '../billing/billing.module';
import { CompaniesModule } from '../companies/companies.module';
import { ContractsModule } from '../contracts/contracts.module';
import { DepartmentsModule } from '../departments/departments.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { LocationsModule } from '../locations/locations.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { SpendModule } from '../spend/spend.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { Tenant } from '../tenants/tenant.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { UserRole } from '../users/user-role.entity';
import { UsersModule } from '../users/users.module';
import { AiApiKey } from './ai-api-key.entity';
import { AiApiKeysController } from './ai-api-keys.controller';
import { AiApiKeysService } from './ai-api-keys.service';
import { AiCapabilitiesController } from './ai-capabilities.controller';
import { AiChatController } from './ai-chat.controller';
import { AiChatOrchestratorService } from './ai-chat-orchestrator.service';
import { AiConversation } from './ai-conversation.entity';
import { AiConversationService } from './ai-conversation.service';
import { AiConversationsController } from './ai-conversations.controller';
import { AiEntityService } from './ai-entity.service';
import { AiMcpController } from './ai-mcp.controller';
import { AiMessage } from './ai-message.entity';
import { AiPolicyService } from './ai-policy.service';
import { AiProviderTestService } from './ai-provider-test.service';
import { AiSecretCipherService } from './ai-secret-cipher.service';
import { AiAdminOverviewController } from './ai-admin-overview.controller';
import { AiAdminOverviewService } from './ai-admin-overview.service';
import { AiSettingsController } from './ai-settings.controller';
import { AiSettings } from './ai-settings.entity';
import { AiSettingsService } from './ai-settings.service';
import { AiSystemPromptService } from './ai-system-prompt.service';
import { AiToolRegistry } from './ai-tool.registry';
import { McpApiKeyAuthGuard } from './auth/mcp-api-key-auth.guard';
import { McpApiKeyHashService } from './auth/mcp-api-key-hash.service';
import { AiTenantExecutionService } from './execution/ai-tenant-execution.service';
import { AiProviderRegistry } from './providers/ai-provider-registry.service';
import { AnthropicAiProviderAdapter } from './providers/anthropic-ai-provider.adapter';
import { CustomAiProviderAdapter } from './providers/custom-ai-provider.adapter';
import { OllamaAiProviderAdapter } from './providers/ollama-ai-provider.adapter';
import { OpenAiProviderAdapter } from './providers/openai-ai-provider.adapter';
import { AiAggregateExecutor } from './query/ai-aggregate.executor';
import { AiQueryExecutor } from './query/ai-query.executor';
import { BraveSearchService } from './web-search/brave-search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiSettings,
      AiApiKey,
      AiConversation,
      AiMessage,
      UserRole,
      Subscription,
      Tenant,
    ]),
    ApplicationsModule,
    AuditModule,
    AssetsModule,
    BillingModule,
    CompaniesModule,
    ContractsModule,
    DepartmentsModule,
    KnowledgeModule,
    LocationsModule,
    PermissionsModule,
    PortfolioModule,
    SpendModule,
    SuppliersModule,
    TenantsModule,
    UsersModule,
  ],
  controllers: [
    AiCapabilitiesController,
    AiSettingsController,
    AiAdminOverviewController,
    AiChatController,
    AiConversationsController,
    AiApiKeysController,
    AiMcpController,
  ],
  providers: [
    AiTenantExecutionService,
    AiSecretCipherService,
    McpApiKeyHashService,
    AnthropicAiProviderAdapter,
    OpenAiProviderAdapter,
    OllamaAiProviderAdapter,
    CustomAiProviderAdapter,
    AiProviderRegistry,
    AiSettingsService,
    AiAdminOverviewService,
    AiApiKeysService,
    AiConversationService,
    AiPolicyService,
    AiProviderTestService,
    AiEntityService,
    AiQueryExecutor,
    AiAggregateExecutor,
    AiToolRegistry,
    BraveSearchService,
    McpApiKeyAuthGuard,
    AiChatOrchestratorService,
    AiSystemPromptService,
  ],
  exports: [
    AiTenantExecutionService,
    AiProviderRegistry,
    AiSettingsService,
    AiAdminOverviewService,
    AiApiKeysService,
    AiConversationService,
    AiPolicyService,
    AiProviderTestService,
    AiEntityService,
    AiQueryExecutor,
    AiAggregateExecutor,
    AiToolRegistry,
    McpApiKeyAuthGuard,
    AiChatOrchestratorService,
    AiSystemPromptService,
  ],
})
export class AiModule {}
