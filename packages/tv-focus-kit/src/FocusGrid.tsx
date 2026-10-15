import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState} from 'react';
import {findNodeHandle, LayoutChangeEvent, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import {FocusableCard, FocusableCardProps} from './FocusableCard';
import {buildNeighborMap, GridCell, gridSize, readingOrder, rememberFocus, RowMemory, validateGrid} from './grid';

export interface FocusGridItem extends GridCell {
  render: (state: {focused: boolean}) => React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Per-cell style for the pressable surface. */
  style?: StyleProp<ViewStyle>;
}

export interface FocusGridProps
  extends Pick<FocusableCardProps, 'focusScale' | 'ringColor' | 'ringWidth' | 'radius' | 'animationDuration' | 'focusedStyle'> {
  items: FocusGridItem[];
  /** Gap between cells in px. Leave room for the focus scale. */
  gap?: number;
  /** Fixed column count; default is derived from the items. */
  columns?: number;
  /** Fixed row count; default is derived from the items. */
  rows?: number;
  /** Cell that takes focus when the grid mounts. Default: first in reading order. Pass null for none. */
  initialFocusId?: string | null;
  /** Up/Down returns to the cell you last focused in that row. Default true. */
  rememberRowFocus?: boolean;
  wrapRows?: boolean;
  onFocusChange?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
  /** Style applied to every cell's pressable surface. */
  cellStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Imperative access, e.g. to hand focus back to a cell after an overlay closes. */
export interface FocusGridHandle {
  /** The cell's focusable view, once laid out. */
  getCell: (id: string) => View | null;
}

/**
 * A widget grid laid out in rows × columns (cells may span), with
 * deterministic D-pad navigation from `grid.ts` wired into `nextFocus*`.
 * Edges hand focus back to the platform so it can leave the grid.
 */
export const FocusGrid = forwardRef<FocusGridHandle, FocusGridProps>(function FocusGrid({
  items,
  gap = 24,
  columns,
  rows,
  initialFocusId,
  rememberRowFocus = true,
  wrapRows = false,
  onFocusChange,
  style,
  cellStyle,
  testID,
  ...cardProps
}, ref) {
  if (__DEV__) validateGrid(items);

  const size = useMemo(() => gridSize(items), [items]);
  const cols = columns ?? size.cols;
  const rowCount = rows ?? size.rows;

  const [box, setBox] = useState<{width: number; height: number} | null>(null);
  const [memory, setMemory] = useState<RowMemory>({});
  const [handles, setHandles] = useState<Record<string, number>>({});
  const refs = useRef<Record<string, View | null>>({});
  useImperativeHandle(ref, () => ({getCell: id => refs.current[id] ?? null}), []);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setBox(prev => (prev && prev.width === width && prev.height === height ? prev : {width, height}));
  }, []);

  const ids = items.map(i => i.id).join('|');
  useEffect(() => {
    if (!box) return;
    const next: Record<string, number> = {};
    for (const id of ids.split('|')) {
      const node = refs.current[id];
      const handle = node ? findNodeHandle(node) : null;
      if (handle != null) next[id] = handle;
    }
    setHandles(next);
  }, [box, ids]);

  const neighbors = useMemo(
    () => buildNeighborMap(items, {memory: rememberRowFocus ? memory : undefined, wrapRows}),
    [items, memory, rememberRowFocus, wrapRows],
  );

  const firstId = initialFocusId === undefined ? readingOrder(items)[0] : initialFocusId;

  const handleFocus = useCallback(
    (id: string) => {
      if (rememberRowFocus) setMemory(prev => rememberFocus(prev, items, id));
      onFocusChange?.(id);
    },
    [items, onFocusChange, rememberRowFocus],
  );

  const cellW = box ? (box.width - gap * (cols - 1)) / cols : 0;
  const cellH = box ? (box.height - gap * (rowCount - 1)) / rowCount : 0;

  return (
    <View style={[styles.root, style]} onLayout={onLayout} testID={testID}>
      {box
        ? items.map(item => {
            const colSpan = item.colSpan ?? 1;
            const rowSpan = item.rowSpan ?? 1;
            const n = neighbors[item.id] ?? {};
            return (
              <View
                key={item.id}
                style={{
                  position: 'absolute',
                  left: item.col * (cellW + gap),
                  top: item.row * (cellH + gap),
                  width: colSpan * cellW + (colSpan - 1) * gap,
                  height: rowSpan * cellH + (rowSpan - 1) * gap,
                }}>
                <FocusableCard
                  {...cardProps}
                  ref={node => {
                    refs.current[item.id] = node;
                  }}
                  testID={`grid-cell-${item.id}`}
                  accessibilityLabel={item.accessibilityLabel}
                  onPress={item.onPress}
                  onFocus={() => handleFocus(item.id)}
                  hasTVPreferredFocus={item.id === firstId}
                  nextFocusUp={n.up ? handles[n.up] : undefined}
                  nextFocusDown={n.down ? handles[n.down] : undefined}
                  nextFocusLeft={n.left ? handles[n.left] : undefined}
                  nextFocusRight={n.right ? handles[n.right] : undefined}
                  containerStyle={styles.fill}
                  style={[styles.fill, cellStyle, item.style]}>
                  {item.render}
                </FocusableCard>
              </View>
            );
          })
        : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
});
