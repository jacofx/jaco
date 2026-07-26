import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useId, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, layout, radius, spacing, typography } from '../../constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface FormFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  leftIcon?: IconName;
  rightElement?: ReactNode;
  showPasswordToggle?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export const FormField = forwardRef<TextInput, FormFieldProps>(function FormField(
  {
    label,
    error,
    helperText,
    required = false,
    disabled = false,
    leftIcon,
    rightElement,
    showPasswordToggle = false,
    containerStyle,
    inputStyle,
    multiline = false,
    secureTextEntry = false,
    editable,
    accessibilityLabel = label,
    accessibilityHint,
    onFocus,
    onBlur,
    nativeID,
    ...inputProps
  },
  ref,
) {
  const generatedId = useId();
  const fieldId = nativeID ?? `field-${generatedId}`;
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const message = error || helperText;
  const isEditable = disabled ? false : editable;
  const shouldShowPasswordToggle = showPasswordToggle && secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text nativeID={`${fieldId}-label`} style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <View
        style={[
          styles.inputShell,
          focused && styles.inputShellFocused,
          error && styles.inputShellError,
          disabled && styles.inputShellDisabled,
          multiline && styles.inputShellMultiline,
        ]}
      >
        {leftIcon ? (
          <Ionicons
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            name={leftIcon}
            size={19}
            color={focused ? colors.primary : colors.muted}
          />
        ) : null}
        <TextInput
          {...inputProps}
          ref={ref}
          nativeID={fieldId}
          accessibilityHint={accessibilityHint ?? message}
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled: disabled || editable === false }}
          editable={isEditable}
          multiline={multiline}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry && !passwordVisible}
          selectionColor={colors.primary}
          style={[styles.input, multiline && styles.inputMultiline, inputStyle]}
        />
        {shouldShowPasswordToggle ? (
          <Pressable
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={spacing.sm}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.accessoryButton}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.muted}
            />
          </Pressable>
        ) : (
          rightElement
        )}
      </View>
      {message ? (
        <Text
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          style={[styles.message, error && styles.errorMessage]}
        >
          {message}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    width: '100%',
  },
  label: {
    ...typography.label,
    color: colors.ink,
  },
  required: {
    color: colors.danger,
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  inputShellFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
    paddingHorizontal: spacing.md - 1,
  },
  inputShellError: {
    borderColor: colors.danger,
  },
  inputShellDisabled: {
    backgroundColor: colors.disabledSurface,
  },
  inputShellMultiline: {
    alignItems: 'flex-start',
    minHeight: 112,
    paddingVertical: spacing.md,
  },
  input: {
    ...typography.bodyLarge,
    color: colors.ink,
    flex: 1,
    minHeight: layout.minimumTouchTarget,
    minWidth: 0,
    paddingVertical: spacing.sm,
  },
  inputMultiline: {
    minHeight: 86,
    paddingTop: 0,
    textAlignVertical: 'top',
  },
  accessoryButton: {
    alignItems: 'center',
    height: layout.minimumTouchTarget,
    justifyContent: 'center',
    marginVertical: -spacing.sm,
    width: layout.minimumTouchTarget,
  },
  message: {
    ...typography.caption,
    color: colors.muted,
  },
  errorMessage: {
    color: colors.danger,
  },
});
