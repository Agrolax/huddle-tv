import React, {memo, useState} from 'react';
import {Image, StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Svg, {Circle, Path, Rect} from '@amazon-devices/react-native-svg';
import type {TonightPick} from '@huddle/shared';

/** Flat palettes for the drawn scene: sky, sun or moon, far hills, near hills, ground. No gradients. */
const PALETTES = [
  ['#2B2350', '#F5A524', '#4B3B7A', '#6A4C93', '#1E1838'],
  ['#1F3B4D', '#F2E8CF', '#2E5E4E', '#3E7C59', '#173226'],
  ['#F28F3B', '#FFE8A3', '#C8553D', '#8C2F39', '#461220'],
  ['#0B3954', '#FFD166', '#087E8B', '#2E86AB', '#04263A'],
  ['#FF6B8B', '#FFF1C1', '#B57BFF', '#7A4FD0', '#3B1F6E'],
  ['#0F1B2D', '#E8EEF2', '#1F3A5F', '#2C5282', '#0A1220'],
] as const;

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** A steady little landscape per title, so a pick looks the same every time it shows up. */
export function sceneFor(title: string) {
  const h = hash(title.toLowerCase());
  const palette = PALETTES[h % PALETTES.length]!;
  const far = 52 + ((h >>> 3) % 10);
  const near = 66 + ((h >>> 7) % 8);
  const sunX = 22 + ((h >>> 11) % 116);
  return {
    palette,
    sun: {cx: sunX, cy: 22 + ((h >>> 15) % 14), r: 9 + ((h >>> 19) % 6)},
    far: `M0 ${far} C40 ${far - 16} 70 ${far + 8} 100 ${far - 6} C125 ${far - 14} 145 ${far} 160 ${far - 4} L160 90 L0 90 Z`,
    near: `M0 ${near + 4} C30 ${near - 8} 60 ${near + 6} 95 ${near - 2} C120 ${near - 8} 140 ${near + 4} 160 ${near} L160 90 L0 90 Z`,
    ground: `M0 ${near + 14} L160 ${near + 10} L160 90 L0 90 Z`,
  };
}

/** `ws://10.0.0.5:8787/ws` + `/art/x.png` → `http://10.0.0.5:8787/art/x.png`. */
export function artUrl(serverUrl: string, path: string): string {
  const base = serverUrl.replace(/^ws(s?):/, 'http$1:').replace(/\/ws\/?$/, '');
  return `${base}${path}`;
}

type Props = {
  pick: Pick<TonightPick, 'title' | 'image' | 'posterUrl'>;
  serverUrl: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * A pick's art, edge to edge. A TMDB poster when the server found one; else Nova Canvas
 * paints it on the server when Bedrock is on; until it arrives (or offline, or the poster
 * fails to load) the TV draws a flat scene of its own.
 * Every shape is mounted from the first render and only its props change (FL-14).
 */
export const Backdrop = memo(function Backdrop({pick, serverUrl, style, testID}: Props) {
  const [posterBroken, setPosterBroken] = useState<string | null>(null);
  const showPoster = Boolean(pick.posterUrl) && posterBroken !== pick.posterUrl;
  const s = sceneFor(pick.title);
  const [sky, sun, far, near, ground] = s.palette;
  return (
    <View style={[styles.fill, style]} testID={testID} accessibilityLabel={showPoster ? 'Movie poster' : pick.image ? 'Painted backdrop' : 'Drawn backdrop'}>
      <Svg width="100%" height="100%" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">
        <Rect x={0} y={0} width={160} height={90} fill={sky} />
        <Circle testID="scene" cx={s.sun.cx} cy={s.sun.cy} r={s.sun.r} fill={sun} />
        <Path testID="scene" d={s.far} fill={far} />
        <Path testID="scene" d={s.near} fill={near} />
        <Path testID="scene" d={s.ground} fill={ground} />
      </Svg>
      {pick.image ? <Image source={{uri: artUrl(serverUrl, pick.image)}} style={styles.fill} resizeMode="cover" testID={testID ? `${testID}-image` : undefined} /> : null}
      {showPoster && pick.posterUrl ? (
        <Image
          accessible={false}
          source={{uri: pick.posterUrl}}
          style={styles.fill}
          resizeMode="cover"
          onError={() => setPosterBroken(pick.posterUrl ?? null)}
          testID={testID ? `${testID}-poster` : undefined}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
});
