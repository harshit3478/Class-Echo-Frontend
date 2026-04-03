import { useCallback, useEffect, useState } from 'react';
import { Feather, Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdminSchoolCard } from '../components/AdminSchoolCard';
import { InfoState } from '../components/InfoState';
import { useAuth } from '../context/AuthContext';
import { getAdminSchools } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { SchoolOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminSchools'>;

export function SchoolsScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();
  const [schools, setSchools] = useState<SchoolOut[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSchools = async () => {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      setSchools(await getAdminSchools(session.token));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load schools');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void loadSchools();
    }, [session]),
  );

  useEffect(() => {
    void loadSchools();
  }, [session]);

  const filteredSchools = schools.filter((school) => {
    const haystack = [
      school.name,
      school.address ?? '',
      school.admin?.name ?? '',
      school.admin?.email ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query.trim().toLowerCase());
  });

  const linkedAdmins = schools.filter((school) => school.admin).length;
  const missingAdmins = schools.length - linkedAdmins;
  const addressReady = schools.filter((school) => school.address).length;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <Text style={styles.kicker}>Super Admin</Text>
            <Text style={styles.topTitle}>District command</Text>
          </View>

          <View style={styles.topActions}>
            <Pressable onPress={() => void loadSchools()} style={styles.iconButton}>
              <Ionicons color={colors.textMuted} name="refresh-outline" size={18} />
            </Pressable>
            <Pressable onPress={signOut} style={styles.iconButton}>
              <Ionicons color={colors.textMuted} name="log-out-outline" size={18} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Academic Institutions</Text>
            <Text style={styles.subtitle}>
              Run district operations, inspect institution readiness, and spin up new schools without leaving the workspace.
            </Text>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Institutions</Text>
              <Text style={styles.metricValue}>{schools.length}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Admins linked</Text>
              <Text style={styles.metricValue}>{linkedAdmins}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Need admin</Text>
              <Text style={styles.metricValue}>{missingAdmins}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Address ready</Text>
              <Text style={styles.metricValue}>{addressReady}</Text>
            </View>
          </View>

          <View style={styles.commandRow}>
            <View style={styles.searchShell}>
              <Feather color={colors.textMuted} name="search" size={16} />
              <TextInput
                onChangeText={setQuery}
                placeholder="Search schools, admins, or addresses"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.searchInput}
                value={query}
              />
            </View>
            <Pressable
              onPress={() => navigation.navigate('AdminCreateSchool')}
              style={styles.createButton}
            >
              <Feather color="#FFFFFF" name="plus" size={16} />
            </Pressable>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Institution roster</Text>
            <Text style={styles.sectionSub}>
              {query.trim() ? `${filteredSchools.length} matching results` : 'Live admin list'}
            </Text>
          </View>

          <View style={styles.grid}>
            {isLoading ? (
              <InfoState loading title="Loading schools" />
            ) : error ? (
              <InfoState body={error} title="Could not load schools" />
            ) : filteredSchools.length === 0 ? (
              <InfoState title="No schools found" />
            ) : (
              filteredSchools.map((school) => (
                <Pressable
                  key={school.id}
                  onPress={() =>
                    navigation.navigate('AdminSchoolDetail', {
                      schoolId: school.id,
                    })
                  }
                >
                  <AdminSchoolCard school={school} />
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
  },
  topLeft: {
    gap: 4,
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  topTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 30,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 18,
  },
  header: {
    gap: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    letterSpacing: -0.75,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  grid: {
    gap: 14,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  commandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchShell: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    padding: 0,
  },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.accentDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    gap: 4,
    paddingTop: 6,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  sectionSub: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
