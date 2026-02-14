import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { PortfolioRequest } from './portfolio-request.entity';
import { PortfolioProject } from './portfolio-project.entity';
import { PortfolioActivity } from './portfolio-activity.entity';
import { PortfolioCriterion } from './portfolio-criterion.entity';
import { PortfolioCriterionValue } from './portfolio-criterion-value.entity';
import { PortfolioSettings } from './portfolio-settings.entity';
import { TeamMemberConfig } from './team-member-config.entity';
import { PortfolioSkill } from './portfolio-skill.entity';

// Request junction tables
import { PortfolioRequestTeam } from './portfolio-request-team.entity';
import { PortfolioRequestContact } from './portfolio-request-contact.entity';
import { PortfolioRequestDependency } from './portfolio-request-dependency.entity';
import { PortfolioRequestUrl } from './portfolio-request-url.entity';
import { PortfolioRequestAttachment } from './portfolio-request-attachment.entity';
import { PortfolioRequestProject } from './portfolio-request-project.entity';
import { PortfolioRequestCapex } from './portfolio-request-capex.entity';
import { PortfolioRequestOpex } from './portfolio-request-opex.entity';
import { PortfolioRequestBusinessProcess } from './portfolio-request-business-process.entity';

// Project junction tables
import { PortfolioProjectTeam } from './portfolio-project-team.entity';
import { PortfolioProjectContact } from './portfolio-project-contact.entity';
import { PortfolioProjectDependency } from './portfolio-project-dependency.entity';
import { PortfolioProjectUrl } from './portfolio-project-url.entity';
import { PortfolioProjectAttachment } from './portfolio-project-attachment.entity';
import { PortfolioProjectCapex } from './portfolio-project-capex.entity';
import { PortfolioProjectOpex } from './portfolio-project-opex.entity';

// Phase templates and project phases/milestones
import { PortfolioPhaseTemplate } from './portfolio-phase-template.entity';
import { PortfolioPhaseTemplateItem } from './portfolio-phase-template-item.entity';
import { PortfolioProjectPhase } from './portfolio-project-phase.entity';
import { PortfolioProjectMilestone } from './portfolio-project-milestone.entity';
import { PortfolioProjectTimeEntry } from './portfolio-project-time-entry.entity';
import { PortfolioProjectEffortAllocation } from './portfolio-project-effort-allocation.entity';
import { UserTimeMonthlyAggregate } from './user-time-monthly-aggregate.entity';

// Classification
import { PortfolioSource } from './portfolio-source.entity';
import { PortfolioCategory } from './portfolio-category.entity';
import { PortfolioStream } from './portfolio-stream.entity';
import { PortfolioTaskType } from './portfolio-task-type.entity';

// Teams
import { PortfolioTeam } from './portfolio-team.entity';

// Services (non-decomposed)
import { PortfolioRequestsService } from './portfolio-requests.service';
import { PortfolioCriteriaService } from './portfolio-criteria.service';
import { PortfolioSettingsService } from './portfolio-settings.service';
import { PortfolioSkillsService } from './portfolio-skills.service';
import { TeamMemberConfigService } from './team-member-config.service';
import { PortfolioPhaseTemplatesService } from './portfolio-phase-templates.service';
import { PortfolioClassificationService } from './portfolio-classification.service';
import { PortfolioTeamsService } from './portfolio-teams.service';
import { PortfolioCapacityReportService } from './services/portfolio-capacity-report.service';
import { PortfolioStatusChangeReportService } from './services/portfolio-status-change-report.service';

// Decomposed portfolio projects services
import {
  PortfolioProjectsService,
  PortfolioProjectsListService,
  PortfolioProjectsCrudService,
  PortfolioDependenciesService,
  PortfolioPhasesService,
  PortfolioMilestonesService,
  PortfolioTimesheetService,
  PortfolioAttachmentsService,
  PortfolioStatusService,
  PortfolioRoadmapService,
} from './services';
import { UserTimeAggregateService } from './services/user-time-aggregate.service';

// Controllers
import { PortfolioRequestsController } from './portfolio-requests.controller';
import { PortfolioProjectsController } from './portfolio-projects.controller';
import { PortfolioCriteriaController } from './portfolio-criteria.controller';
import { PortfolioSettingsController } from './portfolio-settings.controller';
import { PortfolioSkillsController } from './portfolio-skills.controller';
import { TeamMemberConfigController } from './team-member-config.controller';
import { PortfolioPhaseTemplatesController } from './portfolio-phase-templates.controller';
import { PortfolioClassificationController } from './portfolio-classification.controller';
import { PortfolioProjectTasksController } from './portfolio-project-tasks.controller';
import { PortfolioTeamsController } from './portfolio-teams.controller';
import { PortfolioCapacityReportController } from './portfolio-capacity-report.controller';
import { PortfolioRoadmapController } from './portfolio-roadmap.controller';
import { PortfolioStatusChangeReportController } from './portfolio-status-change-report.controller';

// CSV Services
import { PortfolioRequestsCsvService } from './portfolio-requests-csv.service';
import { PortfolioProjectsCsvService } from './portfolio-projects-csv.service';

// Dependencies
import { AuditModule } from '../audit/audit.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../common/storage/storage.module';
import { TasksModule } from '../tasks/tasks.module';
import { CsvModule } from '../common/csv';
import { NotificationsModule } from '../notifications/notifications.module';

const entities = [
  PortfolioRequest,
  PortfolioProject,
  PortfolioActivity,
  PortfolioCriterion,
  PortfolioCriterionValue,
  PortfolioSettings,
  TeamMemberConfig,
  PortfolioSkill,
  PortfolioRequestTeam,
  PortfolioRequestContact,
  PortfolioRequestDependency,
  PortfolioRequestUrl,
  PortfolioRequestAttachment,
  PortfolioRequestProject,
  PortfolioRequestCapex,
  PortfolioRequestOpex,
  PortfolioRequestBusinessProcess,
  PortfolioProjectTeam,
  PortfolioProjectContact,
  PortfolioProjectDependency,
  PortfolioProjectUrl,
  PortfolioProjectAttachment,
  PortfolioProjectCapex,
  PortfolioProjectOpex,
  PortfolioPhaseTemplate,
  PortfolioPhaseTemplateItem,
  PortfolioProjectPhase,
  PortfolioProjectMilestone,
  PortfolioProjectTimeEntry,
  PortfolioProjectEffortAllocation,
  UserTimeMonthlyAggregate,
  PortfolioSource,
  PortfolioCategory,
  PortfolioStream,
  PortfolioTaskType,
  PortfolioTeam,
];

@Module({
  imports: [
    TypeOrmModule.forFeature(entities),
    AuditModule,
    PermissionsModule,
    forwardRef(() => UsersModule),
    StorageModule,
    forwardRef(() => TasksModule),
    CsvModule,
    NotificationsModule,
  ],
  providers: [
    // Non-decomposed services
    PortfolioRequestsService,
    PortfolioCriteriaService,
    PortfolioSettingsService,
    PortfolioSkillsService,
    TeamMemberConfigService,
    PortfolioPhaseTemplatesService,
    PortfolioClassificationService,
    PortfolioTeamsService,
    PortfolioCapacityReportService,
    PortfolioStatusChangeReportService,
    // CSV services
    PortfolioRequestsCsvService,
    PortfolioProjectsCsvService,
    // Decomposed portfolio projects services (order matters for DI)
    PortfolioProjectsListService,
    PortfolioProjectsCrudService,
    PortfolioDependenciesService,
    PortfolioPhasesService,
    PortfolioMilestonesService,
    PortfolioTimesheetService,
    PortfolioAttachmentsService,
    PortfolioStatusService,
    PortfolioRoadmapService,
    UserTimeAggregateService,
    // Main facade service
    PortfolioProjectsService,
  ],
  controllers: [
    PortfolioRequestsController,
    PortfolioProjectsController,
    PortfolioCriteriaController,
    PortfolioSettingsController,
    PortfolioSkillsController,
    TeamMemberConfigController,
    PortfolioPhaseTemplatesController,
    PortfolioClassificationController,
    PortfolioProjectTasksController,
    PortfolioTeamsController,
    PortfolioCapacityReportController,
    PortfolioStatusChangeReportController,
    PortfolioRoadmapController,
  ],
  exports: [
    PortfolioRequestsService,
    PortfolioProjectsService,
    PortfolioCriteriaService,
    PortfolioRequestsCsvService,
    PortfolioProjectsCsvService,
    TypeOrmModule,
    UserTimeAggregateService,
  ],
})
export class PortfolioModule {}
