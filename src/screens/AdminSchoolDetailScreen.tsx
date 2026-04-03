import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InfoState } from '../components/InfoState';
import { PanelCard } from '../components/PanelCard';
import { useAuth } from '../context/AuthContext';
import { getAdminSchool, getAdminSchoolClasses } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { ClassOut, SchoolOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminSchoolDetail'>;

export function AdminSchoolDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const [school, setSchool] = useState<SchoolOut | null>(null);
  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [schoolResponse, classesResponse] = await Promise.all([
          getAdminSchool(session.token, route.params.schoolId),
          getAdminSchoolClasses(session.token, route.params.schoolId),
        ]);

        setSchool(schoolResponse);
        setClasses(classesResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load school');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [route.params.schoolId, session]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Feather color={colors.textPrimary} name="arrow-left" size={18} />
          </Pressable>
          <Text style={styles.topTitle}>Institution Detail</Text>
          <View style={styles.iconButton} />
        </View>

        {isLoading ? (
          <InfoState loading title="Loading school profile" />
        ) : error ? (
          <InfoState body={error} title="Could not load school" />
        ) : school ? (
          <>
            <PanelCard>
              <View style={styles.hero}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>
                    {school.name
                      .split(' ')
                      .slice(0, 2)
                      .map((part) => part[0] ?? '')
                      .join('')}
                  </Text>
                </View>
                <View style={styles.heroBody}>
                  <Text style={styles.heroTitle}>{school.name}</Text>
                  <Text style={styles.heroSubtitle}>
                    {school.address ?? 'District location pending'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaGrid}>
                <View style={styles.metaCard}>
                  <Text style={styles.metaLabel}>Classes</Text>
                  <Text style={styles.metaValue}>{classes.length}</Text>
                </View>
                <View style={styles.metaCard}>
                  <Text style={styles.metaLabel}>Administrator</Text>
                  <Text style={styles.metaValueSmall}>
                    {school.admin?.name ?? 'Unassigned'}
                  </Text>
                </View>
              </View>
            </PanelCard>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Academic classes</Text>
              <Text style={styles.sectionSub}>Mapped from the live admin API</Text>
            </View>

            {classes.length === 0 ? (
              <InfoState
                body="This school does not have classes yet."
                title="No classes found"
              />
            ) : (
              classes.map((classItem) => (
                <PanelCard key={classItem.id}>
                  <View style={styles.classRow}>
                    <View>
                      <Text style={styles.className}>{classItem.name}</Text>
                      <Text style={styles.classMeta}>
                        Created {new Date(classItem.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.classChip}>
                      <Text style={styles.classChipText}>Class</Text>
                    </View>
                  </View>
                </PanelCard>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    gap: 18,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  hero: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  heroBadge: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeText: {
    color: colors.accentDark,
    fontSize: 22,
    fontWeight: '800',
  },
  heroBody: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  heroSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metaCard: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    gap: 6,
  },
  metaLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  metaValueSmall: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
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
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  className: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  classMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  classChip: {
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  classChipText: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: '700',
  },
});
