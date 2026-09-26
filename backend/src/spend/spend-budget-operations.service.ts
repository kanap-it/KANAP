import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, EntityManager, In, Raw, Repository } from 'typeorm';
import { SpendItem } from './spend-item.entity';
import { SpendVersion } from './spend-version.entity';
import { SpendAmount } from './spend-amount.entity';
import { SpendAllocation } from './spend-allocation.entity';
import { AllocationCalculatorService } from './allocation-calculator.service';
import { AuditService } from '../audit/audit.service';
import { FreezeColumn, FreezeService } from '../freeze/freeze.service';
import { toCents } from '../common/amount';
import {
  AmountMeasure,
  BUDGET_COLUMN_MEASURE,
  BudgetColumn,
  MEASURE_FREEZE_COLUMN,
  replaceAmounts,
  spreadAnnualRows,
  yearPeriods,
} from './amounts-write.util';
import { formatAllocationMethodLabel } from './allocation-utils';

@Injectable()
export class SpendBudgetOperationsService {
  constructor(
    @InjectRepository(SpendItem) private readonly spendItems: Repository<SpendItem>,
    @InjectRepository(SpendVersion) private readonly versions: Repository<SpendVersion>,
    @InjectRepository(SpendAmount) private readonly amounts: Repository<SpendAmount>,
    @InjectRepository(SpendAllocation) private readonly allocations: Repository<SpendAllocation>,
    private readonly audit: AuditService,
    private readonly freeze: FreezeService,
    private readonly allocationCalculator: AllocationCalculatorService,
  ) {}

  private mapFrontendColumnToFreeze(column: BudgetColumn): FreezeColumn {
    const measure = BUDGET_COLUMN_MEASURE[column];
    if (!measure) throw new Error(`Unsupported budget column '${column}'`);
    return MEASURE_FREEZE_COLUMN[measure];
  }

  async copyBudgetColumn(
    operation: {
      sourceYear: number;
      sourceColumn: BudgetColumn;
      destinationYear: number;
      destinationColumn: BudgetColumn;
      percentageIncrease: number;
      overwrite: boolean;
      dryRun: boolean;
    },
    userId: string | null,
    opts?: { manager?: EntityManager }
  ) {
    const mg = opts?.manager ?? this.spendItems.manager;
    const { sourceYear, sourceColumn, destinationYear, destinationColumn, percentageIncrease, overwrite, dryRun } = operation;

    await this.freeze.assertNotFrozen({
      scope: 'opex',
      column: this.mapFrontendColumnToFreeze(destinationColumn),
      year: destinationYear,
      action: 'Copy',
    }, { manager: mg });

    const columnMapping: Record<BudgetColumn, AmountMeasure> = BUDGET_COLUMN_MEASURE;
    // Freeze is checked once for the whole operation, not once per item.
    const checkedFreeze = new Set<string>();

    const spendItems = await mg.getRepository(SpendItem).find({
      where: {
        disabled_at: Raw((alias) => `${alias} IS NULL OR ${alias} > NOW()`),
      },
      order: { created_at: 'DESC' }
    });

    console.log(`Found ${spendItems.length} spend items for budget operation`);
    console.log(`Looking for source: ${sourceYear} ${sourceColumn}, destination: ${destinationYear} ${destinationColumn}`);

    const results = [];
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const spendItem of spendItems) {
      try {
        const sourceVersion = await mg.getRepository(SpendVersion).findOne({
          where: { spend_item_id: spendItem.id, budget_year: sourceYear }
        });

        if (!sourceVersion) {
          skipped++;
          console.log(`No source version found for item ${spendItem.product_name} year ${sourceYear}`);
          continue;
        }

        console.log(`Found source version ${sourceVersion.id} for ${spendItem.product_name}`);

        const sourceAmounts = await mg.getRepository(SpendAmount).find({
          where: { version_id: sourceVersion.id }
        });

        const sourceDbColumn = columnMapping[sourceColumn];
        const sourceValue = sourceAmounts.reduce((sum, amount) => sum + Number(amount[sourceDbColumn] || 0), 0);

        console.log(`Source amounts for ${spendItem.product_name}: ${sourceAmounts.length} records, column: ${sourceDbColumn}, total: ${sourceValue}`);

        let destinationVersion = await mg.getRepository(SpendVersion).findOne({
          where: { spend_item_id: spendItem.id, budget_year: destinationYear }
        });

        let currentDestinationValue = 0;
        if (destinationVersion) {
          const destinationAmounts = await mg.getRepository(SpendAmount).find({
            where: { version_id: destinationVersion.id }
          });
          const destDbColumn = columnMapping[destinationColumn];
          currentDestinationValue = destinationAmounts.reduce((sum, amount) => sum + Number(amount[destDbColumn] || 0), 0);
        }

        if (dryRun) {
          let newValue = sourceValue;
          if (percentageIncrease !== 0 && sourceValue !== 0) {
            newValue = newValue * (1 + percentageIncrease / 100);
          }
          newValue = Math.round(newValue);

          const wouldBeSkipped = sourceValue === 0 || (!overwrite && currentDestinationValue !== 0);

          results.push({
            itemId: spendItem.id,
            itemName: spendItem.product_name,
            sourceValue,
            currentDestinationValue,
            newValue: wouldBeSkipped ? currentDestinationValue : newValue,
          });

          if (wouldBeSkipped) {
            skipped++;
          } else {
            processed++;
          }
          continue;
        }

        if (sourceValue === 0) {
          skipped++;
          continue;
        }

        if (!overwrite && currentDestinationValue !== 0) {
          skipped++;
          continue;
        }

        let newValue = sourceValue;
        if (percentageIncrease !== 0) {
          newValue = newValue * (1 + percentageIncrease / 100);
        }
        newValue = Math.round(newValue);

        console.log(`Processing item ${spendItem.product_name}: ${sourceValue} -> ${newValue}`);

        results.push({
          itemId: spendItem.id,
          itemName: spendItem.product_name,
          sourceValue,
          currentDestinationValue,
          newValue,
        });

        if (!destinationVersion) {
          const versionPartial: DeepPartial<SpendVersion> = {
            spend_item_id: spendItem.id,
            budget_year: destinationYear,
            version_name: `Budget ${destinationYear}`,
            input_grain: 'annual',
            is_approved: false,
            as_of_date: `${destinationYear}-01-01`,
            allocation_method: 'default',
            tenant_id: spendItem.tenant_id,
          };

          destinationVersion = mg.getRepository(SpendVersion).create(versionPartial);
          destinationVersion = await mg.getRepository(SpendVersion).save(destinationVersion);

          console.log(`Created version ${destinationVersion.id} for year ${destinationYear}`);

          await this.audit.log({
            table: 'spend_versions',
            recordId: destinationVersion.id,
            action: 'create',
            before: null,
            after: destinationVersion,
            userId
          }, { manager: mg });
        }

        // Replace the destination measure only; the other measures keep their months.
        const dbColumnName = columnMapping[destinationColumn];
        await replaceAmounts(
          { manager: mg, freeze: this.freeze, scope: 'opex', version: destinationVersion!, checkedFreeze },
          destinationYear,
          spreadAnnualRows(destinationYear, { [dbColumnName]: toCents(newValue) }),
        );

        await this.audit.log({
          table: 'spend_items',
          recordId: spendItem.id,
          action: 'update',
          before: { [destinationColumn]: currentDestinationValue },
          after: { [destinationColumn]: newValue, operation: 'budget_column_copy', sourceYear, sourceColumn, destinationYear, destinationColumn, percentageIncrease },
          userId
        }, { manager: mg });

        processed++;
      } catch (error) {
        console.error(`Error processing item ${spendItem.id}:`, error);
        errors++;
      }
    }

    return {
      success: true,
      dryRun,
      summary: {
        totalItems: spendItems.length,
        processed,
        skipped,
        errors,
      },
      results: dryRun ? results : [],
    };
  }

  async copyAllocations(
    operation: {
      sourceYear: number;
      destinationYear: number;
      overwrite?: boolean;
      dryRun?: boolean;
    },
    userId: string | null,
    opts?: { manager?: EntityManager }
  ) {
    const mg = opts?.manager ?? this.spendItems.manager;
    const sourceYear = Number(operation?.sourceYear);
    const destinationYear = Number(operation?.destinationYear);
    const overwrite = Boolean(operation?.overwrite);
    const dryRun = Boolean(operation?.dryRun);

    if (!Number.isInteger(sourceYear) || !Number.isInteger(destinationYear)) {
      throw new Error('sourceYear and destinationYear are required integer values');
    }
    if (sourceYear === destinationYear) {
      throw new Error('Source year and destination year must be different');
    }

    const spendItems = await mg.getRepository(SpendItem).find({
      where: {
        disabled_at: Raw((alias) => `${alias} IS NULL OR ${alias} > NOW()`),
      },
      order: { created_at: 'DESC' }
    });

    type AllocationAction = 'copy' | 'skip_missing_source_version' | 'skip_no_source_allocations' | 'skip_destination_has_data' | 'error';
    type AllocationPreview = {
      itemId: string;
      itemName: string;
      sourceMethod: string | null;
      sourceMethodLabel: string;
      destinationMethod: string | null;
      destinationMethodLabel: string;
      resultMethod: string | null;
      resultMethodLabel: string;
      sourceAllocationsCount: number;
      destinationAllocationsCount: number;
      action: AllocationAction;
      message?: string;
    };

    const results: AllocationPreview[] = [];
    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const spendItem of spendItems) {
      try {
        const sourceVersion = await mg.getRepository(SpendVersion).findOne({
          where: { spend_item_id: spendItem.id, budget_year: sourceYear }
        });

        if (!sourceVersion) {
          if (dryRun) {
            results.push({
              itemId: spendItem.id,
              itemName: spendItem.product_name,
              sourceMethod: null,
              sourceMethodLabel: '',
              destinationMethod: null,
              destinationMethodLabel: '',
              resultMethod: null,
              resultMethodLabel: '',
              sourceAllocationsCount: 0,
              destinationAllocationsCount: 0,
              action: 'skip_missing_source_version',
              message: `No allocation data for ${sourceYear}`,
            });
          }
          skipped++;
          continue;
        }

        const sourceAllocations = await mg.getRepository(SpendAllocation).find({
          where: { version_id: sourceVersion.id }
        });
        const sourceManualAllocations = sourceAllocations.filter((alloc) => !alloc.is_system_generated);

        const sourceMethod = (sourceVersion.allocation_method as string | undefined) ?? 'default';
        const sourceMethodLabel = formatAllocationMethodLabel(sourceMethod);

        let destinationVersion = await mg.getRepository(SpendVersion).findOne({
          where: { spend_item_id: spendItem.id, budget_year: destinationYear }
        });

        let destinationAllocations: SpendAllocation[] = [];
        let destinationMethod: string | null = null;
        if (destinationVersion) {
          destinationAllocations = await mg.getRepository(SpendAllocation).find({
            where: { version_id: destinationVersion.id }
          });
          destinationMethod = (destinationVersion.allocation_method as string | undefined) ?? 'default';
        }
        const destinationManualAllocations = destinationAllocations.filter((alloc) => !alloc.is_system_generated);

        const destinationMethodLabel = formatAllocationMethodLabel(destinationMethod);

        const isSourceManual = sourceMethod === 'manual_company' || sourceMethod === 'manual_department' || sourceMethod === 'manual_pct';
        const hasSourceData = isSourceManual ? sourceManualAllocations.length > 0 : true;
        const hasDestinationData = destinationManualAllocations.length > 0;

        const sourceComputation = await this.allocationCalculator.computeForVersions([sourceVersion], { manager: mg });
        const sourceShareCount = sourceComputation.get(sourceVersion.id)?.shares.length ?? 0;

        let action: AllocationAction = 'copy';
        if (!hasSourceData) {
          action = 'skip_no_source_allocations';
        } else if (!overwrite && hasDestinationData) {
          action = 'skip_destination_has_data';
        }

        const resultMethod = action === 'copy' ? sourceMethod : destinationMethod;
        const resultMethodLabel = formatAllocationMethodLabel(resultMethod);

        if (dryRun) {
          results.push({
            itemId: spendItem.id,
            itemName: spendItem.product_name,
            sourceMethod,
            sourceMethodLabel,
            destinationMethod,
            destinationMethodLabel,
            resultMethod,
            resultMethodLabel,
            sourceAllocationsCount: sourceShareCount,
            destinationAllocationsCount: destinationManualAllocations.length,
            action,
            message: action === 'skip_destination_has_data' && !overwrite
              ? 'Destination already has allocations'
              : action === 'skip_no_source_allocations'
                ? 'No allocations in source year'
                : undefined,
          });
          if (action === 'copy') {
            processed++;
          } else {
            skipped++;
          }
          continue;
        }

        if (action !== 'copy') {
          skipped++;
          continue;
        }

        if (!destinationVersion) {
          const versionPartial: DeepPartial<SpendVersion> = {
            spend_item_id: spendItem.id,
            budget_year: destinationYear,
            version_name: `Budget ${destinationYear}`,
            input_grain: sourceVersion.input_grain ?? 'annual',
            is_approved: false,
            as_of_date: `${destinationYear}-01-01`,
            allocation_method: sourceMethod as any,
            tenant_id: spendItem.tenant_id,
            notes: sourceVersion.notes ?? null,
          };
          destinationVersion = mg.getRepository(SpendVersion).create(versionPartial);
          destinationVersion = await mg.getRepository(SpendVersion).save(destinationVersion);
          await this.audit.log({ table: 'spend_versions', recordId: destinationVersion.id, action: 'create', before: null, after: destinationVersion, userId }, { manager: mg });
        } else if ((destinationVersion.allocation_method as any) !== sourceMethod) {
          const beforeMethod = destinationVersion.allocation_method;
          await mg.getRepository(SpendVersion).update(destinationVersion.id, { allocation_method: sourceMethod as any });
          await this.audit.log({
            table: 'spend_versions',
            recordId: destinationVersion.id,
            action: 'update',
            before: { allocation_method: beforeMethod },
            after: { allocation_method: sourceMethod, operation: 'allocation_copy', sourceYear, destinationYear },
            userId
          }, { manager: mg });
          destinationVersion.allocation_method = sourceMethod as any;
        }

        if (destinationManualAllocations.length > 0) {
          await mg.getRepository(SpendAllocation).delete({ version_id: destinationVersion.id } as any);
        }
        const destIsManual = sourceMethod === 'manual_company' || sourceMethod === 'manual_department' || sourceMethod === 'manual_pct';
        if (destIsManual) {
          if (sourceManualAllocations.length === 0) {
            throw new Error(`Source item ${spendItem.product_name} has no manual allocations to copy.`);
          }
          const repo = mg.getRepository(SpendAllocation);
          const copies = sourceManualAllocations.map((alloc) => repo.create({
            tenant_id: destinationVersion!.tenant_id,
            version_id: destinationVersion!.id,
            company_id: alloc.company_id,
            department_id: alloc.department_id ?? null,
            allocation_pct: Number(alloc.allocation_pct || 0),
            is_system_generated: false,
            rule_id: null,
            materialized_from: null,
          }));
          await repo.save(copies);
        } else {
          await this.allocationCalculator.computeForVersions([destinationVersion], { manager: mg });
        }

        await this.audit.log({
          table: 'spend_allocations',
          recordId: destinationVersion.id,
          action: 'update',
          before: { count: destinationManualAllocations.length },
          after: { count: destIsManual ? sourceManualAllocations.length : 0, operation: 'allocation_copy', sourceYear, destinationYear, overwrite },
          userId
        }, { manager: mg });

        processed++;
      } catch (error) {
        errors++;
        console.error(`Failed to copy allocations for spend item ${(spendItem as any).id}:`, error);
        if (dryRun) {
          results.push({
            itemId: spendItem.id,
            itemName: spendItem.product_name,
            sourceMethod: null,
            sourceMethodLabel: '',
            destinationMethod: null,
            destinationMethodLabel: '',
            resultMethod: null,
            resultMethodLabel: '',
            sourceAllocationsCount: 0,
            destinationAllocationsCount: 0,
            action: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return {
      success: errors === 0,
      dryRun,
      summary: {
        totalItems: spendItems.length,
        processed,
        skipped,
        errors,
      },
      results: dryRun ? results : [],
    };
  }

  async clearBudgetColumn(
    operation: {
      year: number;
      column: BudgetColumn;
    },
    userId: string | null,
    opts?: { manager?: EntityManager }
  ) {
    const mg = opts?.manager ?? this.spendItems.manager;
    const { year, column } = operation;

    await this.freeze.assertNotFrozen({
      scope: 'opex',
      column: this.mapFrontendColumnToFreeze(column),
      year,
      action: 'Clear',
    }, { manager: mg });

    const dbColumnName = BUDGET_COLUMN_MEASURE[column];
    // Freeze is checked once for the whole operation, not once per item.
    const checkedFreeze = new Set<string>();

    const spendItems = await mg.getRepository(SpendItem).find({
      where: {
        disabled_at: Raw((alias) => `${alias} IS NULL OR ${alias} > NOW()`),
      },
      order: { created_at: 'DESC' }
    });

    console.log(`Found ${spendItems.length} spend items for clear operation`);
    console.log(`Clearing column ${column} (${dbColumnName}) for year ${year}`);

    let cleared = 0;
    let skipped = 0;
    let errors = 0;

    for (const spendItem of spendItems) {
      try {
        const version = await mg.getRepository(SpendVersion).findOne({
          where: { spend_item_id: spendItem.id, budget_year: year }
        });

        if (!version) {
          skipped++;
          continue;
        }

        const existingAmounts = await mg.getRepository(SpendAmount).find({
          where: { version_id: version.id }
        });

        if (existingAmounts.length === 0) {
          skipped++;
          continue;
        }

        const hasData = existingAmounts.some(amount => Number(amount[dbColumnName] || 0) !== 0);
        if (!hasData) {
          skipped++;
          continue;
        }

        const currentValue = existingAmounts.reduce((sum, amount) => sum + Number(amount[dbColumnName] || 0), 0);

        console.log(`Clearing ${spendItem.product_name}: ${dbColumnName} current value: ${currentValue}`);

        // Zero, not NULL: the twelve months of this measure only.
        await replaceAmounts(
          { manager: mg, freeze: this.freeze, scope: 'opex', version, checkedFreeze },
          year,
          yearPeriods(year).map((period) => ({ period, [dbColumnName]: 0n })),
        );

        await this.audit.log({
          table: 'spend_items',
          recordId: spendItem.id,
          action: 'update',
          before: { [column]: currentValue },
          after: { [column]: 0, operation: 'budget_column_clear', year, column },
          userId
        }, { manager: mg });

        cleared++;
      } catch (error) {
        console.error(`Error clearing item ${spendItem.id}:`, error);
        errors++;
      }
    }

    return {
      success: true,
      summary: {
        totalItems: spendItems.length,
        cleared,
        skipped,
        errors,
      },
    };
  }
}
