import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { fetchCustomers, type AuthTokens } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'Customers'>;

type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  lastVisit?: string;
};

export const CustomersScreen: React.FC<Props> = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const tokens: AuthTokens | undefined = undefined;

  useEffect(() => {
    const loadCustomers = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!tokens) {
          setError('Not authenticated yet.');
          return;
        }
        const result = await fetchCustomers(tokens);
        setCustomers(result as Customer[]);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load customers.');
      } finally {
        setLoading(false);
      }
    };

    loadCustomers();
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
      data={customers}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.title}>{item.name}</Text>
          {item.phone && <Text style={styles.subtitle}>{item.phone}</Text>}
          {item.email && <Text style={styles.meta}>{item.email}</Text>}
          {item.lastVisit && (
            <Text style={styles.meta}>
              Last visit: {new Date(item.lastVisit).toLocaleDateString()}
            </Text>
          )}
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
    marginBottom: 2,
  },
  errorText: {
    fontSize: 14,
    color: '#B91C1C',
    textAlign: 'center',
  },
});

