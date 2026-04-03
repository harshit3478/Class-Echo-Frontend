import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type AppLogoProps = {
  compact?: boolean;
  showBadge?: boolean;
};

export function AppLogo({ compact = false, showBadge = true }: AppLogoProps) {
  return (
    <View style={styles.row}>
      {showBadge ? (
        <View style={[styles.badge, compact && styles.badgeCompact]}>
          <Feather
            color="#FFFFFF"
            name="bar-chart-2"
            size={compact ? 14 : 18}
            style={styles.icon}
          />
        </View>
      ) : null}
      <Text style={[styles.wordmark, compact && styles.wordmarkCompact]}>
        ClassEcho
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentDark,
    shadowColor: colors.accentDark,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 4,
  },
  badgeCompact: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  icon: {
    transform: [{ rotate: '90deg' }],
  },
  wordmark: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  wordmarkCompact: {
    fontSize: 20,
    letterSpacing: -0.5,
  },
});
