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
  { key: 'classes', label: 'Classes', icon: 'school-outline', activeIcon: 'school' },
  { key: 'teachers', label: 'Teachers', icon: 'people-outline', activeIcon: 'people' },
  { key: 'students', label: 'Students', icon: 'people-circle-outline', activeIcon: 'people-circle' },
  { key: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
];

type Props = {
  active: string;
  onTabPress: (key: string) => void;
};

export function SchoolAdminTabBar({ active, onTabPress }: Props) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onTabPress(tab.key)}
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
  },
  label: {
    color: colors.navInactive,
    fontSize: 10,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.accent,
  },
});
