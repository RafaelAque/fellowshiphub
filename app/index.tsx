import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppRole } from '@/components/app-role-context';

export default function Index() {
  const router = useRouter();
  const { currentUser, loading } = useAppRole();

  useEffect(() => {
    if (loading) {
      return;
    }

    router.replace(currentUser ? '/(tabs)/dashboard' : '/login');
  }, [currentUser, loading, router]);

  return <View />;
}
