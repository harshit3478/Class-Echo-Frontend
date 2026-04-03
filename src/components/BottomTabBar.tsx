import { Feather, Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

const items = [
  { key: 'home', label: 'Home', icon: <Feather color={colors.navInactive} name="home" size={18} /> },
  { key: 'schools', label: 'Schools', icon: <Ionicons color={colors.accentDark} name="school-outline" size={20} />, active: true },
  { key: 'staff', label: 'Staff', icon: <Feather color={colors.navInactive} name="users" size={18} /> },
  { key: 'students', label: 'Students', icon: <Ionicons color={colors.navInactive} name="people-outline" size={20} /> },
  { key: 'settings', label: 'Settings', icon: <Feather color={colors.navInactive} name="settings" size={18} /> },
];

export function BottomTabBar() {
  return (
    <View style={styles.shell}>
      {items.map((item) => (
        <View key={item.key} style={styles.item}>
          {item.icon}
          <Text style={[styles.label, item.active && styles.labelActive]}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 13,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  item: {
    minWidth: 52,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    color: colors.navInactive,
    fontSize: 10,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.accentDark,
    fontWeight: '700',
  },
});
