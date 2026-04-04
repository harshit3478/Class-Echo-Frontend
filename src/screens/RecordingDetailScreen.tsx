import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
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

import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { RecordingStatus } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'RecordingDetail'>;

function statusStyle(status: RecordingStatus) {
  switch (status) {
    case 'completed': return { bg: '#E8F7EE', text: '#127A40', label: 'Analysed' };
    case 'processing': return { bg: '#FFF4E0', text: '#92400E', label: 'Processing' };
    case 'pending': return { bg: colors.surfaceMuted, text: colors.textSecondary, label: 'Pending' };
    case 'failed': return { bg: '#FFF1F1', text: '#B42318', label: 'Failed' };
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function ScoreRing({ score }: { score: number }) {
  const label =
    score >= 85 ? 'Excellent' :
    score >= 70 ? 'Good' :
    score >= 55 ? 'Fair' : 'Needs work';
  const color =
    score >= 85 ? '#127A40' :
    score >= 70 ? colors.accent :
    score >= 55 ? '#92400E' : '#B42318';

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
    width: 96, height: 96, borderRadius: 48,
    borderWidth: 5, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 1,
  },
  score: { fontSize: 28, fontWeight: '800' },
  pct: { fontSize: 14, fontWeight: '700', marginTop: 6, color: colors.textMuted },
  label: { fontSize: 13, fontWeight: '700' },
});

export function RecordingDetailScreen({ navigation, route }: Props) {
  const { recording, subjectName } = route.params;
  const s = statusStyle(recording.status);

  // Audio playback
  const soundRef = useRef<Audio.Sound | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => undefined);
    };
  }, []);

  const togglePlay = async () => {
    if (audioLoading) return;

    if (isPlaying && soundRef.current) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      return;
    }

    if (soundRef.current) {
      await soundRef.current.playAsync();
      setIsPlaying(true);
      return;
    }

    // First play — load the sound
    setAudioLoading(true);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
      const { sound } = await Audio.Sound.createAsync(
        { uri: recording.cloudinary_url },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        },
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch {
      Alert.alert('Playback error', 'Could not play this recording.');
    } finally {
      setAudioLoading(false);
    }
  };

  const report = recording.report;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
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
            <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
              <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
            </View>
            <Text style={styles.heroMeta}>
              {new Date(recording.uploaded_at).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric', year: 'numeric',
              })}
            </Text>
            {recording.duration_seconds ? (
              <Text style={styles.heroMeta}>· {formatDuration(recording.duration_seconds)}</Text>
            ) : null}
          </View>
        </View>

        {/* Audio Player */}
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Audio Playback</Text>
          <Pressable onPress={() => { void togglePlay(); }} style={styles.playerRow}>
            <View style={styles.playerIcon}>
              {audioLoading ? (
                <ActivityIndicator color={colors.accent} size="small" />
              ) : (
                <Ionicons
                  color={colors.accent}
                  name={isPlaying ? 'pause' : 'play'}
                  size={24}
                />
              )}
            </View>
            <View style={styles.playerInfo}>
              <Text style={styles.playerTitle}>
                {recording.chapter_name ?? `Recording #${recording.id}`}
              </Text>
              <Text style={styles.playerDuration}>
                {formatDuration(recording.duration_seconds)}
              </Text>
            </View>
            <Ionicons color={colors.textMuted} name="volume-medium-outline" size={18} />
          </Pressable>
        </View>

        {/* AI Report */}
        {recording.status === 'completed' && report ? (
          <View style={styles.card}>
            <Text style={styles.cardHeading}>AI Performance Report</Text>
            {report.overall_score != null ? (
              <ScoreRing score={report.overall_score} />
            ) : null}

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
        ) : recording.status === 'processing' ? (
          <View style={styles.processingCard}>
            <ActivityIndicator color={colors.accent} size="small" />
            <Text style={styles.processingText}>
              AI analysis is in progress. Check back shortly.
            </Text>
          </View>
        ) : recording.status === 'pending' ? (
          <View style={styles.processingCard}>
            <Ionicons color={colors.textMuted} name="time-outline" size={20} />
            <Text style={styles.processingText}>
              Analysis is queued and will start soon.
            </Text>
          </View>
        ) : null}
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  headerSpacer: { width: 36 },

  scroll: { paddingBottom: 40, gap: 16 },

  hero: {
    backgroundColor: colors.surface,
    padding: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  subjectLabel: { color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, letterSpacing: -0.5, lineHeight: 32 },
  heroDescription: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  heroMeta: { fontSize: 13, color: colors.textMuted },

  card: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 16,
  },
  cardHeading: { fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5 },

  // Audio player
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.accentSoft, borderRadius: 14, padding: 14,
  },
  playerIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  playerInfo: { flex: 1, gap: 3 },
  playerTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  playerDuration: { fontSize: 12, color: colors.textMuted },

  // Report
  noteSection: { gap: 6 },
  noteLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteLabel: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  noteText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },

  processingCard: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  processingText: { flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
});
