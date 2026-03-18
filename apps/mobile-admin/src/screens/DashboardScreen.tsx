import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { fetchDashboardStats, type AuthTokens } from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export const DashboardScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any | null>(null);

  // Replace this with real token retrieval (secure storage)
  const tokens: AuthTokens | undefined = undefined;

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        if (!tokens) {
          setError('Not authenticated yet.');
          return;
        }
        const result = await fetchDashboardStats(tokens);
        setStats(result);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Key metrics for your business</Text>

      <View style={styles.chipRow}>
        <TouchableOpacity style={styles.chip} onPress={() => navigation.navigate('Bookings')}>
          <Text style={styles.chipText}>Bookings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => navigation.navigate('Customers')}>
          <Text style={styles.chipText}>Customers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chip} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.chipText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      )}

      {!loading && error && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Unable to load metrics</Text>
          <Text style={styles.cardText}>{error}</Text>
        </View>
      )}

      {!loading && !error && stats && (
        <View style={styles.grid}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Total bookings (30d)</Text>
            <Text style={styles.cardValue}>{stats.totalBookings ?? '-'}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Revenue (30d)</Text>
            <Text style={styles.cardValue}>{stats.totalRevenue ?? '-'}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Occupancy</Text>
            <Text style={styles.cardValue}>{stats.occupancyRate ? `${stats.occupancyRate}%` : '-'}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Cancelled</Text>
            <Text style={styles.cardValue}>{stats.cancelledBookings ?? '-'}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderRadius: 999,
    marginRight: 8,
  },
  chipText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    marginBottom: 12,
    flexBasis: '48%',
  },
  cardLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: '#6B7280',
  },
});

