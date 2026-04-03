import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

export function FooterMeta() {
  return (
    <View style={styles.footer}>
      <Text style={styles.copy}>© 2024 ClassEcho Editorial. All rights reserved.</Text>

      <View style={styles.linksRow}>
        <Text style={styles.link}>Privacy{'\n'}Policy</Text>
        <Text style={styles.link}>Terms of{'\n'}Service</Text>
        <Text style={styles.link}>Help{'\n'}Center</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: colors.footer,
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 48,
    gap: 24,
  },
  copy: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 32,
  },
  link: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});
