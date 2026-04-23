import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AudioWaveform } from '../components/AudioWaveform';
import { useAuth } from '../context/AuthContext';
import { retryRecording } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { DimensionScore, QuantitativeMetrics, RecordingStatus, ScoreBreakdown } from '../types/api';
import { buildWaveformBars, formatAudioTime } from '../lib/audio';

type Props = NativeStackScreenProps<RootStackParamList, 'RecordingDetail'>;

// ── Dimension metadata ────────────────────────────────────────────────────────

const DIMENSIONS: {
  key: keyof ScoreBreakdown;
  label: string;
  max: number;
  icon: string;
}[] = [
  { key: 'verbal_clarity',         label: 'Verbal Clarity',        max: 20, icon: 'mic-outline' },
  { key: 'pacing_delivery',        label: 'Pacing & Delivery',     max: 15, icon: 'speedometer-outline' },
  { key: 'content_structure',      label: 'Content Structure',     max: 15, icon: 'list-outline' },
  { key: 'conceptual_depth',       label: 'Conceptual Depth',      max: 20, icon: 'bulb-outline' },
  { key: 'student_engagement',     label: 'Student Engagement',    max: 15, icon: 'people-outline' },
  { key: 'language_accessibility', label: 'Language Accessibility',max: 10, icon: 'language-outline' },
  { key: 'closure_recap',          label: 'Closure & Recap',       max:  5, icon: 'checkmark-done-outline' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number, max: number): string {
  const pct = score / max;
  if (pct >= 0.8) return '#127A40';
  if (pct >= 0.6) return colors.accent;
  if (pct >= 0.4) return '#92400E';
  return '#B42318';
}

function grade(score: number): string {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function statusStyle(status: RecordingStatus) {
  switch (status) {
    case 'completed':  return { bg: '#E8F7EE', text: '#127A40', label: 'Analysed' };
    case 'processing': return { bg: '#FFF4E0', text: '#92400E', label: 'Processing' };
    case 'pending':    return { bg: colors.surfaceMuted, text: colors.textSecondary, label: 'Pending' };
    case 'failed':     return { bg: '#FFF1F1', text: '#B42318', label: 'Failed' };
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const g = grade(score);
  const col = scoreColor(score, 100);
  return (
    <View style={ring.wrap}>
      <View style={[ring.circle, { borderColor: col }]}>
        <Text style={[ring.score, { color: col }]}>{Math.round(score)}</Text>
        <Text style={ring.outOf}>/100</Text>
      </View>
      <View style={[ring.gradeBadge, { backgroundColor: col }]}>
        <Text style={ring.gradeText}>{g}</Text>
      </View>
    </View>
  );
}

const ring = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  circle: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 5,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 2,
  },
  score: { fontSize: 30, fontWeight: '800' },
  outOf: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 10 },
  gradeBadge: {
    paddingHorizontal: 14, paddingVertical: 4, borderRadius: 999,
  },
  gradeText: { fontSize: 13, fontWeight: '800', color: '#fff' },
});

function MetricsStrip({ q }: { q: QuantitativeMetrics }) {
  const items = [
    { label: 'WPM', value: q.wpm_estimate > 0 ? `~${q.wpm_estimate}` : '—', icon: 'speedometer-outline' },
    { label: 'Fillers', value: String(q.filler_words_heard), icon: 'chatbubble-ellipses-outline' },
    { label: 'Questions', value: String(q.questions_asked), icon: 'help-circle-outline' },
  ];
  return (
    <View style={ms.wrap}>
      {items.map((item, i) => (
        <View key={item.label} style={[ms.cell, i < items.length - 1 && ms.cellBorder]}>
          <Ionicons color={colors.accent} name={item.icon as any} size={16} />
          <Text style={ms.value}>{item.value}</Text>
          <Text style={ms.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const ms = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceSoft, overflow: 'hidden',
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 3 },
  cellBorder: { borderRightWidth: 1, borderRightColor: colors.border },
  value: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  label: { fontSize: 10, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.8 },
});

function LanguagePill({ text }: { text: string }) {
  return (
    <View style={lp.pill}>
      <Text style={lp.text}>{text}</Text>
    </View>
  );
}

const lp = StyleSheet.create({
  pill: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent + '40',
  },
  text: { fontSize: 12, fontWeight: '700', color: colors.accentDark },
});

function DimensionCard({ dim, data }: { dim: typeof DIMENSIONS[0]; data: DimensionScore }) {
  const col = scoreColor(data.score, dim.max);
  const pct = Math.round((data.score / dim.max) * 100);

  return (
    <View style={dc.card}>
      <View style={dc.header}>
        <View style={dc.iconWrap}>
          <Ionicons color={col} name={dim.icon as any} size={16} />
        </View>
        <Text style={dc.label}>{dim.label}</Text>
        <View style={[dc.scoreBadge, { backgroundColor: col + '18', borderColor: col + '40' }]}>
          <Text style={[dc.scoreText, { color: col }]}>{data.score}<Text style={dc.maxText}>/{dim.max}</Text></Text>
        </View>
      </View>

      {/* Score bar */}
      <View style={dc.barTrack}>
        <View style={[dc.barFill, { width: `${pct}%` as any, backgroundColor: col }]} />
      </View>

      {/* Finding */}
      {data.finding ? (
        <Text style={dc.finding}>{data.finding}</Text>
      ) : null}

      {/* Evidence quotes */}
      {data.evidence.length > 0 ? (
        <View style={dc.evidenceList}>
          {data.evidence.map((e, i) => (
            <View key={i} style={dc.evidenceRow}>
              <Text style={dc.evidenceDot}>›</Text>
              <Text style={dc.evidenceText}>{e}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const dc = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 16, gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  label: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  scoreBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1,
  },
  scoreText: { fontSize: 14, fontWeight: '800' },
  maxText: { fontSize: 11, fontWeight: '600' },
  barTrack: {
    height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3 },
  finding: { fontSize: 13, lineHeight: 19, color: colors.textSecondary, fontStyle: 'italic' },
  evidenceList: { gap: 5 },
  evidenceRow: { flexDirection: 'row', gap: 6 },
  evidenceDot: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 1 },
  evidenceText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.textMuted },
});

function BulletList({ items, color, title, icon }: {
  items: string[]; color: string; title: string; icon: string;
}) {
  if (!items.length) return null;
  return (
    <View style={bl.wrap}>
      <View style={bl.titleRow}>
        <Ionicons color={color} name={icon as any} size={15} />
        <Text style={[bl.title, { color }]}>{title}</Text>
      </View>
      {items.map((item, i) => (
        <View key={i} style={bl.row}>
          <View style={[bl.dot, { backgroundColor: color }]} />
          <Text style={bl.text}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const bl = StyleSheet.create({
  wrap: { gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  text: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.textSecondary },
});

// ── Main screen ───────────────────────────────────────────────────────────────

export function RecordingDetailScreen({ navigation, route }: Props) {
  const { recording: initialRecording, subjectName } = route.params;
  const { session } = useAuth();
  const [status, setStatus] = useState(initialRecording.status);
  const [retrying, setRetrying] = useState(false);
  const player = useAudioPlayer(initialRecording.cloudinary_url, { updateInterval: 200 });
  const playerStatus = useAudioPlayerStatus(player);
  const statusBadge = statusStyle(status);
  const waveform = useMemo(() => buildWaveformBars(initialRecording.id), [initialRecording.id]);

  useEffect(() => {
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  }, []);

  const progress =
    playerStatus.duration > 0
      ? Math.min(1, playerStatus.currentTime / playerStatus.duration)
      : 0;

  const handleTogglePlay = () => {
    if (playerStatus.playing) { player.pause(); return; }
    if (playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration - 0.2) {
      void player.seekTo(0);
    }
    player.play();
  };

  const handleRetry = async () => {
    if (!session || retrying) return;
    setRetrying(true);
    try {
      await retryRecording(session.token, initialRecording.id);
      setStatus('pending');
    } catch (e) {
      Alert.alert('Retry failed', e instanceof Error ? e.message : 'Could not queue retry.');
    } finally {
      setRetrying(false);
    }
  };

  const recording = { ...initialRecording, status };
  const report = initialRecording.report;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {recording.chapter_name ?? `Recording #${recording.id}`}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.subjectLabel}>{subjectName}</Text>
          <Text style={styles.heroTitle}>
            {recording.chapter_name ?? `Recording #${recording.id}`}
          </Text>
          {recording.description ? (
            <Text style={styles.heroDescription}>{recording.description}</Text>
          ) : null}
          <View style={styles.heroBadgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              <Text style={[styles.statusText, { color: statusBadge.text }]}>
                {statusBadge.label}
              </Text>
            </View>
            <Text style={styles.heroMeta}>
              {new Date(recording.uploaded_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </Text>
            <Text style={styles.heroMeta}>· {formatAudioTime(recording.duration_seconds)}</Text>
          </View>
        </View>

        {/* Playback card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeading}>Audio Playback</Text>
            <Text style={styles.playerTime}>
              {formatAudioTime(playerStatus.currentTime)} /{' '}
              {formatAudioTime(playerStatus.duration || recording.duration_seconds)}
            </Text>
          </View>
          <Pressable onPress={handleTogglePlay} style={styles.playerButton}>
            <View style={styles.playerIcon}>
              {!playerStatus.isLoaded || playerStatus.isBuffering ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <Ionicons
                  color={colors.accent}
                  name={playerStatus.playing ? 'pause' : 'play'}
                  size={24}
                />
              )}
            </View>
            <View style={styles.playerTextWrap}>
              <Text style={styles.playerTitle}>Play recording</Text>
              <Text style={styles.playerSubtitle}>
                {playerStatus.playing ? 'Tap to pause' : 'Tap to listen'}
              </Text>
            </View>
          </Pressable>
          <View style={styles.waveformWrap}>
            <AudioWaveform bars={waveform} progress={progress} />
          </View>
        </View>

        {/* Report */}
        {recording.status === 'completed' && report ? (
          <View style={styles.reportWrap}>
            {/* Header + score */}
            <View style={styles.card}>
              <Text style={styles.cardHeading}>AI Performance Report</Text>
              {report.overall_score != null ? (
                <ScoreRing score={report.overall_score} />
              ) : null}
              {report.teaching_quality_notes ? (
                <Text style={styles.overallNotes}>{report.teaching_quality_notes}</Text>
              ) : null}
            </View>

            {/* Quantitative metrics */}
            {report.quantitative_metrics ? (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>KEY METRICS</Text>
                <MetricsStrip q={report.quantitative_metrics} />
                {report.quantitative_metrics.languages_detected.length > 0 ? (
                  <View style={styles.langRow}>
                    <Text style={styles.langPrefix}>Languages detected:</Text>
                    {report.quantitative_metrics.languages_detected.map((lang) => (
                      <LanguagePill key={lang} text={lang} />
                    ))}
                    {report.quantitative_metrics.code_switching_frequency !== 'none' ? (
                      <LanguagePill
                        text={`${report.quantitative_metrics.code_switching_frequency} switching`}
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Per-dimension scores */}
            {report.score_breakdown ? (
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>DIMENSION BREAKDOWN</Text>
                {DIMENSIONS.map((dim) => {
                  const data = report.score_breakdown![dim.key];
                  return data ? (
                    <DimensionCard key={dim.key} dim={dim} data={data} />
                  ) : null;
                })}
              </View>
            ) : null}

            {/* Strengths + improvements */}
            {report.quantitative_metrics &&
            (report.quantitative_metrics.top_strengths.length > 0 ||
              report.quantitative_metrics.priority_improvements.length > 0) ? (
              <View style={styles.card}>
                <BulletList
                  color="#127A40"
                  icon="checkmark-circle-outline"
                  items={report.quantitative_metrics.top_strengths}
                  title="Top Strengths"
                />
                <BulletList
                  color={colors.warning}
                  icon="arrow-up-circle-outline"
                  items={report.quantitative_metrics.priority_improvements}
                  title="Priority Improvements"
                />
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[styles.processingCard, status === 'failed' && styles.processingCardFailed]}>
            {status === 'processing' ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Ionicons
                color={status === 'failed' ? '#B42318' : colors.textMuted}
                name={status === 'failed' ? 'alert-circle-outline' : 'time-outline'}
                size={20}
              />
            )}
            <View style={styles.processingBody}>
              <Text style={styles.processingText}>
                {status === 'processing'
                  ? 'AI analysis in progress. Check back in about a minute.'
                  : status === 'failed'
                  ? 'The report could not be generated for this recording.'
                  : 'Analysis is queued and will start soon.'}
              </Text>
              {status === 'failed' ? (
                <Pressable
                  disabled={retrying}
                  onPress={() => void handleRetry()}
                  style={styles.retryButton}
                >
                  {retrying ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Ionicons color="#fff" name="refresh-outline" size={14} />
                  )}
                  <Text style={styles.retryButtonText}>
                    {retrying ? 'Queuing…' : 'Retry Analysis'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.textPrimary,
  },
  headerSpacer: { width: 36 },
  scroll: { paddingBottom: 40, gap: 16 },
  hero: {
    padding: 20, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8,
  },
  subjectLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.accent },
  heroTitle: { fontSize: 28, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.6 },
  heroDescription: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  heroMeta: { fontSize: 13, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700' },
  card: {
    marginHorizontal: 20, padding: 18, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 14,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardHeading: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  playerTime: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  playerButton: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
    borderRadius: 18, backgroundColor: colors.surfaceSoft,
  },
  playerIcon: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  playerTextWrap: { flex: 1, gap: 3 },
  playerTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  playerSubtitle: { fontSize: 13, color: colors.textSecondary },
  waveformWrap: {
    padding: 14, borderRadius: 18, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surfaceSoft,
  },
  reportWrap: { gap: 16 },
  overallNotes: {
    fontSize: 14, lineHeight: 22, color: colors.textSecondary,
    textAlign: 'center', paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', letterSpacing: 1.2,
    color: colors.textMuted,
  },
  langRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  langPrefix: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  processingCard: {
    marginHorizontal: 20, padding: 18, borderRadius: 20,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
  },
  processingCardFailed: { borderColor: '#FECACA', backgroundColor: '#FFF8F8' },
  processingBody: { flex: 1, gap: 12 },
  processingText: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  retryButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 999, backgroundColor: '#B42318',
  },
  retryButtonText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
