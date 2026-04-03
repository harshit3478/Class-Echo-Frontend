import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InfoState } from '../components/InfoState';
import { PanelCard } from '../components/PanelCard';
import { useAuth } from '../context/AuthContext';
import { getTeacherSubject, getTeacherSubjectRecordings } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { RecordingWithReport, SubjectOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherSubjectDetail'>;

export function TeacherSubjectDetailScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const [subject, setSubject] = useState<SubjectOut | null>(null);
  const [recordings, setRecordings] = useState<RecordingWithReport[]>([]);
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
        const [subjectResponse, recordingsResponse] = await Promise.all([
          getTeacherSubject(session.token, route.params.subjectId),
          getTeacherSubjectRecordings(session.token, route.params.subjectId),
        ]);
        setSubject(subjectResponse);
        setRecordings(recordingsResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load subject');
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [route.params.subjectId, session]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Feather color={colors.textPrimary} name="arrow-left" size={18} />
          </Pressable>
          <Text style={styles.topTitle}>Subject detail</Text>
          <View style={styles.iconButton} />
        </View>

        {isLoading ? (
          <InfoState loading title="Loading subject" />
        ) : error ? (
          <InfoState body={error} title="Could not load subject detail" />
        ) : subject ? (
          <>
            <PanelCard>
              <Text style={styles.subjectName}>{subject.name}</Text>
              <Text style={styles.subjectMeta}>
                Class {subject.class_id}
                {subject.teacher ? ` · ${subject.teacher.name}` : ''}
              </Text>
            </PanelCard>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recordings</Text>
              <Text style={styles.sectionSub}>
                Upload/report history from the live teacher API
              </Text>
            </View>

            {recordings.length === 0 ? (
              <InfoState
                title="No recordings yet"
                body="Once lessons are uploaded, they will appear here with their analysis state."
              />
            ) : (
              recordings.map((recording) => (
                <PanelCard key={recording.id}>
                  <View style={styles.recordingHeader}>
                    <Text style={styles.recordingTitle}>
                      Recording #{recording.id}
                    </Text>
                    <View style={styles.statusChip}>
                      <Text style={styles.statusText}>{recording.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.recordingMeta}>
                    Uploaded {new Date(recording.uploaded_at).toLocaleString()}
                  </Text>
                  {recording.report?.overall_score != null ? (
                    <View style={styles.reportBox}>
                      <Text style={styles.reportScore}>
                        Score {recording.report.overall_score.toFixed(1)}
                      </Text>
                      <Text style={styles.reportText} numberOfLines={3}>
                        {recording.report.teaching_quality_notes}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.pendingText}>
                      Analysis not available yet.
                    </Text>
                  )}
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
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 18, paddingBottom: 40 },
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
  subjectName: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
  },
  subjectMeta: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  sectionHeader: {
    gap: 4,
    paddingTop: 4,
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
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  recordingTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  statusChip: {
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  recordingMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  reportBox: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    gap: 6,
  },
  reportScore: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  reportText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  pendingText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 14,
  },
});
