import React, { useMemo } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import qrcode from 'qrcode-generator';

interface QRCodeProps {
  value: string;
  size?: number;
  color?: string;
  backgroundColor?: string;
  quietZone?: number;
  style?: ViewStyle;
}

/**
 * Universal SVG-based QR Code component for React Native & Web.
 * Renders high-definition vector QR codes without native bridges or bitmap distortion.
 */
export const QRCode: React.FC<QRCodeProps> = ({
  value,
  size = 200,
  color = '#000000',
  backgroundColor = '#FFFFFF',
  quietZone = 2,
  style,
}) => {
  const { pathData, totalSize } = useMemo(() => {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(value || '');
      qr.make();

      const moduleCount = qr.getModuleCount();
      const totalSize = moduleCount + quietZone * 2;

      let d = '';
      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.isDark(row, col)) {
            const x = col + quietZone;
            const y = row + quietZone;
            d += `M${x},${y}h1v1h-1z `;
          }
        }
      }

      return { pathData: d, totalSize };
    } catch (e) {
      console.warn('[Spendz QRCode] Failed to generate QR:', e);
      return { pathData: '', totalSize: 25 };
    }
  }, [value, quietZone]);

  if (!pathData) {
    return <View style={[{ width: size, height: size, backgroundColor }, style]} />;
  }

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${totalSize} ${totalSize}`}
      >
        {backgroundColor !== 'transparent' && (
          <Rect
            x={0}
            y={0}
            width={totalSize}
            height={totalSize}
            fill={backgroundColor}
          />
        )}
        <Path d={pathData} fill={color} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
