import type { APIContext } from 'astro';
import { blogFeed } from '../../../lib/rss';

export const GET = (ctx: APIContext) => blogFeed('es', ctx);
