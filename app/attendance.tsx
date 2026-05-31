// app/attendance.tsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';

export default function Attendance() {
  const [checkedIn, setCheckedIn] = useState(false);

  const handleCheckIn = () => {
    setCheckedIn(true);
    Alert.alert('Attendance Checked!', 'You are marked present.');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Check Attendance</Text>

      <Card style={styles.sessionCard}>
        <Card.Content>
          <Text style={styles.sessionTitle}>Youth Fellowship</Text>
          <Text>Date: May 12, 2024</Text>
          <Text>Time: 6:00 PM</Text>
          <Text>Location: Main Hall</Text>
        </Card.Content>
      </Card>

      <Divider style={{ marginVertical: 15 }} />

      <Button
        mode={checkedIn ? 'outlined' : 'contained'}
        icon="check"
        onPress={handleCheckIn}
        disabled={checkedIn}
      >
        {checkedIn ? 'Checked In' : 'Check In'}
      </Button>

      <Divider style={{ marginVertical: 15 }} />

      <Button mode="outlined" icon="history" onPress={() => Alert.alert('History', 'Go to Attendance History')}>
        View Attendance History
      </Button>

      <Button mode="outlined" icon="file-export" onPress={() => Alert.alert('Export', 'Export Attendance')}>
        Export Attendance
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  sessionCard: { marginBottom: 15, borderRadius: 12, elevation: 3, paddingVertical: 15 },
  sessionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
});
