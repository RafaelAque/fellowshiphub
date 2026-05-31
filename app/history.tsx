// app/history.tsx
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, Divider } from 'react-native-paper';

const dummyHistory = [
  { date: 'May 12', session: 'Youth Fellowship', status: 'Present' },
  { date: 'May 5', session: 'Bible Study', status: 'Present' },
  { date: 'Apr 28', session: 'Prayer Meeting', status: 'Absent' },
  { date: 'Apr 21', session: 'Youth Fellowship', status: 'Present' },
];

export default function History() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Attendance History</Text>

      {dummyHistory.map((h, idx) => (
        <Card key={idx} style={styles.historyCard}>
          <Card.Content style={styles.cardContent}>
            <Text>{h.date}</Text>
            <Text>{h.session}</Text>
            <Text style={{ fontWeight: 'bold' }}>{h.status}</Text>
          </Card.Content>
        </Card>
      ))}

      <Divider style={{ marginVertical: 15 }} />

      <Button mode="outlined" icon="file-export" onPress={() => alert('Export History')}>
        Export History
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  historyCard: { marginBottom: 10, borderRadius: 12, elevation: 3 },
  cardContent: { flexDirection: 'row', justifyContent: 'space-between' },
});
