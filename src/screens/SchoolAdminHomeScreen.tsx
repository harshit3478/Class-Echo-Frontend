import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InfoState } from '../components/InfoState';
import { PanelCard } from '../components/PanelCard';
import { useAuth } from '../context/AuthContext';
import { getSchoolAdminClasses, getSchoolAdminTeachers } from '../lib/api';
import { colors } from '../theme/colors';
import { ClassOut, TeacherOut } from '../types/api';

type TabKey = 'classes' | 'teachers';

export function SchoolAdminHomeScreen() {
  const { session, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('classes');
  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [teachers, setTeachers] = useState<TeacherOut[]>([]);
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
        const [classResponse, teacherResponse] = await Promise.all([
          getSchoolAdminClasses(session.token),
          getSchoolAdminTeachers(session.token),
        ]);
        setClasses(classResponse);
        setTeachers(teacherResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [session]);

  const items = activeTab === 'classes' ? classes : teachers;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>School Admin</Text>
            <Text style={styles.title}>Operations hub</Text>
          </View>
          <Pressable onPress={signOut} style={styles.ghostButton}>
            <Feather color={colors.textPrimary} name="log-out" size={16} />
          </Pressable>
        </View>

        <PanelCard>
          <Text style={styles.heroText}>
            Manage teaching staff and class groups from one place.
          </Text>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Classes</Text>
              <Text style={styles.metricValue}>{classes.length}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Teachers</Text>
              <Text style={styles.metricValue}>{teachers.length}</Text>
            </View>
          </View>
        </PanelCard>

        <View style={styles.segmented}>
          <Pressable
            onPress={() => setActiveTab('classes')}
            style={[styles.segment, activeTab === 'classes' && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, activeTab === 'classes' && styles.segmentTextActive]}>
              Classes
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('teachers')}
            style={[styles.segment, activeTab === 'teachers' && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, activeTab === 'teachers' && styles.segmentTextActive]}>
              Teachers
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <InfoState loading title="Loading workspace" />
        ) : error ? (
          <InfoState body={error} title="Could not load school admin data" />
        ) : items.length === 0 ? (
          <InfoState title={`No ${activeTab} found`} />
        ) : activeTab === 'classes' ? (
          classes.map((classItem) => (
            <PanelCard key={classItem.id}>
              <Text style={styles.rowTitle}>{classItem.name}</Text>
              <Text style={styles.rowBody}>
                School id {classItem.school_id} · created{' '}
                {new Date(classItem.created_at).toLocaleDateString()}
              </Text>
            </PanelCard>
          ))
        ) : (
          teachers.map((teacher) => (
            <PanelCard key={teacher.id}>
              <Text style={styles.rowTitle}>{teacher.name}</Text>
              <Text style={styles.rowBody}>{teacher.email}</Text>
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
    alignItems: 'center',
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
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  ghostButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    marginBottom: 18,
  },
  metrics: { flexDirection: 'row', gap: 12 },
  metric: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    gap: 6,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricValue: {
    color: colors.accentDark,
    fontSize: 26,
    fontWeight: '800',
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 6,
    gap: 6,
  },
  segment: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: colors.textPrimary,
  },
  rowTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  rowBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
});
