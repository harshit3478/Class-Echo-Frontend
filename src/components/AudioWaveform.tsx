import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';

type Props = {
  bars: number[];
  progress?: number;
  activeColor?: string;
  inactiveColor?: string;
  height?: number;
};

export const AudioWaveform = memo(function AudioWaveform({
  bars,
  progress = 0,
  activeColor = colors.accent,
  inactiveColor = colors.border,
  height = 58,
}: Props) {
  const safeProgress = Math.max(0, Math.min(1, progress));

  return (
    <View style={[styles.row, { height }]}>
      {bars.map((bar, index) => {
        const isActive = (index + 1) / bars.length <= safeProgress;
        return (
          <View
            key={`${index}-${bar}`}
            style={[
              styles.bar,
              {
                height: Math.max(8, height * bar),
                backgroundColor: isActive ? activeColor : inactiveColor,
              },
            ]}
          />
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  bar: {
    flex: 1,
    borderRadius: 999,
  },
});
