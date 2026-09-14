"use client";

import React, { createContext, useContext } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface RowDragContextValue {
  attributes: React.HTMLAttributes<HTMLElement>;
  listeners: Record<string, unknown> | undefined;
  setActivatorNodeRef: (element: HTMLElement | null) => void;
}

const RowDragContext = createContext<RowDragContextValue | null>(null);

/**
 * A table row that can be dragged to reorder it.
 *
 * antd renders rows itself, so the drag props have to reach the handle cell
 * through context rather than props — hence the paired {@link DragHandle},
 * which any column can render. Dragging is handle-only on purpose: the row is
 * full of buttons and links that must stay clickable.
 */
export function SortableTableRow(
  props: React.HTMLAttributes<HTMLTableRowElement> & { "data-row-key"?: string },
) {
  const { "data-row-key": rowKey, style, ...rest } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rowKey ?? "" });

  return (
    <RowDragContext.Provider
      value={{ attributes, listeners, setActivatorNodeRef }}
    >
      <tr
        {...rest}
        ref={setNodeRef}
        style={{
          ...style,
          transform: CSS.Transform.toString(
            transform ? { ...transform, scaleX: 1, scaleY: 1 } : null,
          ),
          transition,
          // Lifted above the rest of the table while it's being dragged, or
          // the row slides underneath its neighbours.
          ...(isDragging ? { position: "relative", zIndex: 20 } : {}),
        }}
      />
    </RowDragContext.Provider>
  );
}

/** The grip a row is dragged by — render it inside a column's cell. */
export function DragHandle({ disabled = false }: { disabled?: boolean }) {
  const ctx = useContext(RowDragContext);
  if (!ctx || disabled) {
    return <GripVertical className="h-4 w-4 text-muted-foreground/30" />;
  }

  return (
    <button
      type="button"
      ref={ctx.setActivatorNodeRef}
      {...ctx.attributes}
      {...ctx.listeners}
      aria-label="Drag to reorder"
      className="flex h-7 w-7 cursor-grab items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing touch-none"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}
