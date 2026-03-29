import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { validate as isUuid } from 'uuid';
import { AiExecutionContextWithManager } from '../ai.types';

const TASK_REF_RE = /^T-(\d+)$/i;

export type AiTaskSnapshot = {
  task_id: string;
  target_ref: string | null;
  target_title: string | null;
  status: string | null;
  assignee_user_id: string | null;
  assignee_label: string | null;
};

function buildTaskRef(itemNumber: number | null | undefined): string | null {
  return itemNumber ? `T-${itemNumber}` : null;
}

export function toDisplayStatus(value: string | null | undefined): string | null {
  if (!value) return null;
  return String(value).replace(/_/g, ' ');
}

export function toDisplayAssignee(value: string | null | undefined): string | null {
  return value ?? 'Unassigned';
}

@Injectable()
export class AiTaskMutationSupportService {
  private toTaskSnapshot(row: any): AiTaskSnapshot {
    return {
      task_id: row.id,
      target_ref: buildTaskRef(row.item_number ?? null),
      target_title: row.title ?? null,
      status: row.status ?? null,
      assignee_user_id: row.assignee_user_id ?? null,
      assignee_label: row.assignee_label ?? null,
    };
  }

  async resolveTaskSnapshot(
    context: AiExecutionContextWithManager,
    ref: string,
  ): Promise<AiTaskSnapshot> {
    const normalized = String(ref || '').trim();
    if (!normalized) {
      throw new BadRequestException('Task reference is required.');
    }

    let rows: any[] = [];
    if (isUuid(normalized)) {
      rows = await context.manager.query(
        `
        SELECT t.id,
               t.item_number,
               t.title,
               t.status,
               t.assignee_user_id,
               COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email) AS assignee_label
        FROM tasks t
        LEFT JOIN users u
          ON u.id = t.assignee_user_id
         AND u.tenant_id = t.tenant_id
        WHERE t.tenant_id = $1
          AND t.id = $2
        LIMIT 1
        `,
        [context.tenantId, normalized],
      );
    } else {
      const match = normalized.match(TASK_REF_RE);
      if (!match) {
        throw new BadRequestException('Task reference must be a task UUID or a T-123 style reference.');
      }
      rows = await context.manager.query(
        `
        SELECT t.id,
               t.item_number,
               t.title,
               t.status,
               t.assignee_user_id,
               COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email) AS assignee_label
        FROM tasks t
        LEFT JOIN users u
          ON u.id = t.assignee_user_id
         AND u.tenant_id = t.tenant_id
        WHERE t.tenant_id = $1
          AND t.item_number = $2
        LIMIT 1
        `,
        [context.tenantId, Number.parseInt(match[1], 10)],
      );
    }

    if (!rows[0]) {
      throw new NotFoundException('Task not found.');
    }

    return this.toTaskSnapshot(rows[0]);
  }

  async resolveAssignee(
    context: AiExecutionContextWithManager,
    assigneeEmail: string,
  ): Promise<{ id: string; email: string; label: string }> {
    const normalized = String(assigneeEmail || '').trim();
    if (!normalized) {
      throw new BadRequestException('Assignee email is required.');
    }

    const rows = await context.manager.query(
      `
      SELECT u.id,
             u.email,
             COALESCE(NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), ''), u.email) AS label
      FROM users u
      WHERE u.tenant_id = $1
        AND LOWER(u.email) = LOWER($2)
        AND u.status = 'enabled'
      LIMIT 1
      `,
      [context.tenantId, normalized],
    );

    if (!rows[0]) {
      throw new NotFoundException('Assignee not found.');
    }

    return rows[0];
  }
}
