import {useRef, useState, type ReactNode} from 'react';
import {Rnd} from 'react-rnd';
import {ADDABLE_WIDGETS, DATA_SOURCE_LABELS, WIDGET_CATALOG} from '../data';
import type {WidgetLayout, WidgetType} from '../domain';
import {addWidget, bringToFront, removeWidget, snapDrag, snapResize, updateWidget} from './layout';

type WidgetWorkspaceProps = {
  layout: WidgetLayout[];
  onLayoutChange: (layout: WidgetLayout[]) => void;
  renderWidget: (widget: WidgetLayout) => ReactNode;
  title?: string;
  hint?: string;
  /** Present only where a widget can live in its own window (an actual call). */
  onPopOut?: (widget: WidgetLayout) => void;
  toolbarExtra?: ReactNode;
  /** A preset the viewer does not own: dragging, resizing, adding and removing are all disabled. */
  readOnly?: boolean;
};

export function WidgetWorkspace({
  layout,
  onLayoutChange,
  renderWidget,
  title = 'Call workspace',
  hint = 'Drag and resize widgets anywhere on the canvas.',
  onPopOut,
  toolbarExtra,
  readOnly = false,
}: WidgetWorkspaceProps) {
  const [catalogOpen, setCatalogOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const add = (type: WidgetType) => {
    onLayoutChange(addWidget(layout, type));
    setCatalogOpen(false);
  };

  const canvasSize = () => {
    const canvas = canvasRef.current;
    return {width: canvas?.clientWidth ?? 0, height: canvas?.clientHeight ?? 0};
  };
  const siblingRects = (id: string) => layout.filter((widget) => widget.id !== id);

  return (
    <section className="workspace-shell">
      <header className="workspace-toolbar">
        <div><strong>{title}</strong><span>{hint}</span></div>
        <div className="workspace-toolbar-actions">
          {toolbarExtra}
          {!readOnly && (
            <div className="widget-add-wrap">
              <button type="button" className="button button-small" onClick={() => setCatalogOpen((open) => !open)}>＋ Add widget</button>
              {catalogOpen && (
                <div className="widget-catalog">
                  {ADDABLE_WIDGETS.map((item) => (
                    <button type="button" key={item.type} onClick={() => add(item.type)}>
                      <span>{item.title}</span>
                      <small>{item.description}{item.sources.length > 0 && ` · ${item.sources.map((source) => DATA_SOURCE_LABELS[source]).join(', ')} 사용`}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <div className="widget-canvas" ref={canvasRef}>
        {layout.map((widget) => {
          const removable = !readOnly && (WIDGET_CATALOG.find((item) => item.type === widget.type)?.removable ?? true);
          return (
            <Rnd
              key={widget.id}
              bounds="parent"
              minWidth={280}
              minHeight={190}
              size={{width: widget.width, height: widget.height}}
              position={{x: widget.x, y: widget.y}}
              style={{zIndex: widget.zIndex}}
              dragHandleClassName="widget-drag-handle"
              disableDragging={readOnly}
              enableResizing={!readOnly}
              onMouseDown={() => onLayoutChange(bringToFront(layout, widget.id))}
              onDragStop={(_, data) => {
                const snapped = snapDrag({x: data.x, y: data.y, width: widget.width, height: widget.height}, siblingRects(widget.id), canvasSize());
                onLayoutChange(updateWidget(layout, widget.id, snapped));
              }}
              onResizeStop={(_, direction, element, __, position) => {
                const resized = {x: position.x, y: position.y, width: element.offsetWidth, height: element.offsetHeight};
                const snapped = snapResize(resized, direction, siblingRects(widget.id), canvasSize());
                onLayoutChange(updateWidget(layout, widget.id, snapped));
              }}
            >
              <article className="widget-frame">
                <header className={readOnly ? undefined : 'widget-drag-handle'}>
                  <div><i /><strong>{WIDGET_CATALOG.find((item) => item.type === widget.type)?.title}</strong></div>
                  <nav>
                    {onPopOut && <button type="button" onClick={() => onPopOut(widget)} aria-label="Open widget in a new window">↗</button>}
                    {removable && <button type="button" onClick={() => onLayoutChange(removeWidget(layout, widget.id))} aria-label="Remove widget">×</button>}
                  </nav>
                </header>
                <div className="widget-body">{renderWidget(widget)}</div>
              </article>
            </Rnd>
          );
        })}
      </div>
    </section>
  );
}
