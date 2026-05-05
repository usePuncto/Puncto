import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

/** Módulos nativos adicionais (pagamentos, clientes, etc.) entram aqui por fases. */
export const MoreScreen: React.FC = () => {
  return (
    <ScrollView contentContainerStyle={styles.box}>
      <Text style={styles.title}>Mais</Text>
      <Text style={styles.body}>
        As demais áreas do painel (clientes, pagamentos, cardápio, WhatsApp, etc.) serão adicionadas aqui como
        telas nativas, consumindo as mesmas APIs do servidor.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  box: { padding: 20, backgroundColor: '#F3F4F6', flexGrow: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 12 },
  body: { fontSize: 15, color: '#4B5563', lineHeight: 22 },
});
