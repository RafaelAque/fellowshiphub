import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { Badge, Button, Card, Chip, DataTable, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppShell } from '@/components/app-shell';
import { Announcement, AnnouncementPriority, useAppRole } from '@/components/app-role-context';
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
  const {
    announcements,
    attendanceRecords,
    createAnnouncement,
    currentUser,
    deleteAnnouncement,
    feedbackEntries,
    role,
    sessions,
    themeMode,
    updateAnnouncement,
    users,
  } = useAppRole();
  const { width } = useWindowDimensions();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [announcementFilter, setAnnouncementFilter] = useState<'All' | 'Pinned' | 'Important' | 'Recent'>('All');
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [announcementDetail, setAnnouncementDetail] = useState<Announcement | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('Normal');
  const [formPinned, setFormPinned] = useState(false);
  const [luceHidden, setLuceHidden] = useState(false);
  const [luceOpen, setLuceOpen] = useState(false);
  const [verseIndex, setVerseIndex] = useState(0);
  const panelTranslate = useRef(new Animated.Value(360)).current;
  const luceFloat = useRef(new Animated.Value(0)).current;
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
  const visibleAnnouncements = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const query = announcementSearch.trim().toLowerCase();

    return (announcements ?? [])
      .filter((announcement) => !announcement.archived || isAdmin)
      .filter((announcement) => {
        if (announcementFilter === 'Pinned') return announcement.pinned;
        if (announcementFilter === 'Important') return announcement.priority !== 'Normal';
        if (announcementFilter === 'Recent') return new Date(announcement.createdAt).getTime() >= sevenDaysAgo;
        return true;
      })
      .filter((announcement) => (
        !query ||
        announcement.title.toLowerCase().includes(query) ||
        announcement.content.toLowerCase().includes(query) ||
        announcement.createdByName.toLowerCase().includes(query)
      ))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [announcementFilter, announcementSearch, announcements, isAdmin]);
  const recentAnnouncementCount = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return (announcements ?? []).filter((announcement) => !announcement.archived && new Date(announcement.createdAt).getTime() >= sevenDaysAgo).length;
  }, [announcements]);

  useEffect(() => {
    Animated.timing(panelTranslate, {
      toValue: actionsOpen ? 0 : 360,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [actionsOpen, panelTranslate]);
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(luceFloat, {
          toValue: -8,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(luceFloat, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [luceFloat]);

  const openAnnouncementForm = (announcement?: Announcement) => {
    setEditingAnnouncement(announcement ?? null);
    setFormTitle(announcement?.title ?? '');
    setFormContent(announcement?.content ?? '');
    setFormPriority(announcement?.priority ?? 'Normal');
    setFormPinned(Boolean(announcement?.pinned));
    setAnnouncementDialogOpen(true);
  };

  const saveAnnouncement = async () => {
    const result = editingAnnouncement
      ? await updateAnnouncement(editingAnnouncement.id, {
          title: formTitle,
          content: formContent,
          priority: formPriority,
          pinned: formPinned,
          archived: editingAnnouncement.archived,
        })
      : await createAnnouncement({
          title: formTitle,
          content: formContent,
          priority: formPriority,
          pinned: formPinned,
        });

    if (!result.ok) {
      Alert.alert('Announcement', result.message ?? 'Unable to save announcement.');
      return;
    }

    setAnnouncementDialogOpen(false);
    setEditingAnnouncement(null);
  };

  const archiveAnnouncement = async (announcement: Announcement) => {
    const result = await updateAnnouncement(announcement.id, {
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      pinned: announcement.pinned,
      archived: !announcement.archived,
    });

    if (!result.ok) {
      Alert.alert('Announcement', result.message ?? 'Unable to update announcement.');
    }
  };

  const confirmDeleteAnnouncement = (announcement: Announcement) => {
    Alert.alert(
      'Delete announcement?',
      `Delete "${announcement.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteAnnouncement(announcement.id);
            if (!result.ok) {
              Alert.alert('Announcement', result.message ?? 'Unable to delete announcement.');
            }
          },
        },
      ]
    );
  };

  const nextVerse = () => {
    setVerseIndex((current) => {
      if (BIBLE_VERSES.length <= 1) return current;
      let next = Math.floor(Math.random() * BIBLE_VERSES.length);
      while (next === current) {
        next = Math.floor(Math.random() * BIBLE_VERSES.length);
      }
      return next;
    });
  };

  const openLuce = () => {
    nextVerse();
    setLuceOpen(true);
  };

  const copyVerse = () => {
    const verse = BIBLE_VERSES[verseIndex];
    const text = `${verse.text}\n- ${verse.reference}`;

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }

    Alert.alert('Copied', 'Verse copied for sharing.');
  };

  const renderAnnouncements = () => (
    <Card mode="outlined" style={[styles.announcementsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Card.Content style={styles.announcementsContent}>
        <View style={styles.announcementsHeader}>
          <View style={styles.announcementsTitleWrap}>
            <View style={styles.announcementsTitleRow}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: colors.text }]}>Announcements</Text>
              {recentAnnouncementCount ? <Badge style={styles.announcementBadge}>{recentAnnouncementCount}</Badge> : null}
            </View>
            <Text style={[styles.announcementsSubtitle, { color: colors.muted }]}>
              Church updates, reminders, and important messages.
            </Text>
          </View>
          {isAdmin ? (
            <Button mode="contained" icon="plus" onPress={() => openAnnouncementForm()}>
              New
            </Button>
          ) : null}
        </View>

        <TextInput
          mode="outlined"
          label="Search announcements"
          value={announcementSearch}
          onChangeText={setAnnouncementSearch}
          left={<TextInput.Icon icon="magnify" />}
          style={styles.announcementSearch}
        />

        <View style={styles.filterRow}>
          {(['All', 'Pinned', 'Important', 'Recent'] as const).map((filter) => (
            <Chip
              key={filter}
              selected={announcementFilter === filter}
              onPress={() => setAnnouncementFilter(filter)}
              style={styles.filterChip}
            >
              {filter}
            </Chip>
          ))}
        </View>

        <View style={styles.announcementList}>
          {visibleAnnouncements.length ? visibleAnnouncements.map((announcement) => (
            <Card
              key={announcement.id}
              mode="outlined"
              style={[styles.announcementItem, { backgroundColor: colors.panelItem, borderColor: colors.border }]}
            >
              <Card.Content style={styles.announcementItemContent}>
                <View style={styles.announcementItemTop}>
                  <View style={styles.announcementItemTitleWrap}>
                    <View style={styles.announcementItemTitleRow}>
                      {announcement.pinned ? <MaterialCommunityIcons name="pin" size={16} color={colors.text} /> : null}
                      <Text style={[styles.announcementItemTitle, { color: colors.text }]}>{announcement.title}</Text>
                    </View>
                    <Text style={[styles.announcementMeta, { color: colors.muted }]}>
                      {announcement.createdByName} - {formatDashboardDate(announcement.createdAt)}
                    </Text>
                  </View>
                  <Chip compact style={priorityChipStyle(announcement.priority)} textStyle={styles.priorityText}>
                    {announcement.priority}
                  </Chip>
                </View>
                <Text style={[styles.announcementBody, { color: colors.muted }]} numberOfLines={3}>
                  {announcement.content}
                </Text>
                <View style={styles.announcementActions}>
                  <Button mode="text" icon="book-open-page-variant" textColor={colors.text} onPress={() => setAnnouncementDetail(announcement)}>
                    Read More
                  </Button>
                  {isAdmin ? (
                    <>
                      <Button mode="text" icon="pencil" textColor={colors.text} onPress={() => openAnnouncementForm(announcement)}>Edit</Button>
                      <Button mode="text" icon={announcement.archived ? 'archive-arrow-up' : 'archive'} textColor={colors.muted} onPress={() => archiveAnnouncement(announcement)}>
                        {announcement.archived ? 'Restore' : 'Archive'}
                      </Button>
                      <Button mode="text" icon="delete" textColor="#dc2626" onPress={() => confirmDeleteAnnouncement(announcement)}>Delete</Button>
                    </>
                  ) : null}
                </View>
              </Card.Content>
            </Card>
          )) : (
            <View style={[styles.emptyAnnouncements, { borderColor: colors.border }]}>
              <MaterialCommunityIcons name="bullhorn-outline" size={30} color={colors.muted} />
              <Text style={[styles.emptyAnnouncementText, { color: colors.muted }]}>No announcements match this view.</Text>
            </View>
          )}
        </View>
      </Card.Content>
    </Card>
  );

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

            {renderAnnouncements()}

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

            {renderAnnouncements()}
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
        <Dialog visible={announcementDialogOpen} onDismiss={() => setAnnouncementDialogOpen(false)} style={{ backgroundColor: colors.card }}>
          <Dialog.Title style={{ color: colors.text }}>{editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <TextInput mode="outlined" label="Title" value={formTitle} onChangeText={setFormTitle} />
            <TextInput
              mode="outlined"
              label="Message"
              value={formContent}
              onChangeText={setFormContent}
              multiline
              style={styles.announcementMessageInput}
            />
            <View style={styles.filterRow}>
              {(['Normal', 'Important', 'Urgent'] as const).map((priority) => (
                <Chip key={priority} selected={formPriority === priority} onPress={() => setFormPriority(priority)}>
                  {priority}
                </Chip>
              ))}
            </View>
            <Chip
              selected={formPinned}
              icon={formPinned ? 'pin' : 'pin-outline'}
              onPress={() => setFormPinned((current) => !current)}
              style={styles.pinnedToggle}
            >
              {formPinned ? 'Pinned to top' : 'Pin announcement'}
            </Chip>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAnnouncementDialogOpen(false)}>Cancel</Button>
            <Button mode="contained" onPress={saveAnnouncement}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={Boolean(announcementDetail)} onDismiss={() => setAnnouncementDetail(null)} style={{ backgroundColor: colors.card }}>
          <Dialog.Title style={{ color: colors.text }}>{announcementDetail?.title}</Dialog.Title>
          <Dialog.Content>
            {announcementDetail ? (
              <>
                <Text style={[styles.announcementMeta, { color: colors.muted }]}>
                  {announcementDetail.createdByName} - {formatDashboardDate(announcementDetail.createdAt)}
                </Text>
                <Text style={[styles.detailContent, { color: colors.text }]}>{announcementDetail.content}</Text>
              </>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAnnouncementDetail(null)}>Close</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={luceOpen} onDismiss={() => setLuceOpen(false)} style={{ backgroundColor: colors.card }}>
          <Dialog.Title style={{ color: colors.text }}>Speak to Luce</Dialog.Title>
          <Dialog.Content>
            <Text style={[styles.luceVerse, { color: colors.text }]}>{BIBLE_VERSES[verseIndex].text}</Text>
            <Text style={[styles.luceReference, { color: colors.muted }]}>- {BIBLE_VERSES[verseIndex].reference}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLuceHidden(true)}>Hide Luce</Button>
            <Button icon="content-copy" onPress={copyVerse}>Copy Verse</Button>
            <Button mode="contained" onPress={nextVerse}>Next Verse</Button>
          </Dialog.Actions>
        </Dialog>

        {!luceHidden ? (
          <Animated.View style={[styles.luceWrap, { transform: [{ translateY: luceFloat }] }]}>
            <Pressable style={[styles.luceBubble, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={openLuce}>
              <View style={styles.sheepBody}>
                <View style={[styles.woolPuff, styles.woolTopLeft]} />
                <View style={[styles.woolPuff, styles.woolTop]} />
                <View style={[styles.woolPuff, styles.woolTopRight]} />
                <View style={[styles.woolPuff, styles.woolLeft]} />
                <View style={[styles.woolPuff, styles.woolRight]} />
                <View style={styles.sheepEarLeft} />
                <View style={styles.sheepEarRight} />
                <View style={styles.sheepFace}>
                  <View style={styles.sheepEyeRow}>
                    <View style={styles.sheepEye} />
                    <View style={styles.sheepEye} />
                  </View>
                  <Text style={styles.sheepMouth}>u</Text>
                </View>
                <View style={styles.sheepLegRow}>
                  <View style={styles.sheepLeg} />
                  <View style={styles.sheepLeg} />
                </View>
              </View>
              <Text style={[styles.luceName, { color: colors.text }]}>Luce</Text>
            </Pressable>
            <Pressable style={styles.luceClose} onPress={() => setLuceHidden(true)}>
              <MaterialCommunityIcons name="close" size={14} color="#ffffff" />
            </Pressable>
          </Animated.View>
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
    flexBasis: 150,
    flexGrow: 1,
    minWidth: 0,
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  statContent: { alignItems: 'center', gap: 6, paddingVertical: 18 },
  statValue: { color: '#111827', fontWeight: '800' },
  statLabel: { color: '#374151', textAlign: 'center', fontWeight: '600' },
  sectionTitle: { fontWeight: '800', color: '#111827' },
  tableCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  announcementsCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  announcementsContent: { gap: 14 },
  announcementsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 },
  announcementsTitleWrap: { flex: 1, minWidth: 220 },
  announcementsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  announcementBadge: { backgroundColor: '#111827', color: '#ffffff' },
  announcementsSubtitle: { marginTop: 2 },
  announcementSearch: { backgroundColor: 'transparent' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { marginRight: 0 },
  announcementList: { gap: 10 },
  announcementItem: { borderRadius: 8 },
  announcementItemContent: { gap: 10 },
  announcementItemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  announcementItemTitleWrap: { flex: 1, minWidth: 0 },
  announcementItemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  announcementItemTitle: { fontWeight: '900', fontSize: 16 },
  announcementMeta: { fontSize: 12, fontWeight: '600' },
  announcementBody: { lineHeight: 20 },
  announcementActions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  priorityText: { fontSize: 11, fontWeight: '800' },
  emptyAnnouncements: { borderWidth: 1, borderRadius: 8, padding: 18, alignItems: 'center', gap: 8 },
  emptyAnnouncementText: { textAlign: 'center' },
  dialogContent: { gap: 12 },
  announcementMessageInput: { minHeight: 120 },
  pinnedToggle: { alignSelf: 'flex-start' },
  detailContent: { marginTop: 14, lineHeight: 22 },
  luceVerse: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  luceReference: { marginTop: 10, fontWeight: '800' },
  luceWrap: { position: 'absolute', right: 18, bottom: 18, zIndex: 40 },
  luceBubble: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  sheepBody: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
  woolPuff: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e5e7eb' },
  woolTopLeft: { top: 3, left: 8 },
  woolTop: { top: 0, left: 20 },
  woolTopRight: { top: 3, right: 8 },
  woolLeft: { top: 17, left: 4 },
  woolRight: { top: 17, right: 4 },
  sheepEarLeft: { position: 'absolute', width: 14, height: 20, borderRadius: 8, backgroundColor: '#d1d5db', left: 8, top: 22, transform: [{ rotate: '-18deg' }] },
  sheepEarRight: { position: 'absolute', width: 14, height: 20, borderRadius: 8, backgroundColor: '#d1d5db', right: 8, top: 22, transform: [{ rotate: '18deg' }] },
  sheepFace: { width: 38, height: 42, borderRadius: 20, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  sheepEyeRow: { flexDirection: 'row', gap: 8, marginBottom: 3 },
  sheepEye: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#ffffff' },
  sheepMouth: { color: '#ffffff', fontWeight: '900', lineHeight: 14 },
  sheepLegRow: { position: 'absolute', bottom: 0, flexDirection: 'row', gap: 16 },
  sheepLeg: { width: 7, height: 10, borderRadius: 4, backgroundColor: '#111827' },
  luceName: { marginTop: 5, fontWeight: '900', fontSize: 12 },
  luceClose: { position: 'absolute', right: -6, top: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
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

function priorityChipStyle(priority: AnnouncementPriority) {
  if (priority === 'Urgent') {
    return { backgroundColor: '#fee2e2' };
  }

  if (priority === 'Important') {
    return { backgroundColor: '#fef3c7' };
  }

  return { backgroundColor: '#e5e7eb' };
}

function formatDashboardDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const BIBLE_VERSES = [
  {
    reference: 'Jeremiah 29:11',
    text: '"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."',
  },
  {
    reference: 'Psalm 23:1',
    text: 'The Lord is my shepherd, I lack nothing.',
  },
  {
    reference: 'Isaiah 41:10',
    text: 'So do not fear, for I am with you; do not be dismayed, for I am your God.',
  },
  {
    reference: 'Matthew 11:28',
    text: 'Come to me, all you who are weary and burdened, and I will give you rest.',
  },
  {
    reference: 'Philippians 4:13',
    text: 'I can do all this through him who gives me strength.',
  },
  {
    reference: 'Proverbs 3:5',
    text: 'Trust in the Lord with all your heart and lean not on your own understanding.',
  },
  {
    reference: 'Romans 8:28',
    text: 'And we know that in all things God works for the good of those who love him.',
  },
  {
    reference: '1 Corinthians 16:14',
    text: 'Do everything in love.',
  },
  {
    reference: 'Psalm 46:1',
    text: 'God is our refuge and strength, an ever-present help in trouble.',
  },
  {
    reference: 'John 14:27',
    text: 'Peace I leave with you; my peace I give you.',
  },
] as const;
