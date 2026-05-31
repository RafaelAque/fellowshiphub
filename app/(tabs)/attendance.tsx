import React, { useMemo, useState } from 'react';
import { Alert, Image, Platform, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';
import { Button, Card, DataTable, Menu, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppShell } from '@/components/app-shell';
import { FellowshipSession, useAppRole } from '@/components/app-role-context';

const attendanceBaseUrl = process.env.EXPO_PUBLIC_ATTENDANCE_BASE_URL?.replace(/\/$/, '');

function getCheckInUrl(session: FellowshipSession) {
  const params = new URLSearchParams({
    sessionId: session.id,
    title: session.title,
    date: session.date,
    time: session.time,
    location: session.location,
  });
  const path = `/check-in?${params.toString()}`;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }

  if (attendanceBaseUrl) {
    return `${attendanceBaseUrl}${path}`;
  }

  return Linking.createURL('/check-in', {
    queryParams: {
      sessionId: session.id,
      title: session.title,
      date: session.date,
      time: session.time,
      location: session.location,
    },
  });
}

function getQrImageUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(value)}`;
}

export default function Attendance() {
  const { attendanceRecords, checkIn, currentUser, role, sessions, themeMode, users } = useAppRole();
  const openSession = sessions.find((session) => session.status === 'open') ?? sessions[0];
  const [selectedSessionId, setSelectedSessionId] = useState(openSession.id);
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? openSession;
  const currentSessionIds = useMemo(() => new Set(sessions.map((session) => session.id)), [sessions]);
  const currentUserRecords = attendanceRecords.filter(
    (record) => record.userId === currentUser?.id && currentSessionIds.has(record.sessionId)
  );
  const currentUserPresent = currentUserRecords.filter((record) => record.status === 'Present').length;
  const checkedIn = attendanceRecords.some(
    (record) => record.userId === currentUser?.id && record.sessionId === openSession.id && record.status === 'Present'
  );
  const [submitting, setSubmitting] = useState(false);
  const members = users.filter((user) => user.role === 'member');
  const selectedRecords = attendanceRecords.filter((record) => record.sessionId === selectedSession.id);
  const presentRecords = selectedRecords.filter((record) => record.status === 'Present');
  const absentRecords = selectedRecords.filter((record) => record.status === 'Absent');
  const attendanceRows = useMemo(() => (
    members.map((member) => {
      const record = selectedRecords.find((candidate) => candidate.userId === member.id);

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        status: record?.status ?? 'Absent',
        checkedInAt: record?.checkedInAt
          ? new Date(record.checkedInAt).toLocaleString()
          : '-',
        notes: record?.notes ?? '-',
      };
    })
  ), [members, selectedRecords]);
  const dark = themeMode === 'dark';
  const colors = {
    card: dark ? '#111827' : '#ffffff',
    soft: dark ? '#1f2937' : '#f9fafb',
    border: dark ? '#374151' : '#e5e7eb',
    fieldBorder: dark ? '#475569' : '#d1d5db',
    text: dark ? '#f9fafb' : '#111827',
    muted: dark ? '#cbd5e1' : '#374151',
    successCard: dark ? '#064e3b' : '#ecfdf5',
    successBorder: dark ? '#10b981' : '#a7f3d0',
    successText: dark ? '#dcfce7' : '#166534',
  };
  const openSessionCheckInUrl = getCheckInUrl(openSession);
  const selectedSessionCheckInUrl = getCheckInUrl(selectedSession);
  const openSessionQrUrl = getQrImageUrl(openSessionCheckInUrl);
  const selectedSessionQrUrl = getQrImageUrl(selectedSessionCheckInUrl);
  const qrNeedsLanUrl = openSessionCheckInUrl.includes('localhost') || openSessionCheckInUrl.includes('127.0.0.1');

  const handleCheckIn = async () => {
    setSubmitting(true);
    const result = await checkIn(openSession.id);
    setSubmitting(false);
    Alert.alert(result.ok ? 'Attendance checked in' : 'Check-in unavailable', result.message);
  };

  return (
    <AppShell
      activeKey="attendance"
      title={role === 'admin' ? 'Attendance Records' : 'Check Attendance'}
      subtitle={role === 'admin' ? 'View who attended each session.' : 'Mark your attendance for this session.'}
    >
      {role === 'admin' ? (
        <View style={styles.adminLayout}>
          <View style={styles.statsGrid}>
            <Card mode="outlined" style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="account-group-outline" size={28} color={colors.text} />
                <Text variant="headlineSmall" style={[styles.statValue, { color: colors.text }]}>{members.length}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Total members</Text>
              </Card.Content>
            </Card>
            <Card mode="outlined" style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="check-circle-outline" size={28} color={colors.text} />
                <Text variant="headlineSmall" style={[styles.statValue, { color: colors.text }]}>{presentRecords.length}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Present</Text>
              </Card.Content>
            </Card>
            <Card mode="outlined" style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="close-circle-outline" size={28} color={colors.text} />
                <Text variant="headlineSmall" style={[styles.statValue, { color: colors.text }]}>{Math.max(members.length - presentRecords.length, absentRecords.length)}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Absent</Text>
              </Card.Content>
            </Card>
            <Card mode="outlined" style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="chart-pie" size={28} color={colors.text} />
                <Text variant="headlineSmall" style={[styles.statValue, { color: colors.text }]}>
                  {members.length ? Math.round((presentRecords.length / members.length) * 100) : 0}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Attendance rate</Text>
              </Card.Content>
            </Card>
          </View>

          <Card mode="outlined" style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Card.Content style={styles.adminToolbar}>
              <View style={styles.adminSessionCopy}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>Selected Session</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>{selectedSession.title}</Text>
                <Text style={[styles.metaText, { color: colors.muted }]}>{selectedSession.date} at {selectedSession.time} - {selectedSession.location}</Text>
              </View>
              <Menu
                visible={sessionMenuOpen}
                onDismiss={() => setSessionMenuOpen(false)}
                anchor={
                  <Button mode="outlined" textColor={colors.text} icon="chevron-down" onPress={() => setSessionMenuOpen(true)}>
                    Change Session
                  </Button>
                }
              >
                {sessions.map((session) => (
                  <Menu.Item
                    key={session.id}
                    onPress={() => {
                      setSelectedSessionId(session.id);
                      setSessionMenuOpen(false);
                    }}
                    title={`${session.title} - ${session.date}`}
                  />
                ))}
              </Menu>
            </Card.Content>
          </Card>

          <Card mode="outlined" style={[styles.checkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Card.Content style={styles.adminQrContent}>
              <View style={styles.adminQrCopy}>
                <Text variant="titleMedium" style={[styles.tableTitle, { color: colors.text }]}>Session QR Check-in</Text>
                <Text style={[styles.noteText, { color: colors.muted }]}>
                  Let members scan this code to record attendance for {selectedSession.title}.
                </Text>
              </View>
              <View style={[styles.qrBoxLarge, { backgroundColor: '#ffffff', borderColor: colors.fieldBorder }]}>
                <Image source={{ uri: selectedSessionQrUrl }} style={styles.qrImageLarge} accessibilityLabel="Session attendance QR code" />
              </View>
              <Text selectable style={[styles.scanLink, { color: colors.muted }]}>
                {selectedSessionCheckInUrl}
              </Text>
            </Card.Content>
          </Card>

          <Card mode="outlined" style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Card.Content>
              <Text variant="titleMedium" style={[styles.tableTitle, { color: colors.text }]}>Member Attendance</Text>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Name</DataTable.Title>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Email</DataTable.Title>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Status</DataTable.Title>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Checked In</DataTable.Title>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Notes</DataTable.Title>
                </DataTable.Header>
                {attendanceRows.map((row) => (
                  <DataTable.Row key={row.id}>
                    <DataTable.Cell textStyle={{ color: colors.text }}>{row.name}</DataTable.Cell>
                    <DataTable.Cell textStyle={{ color: colors.text }}>{row.email}</DataTable.Cell>
                    <DataTable.Cell>
                      <Text style={row.status === 'Present' ? styles.presentText : styles.absentText}>
                        {row.status}
                      </Text>
                    </DataTable.Cell>
                    <DataTable.Cell textStyle={{ color: colors.text }}>{row.checkedInAt}</DataTable.Cell>
                    <DataTable.Cell textStyle={{ color: colors.text }}>{row.notes}</DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </Card.Content>
          </Card>
        </View>
      ) : (
      <View style={styles.grid}>
        <View style={styles.leftColumn}>
          <Card mode="outlined" style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Card.Content>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Session Name</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{openSession.title}</Text>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.muted} />
                <Text style={[styles.metaText, { color: colors.muted }]}>{openSession.date}</Text>
              </View>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="clock-outline" size={18} color={colors.muted} />
                <Text style={[styles.metaText, { color: colors.muted }]}>{openSession.time}</Text>
              </View>
              <View style={styles.metaRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color={colors.muted} />
                <Text style={[styles.metaText, { color: colors.muted }]}>{openSession.location}</Text>
              </View>
            </Card.Content>
          </Card>

          <Card mode="outlined" style={[styles.checkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Card.Content style={styles.center}>
              <View style={[styles.qrBox, { backgroundColor: '#ffffff', borderColor: colors.fieldBorder }]}>
                <Image source={{ uri: openSessionQrUrl }} style={styles.qrImage} accessibilityLabel="Session attendance QR code" />
              </View>
              <Text style={[styles.helperText, { color: colors.text }]}>Scan the QR code to check in</Text>
              {qrNeedsLanUrl ? (
                <Text style={[styles.qrWarning, { color: colors.muted }]}>
                  For phone scanning, open Expo using a LAN address or set EXPO_PUBLIC_ATTENDANCE_BASE_URL.
                </Text>
              ) : null}
              <Text selectable style={[styles.scanLink, { color: colors.muted }]}>
                {openSessionCheckInUrl}
              </Text>
              <Text style={[styles.orText, { color: colors.muted }]}>OR</Text>
              <Button
                mode={checkedIn ? 'outlined' : 'contained'}
                onPress={handleCheckIn}
                style={styles.button}
                disabled={checkedIn || submitting}
                loading={submitting}
                textColor="#ffffff"
              >
                {checkedIn ? 'Already checked in' : 'Check in manually'}
              </Button>
            </Card.Content>
          </Card>

          <Card mode="outlined" style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Card.Content style={styles.noteRow}>
              <MaterialCommunityIcons name="information-outline" size={20} color={colors.muted} />
              <Text style={[styles.noteText, { color: colors.muted }]}>You will be marked present once checked in successfully.</Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.rightColumn}>
          <Card mode="outlined" style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Card.Content>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Attendance Summary</Text>
              <Text style={[styles.summaryValue, { color: colors.text }]}>
                {currentUserPresent} / {sessions.length}
              </Text>
              <Text style={[styles.summaryText, { color: colors.muted }]}>Sessions attended</Text>
              <Text style={[styles.rate, { color: colors.text }]}>{checkedIn ? 'Current session recorded' : 'Current session is open'}</Text>
            </Card.Content>
          </Card>

          {checkedIn ? (
            <Card mode="outlined" style={[styles.successCard, { backgroundColor: colors.successCard, borderColor: colors.successBorder }]}>
              <Card.Content style={styles.successRow}>
                <MaterialCommunityIcons name="check-circle-outline" size={24} color="#16a34a" />
                <Text style={[styles.successText, { color: colors.successText }]}>Attendance recorded for today.</Text>
              </Card.Content>
            </Card>
          ) : null}
        </View>
      </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  adminLayout: { gap: 16 },
  statsGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statCard: {
    flexBasis: 160,
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  statContent: { alignItems: 'center', gap: 6, paddingVertical: 18 },
  statValue: { color: '#111827', fontWeight: '800' },
  statLabel: { color: '#374151', textAlign: 'center', fontWeight: '600' },
  leftColumn: { flex: 1, minWidth: 300, gap: 16 },
  rightColumn: { width: 280, minWidth: 260, gap: 16 },
  sessionCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  adminToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  adminSessionCopy: { flex: 1, minWidth: 260 },
  detailLabel: { color: '#374151', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  detailValue: { color: '#111827', fontSize: 22, fontWeight: '800', marginTop: 4, marginBottom: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  metaText: { color: '#374151' },
  checkCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  center: { alignItems: 'center', gap: 8 },
  qrBox: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  qrImage: {
    width: 104,
    height: 104,
  },
  qrBoxLarge: {
    width: 150,
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  qrImageLarge: {
    width: 142,
    height: 142,
  },
  adminQrContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  adminQrCopy: { flex: 1, minWidth: 260 },
  helperText: { color: '#111827', textAlign: 'center', fontWeight: '500' },
  qrWarning: { textAlign: 'center', fontSize: 12, lineHeight: 17, fontWeight: '600', maxWidth: 520 },
  scanLink: { textAlign: 'center', fontSize: 12, lineHeight: 17, fontWeight: '600', maxWidth: 620 },
  orText: { color: '#374151', fontWeight: '800' },
  button: { alignSelf: 'stretch', marginTop: 4 },
  noteCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  noteText: { color: '#374151', flex: 1 },
  summaryCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  summaryTitle: { color: '#111827', fontWeight: '800' },
  summaryValue: { fontSize: 30, fontWeight: '900', color: '#111827', marginTop: 8 },
  summaryText: { color: '#374151', marginTop: 4, fontWeight: '500' },
  rate: { color: '#111827', marginTop: 10, fontWeight: '700' },
  successCard: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' },
  successRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  successText: { color: '#166534', flex: 1, fontWeight: '600' },
  tableCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  tableTitle: { color: '#111827', fontWeight: '900', marginBottom: 12 },
  presentText: { color: '#166534', fontWeight: '800' },
  absentText: { color: '#b91c1c', fontWeight: '800' },
});
