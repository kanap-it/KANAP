import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceCheckService } from './reference-check.service';
import { SpendItem } from '../spend/spend-item.entity';
import { CapexItem } from '../capex/capex-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SpendItem, CapexItem])],
  providers: [ReferenceCheckService],
  exports: [ReferenceCheckService],
})
export class CommonModule {}
