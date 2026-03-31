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
import { TasksModule } from '../tasks/tasks.module';
import { UserRole } from '../users/user-role.entity';
import { UsersModule } from '../users/users.module';
import { AiProviderSupportModule } from './ai-provider-support.module';
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
import { AiMutationPreview } from './ai-mutation-preview.entity';
import { AiMutationPreviewService } from './ai-mutation-preview.service';
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
import { AiDocumentMutationSupportService } from './mutation/ai-document-mutation-support.service';
import { AiMutationOperationRegistry } from './mutation/ai-mutation-operation.registry';
import { AiTaskMutationSupportService } from './mutation/ai-task-mutation-support.service';
import { AddTaskCommentAiMutationOperation } from './mutation/operations/add-task-comment.ai-mutation-operation';
import { CreateDocumentAiMutationOperation } from './mutation/operations/create-document.ai-mutation-operation';
import { UpdateDocumentContentAiMutationOperation } from './mutation/operations/update-document-content.ai-mutation-operation';
import { UpdateDocumentMetadataAiMutationOperation } from './mutation/operations/update-document-metadata.ai-mutation-operation';
import { UpdateDocumentRelationsAiMutationOperation } from './mutation/operations/update-document-relations.ai-mutation-operation';
import { UpdateTaskAssigneeAiMutationOperation } from './mutation/operations/update-task-assignee.ai-mutation-operation';
import { UpdateTaskStatusAiMutationOperation } from './mutation/operations/update-task-status.ai-mutation-operation';
import { AiAggregateExecutor } from './query/ai-aggregate.executor';
import { AiQueryExecutor } from './query/ai-query.executor';
import { PlatformAiModule } from './platform/platform-ai.module';
import { BraveSearchService } from './web-search/brave-search.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiSettings,
      AiApiKey,
      AiConversation,
      AiMessage,
      AiMutationPreview,
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
    AiProviderSupportModule,
    PlatformAiModule,
    PermissionsModule,
    PortfolioModule,
    SpendModule,
    SuppliersModule,
    TenantsModule,
    TasksModule,
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
    McpApiKeyHashService,
    AiSettingsService,
    AiAdminOverviewService,
    AiApiKeysService,
    AiConversationService,
    AiDocumentMutationSupportService,
    AiTaskMutationSupportService,
    CreateDocumentAiMutationOperation,
    UpdateDocumentContentAiMutationOperation,
    UpdateDocumentMetadataAiMutationOperation,
    UpdateDocumentRelationsAiMutationOperation,
    UpdateTaskStatusAiMutationOperation,
    UpdateTaskAssigneeAiMutationOperation,
    AddTaskCommentAiMutationOperation,
    AiMutationOperationRegistry,
    AiMutationPreviewService,
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
    AiSettingsService,
    AiAdminOverviewService,
    AiApiKeysService,
    AiConversationService,
    AiMutationPreviewService,
    AiPolicyService,
    AiProviderTestService,
    AiEntityService,
    AiQueryExecutor,
    AiAggregateExecutor,
    AiToolRegistry,
    McpApiKeyAuthGuard,
    AiChatOrchestratorService,
    AiSystemPromptService,
    AiProviderSupportModule,
  ],
})
export class AiModule {}
