import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { AppButton, ScreenHeader } from '../components/ui';
import { colors, layout, radius, spacing, typography } from '../constants/theme';

WebBrowser.maybeCompleteAuthSession();

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function AdsPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const status = getParam(params.status);
  const isSuccess = status === 'success';
  const isCancelled = status === 'cancelled';

  const returnToApp = () => {
    router.replace('/');
  };

  const title = isSuccess
    ? 'Returning to SolveConnect'
    : isCancelled
      ? 'Checkout cancelled'
      : 'Checkout result unavailable';

  const message = isSuccess
    ? 'Checkout returned successfully. SolveConnect will verify the payment in the app before activating the promotion.'
    : isCancelled
      ? 'Checkout reported a cancellation. Return to SolveConnect to review your request or try again.'
      : 'This link did not include a final checkout status. Review payment history in SolveConnect before starting another payment.';

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.frame}>
        <ScreenHeader
          backLabel="Return to SolveConnect"
          compact
          onBack={returnToApp}
          title="Payment return"
        />

        <View style={styles.content}>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.statusIcon,
              isSuccess
                ? styles.statusIconSuccess
                : isCancelled
                  ? styles.statusIconWarning
                  : styles.statusIconNeutral,
            ]}
          >
            {isSuccess ? (
              <ActivityIndicator color={colors.success} size="large" />
            ) : (
              <Ionicons
                color={isCancelled ? colors.warning : colors.muted}
                name={isCancelled ? 'close-circle-outline' : 'help-circle-outline'}
                size={38}
              />
            )}
          </View>

          <View
            accessible
            accessibilityLiveRegion="polite"
            accessibilityRole={isSuccess ? 'progressbar' : 'summary'}
            style={styles.copy}
          >
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          <AppButton
            fullWidth
            icon="arrow-back"
            label="Return to SolveConnect"
            onPress={returnToApp}
            size="large"
            variant={isCancelled ? 'outline' : 'primary'}
          />

          {isSuccess ? (
            <Text style={styles.note}>
              Keep this page open until it closes automatically, or use the button above to return.
            </Text>
          ) : null}
        </View>
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
    alignItems: 'center',
    alignSelf: 'center',
    flex: 1,
    gap: spacing.xl,
    justifyContent: 'center',
    maxWidth: layout.formMaxWidth,
    padding: spacing.xxl,
    width: '100%',
  },
  statusIcon: {
    alignItems: 'center',
    borderRadius: radius.lg,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  statusIconSuccess: {
    backgroundColor: colors.successSoft,
  },
  statusIconWarning: {
    backgroundColor: colors.warningSoft,
  },
  statusIconNeutral: {
    backgroundColor: colors.subtle,
  },
  copy: {
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
    color: colors.ink,
    textAlign: 'center',
  },
  message: {
    ...typography.bodyLarge,
    color: colors.muted,
    textAlign: 'center',
  },
  note: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
  },
});
