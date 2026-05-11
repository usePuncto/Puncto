import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../screens/DashboardScreen';
import { BookingsScreen } from '../screens/BookingsScreen';
import { MoreScreen } from '../screens/MoreScreen';

export type MainTabParamList = {
  Home: undefined;
  Bookings: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#111827',
        tabBarInactiveTintColor: '#9CA3AF',
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{ title: 'Início', tabBarLabel: 'Início' }}
      />
      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{ title: 'Agendamentos', tabBarLabel: 'Agendamentos' }}
      />
      <Tab.Screen name="More" component={MoreScreen} options={{ title: 'Mais', tabBarLabel: 'Mais' }} />
    </Tab.Navigator>
  );
}
