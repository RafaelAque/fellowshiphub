import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Card, DataTable, Modal, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppShell } from '@/components/app-shell';
import { useAppRole } from '@/components/app-role-context';

function formatDate(value?: string) {
  if (!value) {
    return 'Demo account';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Members() {
  const { attendanceRecords, currentUser, deleteMember, feedbackEntries, role, themeMode, users } = useAppRole();
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string; email: string } | null>(null);
  const [deletingMember, setDeletingMember] = useState(false);
  const isAdmin = role === 'admin';
  const dark = themeMode === 'dark';
  const colors = {
    card: dark ? '#111827' : '#ffffff',
    border: dark ? '#374151' : '#e5e7eb',
    text: dark ? '#f9fafb' : '#111827',
    muted: dark ? '#cbd5e1' : '#374151',
  };
  const members = useMemo(() => (
    users
      .filter((user) => user.role === 'member')
      .map((user) => {
        const memberAttendance = attendanceRecords.filter((record) => record.userId === user.id);
        const attended = memberAttendance.filter((record) => record.status === 'Present').length;
        const feedbackCount = feedbackEntries.filter((feedback) => feedback.userId === user.id).length;
        const rate = memberAttendance.length ? Math.round((attended / memberAttendance.length) * 100) : 0;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          registered: formatDate(user.registeredAt),
          attendance: `${attended} / ${memberAttendance.length}`,
          feedback: String(feedbackCount),
          rate: `${rate}%`,
        };
      })
  ), [attendanceRecords, feedbackEntries, users]);

  const registeredCount = members.filter((member) => member.registered !== 'Demo account').length;

  const confirmDeleteMember = async () => {
    if (!memberToDelete) {
      return;
    }

    setDeletingMember(true);
    const result = await deleteMember(memberToDelete.id);
    setDeletingMember(false);

    if (!result.ok) {
      Alert.alert('Member not deleted', result.message ?? 'Please try again.');
      return;
    }

    setMemberToDelete(null);
  };

  return (
    <AppShell
      activeKey="members"
      title="Members"
      subtitle="Track registered members and their participation."
    >
      {!isAdmin ? (
        <Card mode="outlined" style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content style={styles.noticeContent}>
            <MaterialCommunityIcons name="lock-outline" size={28} color={colors.text} />
            <View style={styles.noticeCopy}>
              <Text style={[styles.noticeTitle, { color: colors.text }]}>Admin access required</Text>
              <Text style={[styles.noticeText, { color: colors.muted }]}>
                {currentUser?.name ?? 'This account'} cannot view the member directory.
              </Text>
            </View>
          </Card.Content>
        </Card>
      ) : (
        <View style={styles.layout}>
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
                <MaterialCommunityIcons name="account-plus-outline" size={28} color={colors.text} />
                <Text variant="headlineSmall" style={[styles.statValue, { color: colors.text }]}>{registeredCount}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Registered accounts</Text>
              </Card.Content>
            </Card>
            <Card mode="outlined" style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="email-outline" size={28} color={colors.text} />
                <Text variant="headlineSmall" style={[styles.statValue, { color: colors.text }]}>{members.filter((member) => member.email).length}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Emails tracked</Text>
              </Card.Content>
            </Card>
          </View>

          <Card mode="outlined" style={[styles.tableCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Card.Content>
              <View style={styles.tableHeaderRow}>
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Registered Members</Text>
                <Button
                  mode="outlined"
                  textColor={colors.text}
                  icon="refresh"
                  onPress={() => Alert.alert('Members', 'Restart the app to reload the latest Supabase records.')}
                >
                  Refresh
                </Button>
              </View>

              <DataTable>
                <DataTable.Header>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Name</DataTable.Title>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Email</DataTable.Title>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Registered</DataTable.Title>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Attendance</DataTable.Title>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Feedback</DataTable.Title>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Rate</DataTable.Title>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Action</DataTable.Title>
                </DataTable.Header>
                {members.map((member) => (
                  <DataTable.Row key={member.id}>
                    <DataTable.Cell textStyle={{ color: colors.text }}>{member.name}</DataTable.Cell>
                    <DataTable.Cell textStyle={{ color: colors.text }}>{member.email}</DataTable.Cell>
                    <DataTable.Cell textStyle={{ color: colors.text }}>{member.registered}</DataTable.Cell>
                    <DataTable.Cell textStyle={{ color: colors.text }}>{member.attendance}</DataTable.Cell>
                    <DataTable.Cell textStyle={{ color: colors.text }}>{member.feedback}</DataTable.Cell>
                    <DataTable.Cell textStyle={{ color: colors.text }}>{member.rate}</DataTable.Cell>
                    <DataTable.Cell>
                      <Button
                        compact
                        mode="text"
                        icon="delete-outline"
                        textColor="#dc2626"
                        onPress={() => setMemberToDelete({ id: member.id, name: member.name, email: member.email })}
                      >
                        Delete
                      </Button>
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </Card.Content>
          </Card>

          <Portal>
            <Modal
              visible={Boolean(memberToDelete)}
              onDismiss={() => setMemberToDelete(null)}
              contentContainerStyle={styles.modalWrap}
            >
              <Card mode="outlined" style={[styles.deleteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Card.Content style={styles.deleteContent}>
                  <View style={styles.deleteIconWrap}>
                    <MaterialCommunityIcons name="account-remove-outline" size={34} color="#dc2626" />
                  </View>
                  <Text variant="titleLarge" style={[styles.deleteTitle, { color: colors.text }]}>Delete member?</Text>
                  <Text style={[styles.deleteMessage, { color: colors.muted }]}>
                    This will remove {memberToDelete?.name} ({memberToDelete?.email}) and their saved records from FellowshipHub.
                  </Text>
                  <View style={styles.deleteActions}>
                    <Button mode="outlined" textColor={colors.text} onPress={() => setMemberToDelete(null)} disabled={deletingMember}>
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      icon="delete-outline"
                      buttonColor="#dc2626"
                      textColor="#ffffff"
                      loading={deletingMember}
                      disabled={deletingMember}
                      onPress={confirmDeleteMember}
                    >
                      Delete
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </Modal>
          </Portal>
        </View>
      )}
    </AppShell>
  );
}

const styles = StyleSheet.create({
  layout: { gap: 16 },
  statsGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statCard: {
    flexBasis: 180,
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  statContent: { alignItems: 'center', gap: 6, paddingVertical: 18 },
  statValue: { color: '#111827', fontWeight: '800' },
  statLabel: { color: '#374151', textAlign: 'center', fontWeight: '600' },
  tableCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: { color: '#111827', fontWeight: '800' },
  noticeCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  noticeContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: '#111827', fontWeight: '800' },
  noticeText: { color: '#374151', marginTop: 2 },
  modalWrap: { padding: 20 },
  deleteCard: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  deleteContent: { gap: 12, alignItems: 'stretch' },
  deleteIconWrap: {
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
  },
  deleteTitle: { color: '#111827', fontWeight: '900', textAlign: 'center' },
  deleteMessage: { color: '#374151', textAlign: 'center', lineHeight: 20 },
  deleteActions: { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
});
