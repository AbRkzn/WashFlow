import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';

import { RoleGuard } from '@/components/role-guard';
import { ErrorBoundary } from '@/components/error-boundary';
import { brand } from '@/theme/colors';

export default function CashierLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <RoleGuard roles={['cashier', 'manager', 'admin']}>
      <ErrorBoundary>
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
        <Tabs.Screen name="vehicle-history" options={{ href: null }} />
        <Tabs.Screen
          name="queue"
          options={{
            title: 'Queue',
            tabBarIcon: ({ color, size }) => <Ionicons name="list-outline" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="collect"
          options={{
            title: 'Collect',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cash-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="appointments"
          options={{
            title: 'Bookings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: 'Expenses',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="receipt-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      </ErrorBoundary>
    </RoleGuard>
  );
}
