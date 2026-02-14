// Base utilities
export { PortfolioProjectsBaseService, ServiceOpts, PROJECT_STATUSES, STATUS_TRANSITIONS } from './portfolio-projects-base.service';

// Specialized sub-services
export { PortfolioProjectsListService } from './portfolio-projects-list.service';
export { PortfolioProjectsCrudService } from './portfolio-projects-crud.service';
export { PortfolioDependenciesService } from './portfolio-dependencies.service';
export { PortfolioPhasesService } from './portfolio-phases.service';
export { PortfolioMilestonesService } from './portfolio-milestones.service';
export { PortfolioTimesheetService } from './portfolio-timesheet.service';
export { PortfolioAttachmentsService } from './portfolio-attachments.service';
export { PortfolioStatusService } from './portfolio-status.service';
export { PortfolioRoadmapService } from './portfolio-roadmap.service';

// Main facade service
export { PortfolioProjectsService } from './portfolio-projects.service';
