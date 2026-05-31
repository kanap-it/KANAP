import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AiExecutionContextWithManager } from '../../ai.types';
import { CapabilityContract, CapabilityEffect } from '../capability/capability-contract';
import { AiEmergencyPause } from '../entities/ai-emergency-pause.entity';

export type AiPauseCheckInput = {
  capabilityName: string;
  category: string;
  effect: CapabilityEffect;
};

@Injectable()
export class AiEmergencyPauseService {
  constructor(
    @InjectRepository(AiEmergencyPause)
    private readonly pauseRepo: Repository<AiEmergencyPause>,
  ) {}

  private repo(manager: EntityManager) {
    return manager.getRepository(AiEmergencyPause);
  }

  async createPause(
    context: AiExecutionContextWithManager,
    input: {
      scope?: 'tenant' | 'global';
      capabilityName?: string | null;
      category?: string | null;
      effect?: string | null;
      reason: string;
      expiresAt?: Date | null;
    },
  ): Promise<AiEmergencyPause> {
    const scope = input.scope ?? 'tenant';
    if (scope === 'global') {
      throw new ForbiddenException('Global emergency pause mutation requires a platform control path.');
    }
    const repo = this.repo(context.manager);
    return repo.save(repo.create({
      tenant_id: context.tenantId,
      scope,
      capability_name: input.capabilityName ?? null,
      category: input.category ?? null,
      effect: input.effect ?? null,
      active: true,
      reason: input.reason,
      actor_user_id: context.userId,
      actor_label: null,
      expires_at: input.expiresAt ?? null,
      revoked_at: null,
      created_at: new Date(),
    }));
  }

  async revokePause(
    context: AiExecutionContextWithManager,
    pauseId: string,
  ): Promise<AiEmergencyPause> {
    const repo = this.repo(context.manager);
    const pause = await repo.findOne({
      where: { id: pauseId, tenant_id: context.tenantId },
    });
    if (!pause) {
      throw new ForbiddenException('Emergency pause not found.');
    }
    pause.active = false;
    pause.revoked_at = new Date();
    return repo.save(pause);
  }

  async findActivePause(
    context: AiExecutionContextWithManager,
    input: AiPauseCheckInput,
  ): Promise<AiEmergencyPause | null> {
    const rows = await this.repo(context.manager).createQueryBuilder('pause')
      .where('(pause.tenant_id = :tenantId OR pause.tenant_id IS NULL)', { tenantId: context.tenantId })
      .andWhere('pause.active = true')
      .andWhere('(pause.expires_at IS NULL OR pause.expires_at > now())')
      .andWhere('(pause.capability_name IS NULL OR pause.capability_name = :capabilityName)', {
        capabilityName: input.capabilityName,
      })
      .andWhere('(pause.category IS NULL OR pause.category = :category)', {
        category: input.category,
      })
      .andWhere('(pause.effect IS NULL OR pause.effect = :effect)', {
        effect: input.effect,
      })
      .orderBy('pause.created_at', 'DESC')
      .getMany();
    return rows[0] ?? null;
  }

  async assertNotPaused(
    context: AiExecutionContextWithManager,
    contract: CapabilityContract,
  ): Promise<void> {
    const pause = await this.findActivePause(context, {
      capabilityName: contract.name,
      category: contract.category,
      effect: contract.effect,
    });
    if (pause) {
      throw new ForbiddenException(`AI emergency pause is active: ${pause.reason}`);
    }
  }
}
