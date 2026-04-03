import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InfoState } from '../components/InfoState';
import { PanelCard } from '../components/PanelCard';
import { useAuth } from '../context/AuthContext';
import { getTeacherSubjects } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { SubjectOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherSubjects'>;

export function TeacherSubjectsScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();
  const [subjects, setSubjects] = useState<SubjectOut[]>([]);
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
        setSubjects(await getTeacherSubjects(session.token));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load subjects');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [session]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.kicker}>Teacher Portal</Text>
            <Text style={styles.title}>My subjects</Text>
            <Text style={styles.subtitle}>
              Real data from `/teacher/subjects`
            </Text>
          </View>
          <Pressable onPress={signOut} style={styles.signOut}>
            <Text style={styles.signOutText}>Exit</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <InfoState loading title="Loading your timetable" />
        ) : error ? (
          <InfoState body={error} title="Could not load teacher subjects" />
        ) : subjects.length === 0 ? (
          <InfoState title="No assigned subjects yet" />
        ) : (
          subjects.map((subject, index) => (
            <Pressable
              key={subject.id}
              onPress={() =>
                navigation.navigate('TeacherSubjectDetail', {
                  subjectId: subject.id,
                })
              }
            >
              <PanelCard>
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.subjectBadge,
                      { backgroundColor: badgeColors[index % badgeColors.length] },
                    ]}
                  >
                    <Text style={styles.subjectBadgeText}>
                      {subject.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.classPill}>
                    <Text style={styles.classPillText}>Class {subject.class_id}</Text>
                  </View>
                </View>

                <Text style={styles.subjectName}>{subject.name}</Text>
                <Text style={styles.subjectMeta}>
                  Teacher assignment confirmed
                </Text>
              </PanelCard>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const badgeColors = ['#D1E4FF', '#E8F7E8', '#FFE8C7', '#F3E8FF'];

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 18, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
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
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  subjectBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectBadgeText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  classPill: {
    borderRadius: 999,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  classPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  subjectName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  subjectMeta: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
});
