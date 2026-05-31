// app/dashboard.tsx
import React from 'react';
import { Alert, ScrollView, View, StyleSheet, Pressable } from 'react-native';
import { Text, Card, Avatar, IconButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type IconName = 'calendar-check' | 'robot' | 'star';
type AllowedRoutes = '/attendance' | '/ai-progress' | '/feedback';
type Action = { title: string; icon: IconName; route: AllowedRoutes };

export default function Dashboard() {
  const router = useRouter();
  const actions: Action[] = [
    { title: 'Check Attendance', icon: 'calendar-check', route: '/attendance' },
    { title: 'AI Progress Check', icon: 'robot', route: '/ai-progress' },
    { title: 'Give Feedback', icon: 'star', route: '/feedback' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View>
          <Text style={styles.header}>Welcome back, John!</Text>
          <Text style={styles.subHeader}>Here’s your overview</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconButton icon="bell-outline" size={28} onPress={() => Alert.alert('Notifications', 'No new notifications right now.')} />
          <Avatar.Text size={40} label="JD" />
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="calendar-check" size={28} />
            <Text style={styles.statText}>4 / 5 Sessions</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="star" size={28} />
            <Text style={styles.statText}>80% Attendance</Text>
          </Card.Content>
        </Card>

        <Card style={[styles.statCard, { width: '100%' }]}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="clock-outline" size={28} />
            <Text style={styles.statText}>Next: May 12, 6 PM</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsContainer}>
        {actions.map((action, idx) => (
          <Pressable key={idx} onPress={() => router.push(action.route)}>
            {({ pressed }) => (
              <Card style={[styles.actionCard, pressed && { opacity: 0.8 }]}>
                <Card.Content style={styles.actionContent}>
                  <MaterialCommunityIcons name={action.icon} size={36} />
                  <Text numberOfLines={2} style={styles.actionText}>{action.title}</Text>
                </Card.Content>
              </Card>
            )}
          </Pressable>
        ))}
      </View>

      {/* Announcement Card */}
      <Pressable onPress={() => Alert.alert('Latest Announcement', 'Youth Fellowship this Saturday at 5 PM. See you there!')}>
        <Card style={styles.announcementCard}>
          <Card.Content style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons name="bullhorn" size={24} />
            <Text style={{ marginLeft: 10 }}>Youth Fellowship this Saturday at 5 PM. See you there!</Text>
          </Card.Content>
        </Card>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f5f5f5' },

  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  header: { fontSize: 24, fontWeight: 'bold' },
  subHeader: { fontSize: 16, color: '#555' },

  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { width: '48%', marginBottom: 10, borderRadius: 12, elevation: 3 },
  statContent: { flexDirection: 'row', alignItems: 'center' },
  statText: { marginLeft: 10, fontSize: 16, fontWeight: '500' },

  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  actionsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  actionCard: { width: '48%', aspectRatio: 1.2, marginBottom: 15, borderRadius: 12, elevation: 3, justifyContent: 'center' },
  actionContent: { alignItems: 'center', justifyContent: 'center' },
  actionText: { marginTop: 8, textAlign: 'center', fontSize: 14, fontWeight: '500', lineHeight: 18 },

  announcementCard: { padding: 15, borderRadius: 12, backgroundColor: '#fff', elevation: 2, marginBottom: 20 },
});
