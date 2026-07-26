import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';

import {
  AppButton,
  EmptyState,
  LoadingState,
  ScreenHeader,
  StatusBadge,
  type StatusBadgeTone,
} from '../components/ui';
import { colors, radius, spacing, typography } from '../constants/theme';
import { adsAPI } from '../services/api';
import { getApiErrorMessage } from '../services/error';

type AdPayment = {
  _id: string;
  package_name?: string;
  provider?: string;
  currency?: string;
  amount?: number | string;
  status?: string;
  created_at?: string;
  completed_at?: string;
  job_id?: string;
};

function getStatusTone(status?: string): StatusBadgeTone {
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed' || status === 'cancelled') return 'danger';
  return 'neutral';
}

function formatStatus(status?: string) {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

function formatAmount(amount?: number | string, currency = 'NGN') {
  const numericAmount = Number(amount);
  return `${currency} ${Number.isFinite(numericAmount) ? numericAmount.toLocaleString() : '0'}`;
}

function formatRelativeDate(value?: string) {
  if (!value) return 'Date unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return formatDistanceToNow(date, { addSuffix: true });
}

export default function PaymentsScreen() {
  const router = useRouter();
  const [payments, setPayments] = useState<AdPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/profile');
  };

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await adsAPI.getPurchases();
      setPayments(Array.isArray(response.data) ? response.data : []);
    } catch (requestError: any) {
      setError(getApiErrorMessage(requestError, 'Unable to load promotion payments right now.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const completedPayments = payments.filter((payment) => payment.status === 'completed');
  const totalSpend = completedPayments.reduce((sum, payment) => {
    const amount = Number(payment.amount);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const renderPayment = ({ item }: { item: AdPayment }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentHeadingCopy}>
          <Text style={styles.paymentTitle}>{item.package_name || 'Promotion payment'}</Text>
          <Text style={styles.paymentMeta}>
            {(item.provider || 'Payment provider').toUpperCase()} · {formatAmount(item.amount, item.currency)}
          </Text>
        </View>
        <StatusBadge label={formatStatus(item.status)} tone={getStatusTone(item.status)} />
      </View>

      <View style={styles.timeline}>
        <View style={styles.timelineRow}>
          <Ionicons name="time-outline" size={17} color={colors.muted} />
          <Text style={styles.timelineText}>Created {formatRelativeDate(item.created_at)}</Text>
        </View>

        {item.completed_at ? (
          <View style={styles.timelineRow}>
            <Ionicons name="checkmark-circle-outline" size={17} color={colors.success} />
            <Text style={styles.timelineText}>Confirmed {formatRelativeDate(item.completed_at)}</Text>
          </View>
        ) : null}
      </View>

      {item.job_id ? (
        <View style={styles.linkedRequestRow}>
          <View style={styles.linkedRequestCopy}>
            <Ionicons name="megaphone-outline" size={18} color={colors.accentDark} />
            <Text style={styles.linkedRequestText}>Linked to a request</Text>
          </View>
          <AppButton
            accessibilityHint="Opens the request linked to this payment"
            icon="arrow-forward"
            iconPosition="right"
            label="View request"
            onPress={() => router.push(`/job/${item.job_id}`)}
            size="small"
            variant="ghost"
          />
        </View>
      ) : null}
    </View>
  );

  const renderListHeader = () => {
    if (error && payments.length === 0) return null;

    return (
      <View style={styles.listHeader}>
        <View style={styles.summaryBand}>
          <View style={styles.summaryHeading}>
            <View>
              <Text style={styles.summaryEyebrow}>Payment history</Text>
              <Text style={styles.summaryTitle}>Promotion spend</Text>
            </View>
            <View style={styles.receiptIcon}>
              <Ionicons name="receipt-outline" size={24} color={colors.ink} />
            </View>
          </View>

          <View style={styles.summaryMetrics}>
            <View style={styles.summaryMetric}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                numberOfLines={1}
                style={styles.summaryValue}
              >
                {formatAmount(totalSpend)}
              </Text>
              <Text style={styles.summaryLabel}>Confirmed spend</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryMetric}>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                numberOfLines={1}
                style={styles.summaryValue}
              >
                {payments.length}
              </Text>
              <Text style={styles.summaryLabel}>Payment records</Text>
            </View>
          </View>
        </View>

        {error && payments.length > 0 ? (
          <View accessibilityLiveRegion="polite" style={styles.errorBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color={colors.danger} />
            <View style={styles.errorCopy}>
              <Text style={styles.errorTitle}>Could not refresh payments</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <AppButton label="Retry" onPress={loadPayments} size="small" variant="ghost" />
          </View>
        ) : null}

        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Recent payments
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (error) {
      return (
        <EmptyState
          actionLabel="Try again"
          description={error}
          icon="cloud-offline-outline"
          onAction={loadPayments}
          title="Payment history could not load"
        />
      );
    }

    return (
      <EmptyState
        description="Boosted and top request purchases will appear here after checkout."
        icon="receipt-outline"
        title="No promotion payments yet"
      />
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.frame}>
        <ScreenHeader
          title="Promotion payments"
          subtitle="Review payment status and the requests linked to your ad promotions."
          eyebrow="Billing"
          onBack={goBack}
          bordered
        />

        {loading && payments.length === 0 ? (
          <LoadingState fullScreen label="Loading payment history" />
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={payments}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={renderEmptyState}
            ListHeaderComponent={renderListHeader}
            refreshControl={
              <RefreshControl
                colors={[colors.primary]}
                onRefresh={loadPayments}
                refreshing={loading}
                tintColor={colors.primary}
              />
            }
            renderItem={renderPayment}
            showsVerticalScrollIndicator={false}
          />
        )}
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
    maxWidth: 760,
    width: '100%',
  },
  listContent: {
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.page,
  },
  listHeader: {
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  summaryBand: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    gap: spacing.xl,
    padding: spacing.xl,
  },
  summaryHeading: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryEyebrow: {
    ...typography.overline,
    color: colors.primarySoft,
  },
  summaryTitle: {
    ...typography.h3,
    color: colors.inverse,
    marginTop: spacing.xs,
  },
  receiptIcon: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  summaryMetrics: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: spacing.lg,
  },
  summaryMetric: {
    flex: 1,
    gap: spacing.xs,
  },
  summaryValue: {
    ...typography.title,
    color: colors.inverse,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.disabled,
  },
  summaryDivider: {
    backgroundColor: colors.muted,
    width: 1,
  },
  errorBanner: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  errorCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  errorTitle: {
    ...typography.bodyStrong,
    color: colors.danger,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.ink,
  },
  paymentCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  paymentHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  paymentHeadingCopy: {
    flex: 1,
    gap: spacing.xs,
    minWidth: 0,
  },
  paymentTitle: {
    ...typography.title,
    color: colors.ink,
  },
  paymentMeta: {
    ...typography.caption,
    color: colors.muted,
  },
  timeline: {
    gap: spacing.sm,
  },
  timelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  timelineText: {
    ...typography.body,
    color: colors.muted,
    flex: 1,
  },
  linkedRequestRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  linkedRequestCopy: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  linkedRequestText: {
    ...typography.bodyStrong,
    color: colors.accentDark,
    flex: 1,
  },
});
