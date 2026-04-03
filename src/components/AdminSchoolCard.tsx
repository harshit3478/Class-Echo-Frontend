import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { SchoolOut } from '../types/api';

type AdminSchoolCardProps = {
  school: SchoolOut;
  onPress?: () => void;
};

export function AdminSchoolCard({ school, onPress }: AdminSchoolCardProps) {
  const initials = school.name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('');

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.identityRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{initials}</Text>
          </View>
          <View style={styles.nameBlock}>
            <Text style={styles.name}>{school.name}</Text>
            <Text style={styles.address} numberOfLines={2}>
              {school.address ?? 'Location not added yet'}
            </Text>
          </View>
        </View>
        <MaterialIcons color={colors.textMuted} name="chevron-right" size={20} />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Administrator</Text>
          <Text style={styles.metaValue} numberOfLines={1}>
            {school.admin?.name ?? 'Pending assignment'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Created</Text>
          <Text style={styles.metaValue}>
            {new Date(school.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.pill, school.admin ? styles.pillGood : styles.pillWarn]}>
          <Text style={[styles.pillText, school.admin ? styles.pillTextGood : styles.pillTextWarn]}>
            {school.admin ? 'Admin linked' : 'Needs admin'}
          </Text>
        </View>
        <View
          style={[
            styles.pill,
            school.address ? styles.pillNeutral : styles.pillWarnSurface,
          ]}
        >
          <Text
            style={[
              styles.pillText,
              school.address ? styles.pillTextNeutral : styles.pillTextWarn,
            ]}
          >
            {school.address ? 'Address ready' : 'Address missing'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    gap: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    flex: 1,
  },
  badge: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.accentDark,
    fontSize: 18,
    fontWeight: '800',
  },
  nameBlock: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
  },
  address: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    padding: 12,
    gap: 4,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pillGood: {
    backgroundColor: '#E8F7EE',
  },
  pillWarn: {
    backgroundColor: '#FFF0D8',
  },
  pillWarnSurface: {
    backgroundColor: '#FFF0D8',
  },
  pillNeutral: {
    backgroundColor: colors.surfaceMuted,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextGood: {
    color: '#127A40',
  },
  pillTextWarn: {
    color: '#A15C00',
  },
  pillTextNeutral: {
    color: colors.textSecondary,
  },
});
