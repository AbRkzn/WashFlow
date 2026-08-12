import { Component, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.error) {
      const stack = this.state.error.stack?.split('\n').slice(0, 8).join('\n');
      return (
        <View className="flex-1 items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950">
          <Text className="text-lg font-bold text-red-600">Render error</Text>
          <ScrollView className="mt-3 w-full">
            <Text className="text-sm font-semibold text-red-500">
              {this.state.error.message || String(this.state.error)}
            </Text>
            {stack ? (
              <Text className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{stack}</Text>
            ) : null}
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}
