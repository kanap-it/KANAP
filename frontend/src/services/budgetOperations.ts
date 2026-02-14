import api from '../api';

export type BudgetColumn = 'budget' | 'revision' | 'follow_up' | 'landing';

export type BudgetColumnOperation = {
  sourceYear: number;
  sourceColumn: BudgetColumn;
  destinationYear: number;
  destinationColumn: BudgetColumn;
  percentageIncrease: number;
  overwrite: boolean;
  dryRun: boolean;
};

export type BudgetOperationResult = {
  itemId: string;
  itemName: string;
  sourceValue: number;
  currentDestinationValue: number;
  newValue: number;
};

export type BudgetOperationResponse = {
  success: boolean;
  dryRun: boolean;
  summary: {
    totalItems: number;
    processed: number;
    skipped: number;
    errors: number;
  };
  results: BudgetOperationResult[];
};

export const copyBudgetColumn = async (operation: BudgetColumnOperation): Promise<BudgetOperationResponse> => {
  const response = await api.post<BudgetOperationResponse>('/spend-items/budget-operations/copy-column', operation);
  return response.data;
};

export type AllocationCopyOperation = {
  sourceYear: number;
  destinationYear: number;
  overwrite: boolean;
  dryRun: boolean;
};

export type AllocationCopyResult = {
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
  action: 'copy' | 'skip_missing_source_version' | 'skip_no_source_allocations' | 'skip_destination_has_data' | 'error';
  message?: string;
};

export type AllocationCopyResponse = {
  success: boolean;
  dryRun: boolean;
  summary: {
    totalItems: number;
    processed: number;
    skipped: number;
    errors: number;
  };
  results: AllocationCopyResult[];
};

export const copyAllocations = async (operation: AllocationCopyOperation): Promise<AllocationCopyResponse> => {
  const response = await api.post<AllocationCopyResponse>('/spend-items/budget-operations/copy-allocations', operation);
  return response.data;
};

export type ClearColumnOperation = {
  year: number;
  column: BudgetColumn;
};

export type ClearColumnResponse = {
  success: boolean;
  summary: {
    totalItems: number;
    cleared: number;
    skipped: number;
    errors: number;
  };
};

export const clearBudgetColumn = async (operation: ClearColumnOperation): Promise<ClearColumnResponse> => {
  const response = await api.post<ClearColumnResponse>('/spend-items/budget-operations/clear-column', operation);
  return response.data;
};
