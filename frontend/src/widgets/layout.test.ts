import {describe, expect, it} from 'vitest';
import type {WidgetLayout} from '../domain';
import {
  addWidget,
  bringToFront,
  ensureCallStage,
  isWidgetLayout,
  removeWidget,
  requiredSources,
  snapDrag,
  snapResize,
} from './layout';

const widget = (id: string, type: WidgetLayout['type'], zIndex: number, rect: Partial<WidgetLayout> = {}): WidgetLayout =>
  ({id, type, x: 0, y: 0, width: 300, height: 200, zIndex, ...rect});

describe('widget layout', () => {
  it('adds a widget above the existing ones', () => {
    const layout = addWidget([widget('a', 'notes', 3)], 'checklist', 100);
    expect(layout).toHaveLength(2);
    expect(layout[1]).toMatchObject({id: 'checklist-100', type: 'checklist', zIndex: 4});
  });

  it('does not rewrite the layout when the widget is already on top', () => {
    const layout = [widget('a', 'notes', 1), widget('b', 'checklist', 2)];
    expect(bringToFront(layout, 'b')).toBe(layout);
    expect(bringToFront(layout, 'a').find((item) => item.id === 'a')?.zIndex).toBe(3);
  });

  it('keeps the transcript source while any widget still needs it', () => {
    const layout = [widget('t', 'transcript', 1), widget('n', 'next-action', 2)];
    expect(requiredSources(layout)).toEqual(['transcript']);
    // Removing the Live Transcript view does not remove the transcript source Next Action depends on.
    expect(requiredSources(removeWidget(layout, 't'))).toEqual(['transcript']);
    expect(requiredSources(removeWidget(removeWidget(layout, 't'), 'n'))).toEqual([]);
  });

  it('needs no AI data for a notes-only layout', () => {
    expect(requiredSources([widget('n', 'notes', 1), widget('d', 'call-details', 2)])).toEqual([]);
  });

  it('validates stored layouts', () => {
    expect(isWidgetLayout([widget('call-stage-1', 'call-stage', 1)])).toBe(true);
    expect(isWidgetLayout([{id: 'x', type: 'unknown', x: 0, y: 0, width: 1, height: 1, zIndex: 1}])).toBe(false);
    expect(isWidgetLayout('nope')).toBe(false);
  });

  describe('the call stage', () => {
    it('is added to a layout that does not have one yet, on top', () => {
      const layout = ensureCallStage([widget('n', 'notes', 3)], 42);
      expect(layout).toHaveLength(2);
      expect(layout[0]).toMatchObject({type: 'call-stage', id: 'call-stage-42', zIndex: 4});
    });

    it('is left alone when a layout already has one', () => {
      const layout = [widget('call-stage-1', 'call-stage', 1)];
      expect(ensureCallStage(layout)).toBe(layout);
    });

    it('refuses removal, unlike an ordinary widget', () => {
      const layout = [widget('call-stage-1', 'call-stage', 1), widget('n', 'notes', 2)];
      expect(removeWidget(layout, 'call-stage-1')).toBe(layout);
      expect(removeWidget(layout, 'n')).toHaveLength(1);
    });
  });

  describe('edge snapping', () => {
    const canvas = {width: 1000, height: 800};

    it('snaps a dragged widget flush to the canvas edge when close enough', () => {
      const dragged = {x: 4, y: 5, width: 300, height: 200};
      expect(snapDrag(dragged, [], canvas)).toEqual({x: 0, y: 0});
    });

    it('does not snap when far from any edge', () => {
      const dragged = {x: 120, y: 140, width: 300, height: 200};
      expect(snapDrag(dragged, [], canvas)).toEqual({x: 120, y: 140});
    });

    it('snaps a dragged widget flush against a neighboring widget', () => {
      const neighbor = {x: 400, y: 0, width: 300, height: 200};
      // Right edge (300) is 6px short of the neighbor's left edge (400) minus its own width... instead check left-to-left touch:
      const dragged = {x: 397, y: 50, width: 100, height: 100};
      expect(snapDrag(dragged, [neighbor], canvas).x).toBe(400);
    });

    it('snaps only the edge being resized, per react-rnd direction', () => {
      const neighbor = {x: 0, y: 0, width: 300, height: 200};
      const resized = {x: 0, y: 0, width: 296, height: 500};
      // Resizing from the bottom only should snap height/y-related edges, leaving width alone.
      const snapped = snapResize(resized, 'bottom', [neighbor], canvas);
      expect(snapped.width).toBe(296);
      expect(snapped.height).toBe(500);

      const rightResize = snapResize(resized, 'right', [neighbor], canvas);
      expect(rightResize.width).toBe(300);
    });

    it('keeps a left-resize\'s fixed right edge in place while snapping the moving left edge', () => {
      const rect = {x: 4, y: 0, width: 296, height: 200};
      const fixedRight = rect.x + rect.width;
      const snapped = snapResize(rect, 'left', [], canvas);
      expect(snapped.x).toBe(0);
      expect(snapped.x + snapped.width).toBe(fixedRight);
    });
  });
});
