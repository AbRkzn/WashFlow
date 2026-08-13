import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';
import { useAuditTrail } from '@/data/queries';
import type { AuditTrailEntry } from '@/services/audit';
import {
  auditActionLabel,
  auditDetailsSummary,
  auditEntityLabel,
} from '@/domain/audit';
import { formatDateTime } from '@/utils/time';

function TrailCard({ entry }: { entry: AuditTrailEntry }) {
  const summary = auditDetailsSummary(entry.details);
  return (
    <View className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="flex-row items-center justify-between">
        <Text className="flex-1 pr-2 text-sm font-semibold text-neutral-900 dark:text-white">
          {auditActionLabel(entry.action)}
        </Text>
        <Text className="text-xs text-neutral-400 dark:text-neutral-500">
          {formatDateTime(entry.createdAt)}
        </Text>
      </View>
      <View className="mt-1 flex-row items-center">
        <View className="rounded-full bg-brand-100 px-2.5 py-0.5 dark:bg-brand-950">
          <Text className="text-xs font-medium text-brand-700 dark:text-brand-300">
            {auditEntityLabel(entry.entity)}
          </Text>
        </View>
        <Text className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">
          {entry.actorName ?? 'Unknown user'}
        </Text>
      </View>
      {summary ? (
        <Text className="mt-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {summary}
        </Text>
      ) : null}
    </View>
  );
}

export default function AuditLogScreen() {
  const { data: entries, isLoading, isRefetching, refetch } = useAuditTrail();
  const [expanded, setExpanded] = useState(false);

  const list = entries ?? [];
  const shown = expanded ? list : list.slice(0, 50);

  return (
    <RoleGuard roles={['admin', 'manager']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <SessionHeader />
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">Audit trail</Text>
          {list.length > 50 ? (
            <Pressable
              onPress={() => setExpanded((e) => !e)}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
            >
              <Text className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                {expanded ? 'Show recent 50' : 'Show all'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0891B2" />
          </View>
        ) : list.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="receipt-outline" size={40} color="#A3A3A3" />
            <Text className="mt-3 text-lg font-bold text-neutral-900 dark:text-white">
              No activity yet
            </Text>
            <Text className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
              Sign-ins, check-ins, claims, voids, and payments will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={shown}
            keyExtractor={(entry) => entry.id}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0891B2" />
            }
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => <TrailCard entry={item} />}
          />
        )}
      </SafeAreaView>
    </RoleGuard>
  );
}