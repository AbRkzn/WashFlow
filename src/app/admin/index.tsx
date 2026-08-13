import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';

interface QuickLink {
  label: string;
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}

const TINT = {
  cyan: '#0891B2',
  violet: '#7C3AED',
  emerald: '#059669',
  amber: '#D97706',
  blue: '#2563EB',
  red: '#DC2626',
} as const;

const operationsLinks: QuickLink[] = [
  { label: 'Check-in', href: '/cashier', icon: 'car-sport-outline', tint: TINT.cyan },
  { label: 'Day Board', href: '/manager', icon: 'bar-chart-outline', tint: TINT.violet },
  { label: 'Customers', href: '/manager/customers', icon: 'people-outline', tint: TINT.emerald },
  { label: 'Washer Queue', href: '/washer', icon: 'sparkles-outline', tint: TINT.amber },
];

const managementLinks: QuickLink[] = [
  { label: 'Service presets', href: '/admin/services', icon: 'pricetag-outline', tint: TINT.blue },
  { label: 'Inventory', href: '/admin/inventory', icon: 'cube-outline', tint: TINT.red },
  { label: 'Service recipes', href: '/admin/service-inventory', icon: 'flask-outline', tint: TINT.violet },
  { label: 'Schedule', href: '/admin/schedule', icon: 'time-outline', tint: TINT.emerald },
  { label: 'Manage users', href: '/admin/users', icon: 'people-circle-outline', tint: TINT.cyan },
  { label: 'Closed days', href: '/admin/day-closes', icon: 'calendar-outline', tint: TINT.amber },
  { label: 'Void history', href: '/manager/void-history', icon: 'trash-outline', tint: TINT.red },
];

function QuickLinkCard({ link }: { link: QuickLink }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(link.href)}
      className="mb-3 w-[48%] rounded-2xl border border-neutral-200 bg-white p-4 active:scale-95 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <View
        className="h-11 w-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${link.tint}1A` }}
      >
        <Ionicons name={link.icon} size={22} color={link.tint} />
      </View>
      <Text className="mt-3 text-sm font-semibold leading-tight text-neutral-900 dark:text-white">
        {link.label}
      </Text>
    </Pressable>
  );
}

function QuickAccessSection({ title, links }: { title: string; links: QuickLink[] }) {
  return (
    <View className="mt-6">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
        {title}
      </Text>
      <View className="flex-row flex-wrap justify-between">
        {links.map((link) => (
          <QuickLinkCard key={link.label} link={link} />
        ))}
      </View>
    </View>
  );
}

export default function AdminHome() {
  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <SessionHeader />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-white">Admin</Text>
          <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            User management, config, and settings.
          </Text>

          <QuickAccessSection title="Operations" links={operationsLinks} />
          <QuickAccessSection title="Management" links={managementLinks} />
        </ScrollView>
      </SafeAreaView>
    </RoleGuard>
  );
}
