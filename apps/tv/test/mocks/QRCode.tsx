import React from 'react';
import {Text} from 'react-native';

/** react-native-svg needs native views; tests only care what the QR encodes. */
export default function QRCode({value}: {value: string}) {
  return <Text testID="qr-value">{value}</Text>;
}
