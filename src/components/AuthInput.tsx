import { useState } from 'react';
import { Feather } from '@expo/vector-icons';
import {
  KeyboardTypeOptions,
  Pressable,
  ReturnKeyTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors } from '../theme/colors';

type AuthInputProps = {
  label: string;
  placeholder: string;
  secureTextEntry?: boolean;
  rightLabel?: string;
  showEye?: boolean;
  compactLabel?: boolean;
  value?: string;
  onChangeText?: (value: string) => void;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
  autoCapitalize?: TextInputProps['autoCapitalize'];
};

export function AuthInput({
  label,
  placeholder,
  secureTextEntry,
  rightLabel,
  showEye = false,
  compactLabel = true,
  value,
  onChangeText,
  keyboardType,
  autoComplete,
  textContentType,
  returnKeyType,
  onSubmitEditing,
  autoCapitalize = 'none',
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const shouldMask = !!secureTextEntry && !showPassword;

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, !compactLabel && styles.labelExpanded]}>
          {label}
        </Text>
        {rightLabel ? <Text style={styles.link}>{rightLabel}</Text> : null}
      </View>

      <View style={styles.inputShell}>
        <TextInput
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          autoCorrect={false}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.textPlaceholder}
          returnKeyType={returnKeyType}
          secureTextEntry={shouldMask}
          style={styles.input}
          textContentType={textContentType}
          value={value}
        />
        {showEye ? (
          <Pressable
            hitSlop={10}
            onPress={() => setShowPassword((current) => !current)}
          >
            <Feather
              color={colors.textSecondary}
              name={showPassword ? 'eye-off' : 'eye'}
              size={18}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  labelExpanded: {
    fontSize: 14,
    letterSpacing: 0,
    textTransform: 'none',
  },
  link: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: '600',
  },
  inputShell: {
    minHeight: 56,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(191, 199, 212, 0.24)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    padding: 0,
  },
});
