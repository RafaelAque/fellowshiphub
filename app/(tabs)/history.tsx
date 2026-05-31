import React, { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { Button, Card, DataTable, IconButton, Menu, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppShell } from '@/components/app-shell';
import { AttendanceRecord, useAppRole } from '@/components/app-role-context';

export default function History() {
  const { attendanceRecords, currentUser, role, themeMode } = useAppRole();
  const [month, setMonth] = useState('May 2024');
  const [open, setOpen] = useState(false);

  const records = useMemo(() => {
    const roleRecords = role === 'admin'
      ? attendanceRecords
      : attendanceRecords.filter((record) => record.userId === currentUser?.id);
    const [monthName, year] = month.split(' ');

    return roleRecords.filter((record) => record.date.includes(monthName) && record.date.includes(year));
  }, [attendanceRecords, currentUser?.id, month, role]);
  const dark = themeMode === 'dark';
  const colors = {
    card: dark ? '#111827' : '#ffffff',
    border: dark ? '#374151' : '#e5e7eb',
    text: dark ? '#f9fafb' : '#111827',
    muted: dark ? '#cbd5e1' : '#374151',
  };

  const exportRecords = () => {
    const csv = buildCsv(records);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance-${month.replace(' ', '-').toLowerCase()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    Alert.alert('Export ready', `${records.length} attendance record${records.length === 1 ? '' : 's'} prepared for export.`);
  };

  return (
    <AppShell
      activeKey="history"
      title="My Attendance History"
      subtitle="View your past attendance records."
    >
      <Card mode="outlined" style={[styles.toolbarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Card.Content style={styles.toolbar}>
          <View style={styles.toolbarLeft}>
            <Text style={[styles.toolbarLabel, { color: colors.muted }]}>Filter by Month:</Text>
            <Menu
              visible={open}
              onDismiss={() => setOpen(false)}
              anchor={
                <Button mode="outlined" textColor={colors.text} onPress={() => setOpen(true)} icon="chevron-down">
                  {month}
                </Button>
              }
            >
              <Menu.Item onPress={() => { setMonth('May 2024'); setOpen(false); }} title="May 2024" />
              <Menu.Item onPress={() => { setMonth('Apr 2024'); setOpen(false); }} title="Apr 2024" />
            </Menu>
          </View>
          <Button mode="outlined" textColor={colors.text} icon="download" onPress={exportRecords}>Export</Button>
        </Card.Content>
      </Card>

      <Card mode="outlined" style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Card.Content>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title><Text style={[styles.tableHeader, { color: colors.text }]}>Date</Text></DataTable.Title>
              <DataTable.Title><Text style={[styles.tableHeader, { color: colors.text }]}>Session</Text></DataTable.Title>
              <DataTable.Title><Text style={[styles.tableHeader, { color: colors.text }]}>Status</Text></DataTable.Title>
              <DataTable.Title><Text style={[styles.tableHeader, { color: colors.text }]}>Notes</Text></DataTable.Title>
            </DataTable.Header>
            {records.map((row) => (
              <DataTable.Row key={`${row.date}-${row.session}`}>
                <DataTable.Cell><Text style={[styles.tableCell, { color: colors.text }]}>{row.date}</Text></DataTable.Cell>
                <DataTable.Cell><Text style={[styles.tableCell, { color: colors.text }]}>{row.session}</Text></DataTable.Cell>
                <DataTable.Cell><Text style={[styles.tableCell, { color: colors.text }]}>{row.status}</Text></DataTable.Cell>
                <DataTable.Cell><Text style={[styles.tableCell, { color: colors.text }]}>{row.notes}</Text></DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>

      <View style={styles.pagination}>
        <IconButton icon="chevron-left" size={18} onPress={() => Alert.alert('History', 'You are on the first demo page.')} />
        <Button mode="text" textColor={colors.text} onPress={() => Alert.alert('History', 'Page 1 selected.')}>1</Button>
        <Button mode="contained" onPress={() => Alert.alert('History', 'Page 2 selected.')}>2</Button>
        <IconButton icon="chevron-right" size={18} onPress={() => Alert.alert('History', 'No more demo pages yet.')} />
      </View>

      <Card mode="outlined" style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Card.Content style={styles.summaryRow}>
          <MaterialCommunityIcons name="calendar-check-outline" size={22} color={colors.muted} />
          <Text style={[styles.summaryText, { color: colors.text }]}>
            Showing {records.length} attendance record{records.length === 1 ? '' : 's'} for {month}.
          </Text>
        </Card.Content>
      </Card>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  toolbarCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb', marginBottom: 16 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  toolbarLabel: { color: '#374151', fontWeight: '700' },
  tableCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  pagination: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 12 },
  summaryCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb', marginTop: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { color: '#111827', fontWeight: '500' },
  tableHeader: { color: '#111827', fontWeight: '800' },
  tableCell: { color: '#111827', fontWeight: '500' },
});

function buildCsv(records: AttendanceRecord[]) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const header = ['Date', 'Name', 'Session', 'Status', 'Notes'];
  const rows = records.map((record) => [
    record.date,
    record.userName,
    record.session,
    record.status,
    record.notes,
  ]);

  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}
