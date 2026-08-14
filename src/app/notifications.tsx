import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { RoleGuard } from '@/components/role-guard';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { useAuditTrail } from '@/data/queries';
import type { AuditTrailEntry } from '@/services/audit';
import { auditActionLabel, auditDetailsSummary } from '@/domain/audit';
import { useSessionStore } from '@/stores/session-store';
import { formatClockTime } from '@/utils/time';

interface NotificationItem {
  id: string;
  actorId: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  body: string;
  createdAt: number;
}

/** Maps audit actions to notification-style cards. Only events a device user cares about. */
function toNotification(entry: AuditTrailEntry): NotificationItem | null {
  const body = auditDetailsSummary(entry.details);
  switch (entry.action) {
    case 'job-claim':
      return {
        id: entry.id,
        actorId: entry.actorId,
        icon: 'hand-left-outline',
        tint: '#0891B2',
        title: 'Job claimed',
        body: body || 'A job was added to your list.',
        createdAt: entry.createdAt,
      };
    case 'job-force-assign':
    case 'job-reassign':
      return {
        id: entry.id,
        actorId: entry.actorId,
        icon: 'swap-horizontal-outline',
        tint: '#7C3AED',
        title: auditActionLabel(entry.action),
        body: body || 'A job was assigned to you.',
        createdAt: entry.createdAt,
      };
    case 'job-started':
      return {
        id: entry.id,
        actorId: entry.actorId,
        icon: 'play-circle-outline',
        tint: '#0891B2',
        title: 'Job started',
        body: body || 'You started working on a vehicle.',
        createdAt: entry.createdAt,
      };
    case 'job-quality-check':
      return {
        id: entry.id,
        actorId: entry.actorId,
        icon: 'checkmark-done-outline',
        tint: '#7C3AED',
        title: 'Sent to quality check',
        body: body || 'Your job is waiting for inspection.',
        createdAt: entry.createdAt,
      };
    case 'job-completed':
      return {
        id: entry.id,
        actorId: entry.actorId,
        icon: 'checkmark-circle-outline',
        tint: '#059669',
        title: 'Job completed',
        body: body || 'A job was marked complete.',
        createdAt: entry.createdAt,
      };
    case 'job-paid':
      return {
        id: entry.id,
        actorId: entry.actorId,
        icon: 'cash-outline',
        tint: '#059669',
        title: 'Payment collected',
        body: body || 'A payment was recorded.',
        createdAt: entry.createdAt,
      };
    case 'appointment-booked':
      return {
        id: entry.id,
        actorId: entry.actorId,
        icon: 'calendar-outline',
        tint: '#0891B2',
        title: 'Appointment booked',
        body: body || 'A new appointment was booked.',
        createdAt: entry.createdAt,
      };
    case 'appointment-auto-rescheduled':
    case 'appointment-sync-reflowed':
      return {
        id: entry.id,
        actorId: entry.actorId,
        icon: 'alert-circle-outline',
        tint: '#D97706',
        title: 'Appointment rescheduled',
        body: body || 'A booking was moved to the next free slot.',
        createdAt: entry.createdAt,
      };
    case 'day-close':
      return {
        id: entry.id,
        actorId: entry.actorId,
        icon: 'sunny-outline',
        tint: '#0891B2',
        title: 'Day closed',
        body: body || 'The day was closed with a report.',
        createdAt: entry.createdAt,
      };
    case 'void-requested':
      return {
        id: entry.id,
        actorId: entry.actorId,
        icon: 'shield-checkmark-outline',
        tint: '#D97706',
        title: 'Void requested',
        body: body || 'A void request needs review.',
        createdAt: entry.createdAt,
      };
    default:
      return null;
  }
}

export default function NotificationsScreen() {
  const user = useSessionStore((s) => s.user);
  const { data: trail, isLoading, isRefetching, refetch } = useAuditTrail();
  const [filterMine, setFilterMine] = useState(true);

  const items = useMemo(() => {
    const mapped = (trail ?? []).map(toNotification).filter((item): item is NotificationItem => item !== null);
    const mine = filterMine && user ? mapped.filter((item) => item.actorId === user.id) : mapped;
    return mine;
  }, [trail, filterMine, user]);

  const clearVisible = () => {
    Alert.alert('Notifications are read-only', 'This feed mirrors your on-device audit trail. Nothing to clear.');
  };

  return (
    <RoleGuard roles={['admin', 'manager', 'cashier', 'washer']}>
      <Screen scroll={false}>
        <View className="flex-1 px-5 pt-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <BackButton />
              <Text className="text-2xl font-bold text-neutral-900 dark:text-white">
                Notifications
              </Text>
            </View>
            <Pressable onPress={clearVisible} className="rounded-xl px-3 py-1.5 active:opacity-70">
              <Text className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                Clear
              </Text>
            </Pressable>
          </View>

          <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => setFilterMine(true)}
            className={`rounded-full px-4 py-1.5 ${
              filterMine
                ? 'bg-brand-600'
                : 'border border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <Text className={`text-sm font-semibold ${filterMine ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
              Mine
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setFilterMine(false)}
            className={`rounded-full px-4 py-1.5 ${
              !filterMine
                ? 'bg-brand-600'
                : 'border border-neutral-200 dark:border-neutral-800'
            }`}
          >
            <Text className={`text-sm font-semibold ${!filterMine ? 'text-white' : 'text-neutral-600 dark:text-neutral-300'}`}>
              All activity
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#0891B2" />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            className="mt-4 flex-1"
            contentContainerStyle={{ paddingBottom: 24, gap: 10 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#0891B2"
              />
            }
            ListEmptyComponent={
              <View className="items-center py-16">
                <Ionicons name="notifications-off-outline" size={40} color="#94A3B8" />
                <Text className="mt-3 text-base font-semibold text-neutral-600 dark:text-neutral-300">
                  No notifications yet
                </Text>
                <Text className="mt-1 text-center text-sm text-neutral-400 dark:text-neutral-500">
                  Job assignments, payments and day-close summaries show up here.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Card className="flex-row items-center gap-3">
                <View
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${item.tint}1A` }}
                >
                  <Ionicons name={item.icon} size={20} color={item.tint} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-900 dark:text-white">
                    {item.title}
                  </Text>
                  <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                    {item.body}
                  </Text>
                  <Text className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                    {formatClockTime(item.createdAt)}
                  </Text>
                </View>
              </Card>
            )}
          />
        )}
        </View>
      </Screen>
    </RoleGuard>
  );
}