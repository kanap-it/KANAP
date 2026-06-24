import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiMutationPreview } from '../ai-mutation-preview.entity';
import { AiActionRequestService } from './action-request/ai-action-request.service';
import { AiAgentApprovalLifecycleSweeperService } from './agent/ai-agent-approval-lifecycle-sweeper.service';
import { AiAgentWorkQueueService } from './agent/ai-agent-work-queue.service';
import { AiApprovalService } from './approval/ai-approval.service';
import { AiAutomationJobCatalogService } from './automation/ai-automation-job-catalog.service';
import { AiCapabilityRegistry } from './capability/ai-capability.registry';
import { AiReadonlyDiagnosticWorkflowService } from './diagnostics/ai-readonly-diagnostic-workflow.service';
import { AiCapabilityDispatcherService } from './dispatcher/ai-capability-dispatcher.service';
import { AiActionRequest } from './entities/ai-action-request.entity';
import { AiAgentAuditEvent } from './entities/ai-agent-audit-event.entity';
import { AiAgentDefinition } from './entities/ai-agent-definition.entity';
import { AiAgentTargetState } from './entities/ai-agent-target-state.entity';
import { AiAgentTrigger } from './entities/ai-agent-trigger.entity';
import { AiAgentWorkItem } from './entities/ai-agent-work-item.entity';
import { AiApproval } from './entities/ai-approval.entity';
import { AiApprovalPolicy } from './entities/ai-approval-policy.entity';
import { AiAutomationJobCatalog } from './entities/ai-automation-job-catalog.entity';
import { AiAutonomyCeiling } from './entities/ai-autonomy-ceiling.entity';
import { AiAutonomyRoutine } from './entities/ai-autonomy-routine.entity';
import { AiDecision } from './entities/ai-decision.entity';
import { AiEmergencyPause } from './entities/ai-emergency-pause.entity';
import { AiEvaluation } from './entities/ai-evaluation.entity';
import { AiEvidence } from './entities/ai-evidence.entity';
import { AiExternalMcpServer } from './entities/ai-external-mcp-server.entity';
import { AiExternalMcpToolSnapshot } from './entities/ai-external-mcp-tool-snapshot.entity';
import { AiLiveTestTarget } from './entities/ai-live-test-target.entity';
import { AiObservation } from './entities/ai-observation.entity';
import { AiRecommendation } from './entities/ai-recommendation.entity';
import { AiRun } from './entities/ai-run.entity';
import { AiRunStep } from './entities/ai-run-step.entity';
import { AiToolExecution } from './entities/ai-tool-execution.entity';
import { AiEvidenceService } from './evidence/ai-evidence.service';
import { AiLiveContractHarnessService } from './live-readiness/ai-live-contract-harness.service';
import { AiLiveTestTargetService } from './live-readiness/ai-live-test-target.service';
import { AiExternalMcpBridgeService } from './mcp/ai-external-mcp-bridge.service';
import { AiExternalMcpMockTransport } from './mcp/ai-external-mcp-mock-transport.service';
import { AiEmergencyPauseService } from './pause/ai-emergency-pause.service';
import { AiApprovalPolicyResolverService } from './policy/ai-approval-policy-resolver.service';
import { AiAutonomyCeilingService } from './policy/ai-autonomy-ceiling.service';
import { AiAutonomyDemotionService } from './policy/ai-autonomy-demotion.service';
import { AiAutonomyRoutineService } from './policy/ai-autonomy-routine.service';
import { AiAdapterConfig } from './providers/adapter-config.entity';
import { AiAdapterConfigService } from './providers/adapter-config.service';
import { AiProviderRegistryService } from './providers/provider-registry.service';
import { AiTenantSecretResolverService } from './providers/tenant-secret-resolver.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AiRun,
      AiRunStep,
      AiToolExecution,
      AiEvidence,
      AiAgentAuditEvent,
      AiAgentDefinition,
      AiAgentTrigger,
      AiAgentWorkItem,
      AiAgentTargetState,
      AiActionRequest,
      AiApproval,
      AiApprovalPolicy,
      AiAutomationJobCatalog,
      AiAutonomyCeiling,
      AiAutonomyRoutine,
      AiEmergencyPause,
      AiExternalMcpServer,
      AiExternalMcpToolSnapshot,
      AiLiveTestTarget,
      AiAdapterConfig,
      AiObservation,
      AiRecommendation,
      AiDecision,
      AiEvaluation,
      AiMutationPreview,
    ]),
  ],
  providers: [
    AiCapabilityRegistry,
    AiCapabilityDispatcherService,
    AiEvidenceService,
    AiAgentApprovalLifecycleSweeperService,
    AiAgentWorkQueueService,
    AiExternalMcpBridgeService,
    AiExternalMcpMockTransport,
    AiLiveContractHarnessService,
    AiLiveTestTargetService,
    AiActionRequestService,
    AiApprovalService,
    AiApprovalPolicyResolverService,
    AiAutonomyCeilingService,
    AiAutonomyDemotionService,
    AiAutonomyRoutineService,
    AiAutomationJobCatalogService,
    AiEmergencyPauseService,
    AiAdapterConfigService,
    AiTenantSecretResolverService,
    AiProviderRegistryService,
    AiReadonlyDiagnosticWorkflowService,
  ],
  exports: [
    AiCapabilityRegistry,
    AiCapabilityDispatcherService,
    AiEvidenceService,
    AiAgentApprovalLifecycleSweeperService,
    AiAgentWorkQueueService,
    AiExternalMcpBridgeService,
    AiExternalMcpMockTransport,
    AiLiveContractHarnessService,
    AiLiveTestTargetService,
    AiActionRequestService,
    AiApprovalService,
    AiApprovalPolicyResolverService,
    AiAutonomyCeilingService,
    AiAutonomyDemotionService,
    AiAutonomyRoutineService,
    AiAutomationJobCatalogService,
    AiEmergencyPauseService,
    AiAdapterConfigService,
    AiTenantSecretResolverService,
    AiProviderRegistryService,
    AiReadonlyDiagnosticWorkflowService,
  ],
})
export class AgentControlPlaneModule {}
