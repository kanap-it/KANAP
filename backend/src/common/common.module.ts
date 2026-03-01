import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceCheckService } from './reference-check.service';
import { ItemNumberService } from './item-number.service';
import { SpendItem } from '../spend/spend-item.entity';
import { CapexItem } from '../capex/capex-item.entity';
import { DocumentExportService } from './document-export.service';
import { DocumentExportController } from './document-export.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SpendItem, CapexItem])],
  controllers: [DocumentExportController],
  providers: [ReferenceCheckService, ItemNumberService, DocumentExportService],
  exports: [ReferenceCheckService, ItemNumberService, DocumentExportService],
})
export class CommonModule {}
