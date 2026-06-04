// Renders the project timeline Gantt to a PNG by redrawing it from data onto a
// canvas — the same approach as the roadmap generator export. This avoids any
// DOM/SVG capture (the SVAR Gantt is HTML-based and virtualized), so the export
// covers the FULL displayed range at the current period and milestone settings,
// not just the on-screen viewport.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TimelineGanttRow = {
  id: string;
  text: string;
  start: Date;
  end: Date;
  type: 'task' | 'milestone';
  color: string;
};

type ExportParams = {
  rows: TimelineGanttRow[];
  rangeStart: Date;
  rangeEnd: Date;
  locale: string;
  fileName: string;
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

export async function exportProjectTimelineGanttAsPng({
  rows,
  rangeStart,
  rangeEnd,
  locale,
  fileName,
}: ExportParams): Promise<void> {
  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();
  const totalMs = Math.max(MS_PER_DAY, endMs - startMs);
  const totalDays = Math.max(1, Math.round(totalMs / MS_PER_DAY));

  const headerHeight = 40;
  const rowHeight = 34;
  const leftWidth = 260;
  const pxPerDay = Math.min(14, Math.max(2.2, 1600 / totalDays));
  const chartWidth = Math.max(640, Math.round(totalDays * pxPerDay));
  const canvasWidth = leftWidth + chartWidth;
  const canvasHeight = headerHeight + (Math.max(1, rows.length) * rowHeight) + 1;

  const xForMs = (ms: number) => leftWidth + ((ms - startMs) / totalMs) * chartWidth;

  const scale = Math.max(1, Math.ceil(window.devicePixelRatio || 1));
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth * scale;
  canvas.height = canvasHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.scale(scale, scale);

  // Surfaces.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = '#f7f8fb';
  ctx.fillRect(0, 0, leftWidth, canvasHeight);
  ctx.fillStyle = '#fafbff';
  ctx.fillRect(leftWidth, 0, chartWidth, headerHeight);

  // Left/header separators.
  ctx.strokeStyle = '#dfe3eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftWidth + 0.5, 0);
  ctx.lineTo(leftWidth + 0.5, canvasHeight);
  ctx.stroke();

  // Month header + vertical month gridlines.
  ctx.font = '500 12px Arial, sans-serif';
  ctx.textBaseline = 'alphabetic';
  let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
  while (cursor.getTime() <= endMs) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const startX = xForMs(Math.max(monthStart.getTime(), startMs));
    const endX = xForMs(Math.min(nextMonth.getTime(), endMs));

    if (endX > startX) {
      ctx.strokeStyle = '#e6e9ef';
      ctx.beginPath();
      ctx.moveTo(Math.round(startX) + 0.5, 0);
      ctx.lineTo(Math.round(startX) + 0.5, canvasHeight);
      ctx.stroke();

      const label = monthStart.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
      const textWidth = ctx.measureText(label).width;
      if (endX - startX > textWidth + 8) {
        ctx.fillStyle = '#334155';
        ctx.fillText(label, startX + ((endX - startX) - textWidth) / 2, 25);
      }
    }
    cursor = nextMonth;
  }

  // Header bottom border + left column title.
  ctx.strokeStyle = '#dfe3eb';
  ctx.beginPath();
  ctx.moveTo(0, headerHeight + 0.5);
  ctx.lineTo(canvasWidth, headerHeight + 0.5);
  ctx.stroke();

  // Today marker.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (today.getTime() >= startMs && today.getTime() <= endMs) {
    const todayX = xForMs(today.getTime());
    ctx.strokeStyle = '#ef5350';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.round(todayX), headerHeight);
    ctx.lineTo(Math.round(todayX), canvasHeight);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  // Rows.
  rows.forEach((row, index) => {
    const rowY = headerHeight + (index * rowHeight);
    if (index % 2 === 1) {
      ctx.fillStyle = '#fcfdff';
      ctx.fillRect(leftWidth, rowY, chartWidth, rowHeight);
    }

    ctx.strokeStyle = '#edf0f4';
    ctx.beginPath();
    ctx.moveTo(0, rowY + rowHeight + 0.5);
    ctx.lineTo(canvasWidth, rowY + rowHeight + 0.5);
    ctx.stroke();

    // Name cell (clipped).
    ctx.save();
    ctx.beginPath();
    ctx.rect(10, rowY + 4, leftWidth - 20, rowHeight - 8);
    ctx.clip();
    ctx.font = '400 12px Arial, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(row.text, 12, rowY + 22);
    ctx.restore();

    if (row.type === 'milestone') {
      const cx = xForMs(row.start.getTime());
      const cy = rowY + rowHeight / 2;
      const half = 7;
      ctx.fillStyle = row.color;
      ctx.beginPath();
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx + half, cy);
      ctx.lineTo(cx, cy + half);
      ctx.lineTo(cx - half, cy);
      ctx.closePath();
      ctx.fill();
      return;
    }

    const barX = xForMs(row.start.getTime());
    const barEnd = xForMs(row.end.getTime());
    const barWidth = Math.max(3, barEnd - barX);
    const barHeight = 20;
    const barY = rowY + (rowHeight - barHeight) / 2;
    ctx.fillStyle = row.color;
    roundRect(ctx, barX, barY, barWidth, barHeight, 4);
    ctx.fill();

    if (barWidth > 60) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(barX + 6, barY, barWidth - 12, barHeight);
      ctx.clip();
      ctx.font = '400 11px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(row.text, barX + 8, barY + barHeight - 6);
      ctx.restore();
    }
  });

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
