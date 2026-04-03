import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppLogo } from '../components/AppLogo';
import { AuthInput } from '../components/AuthInput';
import { FooterMeta } from '../components/FooterMeta';
import { PrimaryButton } from '../components/PrimaryButton';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Signup'>;

export function SignupScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Feather color={colors.accentDark} name="arrow-left" size={16} />
          </Pressable>
          <AppLogo compact showBadge={false} />
        </View>

        <View style={styles.main}>
          <View style={styles.card}>
            <View style={styles.hero}>
              <Text style={styles.title}>Join the Echo</Text>
              <Text style={styles.subtitle}>
                Your curated academic journey{'\n'}begins here.
              </Text>
            </View>

            <View style={styles.form}>
              <AuthInput
                compactLabel={false}
                label="Full Name"
                placeholder="Alex Morgan"
                onChangeText={setFullName}
                value={fullName}
              />
              <AuthInput
                compactLabel={false}
                label="Institutional Email"
                placeholder="alex@university.edu"
                onChangeText={setEmail}
                value={email}
              />
              <AuthInput
                compactLabel={false}
                label="Mobile Number"
                placeholder="+1 (555) 000-0000"
                onChangeText={setMobile}
                value={mobile}
              />
              <AuthInput
                compactLabel={false}
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                onChangeText={setPassword}
                value={password}
              />
              <PrimaryButton
                label="Create Account"
                onPress={() => navigation.navigate('Login')}
                showArrow={false}
              />
            </View>

            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Backend gap</Text>
              <Text style={styles.noticeBody}>
                The live backend only supports student signup with required
                school and class ids, but there is no public lookup endpoint
                for those options yet. I left this screen ready for wiring once
                that flow is clarified.
              </Text>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.divider} />
            </View>

            <Pressable style={styles.socialButton}>
              <View style={styles.googleMark}>
                <Text style={styles.googleText}>G</Text>
              </View>
              <Text style={styles.socialText}>Sign up with Google</Text>
            </Pressable>

            <View style={styles.footerLinkRow}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Pressable onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Log in</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <FooterMeta />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    gap: 24,
    shadowColor: colors.cardShadow,
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: {
      width: 0,
      height: 18,
    },
    elevation: 6,
  },
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.9,
    lineHeight: 45,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 18,
    lineHeight: 28,
    textAlign: 'center',
  },
  form: {
    gap: 24,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 4,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  socialButton: {
    minHeight: 56,
    borderRadius: 24,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  googleMark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  googleText: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '700',
  },
  socialText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  footerLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  footerLink: {
    color: colors.accentDark,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  notice: {
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    padding: 14,
    gap: 6,
  },
  noticeTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  noticeBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
