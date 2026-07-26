import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type ActivityIndicatorProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, spacing, typography } from '../../constants/theme';

export interface LoadingStateProps {
  label?: string;
  size?: ActivityIndicatorProps['size'];
  fullScreen?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function LoadingState({
  label = 'Loading',
  size = 'large',
  fullScreen = false,
  style,
}: LoadingStateProps) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={[styles.container, fullScreen && styles.fullScreen, style]}
    >
      <ActivityIndicator color={colors.primary} size={size} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 120,
    padding: spacing.xxl,
  },
  fullScreen: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  label: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
});
