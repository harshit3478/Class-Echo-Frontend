import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InfoState } from '../components/InfoState';
import { PanelCard } from '../components/PanelCard';
import { useAuth } from '../context/AuthContext';
import { getStudentSchools } from '../lib/api';
import { colors } from '../theme/colors';
import { SchoolOut } from '../types/api';

export function StudentExploreScreen() {
  const { session, signOut } = useAuth();
  const [search, setSearch] = useState('');
  const [schools, setSchools] = useState<SchoolOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    const timer = setTimeout(() => {
      const load = async () => {
        setIsLoading(true);
        setError(null);
        try {
          setSchools(await getStudentSchools(session.token, search || undefined));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unable to load schools');
        } finally {
          setIsLoading(false);
        }
      };

      void load();
    }, 250);

    return () => clearTimeout(timer);
  }, [search, session]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>Student Portal</Text>
            <Text style={styles.title}>Explore schools</Text>
          </View>
          <Pressable onPress={signOut} style={styles.signOut}>
            <Text style={styles.signOutText}>Exit</Text>
          </Pressable>
        </View>

        <View style={styles.searchShell}>
          <Feather color={colors.textMuted} name="search" size={16} />
          <TextInput
            onChangeText={setSearch}
            placeholder="Search institutions"
            placeholderTextColor={colors.textPlaceholder}
            style={styles.searchInput}
            value={search}
          />
        </View>

        {isLoading ? (
          <InfoState loading title="Loading schools" />
        ) : error ? (
          <InfoState body={error} title="Could not load schools" />
        ) : schools.length === 0 ? (
          <InfoState title="No schools match this search" />
        ) : (
          schools.map((school) => (
            <PanelCard key={school.id}>
              <Text style={styles.schoolName}>{school.name}</Text>
              <Text style={styles.schoolBody}>
                {school.address ?? 'Address not available'}
              </Text>
            </PanelCard>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 18, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    marginTop: 4,
  },
  signOut: {
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  signOutText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  searchShell: {
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
  schoolName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  schoolBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
});
