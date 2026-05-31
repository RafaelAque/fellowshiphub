// components/QuickActionCard.tsx
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

export default function QuickActionCard({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ padding: 20, margin: 10, borderWidth: 1, borderRadius: 5 }}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}
