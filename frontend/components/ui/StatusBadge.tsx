import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
export type StatusBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface StatusBadgeProps {
  label: string;
  tone?: StatusBadgeTone;
  icon?: IconName;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const toneStyles = {
  neutral: {
    background: colors.subtle,
    foreground: colors.muted,
    border: colors.border,
    defaultIcon: 'ellipse' as IconName,
  },
  success: {
    background: colors.successSoft,
    foreground: colors.success,
    border: colors.primarySoft,
    defaultIcon: 'checkmark-circle' as IconName,
  },
  warning: {
    background: colors.warningSoft,
    foreground: colors.warning,
    border: colors.accentSoft,
    defaultIcon: 'time' as IconName,
  },
  danger: {
    background: colors.dangerSoft,
    foreground: colors.danger,
    border: colors.dangerSoft,
    defaultIcon: 'alert-circle' as IconName,
  },
  info: {
    background: colors.infoSoft,
    foreground: colors.info,
    border: colors.infoSoft,
    defaultIcon: 'information-circle' as IconName,
  },
} as const;

export function StatusBadge({
  label,
  tone = 'neutral',
  icon,
  compact = false,
  style,
  textStyle,
}: StatusBadgeProps) {
  const palette = toneStyles[tone];

  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[
        styles.container,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
        compact && styles.containerCompact,
        style,
      ]}
    >
      <Ionicons
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        name={icon ?? palette.defaultIcon}
        size={compact ? 12 : 14}
        color={palette.foreground}
      />
      <Text
        numberOfLines={1}
        style={[styles.label, { color: palette.foreground }, compact && styles.labelCompact, textStyle]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  containerCompact: {
    minHeight: 24,
    paddingHorizontal: 6,
    paddingVertical: spacing.xxs,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
  },
  labelCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
});
