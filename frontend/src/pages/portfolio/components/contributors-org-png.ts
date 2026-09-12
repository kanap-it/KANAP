// Renders the org chart to a PNG by redrawing it from the layout onto a canvas,
// the same approach as the project timeline and the roadmap generator. No DOM or
// SVG capture, so the image covers the WHOLE chart rather than the visible part
// of the scrollable frame, and the current zoom has no effect on it.
//
// The palette is the light one, always: an org chart exported from dark mode and
// pasted into a deck would be unreadable. It matches the print stylesheet.

const INK = '#111827';
const MUTED = '#6B7280';
const FAINT = '#9CA3AF';
const CARD_BORDER = '#D1D5DB';
const CONNECTOR = '#9CA3AF';
const SURFACE = '#FFFFFF';
const AVATAR_BG = '#1A6B7A';
const AVATAR_INK = '#FFFFFF';

const SANS = "'Inter Variable', Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace";

const CARD_PADDING_X = 10;
const AVATAR_SIZE = 18;
const AVATAR_GAP = 9;
const CAPTION_BLOCK = 26;

export type OrgPngNode = {
  name: string;
  jobTitle: string | null;
  contractType: string | null;
  skillCount: number;
  initials: string;
  left: number;
  top: number;
  /** Reports folded away on screen; drawn as a count so the image stays honest. */
  hiddenReports: number;
};

/** Elbow from a parent's bottom edge to a child's top edge. */
export type OrgPngLink = { fromX: number; fromY: number; midY: number; toX: number; toY: number };

export type ExportOrgChartParams = {
  nodes: OrgPngNode[];
  links: OrgPngLink[];
  /** Drawing size, padding included, as laid out on screen at 100%. */
  width: number;
  height: number;
  nodeWidth: number;
  nodeHeight: number;
  padding: number;
  /** Stamped in the bottom-left corner: the export date, already formatted. */
  caption: string;
  fileName: string;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Cuts to the box the way the CSS ellipsis does on screen. */
function fit(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) {
    cut = cut.slice(0, -1);
  }
  return `${cut}…`;
}

export async function exportOrgChartAsPng({
  nodes,
  links,
  width,
  height,
  nodeWidth,
  nodeHeight,
  padding,
  caption,
  fileName,
}: ExportOrgChartParams): Promise<void> {
  // Without this the first export can rasterize in the fallback font.
  if (document.fonts?.ready) await document.fonts.ready;

  const canvasWidth = Math.ceil(width);
  const canvasHeight = Math.ceil(height + CAPTION_BLOCK);

  const canvas = document.createElement('canvas');
  const scale = Math.max(1, Math.ceil(window.devicePixelRatio || 1));
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('PNG generation failed');
  ctx.scale(scale, scale);

  ctx.fillStyle = SURFACE;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.strokeStyle = CONNECTOR;
  ctx.lineWidth = 1;
  for (const link of links) {
    ctx.beginPath();
    // Half-pixel offsets keep the 1px elbows crisp instead of blurred over two rows.
    const fromX = Math.round(link.fromX) + 0.5;
    const toX = Math.round(link.toX) + 0.5;
    const midY = Math.round(link.midY) + 0.5;
    ctx.moveTo(fromX, Math.round(link.fromY) + 0.5);
    ctx.lineTo(fromX, midY);
    ctx.lineTo(toX, midY);
    ctx.lineTo(toX, Math.round(link.toY) + 0.5);
    ctx.stroke();
  }

  for (const node of nodes) {
    const { left, top } = node;

    ctx.fillStyle = SURFACE;
    ctx.strokeStyle = CARD_BORDER;
    ctx.lineWidth = 1;
    roundRect(ctx, left + 0.5, top + 0.5, nodeWidth - 1, nodeHeight - 1, 8);
    ctx.fill();
    ctx.stroke();

    const avatarX = left + CARD_PADDING_X + AVATAR_SIZE / 2;
    const avatarY = top + nodeHeight / 2;
    ctx.fillStyle = AVATAR_BG;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = AVATAR_INK;
    ctx.font = `500 9px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(node.initials, avatarX, avatarY + 0.5);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const textX = left + CARD_PADDING_X + AVATAR_SIZE + AVATAR_GAP;
    const textWidth = nodeWidth - (textX - left) - CARD_PADDING_X;

    // Same stack as the card: name, optional job title, then contract type with
    // the skill count pinned right. Centred as a block, like the flex row is.
    const lines = 2 + (node.jobTitle ? 1 : 0);
    const blockHeight = lines * 16;
    let baseline = top + (nodeHeight - blockHeight) / 2 + 12;

    ctx.fillStyle = INK;
    ctx.font = `500 13px ${SANS}`;
    ctx.fillText(fit(ctx, node.name, textWidth), textX, baseline);
    baseline += 16;

    if (node.jobTitle) {
      ctx.fillStyle = FAINT;
      ctx.font = `400 12px ${SANS}`;
      ctx.fillText(fit(ctx, node.jobTitle, textWidth), textX, baseline);
      baseline += 16;
    }

    ctx.fillStyle = FAINT;
    ctx.font = `400 12px ${MONO}`;
    const count = String(node.skillCount);
    const countWidth = ctx.measureText(count).width;
    ctx.fillText(count, textX + textWidth - countWidth, baseline);
    if (node.contractType) {
      ctx.font = `400 12px ${SANS}`;
      ctx.fillText(fit(ctx, node.contractType, textWidth - countWidth - 8), textX, baseline);
    }

    // A folded branch would otherwise read as a leaf once the chevron is gone.
    if (node.hiddenReports > 0) {
      const badgeX = left + nodeWidth / 2;
      const badgeY = top + nodeHeight;
      ctx.fillStyle = SURFACE;
      ctx.strokeStyle = CARD_BORDER;
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = MUTED;
      ctx.font = `400 10px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`+${node.hiddenReports}`, badgeX, badgeY + 0.5);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
  }

  ctx.fillStyle = MUTED;
  ctx.font = `400 11px ${SANS}`;
  ctx.fillText(caption, padding, height + 13);

  await new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('PNG generation failed'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
