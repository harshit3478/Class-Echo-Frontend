import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StudentTabBar } from '../components/StudentTabBar';
import { useAuth } from '../context/AuthContext';
import { getStudentMe, getStudentSubjects } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { StudentProfileOut, SubjectOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentHome'>;

const CARD_COLORS = ['#E8F4FF', '#FFF4E0', '#E8F7EE', '#F4E8FF', '#FFE8E8'];
const ACCENT_COLORS = [colors.accent, '#F59E0B', '#22C55E', '#9333EA', '#EF4444'];

export function StudentHomeScreen({ navigation }: Props) {
  const { session } = useAuth();
  const [profile, setProfile] = useState<StudentProfileOut | null>(null);
  const [subjects, setSubjects] = useState<SubjectOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!session) return;
    try {
      setError(null);
      const p = await getStudentMe(session.token);
      setProfile(p);
      const s = await getStudentSubjects(session.token, p.class_id);
      setSubjects(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }

  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
  }, [session]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerApp}>ClassEcho</Text>
          <Text style={styles.headerSub}>Student Portal</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.name?.substring(0, 2).toUpperCase() ?? '?'}
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons color={colors.textMuted} name="alert-circle-outline" size={48} />
          <Text style={styles.errorTitle}>Couldn't load subjects</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={subjects}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={styles.greeting}>
                {greeting()}, {profile?.name?.split(' ')[0]}.
              </Text>
              <Text style={styles.greetingSub}>
                {subjects.length} subject{subjects.length !== 1 ? 's' : ''} in {profile?.class_name}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const bg = CARD_COLORS[index % CARD_COLORS.length];
            const accent = ACCENT_COLORS[index % ACCENT_COLORS.length];
            return (
              <Pressable
                onPress={() =>
                  navigation.navigate('StudentSubjectDetail', {
                    subjectId: item.id,
                    subjectName: item.name,
                  })
                }
                style={[styles.card, { backgroundColor: bg }]}
              >
                <View style={styles.cardTop}>
                  <Text style={[styles.cardKicker, { color: accent }]}>
                    {profile?.class_name?.toUpperCase()}
                  </Text>
                  <View style={[styles.cardArrow, { backgroundColor: accent }]}>
                    <Ionicons color="#fff" name="arrow-forward" size={16} />
                  </View>
                </View>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.teacher ? (
                  <View style={styles.cardFooter}>
                    <Ionicons color={colors.textMuted} name="person-outline" size={13} />
                    <Text style={styles.cardTeacher}>{item.teacher.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.cardUnassigned}>No teacher assigned</Text>
                )}
                <View style={[styles.cardAccentBar, { backgroundColor: accent }]} />
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons color={colors.textMuted} name="book-outline" size={48} />
              <Text style={styles.emptyTitle}>No subjects yet</Text>
              <Text style={styles.emptyBody}>
                Your class doesn't have any subjects assigned yet.
              </Text>
            </View>
          }
        />
      )}

      <StudentTabBar
        active="home"
        onTabPress={(tab) => {
          if (tab === 'profile') navigation.navigate('StudentProfile');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerApp: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: colors.accentDark },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  errorTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  errorBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  listContent: { padding: 20, gap: 14, flexGrow: 1 },
  listHeader: { marginBottom: 8, gap: 4 },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  greetingSub: { fontSize: 14, color: colors.textSecondary },

  card: {
    borderRadius: 20,
    padding: 20,
    gap: 8,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardKicker: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, lineHeight: 26 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardTeacher: { fontSize: 13, color: colors.textMuted },
  cardUnassigned: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  cardAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },

  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
