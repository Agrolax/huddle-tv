import React from 'react';
import {View} from 'react-native';

/** react-native-svg needs native views; tests only count the paths. */
export default function Svg({children}: {children?: React.ReactNode}) {
  return <View testID="svg">{children}</View>;
}

export function Path({d}: {d: string}) {
  return <View testID="svg-path" accessibilityLabel={d} />;
}
