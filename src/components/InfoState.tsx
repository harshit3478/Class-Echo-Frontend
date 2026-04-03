import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type InfoStateProps = {
  title: string;
  body?: string;
  loading?: boolean;
};

export function InfoState({ title, body, loading }: InfoStateProps) {
  return (
    <View style={styles.wrap}>
      {loading ? (
        <ActivityIndicator color={colors.accentDark} />
      ) : (
        <View style={styles.dot} />
      )}
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.accentDark,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
