import { Stack, useRouter } from 'expo-router';
import { Platform, Pressable, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider } from '@/data/store';
import { colors } from '@/theme';

// On the web preview, draw our own back button instead of the header's image icon.
function WebBack({ canGoBack }: { canGoBack?: boolean }) {
  const router = useRouter();
  if (!canGoBack) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ color: colors.hedge, fontSize: 22 }}>‹</Text>
    </Pressable>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.hedge,
            headerTitleStyle: { color: colors.ink, fontWeight: '600' },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg },
            ...(Platform.OS === 'web' ? { headerLeft: (p) => <WebBack canGoBack={p.canGoBack} /> } : {}),
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Hedge' }} />
          <Stack.Screen name="new" options={{ title: 'New garden' }} />
          <Stack.Screen name="design/[id]" options={{ title: 'Your design' }} />
          <Stack.Screen name="edit/[id]" options={{ title: 'Edit plan' }} />
          <Stack.Screen name="plant/[id]" options={{ title: 'Plant details' }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
