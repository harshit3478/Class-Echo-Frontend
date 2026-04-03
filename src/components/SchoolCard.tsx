import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { School } from '../data/schools';
import { colors } from '../theme/colors';

type SchoolCardProps = {
  school: School;
};

export function SchoolCard({ school }: SchoolCardProps) {
  return (
    <Pressable style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: school.accent }]}>
          <Text style={styles.badgeText}>{school.initials}</Text>
        </View>
        <MaterialIcons color={colors.textMuted} name="more-vert" size={18} />
      </View>

      <View style={styles.body}>
        <Text style={styles.name}>{school.name}</Text>
        <View style={styles.addressRow}>
          <Ionicons color={colors.textMuted} name="location-outline" size={12} />
          <Text style={styles.address}>{school.address}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBlock}>
          <Feather color={colors.accentDark} name="columns" size={14} />
          <View>
            <Text style={styles.statLabel}>Classes</Text>
            <Text style={styles.statValue}>{school.classes}</Text>
          </View>
        </View>
        <View style={styles.statBlock}>
          <Ionicons color={colors.accentDark} name="school-outline" size={14} />
          <View>
            <Text style={styles.statLabel}>Students</Text>
            <Text style={styles.statValue}>{school.students}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 24,
    gap: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(191, 199, 212, 0.15)',
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  body: {
    gap: 4,
  },
  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  address: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    paddingTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
});
