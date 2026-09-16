import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { readStreamWithCaps, StreamLimitError } from '../common/bounded-stream';
import { ExportImageFetchOptions, MAX_IMAGE_BYTES_PER_IMAGE } from '../common/document-export.service';
import { StorageService } from '../common/storage/storage.service';
import { KnowledgeService } from './knowledge.service';

/**
 * Résolution interne des images inline de KANAP pour l'export.
 *
 * Le bouton Export de l'interface poste le markdown de l'éditeur à `POST /export` :
 * le service d'export n'a alors aucun contexte de document et téléchargeait ces
 * images par HTTP. Or les routes `inline` sont `@Public()` et s'autorisent par le
 * cookie `refresh_token` — que `POST /export` n'a jamais transmis — et le nom
 * d'hôte présent dans l'URL doit de surcroît correspondre à un tenant et figurer
 * dans la liste d'hôtes autorisés. D'où un 404 sur toute image inline.
 *
 * Ce résolveur supprime la dépendance au cookie **et** à l'hôte : il reconnaît les
 * chemins d'images internes quel que soit le domaine, lit l'attachement dans le
 * contexte tenant de l'appelant, applique exactement les mêmes règles d'accès que
 * la route publique (implémentations partagées dans `KnowledgeService`) et renvoie
 * les octets depuis le stockage.
 *
 * La famille `/ai/conversations/.../inline` est volontairement **hors périmètre** :
 * ces images ne sont pas des ressources de document et restent servies par HTTP.
 */

const INTERNAL_INLINE_PATTERNS: Array<{ family: InlineImageFamily; pattern: RegExp }> = [
  { family: 'document', pattern: /^\/knowledge\/inline\/([^/]+)\/([^/]+)\/?$/ },
  { family: 'project', pattern: /^\/portfolio\/projects\/inline\/([^/]+)\/([^/]+)\/?$/ },
  { family: 'request', pattern: /^\/portfolio\/requests\/inline\/([^/]+)\/([^/]+)\/?$/ },
  { family: 'task', pattern: /^\/tasks\/attachments\/([^/]+)\/([^/]+)\/inline\/?$/ },
];

const ATTACHMENT_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** Préfixe `/api` des routes exposées par nginx, absent en appel interne direct. */
const API_PREFIX_RE = /^\/api(?=\/)/;

export type InlineImageFamily = 'document' | 'project' | 'request' | 'task';

export type InlineImageContext = {
  manager: EntityManager;
  tenantId: string;
  userId: string;
};

export type ResolvedInlineImage = {
  buffer: Buffer;
  mimeType: string | null;
};

type Match = { family: InlineImageFamily; attachmentId: string };

@Injectable()
export class InlineImageResolverService {
  private readonly logger = new Logger(InlineImageResolverService.name);

  constructor(
    private readonly knowledge: KnowledgeService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Construit la fonction attendue par `DocumentExportService` pour un contexte
   * de requête donné. Renvoie `undefined` si le contexte est incomplet, ce qui
   * laisse l'export sur son comportement d'origine.
   */
  exporter(ctx: {
    manager?: EntityManager;
    tenantId?: string;
    userId?: string;
  }): ExportImageFetchOptions['resolveInlineImage'] | undefined {
    if (!ctx?.manager || !ctx?.tenantId || !ctx?.userId) return undefined;
    const { manager, tenantId, userId } = ctx;
    return (rawTarget: string) => this.resolve(rawTarget, { manager, tenantId, userId });
  }

  /**
   * Renvoie les octets de l'image interne désignée par `rawTarget`, ou `null` si
   * la cible n'est pas une image interne résoluble — auquel cas l'export retombe
   * sur son comportement habituel (validation de l'hôte puis téléchargement).
   */
  async resolve(rawTarget: string, ctx: InlineImageContext): Promise<ResolvedInlineImage | null> {
    const match = this.matchInternalInlinePath(rawTarget);
    if (!match) return null;

    const { manager, tenantId, userId } = ctx;
    if (!manager || !tenantId || !userId) return null;

    try {
      const meta = await this.lookupAttachment(match, manager, tenantId, userId);
      if (!meta) {
        this.logger.debug(`Inline export image not resolvable: ${match.family}/${match.attachmentId}`);
        return null;
      }

      const object = await this.storage.getObjectStream(meta.storagePath);
      const buffer = await readStreamWithCaps(
        { node: object.stream },
        { maxBytes: MAX_IMAGE_BYTES_PER_IMAGE },
      );

      return {
        buffer,
        mimeType: object.contentType || meta.mimeType || null,
      };
    } catch (error) {
      if (error instanceof StreamLimitError) {
        this.logger.warn(`Inline export image exceeds the per-image limit: ${match.attachmentId}`);
        return null;
      }
      this.logger.warn(
        `Inline export image resolution failed (${match.family}/${match.attachmentId}): ${String((error as Error)?.message || error)}`,
      );
      return null;
    }
  }

  /**
   * Reconnaît les quatre familles d'images internes par leur chemin, avec ou sans
   * préfixe `/api` (QA/prod, dev, import backend). L'hôte est ignoré : les octets
   * ne viennent que de notre stockage et l'accès est contrôlé plus bas.
   */
  matchInternalInlinePath(rawTarget: string): Match | null {
    const target = String(rawTarget || '').trim();
    if (!target) return null;

    let pathname: string;
    try {
      // Les cibles relatives sont résolues contre une base inerte : seul le chemin
      // nous intéresse.
      pathname = new URL(target, 'http://internal.invalid').pathname;
    } catch {
      return null;
    }

    const normalized = pathname.replace(API_PREFIX_RE, '');
    for (const { family, pattern } of INTERNAL_INLINE_PATTERNS) {
      const match = normalized.match(pattern);
      if (!match) continue;
      const attachmentId = decodeURIComponent(match[2]);
      if (!ATTACHMENT_ID_RE.test(attachmentId)) continue;
      return { family, attachmentId };
    }
    return null;
  }

  private async lookupAttachment(
    match: Match,
    manager: EntityManager,
    tenantId: string,
    userId: string,
  ): Promise<{ storagePath: string; mimeType: string | null } | null> {
    if (match.family === 'document') {
      // Règle knowledge : liaison incident / demande / projet prise en compte par
      // l'implémentation partagée avec la route publique.
      const meta = await this.knowledge.getInlineAttachmentMetaForUser(
        manager,
        tenantId,
        userId,
        match.attachmentId,
      );
      return meta ? { storagePath: meta.storagePath, mimeType: meta.mimeType } : null;
    }

    const table = match.family === 'project'
      ? 'portfolio_project_attachments'
      : match.family === 'request'
        ? 'portfolio_request_attachments'
        : 'task_attachments';
    const resource = match.family === 'project'
      ? 'portfolio_projects'
      : match.family === 'request'
        ? 'portfolio_requests'
        : 'tasks';

    // Restreint au tenant de l'appelant : une image d'un autre tenant ne peut pas
    // être résolue, quel que soit le slug présent dans l'URL.
    const rows = await manager.query(
      `SELECT storage_path, mime_type
       FROM ${table}
       WHERE id = $1
         AND tenant_id = $2
         AND source_field IS NOT NULL
       LIMIT 1`,
      [match.attachmentId, tenantId],
    ) as Array<{ storage_path: string; mime_type: string | null }>;
    if (!rows.length) return null;

    const allowed = await this.knowledge.canAccessResourceForUser(manager, userId, resource);
    if (!allowed) return null;

    return { storagePath: rows[0].storage_path, mimeType: rows[0].mime_type ?? null };
  }
}
