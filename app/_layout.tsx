// app/_layout.tsx
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { Stack } from 'expo-router';
import { AppRoleProvider } from '@/components/app-role-context';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#111827',
    onPrimary: '#ffffff',
    secondary: '#1d4ed8',
    onSurface: '#111827',
    onSurfaceVariant: '#374151',
  },
};

function isFontTimeoutError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const stack = error instanceof Error ? error.stack ?? '' : '';

  return message.includes('timeout exceeded') || stack.includes('fontfaceobserver');
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isFontTimeoutError(event.reason)) {
        event.preventDefault();
        console.warn('Icon font loading was slow, so FellowshipHub continued with fallback icons.');
      }
    };

    const handleWindowError = (event: ErrorEvent) => {
      if (isFontTimeoutError(event.error) || event.message.includes('timeout exceeded')) {
        event.preventDefault();
        console.warn('Icon font loading timed out, so FellowshipHub continued loading.');
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleWindowError);

    Promise.all([MaterialCommunityIcons.loadFont(), MaterialIcons.loadFont()]).catch((error) => {
      if (!isFontTimeoutError(error)) {
        console.warn('Unable to preload app icons.', error);
      }
    });

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleWindowError);
    };
  }, []);

  return (
    <AppRoleProvider>
      <PaperProvider theme={theme}>
        <Stack
          initialRouteName="login"
          screenOptions={{ headerShown: false }}
        />
      </PaperProvider>
    </AppRoleProvider>
  );
}
