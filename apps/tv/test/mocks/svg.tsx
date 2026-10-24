import React from 'react';
import {View} from 'react-native';

/** react-native-svg needs native views; tests only count the paths. */
export default function Svg({children}: {children?: React.ReactNode}) {
  return <View testID="svg">{children}</View>;
}

/** Sketch strokes keep the default id; avatar parts pass their own so stroke counts stay exact. */
export function Path({d, testID}: {d: string; testID?: string}) {
  return <View testID={testID ?? 'svg-path'} accessibilityLabel={d} />;
}

export function Circle({testID}: {testID?: string}) {
  return <View testID={testID ?? 'svg-circle'} />;
}

export function Rect() {
  return <View testID="svg-rect" />;
}
