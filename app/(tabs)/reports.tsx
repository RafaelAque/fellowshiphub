import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { Button, Card, Menu, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppShell } from '@/components/app-shell';
import { useAppRole } from '@/components/app-role-context';

function percent(value: number, total: number) {
  return total ? `${Math.round((value / total) * 100)}%` : '0%';
}

function downloadCsv(filename: string, csv: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    Alert.alert('Export available on web', 'Mobile reports are shown on screen. Open the web version to download CSV files.');
    return;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export default function Reports() {
  const { attendanceRecords, feedbackEntries, role, sessions, users } = useAppRole();
  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id ?? '');
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false);
  const members = users.filter((user) => user.role === 'member');
  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? sessions[0];
  const sessionAttendance = attendanceRecords.filter((record) => record.sessionId === selectedSession?.id);
  const sessionFeedback = feedbackEntries.filter((feedback) => feedback.sessionId === selectedSession?.id);
  const presentCount = sessionAttendance.filter((record) => record.status === 'Present').length;
  const absentCount = Math.max(members.length - presentCount, sessionAttendance.filter((record) => record.status === 'Absent').length);
  const averageRating = sessionFeedback.length
    ? (sessionFeedback.reduce((sum, feedback) => sum + feedback.rating, 0) / sessionFeedback.length).toFixed(1)
    : '0.0';

  useEffect(() => {
    if (!sessions.length) {
      setSelectedSessionId('');
      return;
    }

    if (!sessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [selectedSessionId, sessions]);

  const sessionRows = useMemo(() => (
    sessions.map((session) => {
      const attendance = attendanceRecords.filter((record) => record.sessionId === session.id);
      const present = attendance.filter((record) => record.status === 'Present').length;
      const feedback = feedbackEntries.filter((entry) => entry.sessionId === session.id);
      const rating = feedback.length
        ? (feedback.reduce((sum, entry) => sum + entry.rating, 0) / feedback.length).toFixed(1)
        : '0.0';

      return {
        id: session.id,
        title: session.title,
        date: session.date,
        present,
        absent: Math.max(members.length - present, attendance.filter((record) => record.status === 'Absent').length),
        rate: percent(present, members.length),
        feedback: feedback.length,
        rating,
      };
    })
  ), [attendanceRecords, feedbackEntries, members.length, sessions]);

  const memberRows = useMemo(() => (
    members.map((member) => {
      const records = attendanceRecords.filter((record) => record.userId === member.id);
      const present = records.filter((record) => record.status === 'Present').length;
      const feedback = feedbackEntries.filter((entry) => entry.userId === member.id).length;

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        attended: present,
        total: records.length,
        rate: percent(present, records.length),
        feedback,
      };
    })
  ), [attendanceRecords, feedbackEntries, members]);

  const exportSessionReport = () => {
    const rows = [
      ['Session', 'Date', 'Present', 'Absent', 'Attendance Rate', 'Feedback Count', 'Average Rating'],
      ...sessionRows.map((row) => [row.title, row.date, row.present, row.absent, row.rate, row.feedback, row.rating]),
    ];
    downloadCsv('session-report.csv', rows.map((row) => row.map(escapeCsv).join(',')).join('\n'));
  };

  const exportMemberReport = () => {
    const rows = [
      ['Name', 'Email', 'Attended', 'Recorded Sessions', 'Attendance Rate', 'Feedback Submitted'],
      ...memberRows.map((row) => [row.name, row.email, row.attended, row.total, row.rate, row.feedback]),
    ];
    downloadCsv('member-report.csv', rows.map((row) => row.map(escapeCsv).join(',')).join('\n'));
  };

  return (
    <AppShell
      activeKey="reports"
      title="Reports"
      subtitle="Review attendance, feedback, and participation reports."
    >
      {role !== 'admin' ? (
        <Card mode="outlined" style={styles.noticeCard}>
          <Card.Content style={styles.noticeContent}>
            <MaterialCommunityIcons name="lock-outline" size={28} color="#111827" />
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>Admin access required</Text>
              <Text style={styles.noticeText}>Only administrators can view reports.</Text>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <View style={styles.layout}>
          <View style={styles.statsGrid}>
            <Card mode="outlined" style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="account-group-outline" size={28} color="#111827" />
                <Text variant="headlineSmall" style={styles.statValue}>{members.length}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </Card.Content>
            </Card>
            <Card mode="outlined" style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="calendar-check" size={28} color="#111827" />
                <Text variant="headlineSmall" style={styles.statValue}>{sessions.length}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </Card.Content>
            </Card>
            <Card mode="outlined" style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="check-circle-outline" size={28} color="#111827" />
                <Text variant="headlineSmall" style={styles.statValue}>{presentCount}</Text>
                <Text style={styles.statLabel}>Present selected</Text>
              </Card.Content>
            </Card>
            <Card mode="outlined" style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="star-outline" size={28} color="#111827" />
                <Text variant="headlineSmall" style={styles.statValue}>{averageRating}</Text>
                <Text style={styles.statLabel}>Avg. rating</Text>
              </Card.Content>
            </Card>
          </View>

          <Card mode="outlined" style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <View style={styles.summaryCopy}>
                <Text style={styles.kicker}>Selected Session</Text>
                <Text variant="titleLarge" style={styles.sessionTitle}>{selectedSession?.title ?? 'No session'}</Text>
                <Text style={styles.sessionMeta}>{selectedSession ? `${selectedSession.date} at ${selectedSession.time} - ${selectedSession.location}` : '-'}</Text>
                <Text style={styles.sessionMeta}>
                  Present: {presentCount} | Absent: {absentCount} | Feedback: {sessionFeedback.length}
                </Text>
              </View>
              <Menu
                visible={sessionMenuOpen}
                onDismiss={() => setSessionMenuOpen(false)}
                anchor={
                  <Button mode="outlined" textColor="#111827" icon="chevron-down" onPress={() => setSessionMenuOpen(true)}>
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

          <View style={styles.reportActions}>
            <Button mode="contained" textColor="#ffffff" icon="download" style={styles.exportButton} onPress={exportSessionReport}>
              Export Session Report
            </Button>
            <Button mode="outlined" textColor="#111827" icon="download" onPress={exportMemberReport}>
              Export Member Report
            </Button>
          </View>

          <Card mode="outlined" style={styles.tableCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.tableTitle}>Session Summary</Text>
              <View style={styles.reportList}>
                {sessionRows.length ? sessionRows.map((row) => (
                  <View key={row.id} style={styles.reportRowCard}>
                    <View style={styles.reportRowHeader}>
                      <View style={styles.reportRowTitleWrap}>
                        <Text style={styles.reportRowTitle}>{row.title}</Text>
                        <Text style={styles.reportRowMeta}>{row.date}</Text>
                      </View>
                      <View style={styles.rateBadge}>
                        <Text style={styles.rateBadgeText}>{row.rate}</Text>
                      </View>
                    </View>
                    <View style={styles.metricGrid}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{row.present}</Text>
                        <Text style={styles.metricLabel}>Present</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{row.absent}</Text>
                        <Text style={styles.metricLabel}>Absent</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{row.feedback}</Text>
                        <Text style={styles.metricLabel}>Feedback</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{row.rating}</Text>
                        <Text style={styles.metricLabel}>Rating</Text>
                      </View>
                    </View>
                  </View>
                )) : (
                  <Text style={styles.emptyText}>No sessions available yet.</Text>
                )}
              </View>
            </Card.Content>
          </Card>

          <Card mode="outlined" style={styles.tableCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.tableTitle}>Member Participation</Text>
              <View style={styles.reportList}>
                {memberRows.length ? memberRows.map((row) => (
                  <View key={row.id} style={styles.reportRowCard}>
                    <View style={styles.reportRowHeader}>
                      <View style={styles.reportRowTitleWrap}>
                        <Text style={styles.reportRowTitle}>{row.name}</Text>
                        <Text style={styles.reportRowMeta}>{row.email}</Text>
                      </View>
                      <View style={styles.rateBadge}>
                        <Text style={styles.rateBadgeText}>{row.rate}</Text>
                      </View>
                    </View>
                    <View style={styles.metricGrid}>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{row.attended} / {row.total}</Text>
                        <Text style={styles.metricLabel}>Attended</Text>
                      </View>
                      <View style={styles.metricItem}>
                        <Text style={styles.metricValue}>{row.feedback}</Text>
                        <Text style={styles.metricLabel}>Feedback</Text>
                      </View>
                    </View>
                  </View>
                )) : (
                  <Text style={styles.emptyText}>No members available yet.</Text>
                )}
              </View>
            </Card.Content>
          </Card>
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  layout: { gap: 16 },
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
  summaryCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  summaryContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  summaryCopy: { flex: 1, minWidth: 280 },
  kicker: { color: '#374151', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  sessionTitle: { color: '#111827', fontWeight: '900', marginTop: 4 },
  sessionMeta: { color: '#374151', marginTop: 4, fontWeight: '600' },
  reportActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10 },
  exportButton: { backgroundColor: '#111827' },
  tableCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  tableTitle: { color: '#111827', fontWeight: '900', marginBottom: 12 },
  reportList: { gap: 10 },
  reportRowCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 12,
  },
  reportRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  reportRowTitleWrap: { flex: 1 },
  reportRowTitle: { color: '#111827', fontSize: 16, fontWeight: '900' },
  reportRowMeta: { color: '#6b7280', marginTop: 3 },
  rateBadge: {
    borderRadius: 999,
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rateBadgeText: { color: '#ffffff', fontWeight: '900' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricItem: {
    minWidth: 92,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 10,
  },
  metricValue: { color: '#111827', fontSize: 16, fontWeight: '900' },
  metricLabel: { color: '#6b7280', marginTop: 3, fontSize: 12, fontWeight: '700' },
  emptyText: {
    color: '#6b7280',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    lineHeight: 20,
  },
  noticeCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  noticeContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: '#111827', fontWeight: '800' },
  noticeText: { color: '#374151', marginTop: 2 },
});
