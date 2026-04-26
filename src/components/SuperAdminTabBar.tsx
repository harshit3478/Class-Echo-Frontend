import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';

type Tab = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const TABS: Tab[] = [
  { key: 'schools', label: 'Schools', icon: 'school-outline', activeIcon: 'school' },
];

type Props = {
  active: string;
  onTabPress?: (key: string) => void;
};

export function SuperAdminTabBar({ active, onTabPress }: Props) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabPress?.(tab.key)}
            style={styles.tab}
          >
            <Ionicons
              color={isActive ? colors.accent : colors.navInactive}
              name={isActive ? tab.activeIcon : tab.icon}
              size={22}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {isActive ? <View style={styles.dot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 8,
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  label: {
    color: colors.navInactive,
    fontSize: 10,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.accent,
  },
  dot: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});
