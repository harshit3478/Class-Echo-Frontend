import { useEffect, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AudioWaveform } from '../components/AudioWaveform';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { RecordingStatus } from '../types/api';
import { buildWaveformBars, formatAudioTime } from '../lib/audio';

type Props = NativeStackScreenProps<RootStackParamList, 'RecordingDetail'>;

function statusStyle(status: RecordingStatus) {
  switch (status) {
    case 'completed':
      return { bg: '#E8F7EE', text: '#127A40', label: 'Analysed' };
    case 'processing':
      return { bg: '#FFF4E0', text: '#92400E', label: 'Processing' };
    case 'pending':
      return { bg: colors.surfaceMuted, text: colors.textSecondary, label: 'Pending' };
    case 'failed':
      return { bg: '#FFF1F1', text: '#B42318', label: 'Failed' };
  }
}

function ScoreRing({ score }: { score: number }) {
  const label =
    score >= 85 ? 'Excellent' :
    score >= 70 ? 'Good' :
    score >= 55 ? 'Fair' :
    'Needs work';
  const color =
    score >= 85 ? '#127A40' :
    score >= 70 ? colors.accent :
    score >= 55 ? '#92400E' :
    '#B42318';

  return (
    <View style={ring.wrap}>
      <View style={[ring.circle, { borderColor: color }]}>
        <Text style={[ring.score, { color }]}>{score.toFixed(0)}</Text>
        <Text style={ring.pct}>%</Text>
      </View>
      <Text style={[ring.label, { color }]}>{label}</Text>
    </View>
  );
}

const ring = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 1,
  },
  score: { fontSize: 28, fontWeight: '800' },
  pct: { fontSize: 14, fontWeight: '700', marginTop: 6, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: '700' },
});

export function RecordingDetailScreen({ navigation, route }: Props) {
  const { recording, subjectName } = route.params;
  const player = useAudioPlayer(recording.cloudinary_url, { updateInterval: 200 });
  const playerStatus = useAudioPlayerStatus(player);
  const statusBadge = statusStyle(recording.status);
  const waveform = useMemo(() => buildWaveformBars(recording.id), [recording.id]);

  useEffect(() => {
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  }, []);

  const progress =
    playerStatus.duration > 0
      ? Math.min(1, playerStatus.currentTime / playerStatus.duration)
      : 0;

  const handleTogglePlay = () => {
    if (playerStatus.playing) {
      player.pause();
      return;
    }

    if (playerStatus.duration > 0 && playerStatus.currentTime >= playerStatus.duration - 0.2) {
      void player.seekTo(0);
    }
    player.play();
  };

  const report = recording.report;

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
        <View style={styles.hero}>
          <Text style={styles.subjectLabel}>{subjectName}</Text>
          <Text style={styles.heroTitle}>{recording.chapter_name ?? `Recording #${recording.id}`}</Text>
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
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <Text style={styles.heroMeta}>· {formatAudioTime(recording.duration_seconds)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeading}>Audio Playback</Text>
            <Text style={styles.playerTime}>
              {formatAudioTime(playerStatus.currentTime)} / {formatAudioTime(playerStatus.duration || recording.duration_seconds)}
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
                {playerStatus.playing ? 'Tap to pause playback' : 'Tap to listen to the uploaded audio'}
              </Text>
            </View>
          </Pressable>

          <View style={styles.waveformWrap}>
            <AudioWaveform bars={waveform} progress={progress} />
          </View>
        </View>

        {recording.status === 'completed' && report ? (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>AI Performance Report</Text>
            {report.overall_score != null ? <ScoreRing score={report.overall_score} /> : null}

            {report.teaching_quality_notes ? (
              <View style={styles.noteSection}>
                <Text style={styles.noteLabel}>Teaching Quality</Text>
                <Text style={styles.noteText}>{report.teaching_quality_notes}</Text>
              </View>
            ) : null}

            {report.strengths ? (
              <View style={styles.noteSection}>
                <View style={styles.noteLabelRow}>
                  <Ionicons color="#127A40" name="checkmark-circle" size={15} />
                  <Text style={[styles.noteLabel, { color: '#127A40' }]}>Strengths</Text>
                </View>
                <Text style={styles.noteText}>{report.strengths}</Text>
              </View>
            ) : null}

            {report.improvements ? (
              <View style={styles.noteSection}>
                <View style={styles.noteLabelRow}>
                  <Ionicons color={colors.warning} name="arrow-up-circle" size={15} />
                  <Text style={[styles.noteLabel, { color: colors.warning }]}>
                    Areas for Improvement
                  </Text>
                </View>
                <Text style={styles.noteText}>{report.improvements}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.processingCard}>
            {recording.status === 'processing' ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Ionicons
                color={recording.status === 'failed' ? '#B42318' : colors.textMuted}
                name={recording.status === 'failed' ? 'alert-circle-outline' : 'time-outline'}
                size={20}
              />
            )}
            <Text style={styles.processingText}>
              {recording.status === 'processing'
                ? 'AI analysis is in progress. Check back shortly.'
                : recording.status === 'failed'
                  ? 'The report could not be generated for this recording.'
                  : 'Analysis is queued and will start soon.'}
            </Text>
          </View>
        )}
      </ScrollView>
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSpacer: { width: 36 },
  scroll: { paddingBottom: 40, gap: 16 },
  hero: {
    padding: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  subjectLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: colors.accent },
  heroTitle: { fontSize: 30, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.6 },
  heroDescription: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  heroMeta: { fontSize: 13, color: colors.textMuted },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700' },
  card: {
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  cardHeading: { fontSize: 17, fontWeight: '800', color: colors.textPrimary },
  playerTime: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  playerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surfaceSoft,
  },
  playerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerTextWrap: { flex: 1, gap: 3 },
  playerTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  playerSubtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  waveformWrap: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
  },
  noteSection: { gap: 8 },
  noteLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  noteText: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  noteLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  processingCard: {
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processingText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.textSecondary },
});
