import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useMobileAuth } from '../context/MobileAuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { MainTabs } from './MainTabs';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F3F4F6',
    primary: '#111827',
    card: '#fff',
    text: '#111827',
    border: '#E5E7EB',
  },
};

export function RootNavigator(): React.JSX.Element {
  const { user, loading } = useMobileAuth();

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.flex}>
        <LoginScreen />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <MainTabs />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  flex: { flex: 1 },
});
