import { Injectable, Logger, OnApplicationBootstrap, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ScheduledTask } from './scheduled-task.entity';
import { ScheduledTaskRun } from './scheduled-task-run.entity';

export interface TaskRegistration {
  name: string;
  description: string;
  defaultCron: string;
  handler: () => Promise<Record<string, any>>;
}

@Injectable()
export class ScheduledTasksService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScheduledTasksService.name);
  private readonly handlers = new Map<string, () => Promise<Record<string, any>>>();
  private readonly registrations: TaskRegistration[] = [];

  constructor(
    @InjectRepository(ScheduledTask)
    private readonly taskRepo: Repository<ScheduledTask>,
    @InjectRepository(ScheduledTaskRun)
    private readonly runRepo: Repository<ScheduledTaskRun>,
    private readonly dataSource: DataSource,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  register(opts: TaskRegistration) {
    this.registrations.push(opts);
    this.handlers.set(opts.name, opts.handler);
  }

  async onApplicationBootstrap() {
    for (const reg of this.registrations) {
      // Upsert: preserve user-customized cron/enabled
      const existing = await this.taskRepo.findOne({ where: { name: reg.name } });
      if (!existing) {
        await this.taskRepo.save({
          name: reg.name,
          description: reg.description,
          cron_expression: reg.defaultCron,
          enabled: true,
        });
      } else {
        // Update description only (preserve user's cron/enabled)
        if (existing.description !== reg.description) {
          await this.taskRepo.update({ name: reg.name }, { description: reg.description });
        }
      }

      const task = await this.taskRepo.findOneBy({ name: reg.name });
      if (task && task.enabled) {
        this.createCronJob(task.name, task.cron_expression);
      }
    }

    this.logger.log(`Registered ${this.registrations.length} scheduled tasks`);
  }

  private createCronJob(name: string, cronExpression: string) {
    try {
      // Remove existing job if any
      try { this.schedulerRegistry.deleteCronJob(name); } catch {}

      const job = new CronJob(cronExpression, () => {
        this.executeTask(name).catch(err => {
          this.logger.error(`[${name}] Unhandled execution error: ${err.message}`);
        });
      });

      this.schedulerRegistry.addCronJob(name, job);
      job.start();
      this.logger.log(`Cron job '${name}' scheduled: ${cronExpression}`);
    } catch (err: any) {
      this.logger.error(`Failed to create cron job '${name}': ${err.message}`);
    }
  }

  async executeTask(name: string): Promise<void> {
    const handler = this.handlers.get(name);
    if (!handler) {
      this.logger.warn(`No handler registered for task '${name}'`);
      return;
    }

    const startedAt = new Date();

    // Stale detection: mark old "running" entries as failed
    await this.dataSource.query(
      `UPDATE scheduled_task_runs
       SET status = 'failure', error = 'Timed out (stale run detected)', finished_at = now(),
           duration_ms = EXTRACT(EPOCH FROM (now() - started_at))::integer * 1000
       WHERE task_name = $1 AND status = 'running' AND started_at < now() - interval '1 hour'`,
      [name],
    );
    await this.dataSource.query(
      `UPDATE scheduled_tasks
       SET last_status = 'failure', updated_at = now()
       WHERE name = $1 AND last_status = 'running' AND last_run_at < now() - interval '1 hour'`,
      [name],
    );

    // Try advisory lock (session-level so it spans the full execution)
    const lockResult = await this.dataSource.query(
      `SELECT pg_try_advisory_lock(hashtext($1)) as acquired`,
      [name],
    );
    if (!lockResult[0]?.acquired) {
      this.logger.debug(`[${name}] Skipped: another instance holds the lock`);
      return;
    }

    try {
      // Insert run row
      const run = this.runRepo.create({
        task_name: name,
        status: 'running',
        started_at: startedAt,
      });
      await this.runRepo.save(run);

      // Update task status
      await this.taskRepo.update({ name }, {
        last_run_at: startedAt,
        last_status: 'running',
        updated_at: new Date(),
      });

      try {
        const summary = await handler();
        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();

        await this.runRepo.update({ id: run.id }, {
          status: 'success',
          finished_at: finishedAt,
          duration_ms: durationMs,
          summary: summary ?? null,
        });

        await this.taskRepo.update({ name }, {
          last_status: 'success',
          last_duration_ms: durationMs,
          updated_at: new Date(),
        });

        this.logger.log(`[${name}] Completed in ${durationMs}ms`);
      } catch (err: any) {
        const finishedAt = new Date();
        const durationMs = finishedAt.getTime() - startedAt.getTime();

        await this.runRepo.update({ id: run.id }, {
          status: 'failure',
          finished_at: finishedAt,
          duration_ms: durationMs,
          error: err.message || String(err),
        });

        await this.taskRepo.update({ name }, {
          last_status: 'failure',
          last_duration_ms: durationMs,
          updated_at: new Date(),
        });

        this.logger.error(`[${name}] Failed after ${durationMs}ms: ${err.message}`);
      }

      // Auto-prune old runs
      await this.dataSource.query(
        `DELETE FROM scheduled_task_runs WHERE task_name = $1 AND started_at < now() - interval '90 days'`,
        [name],
      );
    } finally {
      // Release session-level advisory lock
      await this.dataSource.query(
        `SELECT pg_advisory_unlock(hashtext($1))`,
        [name],
      ).catch(() => {});
    }
  }

  // ========== CRUD ==========

  async listTasks(): Promise<ScheduledTask[]> {
    return this.taskRepo.find({ order: { name: 'ASC' } });
  }

  async updateTask(name: string, patch: { cron_expression?: string; enabled?: boolean }): Promise<ScheduledTask> {
    const task = await this.taskRepo.findOneBy({ name });
    if (!task) throw new NotFoundException(`Task '${name}' not found`);

    if (patch.cron_expression !== undefined) {
      this.validateCron(patch.cron_expression);
      task.cron_expression = patch.cron_expression;
    }
    if (patch.enabled !== undefined) {
      task.enabled = patch.enabled;
    }
    task.updated_at = new Date();
    await this.taskRepo.save(task);

    // Reschedule or stop the cron job
    if (task.enabled && this.handlers.has(name)) {
      this.createCronJob(name, task.cron_expression);
    } else {
      try { this.schedulerRegistry.deleteCronJob(name); } catch {}
    }

    return task;
  }

  async getTaskRuns(name: string, page = 1, limit = 20): Promise<{ runs: ScheduledTaskRun[]; total: number }> {
    const task = await this.taskRepo.findOneBy({ name });
    if (!task) throw new NotFoundException(`Task '${name}' not found`);

    const [runs, total] = await this.runRepo.findAndCount({
      where: { task_name: name },
      order: { started_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { runs, total };
  }

  async triggerTask(name: string): Promise<void> {
    if (!this.handlers.has(name)) {
      throw new NotFoundException(`Task '${name}' not found or has no handler`);
    }

    // Fire and forget — don't block the HTTP request
    this.executeTask(name).catch(err => {
      this.logger.error(`[${name}] Manual trigger failed: ${err.message}`);
    });
  }

  private validateCron(expression: string) {
    try {
      // Use CronJob constructor to validate the expression
      new CronJob(expression, () => {});
    } catch {
      throw new BadRequestException(`Invalid cron expression: '${expression}'`);
    }
  }
}
