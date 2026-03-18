import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { fetchBookings, type AuthTokens } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'Bookings'>;

type Booking = {
  id: string;
  customerName?: string;
  serviceName?: string;
  startTime?: string;
  status?: string;
};

export const BookingsScreen: React.FC<Props> = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const tokens: AuthTokens | undefined = undefined;

  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!tokens) {
          setError('Not authenticated yet.');
          return;
        }
        const result = await fetchBookings(tokens);
        setBookings(result as Booking[]);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load bookings.');
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={bookings}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.customerName ?? 'Unknown customer'}</Text>
          <Text style={styles.subtitle}>{item.serviceName ?? 'Service'}</Text>
          <Text style={styles.meta}>
            {item.startTime ? new Date(item.startTime).toLocaleString() : 'No time'}
          </Text>
          <Text style={styles.badge}>{item.status ?? 'pending'}</Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  list: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '500',
    backgroundColor: '#E5E7EB',
    color: '#111827',
  },
  errorText: {
    fontSize: 14,
    color: '#B91C1C',
    textAlign: 'center',
  },
});

