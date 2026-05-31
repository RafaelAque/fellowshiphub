import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, DataTable, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppShell } from '@/components/app-shell';
import { FellowshipSession, useAppRole } from '@/components/app-role-context';

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function parseSessionDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameCalendarDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()
  );
}

function getCalendarDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingEmptyDays = firstDay.getDay();
  const days = Array.from({ length: leadingEmptyDays }, () => null as Date | null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function getCalendarDayKey(day: Date | null, index: number) {
  return day ? day.toISOString() : `empty-${index}`;
}

function getSessionTimeLabel(session: FellowshipSession) {
  return `${session.time || 'Time not set'} - ${session.location || 'Location not set'}`;
}

export default function Inbox() {
  const {
    createMeetingGroup,
    currentUser,
    groupChatMessages,
    meetingGroups,
    meetingInvites,
    respondMeetingInvite,
    role,
    sessions,
    sendGroupMessage,
    themeMode,
    users,
  } = useAppRole();
  const [groupName, setGroupName] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState(sessions[0]?.id ?? '');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(null);
  const [selectedChatGroupId, setSelectedChatGroupId] = useState('');
  const [chatText, setChatText] = useState('');
  const [saving, setSaving] = useState(false);
  const dark = themeMode === 'dark';
  const colors = {
    card: dark ? '#111827' : '#ffffff',
    input: dark ? '#1f2937' : '#ffffff',
    border: dark ? '#374151' : '#e5e7eb',
    text: dark ? '#f9fafb' : '#111827',
    muted: dark ? '#cbd5e1' : '#374151',
    soft: dark ? '#1f2937' : '#f8fafc',
  };
  const inputTheme = {
    colors: {
      primary: colors.text,
      text: colors.text,
      placeholder: colors.muted,
      onSurfaceVariant: colors.muted,
    },
  };
  const inviteableSessions = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    if (role === 'admin') {
      return sessions;
    }

    return sessions.filter((session) => session.hostId === currentUser.id);
  }, [currentUser, role, sessions]);
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);
  const selectedDayMeetings = useMemo(() => {
    if (!selectedCalendarDate) {
      return [];
    }

    return inviteableSessions.filter((session) => {
      const sessionDate = parseSessionDate(session.date);
      return sessionDate ? isSameCalendarDay(sessionDate, selectedCalendarDate) : false;
    });
  }, [inviteableSessions, selectedCalendarDate]);
  const selectedSession = inviteableSessions.find((session) => session.id === selectedSessionId) ?? inviteableSessions[0];
  const members = useMemo(() => (
    users.filter((user) => user.role === 'member' && user.id !== currentUser?.id)
  ), [currentUser?.id, users]);
  const receivedInvites = useMemo(() => (
    (meetingInvites ?? []).filter((invite) => invite.recipientId === currentUser?.id)
  ), [currentUser?.id, meetingInvites]);
  const sentGroups = useMemo(() => (
    (meetingGroups ?? []).filter((group) => group.createdById === currentUser?.id)
  ), [currentUser?.id, meetingGroups]);
  const acceptedInviteGroups = useMemo(() => {
    const acceptedGroupIds = new Set(
      receivedInvites
        .filter((invite) => invite.status === 'accepted')
        .map((invite) => invite.groupId)
    );

    return (meetingGroups ?? []).filter((group) => acceptedGroupIds.has(group.id));
  }, [meetingGroups, receivedInvites]);
  const chatGroups = useMemo(() => {
    const groups = [...sentGroups, ...acceptedInviteGroups];
    const seen = new Set<string>();
    return groups.filter((group) => {
      if (seen.has(group.id)) return false;
      seen.add(group.id);
      return true;
    });
  }, [acceptedInviteGroups, sentGroups]);
  const selectedChatGroup = chatGroups.find((group) => group.id === selectedChatGroupId) ?? chatGroups[0];
  const selectedChatMessages = useMemo(() => (
    (groupChatMessages ?? [])
      .filter((message) => message.groupId === selectedChatGroup?.id)
      .sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime())
  ), [groupChatMessages, selectedChatGroup?.id]);

  useEffect(() => {
    if (!inviteableSessions.length) {
      setSelectedSessionId('');
      setSelectedCalendarDate(null);
      return;
    }

    const nextSession = inviteableSessions.find((session) => session.id === selectedSessionId) ?? inviteableSessions[0];
    const nextDate = parseSessionDate(nextSession.date);

    if (nextSession.id !== selectedSessionId) {
      setSelectedSessionId(nextSession.id);
    }

    if (nextDate && !selectedCalendarDate) {
      setSelectedCalendarDate(nextDate);
      setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    }
  }, [inviteableSessions, selectedCalendarDate, selectedSessionId]);

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((current) => (
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    ));
  };

  const submitGroup = async () => {
    setSaving(true);
    const result = await createMeetingGroup({
      name: groupName,
      sessionId: selectedSession?.id ?? '',
      memberIds: selectedMemberIds,
    });
    setSaving(false);

    if (!result.ok) {
      Alert.alert('Group not created', result.message ?? 'Please check the invite details.');
      return;
    }

    setGroupName('');
    setSelectedMemberIds([]);
    Alert.alert('Invites sent', 'The selected members will see this meeting in their inbox.');
  };

  const respond = async (inviteId: string, status: 'accepted' | 'declined') => {
    const result = await respondMeetingInvite(inviteId, status);

    if (!result.ok) {
      Alert.alert('Invite not updated', result.message ?? 'Please try again.');
    }
  };

  const sendChat = async () => {
    if (!selectedChatGroup) {
      Alert.alert('No group selected', 'Create or accept a group invite first.');
      return;
    }

    const result = await sendGroupMessage(selectedChatGroup.id, chatText);

    if (!result.ok) {
      Alert.alert('Message not sent', result.message ?? 'Please try again.');
      return;
    }

    setChatText('');
  };

  return (
    <AppShell
      activeKey="inbox"
      title="Inbox"
      subtitle="Create groups, send meeting invites, and respond to invitations."
    >
      <View style={styles.layout}>
        <Card mode="outlined" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <MaterialCommunityIcons name="account-multiple-plus-outline" size={24} color={colors.text} />
                <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Create Invite Group</Text>
              </View>
              <Text style={[styles.helpText, { color: colors.muted }]}>Choose a meeting, then invite specific members.</Text>
            </View>

            <View style={styles.inviteComposer}>
              <View style={styles.inviteDetails}>
                <TextInput
                  label="Group Name"
                  value={groupName}
                  onChangeText={setGroupName}
                  mode="outlined"
                  left={<TextInput.Icon icon="account-group-outline" />}
                  placeholder="Example: Youth Leaders"
                  style={[styles.input, { backgroundColor: colors.input }]}
                  theme={inputTheme}
                  textColor={colors.text}
                />

                <View style={[styles.selectedMeetingCard, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                  <View style={styles.selectedMeetingHeader}>
                    <MaterialCommunityIcons name="calendar-check-outline" size={22} color={colors.text} />
                    <View style={styles.selectedMeetingCopy}>
                      <Text style={[styles.selectedMeetingLabel, { color: colors.muted }]}>Selected meeting</Text>
                      <Text style={[styles.selectedMeetingTitle, { color: colors.text }]}>{selectedSession?.title ?? 'No meeting selected'}</Text>
                    </View>
                  </View>
                  <Text style={[styles.selectedMeetingMeta, { color: colors.muted }]}>
                    {selectedSession ? `${selectedSession.date} at ${getSessionTimeLabel(selectedSession)}` : 'Create a meeting first in the Meetings tab.'}
                  </Text>
                </View>
              </View>

              <View style={[styles.calendarPanel, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                <View style={styles.calendarHeader}>
                  <Button compact mode="text" textColor={colors.text} icon="chevron-left" onPress={() => setCalendarMonth((current) => shiftMonth(current, -1))}>
                    Prev
                  </Button>
                  <Text style={[styles.calendarTitle, { color: colors.text }]}>{formatMonthTitle(calendarMonth)}</Text>
                  <Button compact mode="text" textColor={colors.text} contentStyle={styles.nextMonthButton} onPress={() => setCalendarMonth((current) => shiftMonth(current, 1))}>
                    Next
                  </Button>
                </View>

                <View style={styles.weekdayGrid}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
                    <Text key={weekday} style={[styles.weekdayText, { color: colors.muted }]}>{weekday}</Text>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {calendarDays.map((day, index) => {
                    const dayMeetings = day ? inviteableSessions.filter((session) => {
                      const sessionDate = parseSessionDate(session.date);
                      return sessionDate ? isSameCalendarDay(sessionDate, day) : false;
                    }) : [];
                    const selected = Boolean(day && selectedCalendarDate && isSameCalendarDay(day, selectedCalendarDate));
                    const hasMeeting = dayMeetings.length > 0;

                    return (
                      <Button
                        key={getCalendarDayKey(day, index)}
                        mode={selected ? 'contained' : 'text'}
                        compact
                        disabled={!day}
                        textColor={selected ? '#ffffff' : colors.text}
                        buttonColor={selected ? '#111827' : undefined}
                        style={[styles.dayButton, hasMeeting && !selected ? { borderColor: colors.border } : null]}
                        contentStyle={styles.dayButtonContent}
                        onPress={() => {
                          if (!day) return;
                          setSelectedCalendarDate(day);
                          if (dayMeetings[0]) {
                            setSelectedSessionId(dayMeetings[0].id);
                          }
                        }}
                      >
                        {day ? `${day.getDate()}${hasMeeting ? ' *' : ''}` : ' '}
                      </Button>
                    );
                  })}
                </View>

                <View style={styles.dayMeetingList}>
                  <Text style={[styles.dayMeetingLabel, { color: colors.muted }]}>Meetings on selected day</Text>
                  {selectedDayMeetings.length ? selectedDayMeetings.map((session) => {
                    const active = session.id === selectedSession?.id;

                    return (
                      <Button
                        key={session.id}
                        mode={active ? 'contained' : 'outlined'}
                        textColor={active ? '#ffffff' : colors.text}
                        buttonColor={active ? '#111827' : undefined}
                        icon={active ? 'check-circle-outline' : 'calendar-outline'}
                        onPress={() => setSelectedSessionId(session.id)}
                        style={styles.meetingChoice}
                        contentStyle={styles.meetingChoiceContent}
                      >
                        {`${session.title} - ${session.time}`}
                      </Button>
                    );
                  }) : (
                    <Text style={[styles.emptyText, { color: colors.muted }]}>No meetings on this day.</Text>
                  )}
                </View>
              </View>
            </View>

            <Text style={[styles.memberLabel, { color: colors.text }]}>Members to invite</Text>
            <View style={styles.memberChips}>
              {members.length ? members.map((member) => {
                const selected = selectedMemberIds.includes(member.id);
                return (
                  <Chip
                    key={member.id}
                    selected={selected}
                    mode={selected ? 'flat' : 'outlined'}
                    icon={selected ? 'check' : 'account-outline'}
                    onPress={() => toggleMember(member.id)}
                    style={[styles.memberChip, selected ? styles.selectedChip : { backgroundColor: colors.soft }]}
                    textStyle={{ color: selected ? '#ffffff' : colors.text, fontWeight: '700' }}
                  >
                    {member.name}
                  </Chip>
                );
              }) : (
                <Text style={[styles.emptyText, { color: colors.muted }]}>No other members are registered yet.</Text>
              )}
            </View>

            <View style={styles.actions}>
              <Button mode="outlined" textColor={colors.text} onPress={() => setSelectedMemberIds([])}>
                Clear
              </Button>
              <Button mode="contained" textColor="#ffffff" icon="send" loading={saving} disabled={saving} style={styles.primaryButton} onPress={submitGroup}>
                Send Invites
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="inbox-outline" size={24} color={colors.text} />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Received Invites</Text>
            </View>
            {receivedInvites.length ? (
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Meeting</DataTable.Title>
                  <DataTable.Title textStyle={{ color: colors.muted }}>From</DataTable.Title>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Status</DataTable.Title>
                  <DataTable.Title textStyle={{ color: colors.muted }}>Action</DataTable.Title>
                </DataTable.Header>
                {receivedInvites.map((invite) => (
                  <DataTable.Row key={invite.id}>
                    <DataTable.Cell textStyle={{ color: colors.text }}>{invite.sessionTitle}</DataTable.Cell>
                    <DataTable.Cell textStyle={{ color: colors.text }}>{invite.senderName}</DataTable.Cell>
                    <DataTable.Cell textStyle={{ color: colors.text }}>{titleCase(invite.status)}</DataTable.Cell>
                    <DataTable.Cell>
                      {invite.status === 'pending' ? (
                        <View style={styles.inviteActions}>
                          <Button compact mode="contained" buttonColor="#15803d" textColor="#ffffff" onPress={() => respond(invite.id, 'accepted')}>
                            Accept
                          </Button>
                          <Button compact mode="text" textColor="#dc2626" onPress={() => respond(invite.id, 'declined')}>
                            Decline
                          </Button>
                        </View>
                      ) : (
                        <Text style={{ color: colors.muted }}>{formatDateTime(invite.createdAt)}</Text>
                      )}
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            ) : (
              <Text style={[styles.emptyBox, { color: colors.muted, borderColor: colors.border, backgroundColor: colors.soft }]}>No meeting invites yet.</Text>
            )}
          </Card.Content>
        </Card>

        <Card mode="outlined" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="message-text-outline" size={24} color={colors.text} />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Group Chat</Text>
            </View>
            <Text style={[styles.helpText, { color: colors.muted }]}>Chat with members in groups you created or accepted.</Text>

            {chatGroups.length ? (
              <View style={styles.chatShell}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chatTabs}>
                  {chatGroups.map((group) => {
                    const active = group.id === selectedChatGroup?.id;
                    return (
                      <Chip
                        key={group.id}
                        selected={active}
                        mode={active ? 'flat' : 'outlined'}
                        icon={active ? 'message' : 'account-group-outline'}
                        onPress={() => setSelectedChatGroupId(group.id)}
                        style={[styles.chatTab, active ? styles.selectedChip : { backgroundColor: colors.soft }]}
                        textStyle={{ color: active ? '#ffffff' : colors.text, fontWeight: '800' }}
                      >
                        {group.name}
                      </Chip>
                    );
                  })}
                </ScrollView>

                <View style={[styles.chatPanel, { borderColor: colors.border, backgroundColor: colors.soft }]}>
                  <View style={styles.chatHeader}>
                    <View>
                      <Text style={[styles.chatTitle, { color: colors.text }]}>{selectedChatGroup?.name}</Text>
                      <Text style={[styles.chatSubtitle, { color: colors.muted }]}>{selectedChatGroup?.sessionTitle}</Text>
                    </View>
                    <Text style={[styles.chatCount, { color: colors.muted }]}>
                      {(selectedChatGroup?.memberIds.length ?? 0) + 1} members
                    </Text>
                  </View>

                  <ScrollView style={styles.chatMessages} contentContainerStyle={styles.chatMessageContent}>
                    {selectedChatMessages.length ? selectedChatMessages.map((message) => {
                      const mine = message.senderId === currentUser?.id;
                      return (
                        <View key={message.id} style={[styles.messageRow, mine ? styles.myMessageRow : styles.theirMessageRow]}>
                          <View style={[styles.messageBubble, mine ? styles.myBubble : { backgroundColor: colors.card, borderColor: colors.border }]}>
                            {!mine ? <Text style={[styles.messageAuthor, { color: colors.muted }]}>{message.senderName}</Text> : null}
                            <Text style={[styles.messageText, { color: mine ? '#ffffff' : colors.text }]}>{message.text}</Text>
                            <Text style={[styles.messageTime, { color: mine ? '#e5e7eb' : colors.muted }]}>{formatDateTime(message.createdAt)}</Text>
                          </View>
                        </View>
                      );
                    }) : (
                      <Text style={[styles.emptyBox, { color: colors.muted, borderColor: colors.border, backgroundColor: colors.card }]}>No messages yet. Start the group conversation.</Text>
                    )}
                  </ScrollView>

                  <View style={styles.chatComposer}>
                    <TextInput
                      label="Message"
                      value={chatText}
                      onChangeText={setChatText}
                      mode="outlined"
                      dense
                      multiline
                      style={[styles.chatInput, { backgroundColor: colors.input }]}
                      theme={inputTheme}
                      textColor={colors.text}
                    />
                    <Button mode="contained" textColor="#ffffff" icon="send" style={styles.sendButton} onPress={sendChat}>
                      Send
                    </Button>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={[styles.emptyBox, { color: colors.muted, borderColor: colors.border, backgroundColor: colors.soft }]}>Create a group or accept an invite to start chatting.</Text>
            )}
          </Card.Content>
        </Card>

        <Card mode="outlined" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content>
            <View style={styles.sectionTitleRow}>
              <MaterialCommunityIcons name="send-check-outline" size={24} color={colors.text} />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Groups You Created</Text>
            </View>
            {sentGroups.length ? (
              <ScrollView horizontal>
                <DataTable style={styles.sentTable}>
                  <DataTable.Header>
                    <DataTable.Title textStyle={{ color: colors.muted }}>Group</DataTable.Title>
                    <DataTable.Title textStyle={{ color: colors.muted }}>Meeting</DataTable.Title>
                    <DataTable.Title numeric textStyle={{ color: colors.muted }}>Invited</DataTable.Title>
                    <DataTable.Title textStyle={{ color: colors.muted }}>Created</DataTable.Title>
                  </DataTable.Header>
                  {sentGroups.map((group) => (
                    <DataTable.Row key={group.id}>
                      <DataTable.Cell textStyle={{ color: colors.text }}>{group.name}</DataTable.Cell>
                      <DataTable.Cell textStyle={{ color: colors.text }}>{group.sessionTitle}</DataTable.Cell>
                      <DataTable.Cell numeric textStyle={{ color: colors.text }}>{group.memberIds.length}</DataTable.Cell>
                      <DataTable.Cell textStyle={{ color: colors.text }}>{formatDateTime(group.createdAt)}</DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              </ScrollView>
            ) : (
              <Text style={[styles.emptyBox, { color: colors.muted, borderColor: colors.border, backgroundColor: colors.soft }]}>Groups you create will appear here.</Text>
            )}
          </Card.Content>
        </Card>
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  layout: { gap: 16 },
  card: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  sectionHeader: { gap: 2, marginBottom: 14 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  sectionTitle: { color: '#111827', fontWeight: '900' },
  helpText: { color: '#374151' },
  inviteComposer: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' },
  inviteDetails: { flexBasis: 320, flexGrow: 1, gap: 12 },
  input: { backgroundColor: '#ffffff' },
  selectedMeetingCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  selectedMeetingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedMeetingCopy: { flex: 1 },
  selectedMeetingLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  selectedMeetingTitle: { fontSize: 20, fontWeight: '900', marginTop: 2 },
  selectedMeetingMeta: { lineHeight: 20 },
  calendarPanel: {
    flexBasis: 360,
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  calendarTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  nextMonthButton: { flexDirection: 'row-reverse' },
  weekdayGrid: { flexDirection: 'row' },
  weekdayText: {
    width: `${100 / 7}%`,
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayButton: {
    width: `${100 / 7}%`,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    marginVertical: 2,
  },
  dayButtonContent: { minHeight: 34, paddingHorizontal: 0 },
  dayMeetingList: { gap: 8, paddingTop: 4 },
  dayMeetingLabel: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  meetingChoice: { borderRadius: 10, alignSelf: 'stretch' },
  meetingChoiceContent: { minHeight: 42, justifyContent: 'flex-start' },
  memberLabel: { color: '#111827', fontWeight: '900', marginTop: 18, marginBottom: 8 },
  memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: { borderRadius: 999 },
  selectedChip: { backgroundColor: '#111827' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10, marginTop: 18 },
  primaryButton: { backgroundColor: '#111827' },
  emptyText: { color: '#374151' },
  emptyBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    lineHeight: 20,
  },
  inviteActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chatShell: { gap: 12, marginTop: 12 },
  chatTabs: { gap: 8, paddingVertical: 2 },
  chatTab: { borderRadius: 999 },
  chatPanel: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  chatTitle: { color: '#111827', fontWeight: '900', fontSize: 16 },
  chatSubtitle: { color: '#374151', marginTop: 2 },
  chatCount: { color: '#374151', fontWeight: '800' },
  chatMessages: { maxHeight: 320 },
  chatMessageContent: { gap: 8, paddingVertical: 4 },
  messageRow: { flexDirection: 'row' },
  myMessageRow: { justifyContent: 'flex-end' },
  theirMessageRow: { justifyContent: 'flex-start' },
  messageBubble: {
    maxWidth: '78%',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  myBubble: { backgroundColor: '#111827', borderColor: '#111827' },
  messageAuthor: { color: '#374151', fontSize: 12, fontWeight: '900' },
  messageText: { color: '#111827', lineHeight: 20 },
  messageTime: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  chatComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  chatInput: { flex: 1, minHeight: 46 },
  sendButton: { backgroundColor: '#111827', marginBottom: 2 },
  sentTable: { minWidth: 760 },
});
