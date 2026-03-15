import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceCheckService } from './reference-check.service';
import { ItemNumberService } from './item-number.service';
import { SpendItem } from '../spend/spend-item.entity';
import { CapexItem } from '../capex/capex-item.entity';
import { DocumentExportService } from './document-export.service';
import { DocumentExportController } from './document-export.controller';
import { RemoteInlineImageImportService } from './remote-inline-image-import.service';
import { DocumentImportService } from './document-import.service';
import { VectorImageConversionService } from './vector-image-conversion.service';

@Module({
  imports: [TypeOrmModule.forFeature([SpendItem, CapexItem])],
  controllers: [DocumentExportController],
  providers: [
    ReferenceCheckService,
    ItemNumberService,
    DocumentExportService,
    RemoteInlineImageImportService,
    DocumentImportService,
    VectorImageConversionService,
  ],
  exports: [
    ReferenceCheckService,
    ItemNumberService,
    DocumentExportService,
    RemoteInlineImageImportService,
    DocumentImportService,
    VectorImageConversionService,
  ],
})
export class CommonModule {}
