import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, layout, spacing, typography } from '../../constants/theme';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack?: () => void;
  backLabel?: string;
  rightAction?: ReactNode;
  bordered?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  backLabel = 'Go back',
  rightAction,
  bordered = false,
  compact = false,
  style,
}: ScreenHeaderProps) {
  return (
    <View
      style={[
        styles.container,
        compact && styles.containerCompact,
        bordered && styles.containerBordered,
        style,
      ]}
    >
      {onBack ? (
        <Pressable
          accessibilityLabel={backLabel}
          accessibilityRole="button"
          hitSlop={spacing.xs}
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
        >
          <Ionicons name="arrow-back" size={23} color={colors.ink} />
        </Pressable>
      ) : null}
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={[styles.title, compact && styles.titleCompact]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    backgroundColor: colors.canvas,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.lg,
    width: '100%',
  },
  containerCompact: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  containerBordered: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  backButton: {
    alignItems: 'center',
    height: layout.minimumTouchTarget,
    justifyContent: 'center',
    marginLeft: -spacing.sm,
    marginTop: -spacing.sm,
    width: layout.minimumTouchTarget,
  },
  backButtonPressed: {
    opacity: 0.58,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  eyebrow: {
    ...typography.overline,
    color: colors.primary,
  },
  title: {
    ...typography.h2,
    color: colors.ink,
  },
  titleCompact: {
    ...typography.h3,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    maxWidth: 680,
  },
  rightAction: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.minimumTouchTarget,
  },
});
