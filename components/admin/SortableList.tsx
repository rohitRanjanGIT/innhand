"use client";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// Rows only move up and down (@dnd-kit/modifiers isn't installed; this is its restrictToVerticalAxis).
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

/** Spread on the element the admin grabs to drag (see `DragHandle`). */
export type DragHandleProps = {
  ref: (el: HTMLElement | null) => void;
} & Record<string, unknown>;

/**
 * A vertical drag-to-reorder list (dnd-kit), with keyboard support. Generic: give it items with an
 * `id`, a render function, and `onReorder(ids)`, called with the new order after each drop. The list
 * shows the new order at once and follows `items` again whenever the parent passes new ones.
 *
 *   <SortableList items={rows} onReorder={(ids) => save(ids)}
 *     renderItem={(row, handle) => <div><DragHandle {...handle} /> {row.name}</div>} />
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
  itemClassName,
  disabled = false,
}: {
  items: T[];
  onReorder: (ids: string[]) => void;
  renderItem: (item: T, handle: DragHandleProps, state: { isDragging: boolean; index: number }) => ReactNode;
  className?: string;
  itemClassName?: string;
  disabled?: boolean;
}) {
  const dndId = useId();
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const [prevItems, setPrevItems] = useState(items);
  if (prevItems !== items) {
    setPrevItems(items);
    setOrder(items.map((i) => i.id));
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  const ordered = order.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = ordered.map((i) => i.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setOrder(next);
    onReorder(next);
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={ordered.map((i) => i.id)} strategy={verticalListSortingStrategy} disabled={disabled}>
        <ul className={cn("flex flex-col gap-2", className)}>
          {ordered.map((item, index) => (
            <SortableRow key={item.id} id={item.id} className={itemClassName}>
              {(handle, isDragging) => renderItem(item, handle, { isDragging, index })}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: (handle: DragHandleProps, isDragging: boolean) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };
  const handle: DragHandleProps = { ref: setActivatorNodeRef, ...attributes, ...listeners };
  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && "opacity-80 shadow-lg", className)}>
      {children(handle, isDragging)}
    </li>
  );
}

/** The grip button that starts a drag. */
export function DragHandle({ className, label = "Drag to reorder", ...handle }: DragHandleProps & { className?: string; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40",
        className,
      )}
      {...handle}
    >
      <GripVertical className="size-4" />
    </button>
  );
}
