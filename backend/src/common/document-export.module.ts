import { Module } from '@nestjs/common';
import { CommonModule } from './common.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { DocumentExportController } from './document-export.controller';

/**
 * Le contrôleur d'export vit dans son propre module : il a besoin du résolveur
 * d'images inline (fourni par `KnowledgeModule`) en plus du service d'export
 * (fourni par `CommonModule`). Le placer dans `CommonModule` créerait un cycle,
 * puisque `KnowledgeModule` importe déjà `CommonModule`.
 */
@Module({
  imports: [CommonModule, KnowledgeModule],
  controllers: [DocumentExportController],
})
export class DocumentExportModule {}
