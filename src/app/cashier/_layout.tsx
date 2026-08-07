import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { brand } from '@/theme/colors';

export default function CashierLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: brand[600],
        tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8',
        tabBarStyle: {
          backgroundColor: isDark ? '#0A0F12' : '#FFFFFF',
          borderTopColor: isDark ? '#22303A' : '#E1E7EB',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Check-in',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car-sport-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Queue',
          tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
