import {WIDGET_CATALOG} from '../data';
import type {DataSource, WidgetLayout, WidgetType} from '../domain';

const maxZIndex = (layout: WidgetLayout[]) => layout.reduce((max, widget) => Math.max(max, widget.zIndex), 0);
const catalogEntry = (type: WidgetType) => WIDGET_CATALOG.find((item) => item.type === type);

export function addWidget(layout: WidgetLayout[], type: WidgetType, now = Date.now()): WidgetLayout[] {
  const index = layout.length;
  return [...layout, {
    id: `${type}-${now}`,
    type,
    x: 40 + (index % 3) * 36,
    y: 40 + (index % 4) * 42,
    width: type === 'transcript' ? 440 : 330,
    height: type === 'transcript' ? 340 : 250,
    zIndex: maxZIndex(layout) + 1,
  }];
}

/** The call stage represents the call itself, not a piece of content — every layout keeps exactly one. */
export function ensureCallStage(layout: WidgetLayout[], now = Date.now()): WidgetLayout[] {
  if (layout.some((widget) => widget.type === 'call-stage')) return layout;
  return [{id: `call-stage-${now}`, type: 'call-stage', x: 20, y: 20, width: 380, height: 300, zIndex: maxZIndex(layout) + 1}, ...layout];
}

/** A non-removable widget (the call stage) silently refuses removal instead of throwing, so a stray click is harmless. */
export function removeWidget(layout: WidgetLayout[], id: string): WidgetLayout[] {
  const target = layout.find((widget) => widget.id === id);
  if (target && catalogEntry(target.type)?.removable === false) return layout;
  return layout.filter((widget) => widget.id !== id);
}

export function updateWidget(layout: WidgetLayout[], id: string, update: Partial<WidgetLayout>): WidgetLayout[] {
  return layout.map((widget) => widget.id === id ? {...widget, ...update} : widget);
}

export function cloneLayout(layout: WidgetLayout[]): WidgetLayout[] {
  return layout.map((widget) => ({...widget}));
}

/** Returns the same array when the widget is already on top, so a plain click does not rewrite the layout. */
export function bringToFront(layout: WidgetLayout[], id: string): WidgetLayout[] {
  const target = layout.find((widget) => widget.id === id);
  if (!target || layout.every((widget) => widget === target || widget.zIndex < target.zIndex)) return layout;
  return updateWidget(layout, id, {zIndex: maxZIndex(layout) + 1});
}

/**
 * Call-level data the layout needs. Widgets are views: removing the Live Transcript widget
 * does not stop the transcript while a Next Action widget still needs it.
 */
export function requiredSources(layout: WidgetLayout[]): DataSource[] {
  const sources = new Set<DataSource>();
  for (const widget of layout) {
    catalogEntry(widget.type)?.sources.forEach((source) => sources.add(source));
  }
  return [...sources];
}

export function isWidgetLayout(value: unknown): value is WidgetLayout[] {
  return Array.isArray(value) && value.every((widget) => widget
    && typeof widget.id === 'string'
    && WIDGET_CATALOG.some((item) => item.type === widget.type)
    && ['x', 'y', 'width', 'height', 'zIndex'].every((key) => Number.isFinite(widget[key])));
}

// --- Edge snapping ("magnet") -------------------------------------------------------------
// Dragging or resizing a widget close to the canvas edge or another widget's edge locks it
// flush, the way design tools snap shapes together. Pure geometry, independent of react-rnd,
// so it is easy to unit test.

export type Rect = {x: number; y: number; width: number; height: number};
export const SNAP_THRESHOLD = 8;

const left = (rect: Rect) => rect.x;
const right = (rect: Rect) => rect.x + rect.width;
const top = (rect: Rect) => rect.y;
const bottom = (rect: Rect) => rect.y + rect.height;

function nearest(value: number, candidates: number[], threshold: number): number {
  let best = value;
  let bestDelta = threshold;
  for (const candidate of candidates) {
    const delta = Math.abs(candidate - value);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = candidate;
    }
  }
  return best;
}

/** Snaps a dragged widget's left/top edges toward the canvas bounds or a sibling's matching edge. */
export function snapDrag(rect: Rect, siblings: Rect[], canvas: {width: number; height: number}, threshold = SNAP_THRESHOLD): {x: number; y: number} {
  const xCandidates = [0, canvas.width, ...siblings.flatMap((sibling) => [left(sibling), right(sibling)])];
  const yCandidates = [0, canvas.height, ...siblings.flatMap((sibling) => [top(sibling), bottom(sibling)])];

  const snappedLeft = nearest(left(rect), xCandidates, threshold);
  const snappedRight = nearest(right(rect), xCandidates, threshold);
  const x = snappedLeft !== left(rect) ? snappedLeft : snappedRight !== right(rect) ? snappedRight - rect.width : rect.x;

  const snappedTop = nearest(top(rect), yCandidates, threshold);
  const snappedBottom = nearest(bottom(rect), yCandidates, threshold);
  const y = snappedTop !== top(rect) ? snappedTop : snappedBottom !== bottom(rect) ? snappedBottom - rect.height : rect.y;

  return {x, y};
}

/** Snaps the edge(s) being resized (per react-rnd's `direction`) toward the canvas bounds or a sibling's edge. */
export function snapResize(rect: Rect, direction: string, siblings: Rect[], canvas: {width: number; height: number}, threshold = SNAP_THRESHOLD): Rect {
  const xCandidates = [0, canvas.width, ...siblings.flatMap((sibling) => [left(sibling), right(sibling)])];
  const yCandidates = [0, canvas.height, ...siblings.flatMap((sibling) => [top(sibling), bottom(sibling)])];
  const dir = direction.toLowerCase();
  let {x, y, width, height} = rect;

  if (dir.includes('right')) {
    width = Math.max(1, nearest(x + width, xCandidates, threshold) - x);
  }
  if (dir.includes('left')) {
    const fixedRight = x + width;
    x = nearest(x, xCandidates, threshold);
    width = Math.max(1, fixedRight - x);
  }
  if (dir.includes('bottom')) {
    height = Math.max(1, nearest(y + height, yCandidates, threshold) - y);
  }
  if (dir.includes('top')) {
    const fixedBottom = y + height;
    y = nearest(y, yCandidates, threshold);
    height = Math.max(1, fixedBottom - y);
  }

  return {x, y, width, height};
}
