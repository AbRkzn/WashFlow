import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';

const quickLinks = [
  { label: 'Cashier — Check-in & Queue', href: '/cashier', icon: 'car-sport-outline' },
  { label: 'Manager — Day Overview', href: '/manager', icon: 'bar-chart-outline' },
  { label: 'Washer — Job Queue', href: '/washer', icon: 'sparkles-outline' },
  { label: 'Service presets', href: '/admin/services', icon: 'pricetag-outline' },
  { label: 'Inventory', href: '/admin/inventory', icon: 'cube-outline' },
  { label: 'Service recipes', href: '/admin/service-inventory', icon: 'flask-outline' },
  { label: 'Schedule', href: '/admin/schedule', icon: 'time-outline' },
  { label: 'Manage users', href: '/admin/users', icon: 'people-outline' },
  { label: 'Closed Days — Reopen', href: '/admin/day-closes', icon: 'calendar-outline' },
] as const;

export default function AdminHome() {
  const router = useRouter();

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <SessionHeader />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Admin</Text>
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            User management, config, and settings.
          </Text>

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
            Quick access
          </Text>
          <View className="gap-3">
            {quickLinks.map((link) => (
              <Pressable
                key={link.href}
                onPress={() => router.push(link.href)}
                className="flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-80 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <Ionicons name={link.icon} size={24} color="#0891B2" />
                <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}
