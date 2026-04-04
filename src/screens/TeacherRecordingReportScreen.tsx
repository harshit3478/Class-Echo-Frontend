import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { getTeacherRecordingReport } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { LLMReportOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherRecordingReport'>;

// ── Score ring component ─────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const getColor = (s: number) => {
    if (s >= 85) return '#22C55E';
    if (s >= 70) return colors.accent;
    if (s >= 55) return colors.warning;
    return '#EF4444';
  };

  const getLabel = (s: number) => {
    if (s >= 85) return 'Excellent';
    if (s >= 70) return 'Good';
    if (s >= 55) return 'Average';
    return 'Needs Work';
  };

  const ringColor = getColor(score);

  return (
    <View style={[styles.scoreRingWrap, { width: size + 32, height: size + 32 }]}>
      <View style={[styles.scoreRing, { width: size, height: size, borderRadius: size / 2, borderColor: ringColor }]}>
        <Text style={[styles.scoreValue, { color: ringColor }]}>{score.toFixed(0)}%</Text>
      </View>
      <Text style={[styles.scoreLabel, { color: ringColor }]}>{getLabel(score)}</Text>
    </View>
  );
}

// ── Insight Card ─────────────────────────────────────────────────────────────

function InsightCard({
  icon,
  iconBg,
  iconColor,
  title,
  score,
  scoreColor,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  score?: string;
  scoreColor?: string;
  body: string;
}) {
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightCardTop}>
        <View style={[styles.insightIcon, { backgroundColor: iconBg }]}>
          <Ionicons color={iconColor} name={icon} size={18} />
        </View>
        {score ? (
          <Text style={[styles.insightScore, { color: scoreColor ?? colors.accent }]}>{score}</Text>
        ) : null}
      </View>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightBody}>{body}</Text>
    </View>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, content, icon, iconBg, iconColor }: {
  title: string;
  content: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: iconBg }]}>
          <Ionicons color={iconColor} name={icon} size={14} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionBody}>{content}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function TeacherRecordingReportScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { recordingId, subjectName } = route.params;

  const [report, setReport] = useState<LLMReportOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        setReport(await getTeacherRecordingReport(session.token, recordingId));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load report');
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [session, recordingId]);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Recording Detail</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn}>
            <Ionicons color={colors.textPrimary} name="share-outline" size={20} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading AI report…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons color={colors.textMuted} name="document-text-outline" size={48} />
          <Text style={styles.emptyTitle}>Report not available</Text>
          <Text style={styles.emptyBody}>{error}</Text>
          <Text style={styles.emptyHint}>
            The AI analysis may still be processing. Pull down to refresh once you're back on the recordings list.
          </Text>
        </View>
      ) : report ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Recording metadata */}
          <View style={styles.metaCard}>
            <Text style={styles.metaSubject}>{subjectName}</Text>
            <Text style={styles.metaRecording}>Recording #{recordingId}</Text>
            <Text style={styles.metaDate}>
              Analysed {new Date(report.created_at).toLocaleDateString('en-US', {
                weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
              })}
            </Text>
          </View>

          {/* AI Performance Report header */}
          <View style={styles.aiHeader}>
            <Ionicons color={colors.accent} name="sparkles" size={18} />
            <Text style={styles.aiHeaderText}>AI Performance Report</Text>
          </View>

          {/* Overall score */}
          {report.overall_score != null ? (
            <View style={styles.scoreCard}>
              <View style={styles.scoreCardLeft}>
                <Text style={styles.scoreCardTitle}>Overall Score</Text>
                <Text style={styles.scoreCardSubtitle}>
                  Based on teaching quality, clarity, and curriculum coverage.
                </Text>
              </View>
              <ScoreRing score={report.overall_score} />
            </View>
          ) : (
            <View style={styles.noscoreCard}>
              <Ionicons color={colors.textMuted} name="hourglass-outline" size={20} />
              <Text style={styles.noscoreText}>Score is being calculated…</Text>
            </View>
          )}

          {/* Insight grid */}
          <View style={styles.insightGrid}>
            {report.teaching_quality_notes ? (
              <InsightCard
                body={report.teaching_quality_notes}
                icon="mic"
                iconBg="#D1E4FF"
                iconColor={colors.accentDark}
                score={report.overall_score != null ? `${report.overall_score.toFixed(0)}%` : undefined}
                scoreColor={colors.accent}
                title="Teaching Quality"
              />
            ) : null}
          </View>

          {/* Strengths */}
          {report.strengths ? (
            <Section
              content={report.strengths}
              icon="checkmark-circle"
              iconBg="#E8F7EE"
              iconColor="#127A40"
              title="Strengths"
            />
          ) : null}

          {/* Improvements */}
          {report.improvements ? (
            <Section
              content={report.improvements}
              icon="arrow-up-circle"
              iconBg="#FFF4E0"
              iconColor="#92400E"
              title="Areas for Improvement"
            />
          ) : null}

          {/* Footer note */}
          <View style={styles.footerNote}>
            <Ionicons color={colors.textMuted} name="information-circle-outline" size={14} />
            <Text style={styles.footerNoteText}>
              This report is generated by AI analysis. Use it as a guide, not a definitive assessment.
            </Text>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  headerRight: { width: 36, alignItems: 'flex-end' },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  emptyHint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18, marginTop: 4 },

  scroll: { paddingBottom: 48, gap: 0 },

  // Meta card
  metaCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  metaSubject: { color: colors.accent, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  metaRecording: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  metaDate: { color: colors.textMuted, fontSize: 13, marginTop: 4 },

  // AI header
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  aiHeaderText: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },

  // Score card
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 12,
  },
  scoreCardLeft: { flex: 1, gap: 6 },
  scoreCardTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  scoreCardSubtitle: { color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  noscoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    padding: 16,
  },
  noscoreText: { color: colors.textMuted, fontSize: 14 },

  // Score ring
  scoreRingWrap: { alignItems: 'center', gap: 6 },
  scoreRing: {
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: { fontSize: 20, fontWeight: '800' },
  scoreLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  // Insight grid
  insightGrid: { paddingHorizontal: 20, paddingTop: 16, gap: 12 },
  insightCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 8,
  },
  insightCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  insightIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  insightScore: { fontSize: 22, fontWeight: '800' },
  insightTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  insightBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },

  // Section (strengths / improvements)
  section: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 10,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  sectionBody: { color: colors.textSecondary, fontSize: 14, lineHeight: 22 },

  // Footer
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 20,
  },
  footerNoteText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, flex: 1 },
});
