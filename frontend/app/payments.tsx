import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adsAPI } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adsAPI.getPurchases();
      setPayments(response.data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const completedPayments = payments.filter((payment) => payment.status === 'completed');
  const totalSpend = completedPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

  const renderPayment = ({ item }: any) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View>
          <Text style={styles.paymentTitle}>{item.package_name}</Text>
          <Text style={styles.paymentMeta}>
            {item.provider?.toUpperCase?.() || 'PAYMENT'} • {item.currency} {(item.amount || 0).toLocaleString()}
          </Text>
        </View>
        <View style={[styles.statusPill, item.status === 'completed' ? styles.statusCompleted : styles.statusPending]}>
          <Text style={[styles.statusText, item.status === 'completed' ? styles.statusCompletedText : styles.statusPendingText]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.timelineRow}>
        <Ionicons name="time-outline" size={16} color="#6B7280" />
        <Text style={styles.timelineText}>
          Created {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </Text>
      </View>

      {item.completed_at && (
        <View style={styles.timelineRow}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#166534" />
          <Text style={styles.timelineText}>
            Confirmed {formatDistanceToNow(new Date(item.completed_at), { addSuffix: true })}
          </Text>
        </View>
      )}

      {item.job_id && (
        <View style={styles.timelineRow}>
          <Ionicons name="megaphone-outline" size={16} color="#9A3412" />
          <Text style={styles.timelineText}>Linked to listing {item.job_id}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={payments}
        keyExtractor={(item) => item._id}
        renderItem={renderPayment}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadPayments} />}
        ListHeaderComponent={
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Ad payments</Text>
            <Text style={styles.summaryValue}>{payments.length}</Text>
            <Text style={styles.summaryText}>
              Total confirmed spend: NGN {totalSpend.toLocaleString()}
            </Text>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No ad payments yet</Text>
              <Text style={styles.emptyText}>
                Boosted and top listing purchases will appear here after checkout.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  summaryCard: {
    backgroundColor: '#111827',
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FDE68A',
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
  },
  summaryText: {
    marginTop: 6,
    fontSize: 14,
    color: '#D1D5DB',
  },
  paymentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  paymentTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  paymentMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  statusCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  statusCompletedText: {
    color: '#166534',
  },
  statusPendingText: {
    color: '#92400E',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    textAlign: 'center',
  },
});
