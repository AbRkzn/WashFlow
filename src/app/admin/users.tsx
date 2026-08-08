import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleGuard } from '@/components/role-guard';
import { SessionHeader } from '@/components/session-header';
import { useAllUsers, useProvisionUser } from '@/data/queries';
import { ROLE_LABELS, USER_ROLES, type UserRole } from '@/domain/user';
import { useSessionStore } from '@/stores/session-store';

interface UserFormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

const emptyForm: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'washer',
};

export default function AdminUsersScreen() {
  const actorId = useSessionStore((s) => s.user?.id ?? '');
  const { data: users, isLoading, isRefetching, refetch } = useAllUsers();
  const provision = useProvisionUser();

  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyForm);

  const name = form.name.trim();
  const email = form.email.trim().toLowerCase();
  const password = form.password;
  const canSubmit =
    name.length > 0 && email.length > 0 && password.length >= 6 && !provision.isPending;

  const handleClose = () => {
    setForm(emptyForm);
    setAddOpen(false);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    provision
      .mutateAsync({
        values: { name, email, password, role: form.role },
        adminId: actorId,
      })
      .then(() => {
        handleClose();
        Alert.alert('User created', `${name} can now sign in as a ${ROLE_LABELS[form.role]}.`);
      })
      .catch((error) =>
        Alert.alert('Failed to create user', error instanceof Error ? error.message : 'Something went wrong.'),
      );
  };

  const userList = users ?? [];

  return (
    <RoleGuard roles={['admin']}>
      <SafeAreaView className="flex-1 bg-neutral-50 dark:bg-neutral-950">
        <SessionHeader />
        <View className="flex-row items-center justify-between px-4 py-3">
          <Text className="text-lg font-bold text-neutral-900 dark:text-white">Manage users</Text>
          <Pressable
            onPress={() => setAddOpen(true)}
            className="flex-row items-center gap-1 rounded-xl bg-brand-600 px-3 py-2 active:bg-brand-700"
          >
            <Text className="text-sm font-semibold text-white">Add user</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#0891B2" />
          </View>
        ) : userList.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-2xl font-bold text-neutral-900 dark:text-white">No users yet</Text>
            <Text className="mt-2 text-center text-base text-neutral-500 dark:text-neutral-400">
              Create the first account to get the team signed in.
            </Text>
          </View>
        ) : (
          <FlatList
            data={userList}
            keyExtractor={(user) => user.id}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#0891B2" />
            }
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-2">
                    <Text className="text-base font-semibold text-neutral-900 dark:text-white">
                      {item.name}
                    </Text>
                    <Text className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                      {item.email}
                    </Text>
                  </View>
                  <View className="rounded-full bg-brand-100 px-3 py-1 dark:bg-brand-950">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                      {ROLE_LABELS[item.role]}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          />
        )}

        <Modal visible={addOpen} animationType="slide" transparent onRequestClose={handleClose}>
          <KeyboardAvoidingView
            className="flex-1 justify-end bg-black/40"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View className="rounded-t-3xl bg-white p-5 dark:bg-neutral-900">
              <Text className="text-lg font-bold text-neutral-900 dark:text-white">Add user</Text>
              <Text className="mb-4 mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Creates the account in Supabase Auth. Requires an internet connection.
              </Text>
              <ScrollView keyboardShouldPersistTaps="handled">
                <Text className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Full name
                </Text>
                <TextInput
                  value={form.name}
                  onChangeText={(name) => setForm((f) => ({ ...f, name }))}
                  placeholder="e.g. Ana Reyes"
                  placeholderTextColor="#94A3B8"
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                />

                <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Email
                </Text>
                <TextInput
                  value={form.email}
                  onChangeText={(email) => setForm((f) => ({ ...f, email }))}
                  placeholder="name@washflow.app"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                />

                <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Password (min 6 characters)
                </Text>
                <TextInput
                  value={form.password}
                  onChangeText={(password) => setForm((f) => ({ ...f, password }))}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  autoCapitalize="none"
                  className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-white"
                />

                <Text className="mb-2 mt-4 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Role
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {USER_ROLES.map((role) => {
                    const selected = role === form.role;
                    return (
                      <Pressable
                        key={role}
                        onPress={() => setForm((f) => ({ ...f, role }))}
                        className={`rounded-xl border px-3 py-2 active:opacity-80 ${
                          selected
                            ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                            : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            selected ? 'text-brand-800 dark:text-brand-200' : 'text-neutral-900 dark:text-white'
                          }`}
                        >
                          {ROLE_LABELS[role]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View className="mt-4 flex-row gap-2">
                  <Pressable
                    onPress={handleClose}
                    disabled={provision.isPending}
                    className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 active:bg-neutral-100 dark:border-neutral-700 dark:active:bg-neutral-800"
                  >
                    <Text className="text-center text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                      Cancel
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    className="flex-1 flex-row items-center justify-center rounded-xl bg-brand-600 px-4 py-3 active:bg-brand-700 disabled:opacity-40"
                  >
                    {provision.isPending ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text className="text-sm font-semibold text-white">Create user</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </RoleGuard>
  );
}
