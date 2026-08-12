import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs';
import { Tabs } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

import { RoleGuard } from '@/components/role-guard';
import { ErrorBoundary } from '@/components/error-boundary';
import { brand } from '@/theme/colors';

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'car-sport-outline',
  queue: 'list-outline',
  collect: 'cash-outline',
  appointments: 'calendar-outline',
  expenses: 'receipt-outline',
};

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 10) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 28,
          backgroundColor: isDark ? '#101A21' : '#FFFFFF',
          borderColor: isDark ? '#22303A' : '#E1E7EB',
          borderWidth: 1,
          paddingVertical: 6,
          paddingHorizontal: 6,
          shadowColor: '#0E7490',
          shadowOpacity: isDark ? 0.35 : 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        {state.routes
          .filter((route) => {
            const style = descriptors[route.key].options.tabBarItemStyle;
            return !(style && 'display' in style && style.display === 'none');
          })
          .map((route) => {
            const { options } = descriptors[route.key];
            const label = (options.title ?? route.name) as string;
            const focused = state.routes[state.index]?.key === route.key;
            const icon = TAB_ICONS[route.name] ?? 'ellipse-outline';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}
            >
              <View
                style={{
                  width: 52,
                  height: 34,
                  borderRadius: 17,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: focused
                    ? isDark
                      ? 'rgba(14,116,144,0.25)'
                      : 'rgba(14,116,144,0.12)'
                    : 'transparent',
                }}
              >
                <Ionicons
                  name={icon}
                  size={22}
                  color={
                    focused
                      ? isDark
                        ? brand[400]
                        : brand[600]
                      : isDark
                        ? '#94A3B8'
                        : '#64748B'
                  }
                />
              </View>
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: focused
                    ? isDark
                      ? brand[400]
                      : brand[600]
                    : isDark
                      ? '#94A3B8'
                      : '#64748B',
                }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function CashierLayout() {
  return (
    <RoleGuard roles={['cashier', 'manager', 'admin']}>
      <ErrorBoundary>
        <Tabs
          tabBar={(props) => <FloatingTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Check-in',
            }}
          />
          <Tabs.Screen name="vehicle-history" options={{ href: null }} />
          <Tabs.Screen
            name="queue"
            options={{
              title: 'Queue',
            }}
          />
          <Tabs.Screen
            name="collect"
            options={{
              title: 'Collect',
            }}
          />
          <Tabs.Screen
            name="appointments"
            options={{
              title: 'Bookings',
            }}
          />
          <Tabs.Screen
            name="expenses"
            options={{
              title: 'Expenses',
            }}
          />
        </Tabs>
      </ErrorBoundary>
    </RoleGuard>
  );
}