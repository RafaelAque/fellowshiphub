import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, DataTable, IconButton, Modal, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppShell } from '@/components/app-shell';
import { AttendanceRecord, useAppRole } from '@/components/app-role-context';

export default function History() {
  const { attendanceRecords, currentUser, role, sessions, themeMode } = useAppRole();
  const router = useRouter();
  const [month, setMonth] = useState('May 2024');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (currentUser && role !== 'admin') {
      router.replace('/(tabs)/dashboard');
    }
  }, [currentUser, role, router]);

  const visibleRecords = useMemo(() => (
    role === 'admin' ? attendanceRecords : []
  ), [attendanceRecords, role]);
  const monthOptions = useMemo(() => {
    const anchorDates = [
      ...visibleRecords.map((record) => record.date),
      ...sessions.map((session) => session.date),
    ];

    return buildMonthOptions(anchorDates);
  }, [sessions, visibleRecords]);
  useEffect(() => {
    if (monthOptions.length && !monthOptions.includes(month)) {
      setMonth(monthOptions[monthOptions.length - 1]);
    }
  }, [month, monthOptions]);
  const availableYears = useMemo(() => {
    const years = monthOptions
      .map((option) => getMonthParts(option)?.year)
      .filter((year): year is number => typeof year === 'number');
    const currentYear = new Date().getFullYear();

    return {
      max: Math.max(...years, currentYear + 5),
      min: Math.min(...years, currentYear - 10),
    };
  }, [monthOptions]);
  useEffect(() => {
    const selected = getMonthParts(month);

    if (selected) {
      setPickerYear(selected.year);
    }
  }, [month]);
  const records = useMemo(() => {
    const [monthName, year] = month.split(' ');

    return visibleRecords.filter((record) => record.date.includes(monthName) && record.date.includes(year));
  }, [month, visibleRecords]);
  const presentCount = records.filter((record) => record.status === 'Present').length;
  const absentCount = records.filter((record) => record.status === 'Absent').length;
  const rate = records.length ? Math.round((presentCount / records.length) * 100) : 0;
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
      const blob = new Blob([String(csv)], { type: 'text/csv;charset=utf-8;' });
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

  const moveMonth = (direction: -1 | 1) => {
    const current = parseMonthDate(month);

    if (!current) {
      return;
    }

    setMonth(formatMonthOption(new Date(current.getFullYear(), current.getMonth() + direction, 1)));
  };
  const movePickerYear = (direction: -1 | 1) => {
    setPickerYear((year) => Math.min(Math.max(year + direction, availableYears.min), availableYears.max));
  };
  const selectMonth = (option: string) => {
    setMonth(option);
    setPickerOpen(false);
  };

  return (
    <AppShell
      activeKey="history"
      title="Attendance History"
      subtitle="Review member attendance records by month."
    >
      <View style={styles.statsGrid}>
        <Card mode="outlined" style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="calendar-check-outline" size={24} color={colors.text} />
            <Text style={[styles.statValue, { color: colors.text }]}>{records.length}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Records</Text>
          </Card.Content>
        </Card>
        <Card mode="outlined" style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="check-circle-outline" size={24} color={colors.text} />
            <Text style={[styles.statValue, { color: colors.text }]}>{presentCount}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Present</Text>
          </Card.Content>
        </Card>
        <Card mode="outlined" style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="close-circle-outline" size={24} color={colors.text} />
            <Text style={[styles.statValue, { color: colors.text }]}>{absentCount}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Absent</Text>
          </Card.Content>
        </Card>
        <Card mode="outlined" style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content style={styles.statContent}>
            <MaterialCommunityIcons name="chart-pie" size={24} color={colors.text} />
            <Text style={[styles.statValue, { color: colors.text }]}>{rate}%</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Attendance Rate</Text>
          </Card.Content>
        </Card>
      </View>

      <Card mode="outlined" style={[styles.toolbarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Card.Content style={styles.toolbar}>
          <View style={styles.toolbarLeft}>
            <Text style={[styles.toolbarLabel, { color: colors.muted }]}>Filter by Month:</Text>
            <IconButton icon="chevron-left" size={18} onPress={() => moveMonth(-1)} />
            <Button mode="outlined" textColor={colors.text} onPress={() => setPickerOpen(true)} icon="calendar-month">
              {month}
            </Button>
            <IconButton icon="chevron-right" size={18} onPress={() => moveMonth(1)} />
          </View>
          <Button mode="outlined" textColor={colors.text} icon="download" disabled={!records.length} onPress={exportRecords}>Export</Button>
        </Card.Content>
      </Card>
      <Portal>
        <Modal
          visible={pickerOpen}
          onDismiss={() => setPickerOpen(false)}
          contentContainerStyle={[styles.monthPicker, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={styles.monthPickerHeader}>
            <IconButton
              icon="chevron-left"
              size={20}
              disabled={pickerYear <= availableYears.min}
              onPress={() => movePickerYear(-1)}
            />
            <Text style={[styles.monthPickerTitle, { color: colors.text }]}>{pickerYear}</Text>
            <IconButton
              icon="chevron-right"
              size={20}
              disabled={pickerYear >= availableYears.max}
              onPress={() => movePickerYear(1)}
            />
          </View>
          <View style={styles.monthGrid}>
            {MONTH_NAMES.map((monthName) => {
              const option = `${monthName} ${pickerYear}`;
              const selected = option === month;

              return (
                <Button
                  key={option}
                  mode={selected ? 'contained' : 'outlined'}
                  textColor={selected ? '#ffffff' : colors.text}
                  buttonColor={selected ? '#111827' : undefined}
                  style={styles.monthGridButton}
                  onPress={() => selectMonth(option)}
                >
                  {monthName}
                </Button>
              );
            })}
          </View>
          <View style={styles.monthPickerFooter}>
            <Button mode="text" textColor={colors.muted} onPress={() => setPickerOpen(false)}>Cancel</Button>
          </View>
        </Modal>
      </Portal>

      <Card mode="outlined" style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Card.Content>
          {records.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <DataTable style={styles.table}>
                <DataTable.Header>
                  <DataTable.Title style={styles.dateColumn}><Text style={[styles.tableHeader, { color: colors.text }]}>Date</Text></DataTable.Title>
                  {role === 'admin' ? <DataTable.Title style={styles.nameColumn}><Text style={[styles.tableHeader, { color: colors.text }]}>Member</Text></DataTable.Title> : null}
                  <DataTable.Title style={styles.sessionColumn}><Text style={[styles.tableHeader, { color: colors.text }]}>Session</Text></DataTable.Title>
                  <DataTable.Title style={styles.statusColumn}><Text style={[styles.tableHeader, { color: colors.text }]}>Status</Text></DataTable.Title>
                  <DataTable.Title style={styles.notesColumn}><Text style={[styles.tableHeader, { color: colors.text }]}>Notes</Text></DataTable.Title>
                </DataTable.Header>
                {records.map((row) => (
                  <DataTable.Row key={`${row.id}-${row.date}-${row.session}`}>
                    <DataTable.Cell style={styles.dateColumn}><Text style={[styles.tableCell, { color: colors.text }]}>{row.date}</Text></DataTable.Cell>
                    {role === 'admin' ? <DataTable.Cell style={styles.nameColumn}><Text style={[styles.tableCell, { color: colors.text }]}>{row.userName}</Text></DataTable.Cell> : null}
                    <DataTable.Cell style={styles.sessionColumn}><Text style={[styles.tableCell, { color: colors.text }]}>{row.session}</Text></DataTable.Cell>
                    <DataTable.Cell style={styles.statusColumn}><Text style={[styles.statusPill, row.status === 'Present' ? styles.presentPill : styles.absentPill]}>{row.status}</Text></DataTable.Cell>
                    <DataTable.Cell style={styles.notesColumn}><Text style={[styles.tableCell, { color: colors.text }]}>{row.notes || '-'}</Text></DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-search" size={42} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No attendance records for {month}</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Attendance will appear here after members check in for sessions during this month.
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statCard: { flexBasis: 150, flexGrow: 1 },
  statContent: { alignItems: 'center', gap: 6, paddingVertical: 14 },
  statValue: { fontSize: 26, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  toolbarCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb', marginBottom: 16 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  toolbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  toolbarLabel: { color: '#374151', fontWeight: '700' },
  monthPicker: { alignSelf: 'center', borderWidth: 1, borderRadius: 10, padding: 16, width: '92%', maxWidth: 420 },
  monthPickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  monthPickerTitle: { fontSize: 22, fontWeight: '900' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  monthGridButton: { flexBasis: 110, flexGrow: 1 },
  monthPickerFooter: { alignItems: 'flex-end', marginTop: 12 },
  tableCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  table: { minWidth: 760 },
  dateColumn: { minWidth: 140 },
  nameColumn: { minWidth: 160 },
  sessionColumn: { minWidth: 180 },
  statusColumn: { minWidth: 120 },
  notesColumn: { minWidth: 180 },
  summaryCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb', marginTop: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  summaryText: { color: '#111827', fontWeight: '500' },
  tableHeader: { color: '#111827', fontWeight: '800' },
  tableCell: { color: '#111827', fontWeight: '500' },
  statusPill: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, fontWeight: '800', textAlign: 'center' },
  presentPill: { color: '#166534', backgroundColor: '#dcfce7' },
  absentPill: { color: '#991b1b', backgroundColor: '#fee2e2' },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 38, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyText: { textAlign: 'center', lineHeight: 20, maxWidth: 460 },
});

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonthDate(value: string) {
  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
  }

  const match = value.match(/\b([A-Za-z]{3,9})\s+\d{1,2},\s+(\d{4})\b/);
  const fallback = match ? new Date(`${match[1]} 1, ${match[2]}`) : null;

  if (!fallback || Number.isNaN(fallback.getTime())) {
    return null;
  }

  return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
}

function buildMonthOptions(values: string[]) {
  const parsedDates = values
    .map(parseMonthDate)
    .filter((date): date is Date => Boolean(date));
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const fallbackStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 11, 1);
  const dates = parsedDates.length ? parsedDates : [currentMonth];
  const earliest = dates.reduce((oldest, date) => (date < oldest ? date : oldest), dates[0]);
  const latest = dates.reduce((newest, date) => (date > newest ? date : newest), dates[0]);
  const start = earliest < fallbackStart ? earliest : fallbackStart;
  const end = latest > currentMonth ? latest : currentMonth;
  const options: string[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
    options.push(formatMonthOption(cursor));
  }

  return options;
}

function formatMonthOption(date: Date) {
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function getMonthParts(value: string) {
  const [monthName, yearValue] = value.split(' ');
  const monthIndex = MONTH_NAMES.indexOf(monthName);
  const year = Number(yearValue);

  if (monthIndex < 0 || Number.isNaN(year)) {
    return null;
  }

  return { monthIndex, year };
}

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
