import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Button, Card, DataTable, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppShell } from '@/components/app-shell';
import { useAppRole } from '@/components/app-role-context';
import { useRouter } from 'expo-router';

const memberActions = [
  { title: 'Check Attendance', icon: 'login-variant', note: 'Mark your attendance' },
  { title: 'AI Progress Check', icon: 'robot-outline', note: 'Chat with AI about your progress' },
  { title: 'Give Feedback', icon: 'star-outline', note: 'Share your thoughts after the session' },
] as const;

const adminActions = [
  { title: 'Manage Sessions', icon: 'calendar-edit', note: 'Create and update sessions', route: null },
  { title: 'View Reports', icon: 'chart-bar', note: 'Open attendance and feedback reports', route: '/(tabs)/history' },
  { title: 'Attendance Records', icon: 'clipboard-text-outline', note: 'Review session attendance', route: '/(tabs)/attendance' },
  { title: 'Feedback Overview', icon: 'star-outline', note: 'Summarize session feedback', route: '/(tabs)/feedback' },
] as const;

export default function Dashboard() {
  const router = useRouter();
  const { attendanceRecords, currentUser, feedbackEntries, role, sessions, themeMode, users } = useAppRole();
  const { width } = useWindowDimensions();
  const [actionsOpen, setActionsOpen] = useState(false);
  const panelTranslate = useRef(new Animated.Value(360)).current;
  const isAdmin = role === 'admin';
  const compactPanel = width < 520;
  const openSession = sessions.find((session) => session.status === 'open') ?? sessions[0];
  const currentSessionIds = useMemo(() => new Set(sessions.map((session) => session.id)), [sessions]);
  const totalSessions = sessions.length;
  const memberRecords = attendanceRecords.filter(
    (record) => record.userId === currentUser?.id && currentSessionIds.has(record.sessionId)
  );
  const memberPresent = memberRecords.filter((record) => record.status === 'Present').length;
  const memberRate = totalSessions ? Math.round((memberPresent / totalSessions) * 100) : 0;

  const allPresent = attendanceRecords.filter((record) => record.status === 'Present').length;
  const adminRate = attendanceRecords.length ? Math.round((allPresent / attendanceRecords.length) * 100) : 0;
  const avgFeedback = feedbackEntries.length
    ? (feedbackEntries.reduce((sum, feedback) => sum + feedback.rating, 0) / feedbackEntries.length).toFixed(1)
    : '0.0';
  const totalMembers = users.filter((user) => user.role === 'member').length;
  const dark = themeMode === 'dark';
  const colors = {
    card: dark ? '#111827' : '#ffffff',
    panelItem: dark ? '#1f2937' : '#f8fafc',
    border: dark ? '#374151' : '#e5e7eb',
    line: dark ? '#334155' : '#e5e7eb',
    text: dark ? '#f9fafb' : '#111827',
    muted: dark ? '#cbd5e1' : '#374151',
  };

  const memberStats = [
    { label: 'Sessions attended this month', value: `${memberPresent} / ${totalSessions}`, icon: 'calendar-check' },
    { label: 'Attendance rate', value: `${memberRate}%`, icon: 'star' },
    { label: 'Next session', value: `${openSession.date}\n${openSession.time}`, icon: 'clock-outline' },
  ] as const;

  const adminStats = [
    { label: 'Total members', value: String(totalMembers), icon: 'account-group' },
    { label: 'Attendance rate', value: `${adminRate}%`, icon: 'chart-pie' },
    { label: 'Total sessions', value: String(sessions.length), icon: 'calendar-month' },
    { label: 'Feedback avg.', value: `${avgFeedback} / 5`, icon: 'star-outline' },
  ] as const;

  const recentActivity = useMemo(() => {
    const latestAttendance = attendanceRecords.slice(0, 2).map((record) => ({
      key: `att-${record.id}`,
      activity: `${record.status} attendance`,
      date: record.date,
      details: `${record.userName} - ${record.session}`,
    }));
    const latestFeedback = feedbackEntries.slice(0, 2).map((feedback) => ({
      key: `fb-${feedback.id}`,
      activity: 'Feedback submitted',
      date: feedback.date,
      details: `${feedback.userName} - ${feedback.rating}/5`,
    }));

    return [...latestFeedback, ...latestAttendance].slice(0, 4);
  }, [attendanceRecords, feedbackEntries]);
  const memberRows = useMemo(() => (
    users
      .filter((user) => user.role === 'member')
      .map((user) => {
        const memberAttendance = attendanceRecords.filter((record) => record.userId === user.id);
        const attended = memberAttendance.filter((record) => record.status === 'Present').length;
        const rate = memberAttendance.length ? Math.round((attended / memberAttendance.length) * 100) : 0;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          attendance: `${attended} / ${memberAttendance.length}`,
          rate: `${rate}%`,
        };
      })
  ), [attendanceRecords, users]);

  useEffect(() => {
    Animated.timing(panelTranslate, {
      toValue: actionsOpen ? 0 : 360,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [actionsOpen, panelTranslate]);

  return (
    <AppShell
      activeKey="dashboard"
      title={isAdmin ? 'Admin Dashboard' : `Welcome back, ${currentUser?.name.split(' ')[0] ?? 'Member'}!`}
      subtitle={isAdmin ? 'Overview' : "Here's your overview."}
    >
      <View style={styles.page}>
        {isAdmin ? (
          <>
            <View style={styles.statsGridAdmin}>
              {adminStats.map((stat) => (
                <Card key={stat.label} mode="outlined" style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Card.Content style={styles.statContent}>
                    <MaterialCommunityIcons name={stat.icon} size={28} color={colors.text} />
                    <Text variant="headlineSmall" style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</Text>
                  </Card.Content>
                </Card>
              ))}
            </View>

            <View style={styles.quickActionHeader}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
              <Button
                mode="contained-tonal"
                onPress={() => setActionsOpen(true)}
                icon="dots-grid"
                contentStyle={styles.launcherButton}
              >
                Open
              </Button>
            </View>

            <Card mode="outlined" style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title textStyle={{ color: colors.muted }}>Activity</DataTable.Title>
                    <DataTable.Title textStyle={{ color: colors.muted }}>Date</DataTable.Title>
                    <DataTable.Title textStyle={{ color: colors.muted }}>Details</DataTable.Title>
                  </DataTable.Header>
                  {recentActivity.map((row) => (
                    <DataTable.Row key={row.key}>
                      <DataTable.Cell textStyle={{ color: colors.text }}>{row.activity}</DataTable.Cell>
                      <DataTable.Cell textStyle={{ color: colors.text }}>{row.date}</DataTable.Cell>
                      <DataTable.Cell textStyle={{ color: colors.text }}>{row.details}</DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </Card.Content>
            </Card>

            <Card mode="outlined" style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Member Directory</Text>
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title textStyle={{ color: colors.muted }}>Name</DataTable.Title>
                    <DataTable.Title textStyle={{ color: colors.muted }}>Email</DataTable.Title>
                    <DataTable.Title textStyle={{ color: colors.muted }}>Attendance</DataTable.Title>
                    <DataTable.Title textStyle={{ color: colors.muted }}>Rate</DataTable.Title>
                  </DataTable.Header>
                  {memberRows.map((member) => (
                    <DataTable.Row key={member.id}>
                      <DataTable.Cell textStyle={{ color: colors.text }}>{member.name}</DataTable.Cell>
                      <DataTable.Cell textStyle={{ color: colors.text }}>{member.email}</DataTable.Cell>
                      <DataTable.Cell textStyle={{ color: colors.text }}>{member.attendance}</DataTable.Cell>
                      <DataTable.Cell textStyle={{ color: colors.text }}>{member.rate}</DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </Card.Content>
            </Card>
          </>
        ) : (
          <>
            <View style={styles.statsGridMember}>
              {memberStats.map((stat) => (
                <Card key={stat.label} mode="outlined" style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Card.Content style={styles.statContent}>
                    <MaterialCommunityIcons name={stat.icon} size={28} color={colors.text} />
                    <Text variant="headlineSmall" style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                    <Text style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</Text>
                  </Card.Content>
                </Card>
              ))}
            </View>

            <View style={styles.quickActionHeader}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
              <Button
                mode="contained-tonal"
                onPress={() => setActionsOpen(true)}
                icon="dots-grid"
                contentStyle={styles.launcherButton}
              >
                Open
              </Button>
            </View>

            <Card
              mode="outlined"
              style={[styles.announcementCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => Alert.alert('Latest Announcement', 'Youth Fellowship this Saturday at 5 PM. See you there!')}
            >
              <Card.Content style={styles.announcementContent}>
                <MaterialCommunityIcons name="bullhorn-outline" size={26} color={colors.text} />
                <View style={styles.announcementCopy}>
                  <Text style={[styles.announcementTitle, { color: colors.text }]}>Latest Announcement</Text>
                  <Text style={[styles.announcementText, { color: colors.muted }]}>Youth Fellowship this Saturday at 5 PM. See you there!</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.muted} />
              </Card.Content>
            </Card>
          </>
        )}
      </View>

      <Portal>
        {actionsOpen ? (
          <View style={styles.backdrop} pointerEvents="box-none">
            <Pressable style={styles.backdropHitArea} onPress={() => setActionsOpen(false)} />
            <Animated.View
              style={[
                styles.panel,
                compactPanel ? styles.panelCompact : styles.panelWide,
                { backgroundColor: colors.card, borderLeftColor: colors.border, transform: [{ translateX: panelTranslate }] },
              ]}
            >
              <View style={[styles.panelHeader, { borderBottomColor: colors.line }]}>
                <Text variant="titleMedium" style={[styles.panelTitle, { color: colors.text }]}>Quick Actions</Text>
                <Button icon="close" mode="text" textColor={colors.text} onPress={() => setActionsOpen(false)}>
                  Close
                </Button>
              </View>

              <View style={styles.panelList}>
                {(isAdmin ? adminActions : memberActions).map((action) => (
                  <Pressable
                    key={action.title}
                    onPress={() => {
                      setActionsOpen(false);
                      if ('route' in action && action.route) {
                        router.push(action.route);
                        return;
                      }

                      if (!isAdmin && action.title.includes('Attendance')) {
                        router.push('/(tabs)/attendance');
                        return;
                      }
                      if (!isAdmin && action.title.includes('AI')) {
                        router.push('/(tabs)/ai-progress');
                        return;
                      }
                      if (!isAdmin && action.title.includes('Feedback')) {
                        router.push('/(tabs)/feedback');
                        return;
                      }

                      Alert.alert(action.title, action.note);
                    }}
                    style={[styles.panelItem, { backgroundColor: colors.panelItem, borderColor: colors.border }]}
                  >
                    <MaterialCommunityIcons name={action.icon} size={22} color={colors.text} />
                    <View style={styles.panelCopy}>
                      <Text style={[styles.panelActionTitle, { color: colors.text }]}>{action.title}</Text>
                      <Text style={[styles.panelActionNote, { color: colors.muted }]}>{action.note}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          </View>
        ) : null}
      </Portal>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  page: { gap: 18 },
  quickActionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statsGridMember: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  statsGridAdmin: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  statCard: {
    flexBasis: 180,
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  statContent: { alignItems: 'center', gap: 6, paddingVertical: 18 },
  statValue: { color: '#111827', fontWeight: '800' },
  statLabel: { color: '#374151', textAlign: 'center', fontWeight: '600' },
  sectionTitle: { fontWeight: '800', color: '#111827' },
  tableCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  announcementCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  announcementContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  announcementCopy: { flex: 1 },
  announcementTitle: { fontWeight: '800', color: '#111827' },
  announcementText: { color: '#374151', marginTop: 2 },
  launcherButton: { paddingHorizontal: 12 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.22)',
    zIndex: 20,
  },
  backdropHitArea: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: -4, height: 0 },
    elevation: 10,
  },
  panelWide: { width: 320 },
  panelCompact: { width: '88%' },
  panelHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  panelTitle: { fontWeight: '800', color: '#111827' },
  panelList: { padding: 12, gap: 10 },
  panelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  panelCopy: { flex: 1 },
  panelActionTitle: { color: '#111827', fontWeight: '800' },
  panelActionNote: { color: '#374151', marginTop: 2, lineHeight: 18 },
});
