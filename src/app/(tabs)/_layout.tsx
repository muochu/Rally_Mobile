import { Tabs } from 'expo-router';
import { Calendar, Home, MapPinned, User } from 'lucide-react-native';
import type { ReactElement } from 'react';

import { useAvailabilitySync } from '@/hooks/use-availability-sync';
import { colors } from '@/theme/colors';

export default function TabsLayout(): ReactElement {
  useAvailabilitySync();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent.primary,
        tabBarInactiveTintColor: colors.text.tertiary,
      }}
    >
      <Tabs.Screen
        name="hub"
        options={{
          title: 'Hub',
          tabBarIcon: ({ color, size }): ReactElement => (
            <Home color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ color, size }): ReactElement => (
            <Calendar color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="courts"
        options={{
          title: 'Courts',
          tabBarIcon: ({ color, size }): ReactElement => (
            <MapPinned color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }): ReactElement => (
            <User color={color} size={size} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
