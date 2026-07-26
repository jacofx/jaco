import React, { type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '../components/ui';
import { colors, layout, radius, spacing, typography } from '../constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
type SupportRoute = '/edit-profile' | '/location-settings' | '/payments';

const SUPPORT_ITEMS: {
  icon: IconName;
  title: string;
  description: string;
  route: SupportRoute;
}[] = [
  {
    icon: 'person-circle-outline',
    title: 'Profile and skills',
    description: 'Update the name and provider skills shown on your account.',
    route: '/edit-profile',
  },
  {
    icon: 'location-outline',
    title: 'Location and nearby results',
    description: 'Refresh your saved position when distance or nearby results look wrong.',
    route: '/location-settings',
  },
  {
    icon: 'receipt-outline',
    title: 'Promotion payments',
    description: 'Review completed and pending ad promotion payments.',
    route: '/payments',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/profile');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.frame}>
        <ScreenHeader
          title="Help and support"
          subtitle="Use these shortcuts to resolve common account and app issues."
          eyebrow="Self-service"
          onBack={goBack}
          bordered
        />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.linkList}>
            {SUPPORT_ITEMS.map((item, index) => (
              <Pressable
                accessibilityHint={item.description}
                accessibilityLabel={item.title}
                accessibilityRole="button"
                key={item.title}
                onPress={() => router.push(item.route)}
                style={({ pressed }) => [
                  styles.linkRow,
                  index === SUPPORT_ITEMS.length - 1 && styles.linkRowLast,
                  pressed && styles.linkRowPressed,
                ]}
              >
                <View style={styles.iconContainer}>
                  <Ionicons name={item.icon} size={22} color={colors.primary} />
                </View>
                <View style={styles.linkCopy}>
                  <Text style={styles.linkTitle}>{item.title}</Text>
                  <Text style={styles.linkDescription}>{item.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={21} color={colors.muted} />
              </Pressable>
            ))}
          </View>

          <View style={styles.guidancePanel}>
            <View style={styles.guidanceHeader}>
              <Ionicons name="information-circle-outline" size={22} color={colors.info} />
              <Text style={styles.guidanceTitle}>Before trying again</Text>
            </View>
            <View style={styles.guidanceList}>
              <View style={styles.guidanceRow}>
                <Ionicons name="checkmark" size={17} color={colors.success} />
                <Text style={styles.guidanceText}>Confirm that your phone has a working internet connection.</Text>
              </View>
              <View style={styles.guidanceRow}>
                <Ionicons name="checkmark" size={17} color={colors.success} />
                <Text style={styles.guidanceText}>Pull down to refresh the screen that failed.</Text>
              </View>
              <View style={styles.guidanceRow}>
                <Ionicons name="checkmark" size={17} color={colors.success} />
                <Text style={styles.guidanceText}>Keep the exact error message available when reporting an issue.</Text>
              </View>
            </View>
          </View>

          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark-outline" size={21} color={colors.warning} />
            <View style={styles.securityCopy}>
              <Text style={styles.securityTitle}>Protect your account</Text>
              <Text style={styles.securityText}>
                Never share your password, sign-in code, or complete payment details with anyone claiming to offer support.
              </Text>
            </View>
          </View>

          <Text style={styles.disclosure}>
            These are self-service tools and do not create a support ticket.
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  frame: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: layout.readingMaxWidth,
    width: '100%',
  },
  content: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingBottom: spacing.page,
  },
  linkList: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  linkRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 82,
    padding: spacing.lg,
  },
  linkRowPressed: {
    backgroundColor: colors.subtle,
  },
  linkRowLast: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  linkCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  linkTitle: {
    ...typography.bodyStrong,
    color: colors.ink,
  },
  linkDescription: {
    ...typography.body,
    color: colors.muted,
  },
  guidancePanel: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.info,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  guidanceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  guidanceTitle: {
    ...typography.title,
    color: colors.ink,
  },
  guidanceList: {
    gap: spacing.sm,
  },
  guidanceRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  guidanceText: {
    ...typography.body,
    color: colors.ink,
    flex: 1,
  },
  securityNote: {
    alignItems: 'flex-start',
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  securityCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  securityTitle: {
    ...typography.bodyStrong,
    color: colors.warning,
  },
  securityText: {
    ...typography.body,
    color: colors.warning,
  },
  disclosure: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
  },
});
