import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import type { User } from 'firebase/auth';
import { useMobileAuth } from '../context/MobileAuthContext';
import { fetchDashboard, type DashboardResponse } from '../api/client';

export const DashboardScreen: React.FC = () => {
  const { user, me, businessId, setBusinessId, signOutUser } = useMobileAuth();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(async () => {
    const u = user as User | null;
    if (!u || !businessId) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchDashboard(u, businessId);
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

  const businessName =
    me?.businesses.find((b) => b.id === businessId)?.displayName ?? 'Empresa';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Olá</Text>
          <Text style={styles.biz} numberOfLines={1}>
            {businessName}
          </Text>
          {me && me.businesses.length > 1 ? (
            <TouchableOpacity onPress={() => setPickerOpen(true)}>
              <Text style={styles.link}>Trocar empresa</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity onPress={() => signOutUser()} style={styles.outBtn}>
          <Text style={styles.outTxt}>Sair</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111827" />
        </View>
      )}

      {!loading && error && (
        <View style={styles.card}>
          <Text style={styles.err}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.link}>Tentar de novo</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !error && data && (
        <View style={styles.grid}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Clientes</Text>
            <Text style={styles.statVal}>{data.counts.customers}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Serviços</Text>
            <Text style={styles.statVal}>{data.counts.services}</Text>
          </View>
        </View>
      )}

      {!loading && data && data.recentBookings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximos agendamentos</Text>
          {data.recentBookings.map((b) => (
            <View key={b.id} style={styles.row}>
              <Text style={styles.rowTitle}>{b.customerName ?? 'Cliente'}</Text>
              <Text style={styles.rowSub}>{b.serviceName ?? ''}</Text>
              <Text style={styles.rowMeta}>
                {b.scheduledDateTime ? new Date(b.scheduledDateTime).toLocaleString('pt-BR') : '—'}
              </Text>
              <Text style={styles.badge}>{b.status ?? '—'}</Text>
            </View>
          ))}
        </View>
      )}

      <Modal visible={pickerOpen} transparent animationType="fade">
        <Pressable style={styles.modalBg} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Empresa</Text>
            <FlatList
              data={me?.businesses ?? []}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickRow}
                  onPress={async () => {
                    setPickerOpen(false);
                    await setBusinessId(item.id);
                  }}
                >
                  <Text style={styles.pickName}>{item.displayName}</Text>
                  <Text style={styles.pickRole}>{item.role}</Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  hello: { fontSize: 14, color: '#6B7280' },
  biz: { fontSize: 20, fontWeight: '700', color: '#111827' },
  link: { marginTop: 6, color: '#2563EB', fontSize: 14 },
  outBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  outTxt: { color: '#DC2626', fontWeight: '600' },
  center: { paddingVertical: 32, alignItems: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  err: { color: '#B91C1C', marginBottom: 8 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
  },
  statLabel: { fontSize: 12, color: '#6B7280', marginBottom: 6 },
  statVal: { fontSize: 26, fontWeight: '700', color: '#111827' },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 10 },
  row: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  rowTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  rowSub: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  rowMeta: { fontSize: 13, color: '#374151', marginTop: 6 },
  badge: { marginTop: 8, fontSize: 12, color: '#4B5563' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 14, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  pickRow: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  pickName: { fontSize: 16, fontWeight: '600' },
  pickRole: { fontSize: 13, color: '#6B7280', marginTop: 4 },
});
