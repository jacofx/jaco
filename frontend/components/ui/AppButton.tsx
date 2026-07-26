import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, layout, radius, spacing, typography } from '../../constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
export type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type AppButtonSize = 'small' | 'medium' | 'large';

export interface AppButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  trailingElement?: ReactNode;
}

const palettes = {
  primary: {
    background: colors.primary,
    pressedBackground: colors.primaryDark,
    foreground: colors.inverse,
    border: colors.primary,
  },
  secondary: {
    background: colors.ink,
    pressedBackground: colors.primaryDark,
    foreground: colors.inverse,
    border: colors.ink,
  },
  outline: {
    background: colors.surface,
    pressedBackground: colors.primarySoft,
    foreground: colors.primary,
    border: colors.borderStrong,
  },
  ghost: {
    background: colors.transparent,
    pressedBackground: colors.subtle,
    foreground: colors.primary,
    border: colors.transparent,
  },
  danger: {
    background: colors.danger,
    pressedBackground: colors.ink,
    foreground: colors.inverse,
    border: colors.danger,
  },
} as const;

const buttonSizes = {
  small: { minHeight: 40, paddingHorizontal: spacing.md, iconSize: 17 },
  medium: { minHeight: 48, paddingHorizontal: spacing.lg, iconSize: 19 },
  large: { minHeight: 52, paddingHorizontal: spacing.xl, iconSize: 21 },
} as const;

export function AppButton({
  label,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  disabled = false,
  style,
  textStyle,
  trailingElement,
  accessibilityLabel = label,
  accessibilityState,
  ...pressableProps
}: AppButtonProps) {
  const palette = palettes[variant];
  const dimensions = buttonSizes[size];
  const isDisabled = disabled || loading;
  const iconElement = icon ? (
    <Ionicons name={icon} size={dimensions.iconSize} color={palette.foreground} />
  ) : null;

  return (
    <Pressable
      {...pressableProps}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        ...accessibilityState,
        busy: loading,
        disabled: isDisabled,
      }}
      disabled={isDisabled}
      hitSlop={spacing.xs}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: dimensions.minHeight,
          paddingHorizontal: dimensions.paddingHorizontal,
          backgroundColor: pressed ? palette.pressedBackground : palette.background,
          borderColor: palette.border,
        },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.foreground} size="small" />
      ) : (
        <View style={styles.content}>
          {iconPosition === 'left' ? iconElement : null}
          <Text style={[styles.label, { color: palette.foreground }, textStyle]}>
            {label}
          </Text>
          {iconPosition === 'right' ? iconElement : null}
          {trailingElement}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    minWidth: layout.minimumTouchTarget,
    paddingVertical: spacing.sm,
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    maxWidth: '100%',
  },
  label: {
    ...typography.button,
    flexShrink: 1,
    textAlign: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
    width: '100%',
  },
  disabled: {
    opacity: 0.52,
  },
});
