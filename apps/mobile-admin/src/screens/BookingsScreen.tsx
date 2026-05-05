import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import type { User } from 'firebase/auth';
import { useMobileAuth } from '../context/MobileAuthContext';
import { fetchBookings, type BookingsResponse } from '../api/client';

export const BookingsScreen: React.FC = () => {
  const { user, businessId } = useMobileAuth();
  const [data, setData] = useState<BookingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const u = user as User | null;
    if (!u || !businessId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchBookings(u, businessId, 80);
      setData(d);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [user, businessId]);

  useEffect(() => {
    load();
  }, [load]);

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
        <Text style={styles.err}>{error}</Text>
        <TouchableOpacity onPress={load} style={styles.retry}>
          <Text style={styles.retryTxt}>Tentar de novo</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data?.bookings ?? []}
      keyExtractor={(item) => item.id}
      refreshing={loading}
      onRefresh={load}
      ListEmptyComponent={<Text style={styles.empty}>Nenhum agendamento</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.customerName ?? 'Cliente'}</Text>
          <Text style={styles.sub}>{item.serviceName ?? 'Serviço'}</Text>
          {item.professionalName ? <Text style={styles.meta}>{item.professionalName}</Text> : null}
          <Text style={styles.meta}>
            {item.scheduledDateTime ? new Date(item.scheduledDateTime).toLocaleString('pt-BR') : '—'}
          </Text>
          <Text style={styles.badge}>{item.status ?? '—'}</Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F3F4F6' },
  err: { color: '#B91C1C', textAlign: 'center', marginBottom: 12 },
  retry: { padding: 12 },
  retryTxt: { color: '#2563EB', fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  sub: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  meta: { fontSize: 13, color: '#374151', marginTop: 6 },
  badge: { marginTop: 8, fontSize: 12, color: '#4B5563' },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 24 },
});
