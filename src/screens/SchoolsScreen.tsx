import { useCallback, useState } from 'react';
import { Ionicons, Feather } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SuperAdminTabBar } from '../components/SuperAdminTabBar';
import { useAuth } from '../context/AuthContext';
import { getAdminSchools } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { SchoolOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminSchools'>;

function SchoolCard({
  school,
  onPress,
}: {
  school: SchoolOut;
  onPress: () => void;
}) {
  const initials = school.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

  const hasAdmin = !!school.admin;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}>
          <Text style={styles.cardInitials}>{initials}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>
            {school.name}
          </Text>
          <View style={styles.addressRow}>
            <Ionicons color={colors.textMuted} name="location-outline" size={12} />
            <Text style={styles.cardAddress} numberOfLines={1}>
              {school.address ?? 'Address not added'}
            </Text>
          </View>
        </View>
        <Ionicons color={colors.textMuted} name="ellipsis-vertical" size={18} />
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons color={colors.textMuted} name="grid-outline" size={14} />
          <Text style={styles.metaText}>
            Admin: {hasAdmin ? school.admin!.name : '—'}
          </Text>
        </View>
        <View style={[styles.statusBadge, hasAdmin ? styles.badgeGreen : styles.badgeOrange]}>
          <View style={[styles.statusDot, hasAdmin ? styles.dotGreen : styles.dotOrange]} />
          <Text style={[styles.statusText, hasAdmin ? styles.statusGreen : styles.statusOrange]}>
            {hasAdmin ? 'Operational' : 'Needs Admin'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function SchoolsScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();
  const [schools, setSchools] = useState<SchoolOut[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSchools = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        setSchools(await getAdminSchools(session.token));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load schools');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session],
  );

  useFocusEffect(
    useCallback(() => {
      void loadSchools();
    }, [loadSchools]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadSchools(true);
  }, [loadSchools]);

  const filtered = schools.filter((s) => {
    const hay = [s.name, s.address ?? '', s.admin?.name ?? '', s.admin?.email ?? '']
      .join(' ')
      .toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  const operational = schools.filter((s) => s.admin).length;
  const needsAdmin = schools.length - operational;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons color={colors.textPrimary} name="menu" size={24} />
        </View>
        <Text style={styles.headerTitle}>Schools</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn}>
            <Ionicons color={colors.textPrimary} name="notifications-outline" size={22} />
          </Pressable>
          <Pressable onPress={signOut} style={styles.iconBtn}>
            <Ionicons color={colors.textPrimary} name="log-out-outline" size={22} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl onRefresh={onRefresh} refreshing={refreshing} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Page heading */}
        <View style={styles.pageHeading}>
          <Text style={styles.pageTitle}>Academic Institutions</Text>
          <Text style={styles.pageSubtitle}>
            Managing {schools.length} active schools within the primary district.
          </Text>

          {schools.length > 0 ? (
            <View style={styles.statsRow}>
              <View style={styles.statChip}>
                <View style={styles.dotGreen} />
                <Text style={styles.statChipText}>{operational} Operational</Text>
              </View>
              {needsAdmin > 0 ? (
                <View style={[styles.statChip, styles.statChipWarn]}>
                  <View style={styles.dotOrange} />
                  <Text style={[styles.statChipText, styles.statChipTextWarn]}>
                    {needsAdmin} Need Admin
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Feather color={colors.textMuted} name="search" size={16} />
          <TextInput
            onChangeText={setQuery}
            placeholder="Search schools or admins…"
            placeholderTextColor={colors.textPlaceholder}
            style={styles.searchInput}
            value={query}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons color={colors.textMuted} name="close-circle" size={16} />
            </Pressable>
          ) : null}
        </View>

        {/* List */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.loadingText}>Loading schools…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
            <Text style={styles.errorTitle}>Could not load schools</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable onPress={() => void loadSchools()} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Ionicons color={colors.textMuted} name="school-outline" size={40} />
            <Text style={styles.errorTitle}>
              {query.trim() ? 'No results found' : 'No schools yet'}
            </Text>
            <Text style={styles.errorBody}>
              {query.trim()
                ? 'Try a different search term.'
                : 'Register your first school below.'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map((school) => (
              <SchoolCard
                key={school.id}
                onPress={() =>
                  navigation.navigate('AdminSchoolDetail', { schoolId: school.id })
                }
                school={school}
              />
            ))}
          </View>
        )}

        {/* Register School FAB-style button */}
        <Pressable
          onPress={() => navigation.navigate('AdminCreateSchool')}
          style={styles.registerBtn}
        >
          <View style={styles.registerBtnInner}>
            <Ionicons color={colors.accent} name="add-circle" size={22} />
            <Text style={styles.registerBtnText}>Register School</Text>
          </View>
        </Pressable>
      </ScrollView>

      <SuperAdminTabBar active="schools" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 4,
    width: 72,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 20,
  },
  pageHeading: {
    gap: 8,
  },
  pageTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  pageSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F7EE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statChipWarn: {
    backgroundColor: '#FFF4E0',
  },
  statChipText: {
    color: '#127A40',
    fontSize: 12,
    fontWeight: '600',
  },
  statChipTextWarn: {
    color: '#92400E',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    padding: 0,
  },
  list: {
    gap: 14,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  errorBody: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryText: {
    color: colors.accentDark,
    fontWeight: '700',
    fontSize: 14,
  },
  // School Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInitials: {
    color: colors.accentDark,
    fontSize: 18,
    fontWeight: '800',
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardAddress: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeGreen: {
    backgroundColor: '#E8F7EE',
  },
  badgeOrange: {
    backgroundColor: '#FFF4E0',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotGreen: {
    backgroundColor: '#22C55E',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOrange: {
    backgroundColor: '#F59E0B',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusGreen: {
    color: '#127A40',
  },
  statusOrange: {
    color: '#92400E',
  },
  // Register button
  registerBtn: {
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  registerBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  registerBtnText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
});
