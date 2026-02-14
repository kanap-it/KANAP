import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

/**
 * Validator function type
 */
type ValidatorFn = (
  value: any,
  tenantId: string,
  manager: EntityManager,
) => string[] | Promise<string[]>;

/**
 * Service for validating JSON fields in CSV imports.
 *
 * Provides named validators that can be referenced in field definitions.
 * Each validator returns an array of error messages (empty = valid).
 */
@Injectable()
export class CsvJsonValidators {
  /** Registered validators */
  private validators: Map<string, ValidatorFn> = new Map();

  constructor() {
    // Register built-in validators
    this.registerBuiltInValidators();
  }

  /**
   * Register a custom validator.
   *
   * @param name - Validator name
   * @param fn - Validation function
   */
  register(name: string, fn: ValidatorFn): void {
    this.validators.set(name, fn);
  }

  /**
   * Validate a value using a named validator.
   *
   * @param validatorName - Name of the validator to use
   * @param value - Value to validate
   * @param tenantId - Current tenant ID
   * @param manager - TypeORM EntityManager
   * @returns Array of error messages (empty = valid)
   */
  async validate(
    validatorName: string,
    value: any,
    tenantId: string,
    manager: EntityManager,
  ): Promise<string[]> {
    const validator = this.validators.get(validatorName);
    if (!validator) {
      return [`Unknown validator: ${validatorName}`];
    }

    return validator(value, tenantId, manager);
  }

  /**
   * Register built-in validators.
   */
  private registerBuiltInValidators(): void {
    // Portfolio criteria values validator
    this.register('portfolio_criteria', this.validatePortfolioCriteria.bind(this));

    // Generic object validator (checks it's a plain object)
    this.register('object', this.validateObject.bind(this));

    // Generic array validator (checks it's an array)
    this.register('array', this.validateArray.bind(this));
  }

  /**
   * Validate portfolio criteria values.
   *
   * Expects: { [criterionId: string]: valueId }
   * Validates that all criterion IDs exist in the tenant's portfolio_criteria table.
   */
  private async validatePortfolioCriteria(
    value: any,
    tenantId: string,
    manager: EntityManager,
  ): Promise<string[]> {
    const errors: string[] = [];

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return ['criteria_values must be an object'];
    }

    const criterionIds = Object.keys(value);
    if (criterionIds.length === 0) {
      return []; // Empty is valid
    }

    // Load valid criteria for this tenant
    const criteria = await manager.query(
      `SELECT id FROM portfolio_criteria WHERE tenant_id = $1`,
      [tenantId],
    );
    const validIds = new Set(criteria.map((c: any) => c.id));

    // Check each criterion ID
    for (const criterionId of criterionIds) {
      if (!validIds.has(criterionId)) {
        errors.push(`Unknown criterion ID: ${criterionId}`);
      }

      // Also validate the value ID exists for this criterion
      const valueId = value[criterionId];
      if (valueId) {
        const values = await manager.query(
          `SELECT id FROM portfolio_criterion_values WHERE criterion_id = $1`,
          [criterionId],
        );
        const validValueIds = new Set(values.map((v: any) => v.id));

        if (!validValueIds.has(valueId)) {
          errors.push(`Invalid value ID ${valueId} for criterion ${criterionId}`);
        }
      }
    }

    return errors;
  }

  /**
   * Validate that value is a plain object.
   */
  private validateObject(value: any): string[] {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return ['Value must be a plain object'];
    }
    return [];
  }

  /**
   * Validate that value is an array.
   */
  private validateArray(value: any): string[] {
    if (!Array.isArray(value)) {
      return ['Value must be an array'];
    }
    return [];
  }
}
