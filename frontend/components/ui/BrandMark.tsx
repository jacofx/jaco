import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, typography } from '../../constants/theme';

type BrandMarkSize = 'small' | 'medium' | 'large';

export interface BrandMarkProps {
  size?: BrandMarkSize;
  symbolOnly?: boolean;
  inverse?: boolean;
  style?: StyleProp<ViewStyle>;
}

const sizes = {
  small: { symbol: 32, icon: 18, text: 18 },
  medium: { symbol: 40, icon: 23, text: 22 },
  large: { symbol: 48, icon: 28, text: 28 },
} as const;

export function BrandMark({
  size = 'medium',
  symbolOnly = false,
  inverse = false,
  style,
}: BrandMarkProps) {
  const dimensions = sizes[size];

  return (
    <View
      accessible
      accessibilityLabel="SolveConnect"
      accessibilityRole="image"
      style={[styles.container, style]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.symbol,
          { width: dimensions.symbol, height: dimensions.symbol },
        ]}
      >
        <Ionicons name="bulb-outline" size={dimensions.icon} color={colors.inverse} />
      </View>
      {!symbolOnly ? (
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.wordmark,
            { fontSize: dimensions.text, lineHeight: dimensions.text + 6 },
            inverse && styles.wordmarkInverse,
          ]}
        >
          Solve<Text style={styles.wordmarkAccent}>Connect</Text>
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  symbol: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    justifyContent: 'center',
  },
  wordmark: {
    ...typography.title,
    color: colors.ink,
    fontWeight: '800',
  },
  wordmarkInverse: {
    color: colors.inverse,
  },
  wordmarkAccent: {
    color: colors.primary,
  },
});
