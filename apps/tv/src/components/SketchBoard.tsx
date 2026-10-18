import React, {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {Path} from '@amazon-devices/react-native-svg';
import {SKETCH_COLORS, Stroke} from '@huddle/shared';
import {colors, radius} from '../theme';

/** Phones and the TV share this shape; points are 0..1 of it. */
export const SKETCH_ASPECT = 4 / 3;

/** "M x y L x y …" in canvas pixels. A single dot becomes a tiny line so it shows. */
export function strokePath(stroke: Stroke, width: number, height: number): string {
  const pts = stroke.points.map(p => `${(p.x * width).toFixed(1)} ${(p.y * height).toFixed(1)}`);
  if (pts.length === 1) pts.push(`${(stroke.points[0]!.x * width + 0.5).toFixed(1)} ${(stroke.points[0]!.y * height).toFixed(1)}`);
  return `M${pts[0]} L${pts.slice(1).join(' ')}`;
}

/**
 * The drawing from the drawer's phone. One always-mounted Path per pen color
 * whose `d` grows: on Vega, Paths added after the first render did not show.
 */
export const SketchBoard = memo(function SketchBoard({strokes, width}: {strokes: Stroke[]; width: number}) {
  const height = Math.round(width / SKETCH_ASPECT);
  const pens = [...SKETCH_COLORS, ...new Set(strokes.map(s => s.color).filter(c => !SKETCH_COLORS.includes(c)))];
  return (
    <View style={[styles.board, {width, height}]} testID="sketch-board" accessibilityLabel={`Drawing, ${strokes.length} lines`}>
      <Svg width={width} height={height}>
        {pens.map(color => {
          const mine = strokes.filter(s => s.color === color);
          return (
            <Path
              key={color}
              d={mine.length ? mine.map(s => strokePath(s, width, height)).join(' ') : 'M0 0'}
              stroke={color}
              strokeWidth={Math.max(2, (mine[0]?.width ?? 0.012) * width)}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={mine.length ? 1 : 0}
            />
          );
        })}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  board: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
});
