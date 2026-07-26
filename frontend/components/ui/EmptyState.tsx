import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/theme';
import { AppButton } from './AppButton';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: IconName;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  title,
  description,
  icon = 'file-tray-outline',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  compact = false,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact, style]}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.iconContainer}
      >
        <Ionicons name={icon} size={compact ? 26 : 32} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <View style={styles.actions}>
          <AppButton label={actionLabel} onPress={onAction} size="small" />
          {secondaryActionLabel && onSecondaryAction ? (
            <AppButton
              label={secondaryActionLabel}
              onPress={onSecondaryAction}
              size="small"
              variant="ghost"
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'center',
    gap: spacing.lg,
    justifyContent: 'center',
    maxWidth: 400,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.sectionLg,
    width: '100%',
  },
  containerCompact: {
    gap: spacing.md,
    paddingVertical: spacing.xxl,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  copy: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
    color: colors.ink,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
});
