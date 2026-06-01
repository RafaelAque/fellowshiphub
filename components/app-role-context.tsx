import * as FileSystem from 'expo-file-system/legacy';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type AppRole = 'member' | 'admin';
export type AttendanceStatus = 'Present' | 'Absent';
export type ThemeMode = 'light' | 'dark';

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  initials: string;
  registeredAt?: string;
  password?: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  twoFactorEnabled?: boolean;
  twoFactorCode?: string;
};

export type FellowshipSession = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  status: 'open' | 'upcoming' | 'completed';
  hostId?: string;
  hostName?: string;
};

export type MeetingGroup = {
  id: string;
  name: string;
  sessionId: string;
  sessionTitle: string;
  createdById: string;
  createdByName: string;
  memberIds: string[];
  createdAt: string;
};

export type MeetingInvite = {
  id: string;
  groupId: string;
  sessionId: string;
  sessionTitle: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  recipientName: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
};

export type GroupChatMessage = {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
};

export type MeetingLog = {
  id: string;
  sessionId: string;
  sessionTitle: string;
  startedById: string;
  startedByName: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes?: number;
  participantIds: string[];
  participantNames: string[];
  status: 'live' | 'closed';
};

export type AttendanceRecord = {
  id: string;
  userId: string;
  userName: string;
  sessionId: string;
  session: string;
  date: string;
  status: AttendanceStatus;
  notes: string;
  checkedInAt?: string;
};

export type FeedbackEntry = {
  id: string;
  userId: string;
  userName: string;
  sessionId: string;
  session: string;
  date: string;
  rating: number;
  learned: string;
  suggestions: string;
  submittedAt: string;
};

export type ChatMessage = {
  id: string;
  userId: string;
  author: 'ai' | 'user';
  text: string;
  createdAt: string;
};

export type SummaryType = 'brief' | 'detailed' | 'scripture' | 'action';

export type SessionSummary = {
  id: string;
  sessionId: string;
  session: string;
  userId: string;
  userName: string;
  type: SummaryType;
  transcript: string;
  summary: string;
  scriptures: string[];
  createdAt: string;
};

type DemoData = {
  users: DemoUser[];
  sessions: FellowshipSession[];
  attendanceRecords: AttendanceRecord[];
  feedbackEntries: FeedbackEntry[];
  chatMessages: ChatMessage[];
  sessionSummaries: SessionSummary[];
  meetingGroups: MeetingGroup[];
  meetingInvites: MeetingInvite[];
  groupChatMessages: GroupChatMessage[];
  meetingLogs: MeetingLog[];
};

type PersistedState = {
  sessionUserId: string | null;
  themeMode?: ThemeMode;
  data: DemoData;
};

type CheckInResult = {
  ok: boolean;
  duplicate?: boolean;
  message: string;
};

type CheckInSessionSnapshot = {
  title: string;
  date: string;
  time?: string;
  location?: string;
};

type AppRoleContextValue = {
  loading: boolean;
  role: AppRole;
  currentUser: DemoUser | null;
  users: DemoUser[];
  sessions: FellowshipSession[];
  attendanceRecords: AttendanceRecord[];
  feedbackEntries: FeedbackEntry[];
  chatMessages: ChatMessage[];
  sessionSummaries: SessionSummary[];
  meetingGroups: MeetingGroup[];
  meetingInvites: MeetingInvite[];
  groupChatMessages: GroupChatMessage[];
  meetingLogs: MeetingLog[];
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleThemeMode: () => void;
  login: (identifier: string, password: string, role: AppRole, displayName?: string, twoFactorCode?: string) => Promise<{ ok: boolean; message?: string; requiresTwoFactor?: boolean }>;
  signInWithGoogle: (role: AppRole) => Promise<{ ok: boolean; message?: string }>;
  register: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; message?: string; method?: 'email' | 'code' }>;
  resetPassword: (email: string, nextPassword: string) => Promise<{ ok: boolean; message?: string }>;
  updateProfile: (input: { name: string; phone?: string; birthDate?: string; address?: string }) => Promise<{ ok: boolean; message?: string }>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<{ ok: boolean; message?: string }>;
  enableTwoFactor: (code: string) => Promise<{ ok: boolean; message?: string }>;
  disableTwoFactor: () => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
  setRole: (role: AppRole) => void;
  checkIn: (sessionId: string, snapshot?: CheckInSessionSnapshot) => Promise<CheckInResult>;
  createSession: (input: Omit<FellowshipSession, 'id'>) => Promise<{ ok: boolean; message?: string }>;
  deleteSession: (sessionId: string) => Promise<{ ok: boolean; message?: string }>;
  deleteMember: (memberId: string) => Promise<{ ok: boolean; message?: string }>;
  submitFeedback: (input: Omit<FeedbackEntry, 'id' | 'userId' | 'userName' | 'submittedAt'>) => Promise<void>;
  deleteFeedback: (feedbackId: string) => Promise<{ ok: boolean; message?: string }>;
  sendAiMessage: (text: string) => Promise<void>;
  saveSessionSummary: (input: Omit<SessionSummary, 'id' | 'userId' | 'userName' | 'createdAt'>) => Promise<void>;
  deleteSessionSummary: (summaryId: string) => Promise<{ ok: boolean; message?: string }>;
  createMeetingGroup: (input: { name: string; sessionId: string; memberIds: string[] }) => Promise<{ ok: boolean; message?: string }>;
  respondMeetingInvite: (inviteId: string, status: MeetingInvite['status']) => Promise<{ ok: boolean; message?: string }>;
  sendGroupMessage: (groupId: string, text: string) => Promise<{ ok: boolean; message?: string }>;
  startMeeting: (sessionId: string) => Promise<{ ok: boolean; message?: string }>;
  joinMeeting: (sessionId: string) => Promise<{ ok: boolean; message?: string }>;
  closeMeeting: (sessionId: string) => Promise<{ ok: boolean; message?: string }>;
};

const STORE_KEY = 'fellowshiphub-store-v3';
const LEGACY_STORE_KEY = 'fellowshiphub-demo-store-v2';
const GOOGLE_ROLE_KEY = 'fellowshiphub-google-role';
const STORE_FILE = `${FileSystem.documentDirectory ?? ''}fellowshiphub-store.json`;
const LEGACY_STORE_FILE = `${FileSystem.documentDirectory ?? ''}fellowshiphub-demo-store.json`;
const REMOVED_SAMPLE_USER_IDS = ['member-john', 'admin-main', 'member-mary', 'member-paul'];
const REMOVED_SAMPLE_USER_EMAILS = [
  'john@fellowshiphub.app',
  'admin@fellowshiphub.app',
  'mary@fellowshiphub.app',
  'paul@fellowshiphub.app',
];

const seedData: DemoData = {
  users: [
    {
      id: 'admin-albinaurics',
      name: 'Albinaurics Admin',
      email: 'albinaurics@gmail.com',
      role: 'admin',
      initials: 'AA',
      password: 'euqaleafar',
      registeredAt: '2026-05-13T00:00:00.000Z',
    },
  ],
  sessions: [
    { id: 'session-youth-current', title: 'Youth Fellowship', date: 'May 12, 2026', time: '6:00 PM', location: 'Main Hall', status: 'open' },
    { id: 'session-bible-next', title: 'Bible Study', date: 'May 15, 2026', time: '7:00 PM', location: 'Room 204', status: 'upcoming' },
    { id: 'session-youth-may5', title: 'Youth Fellowship', date: 'May 5, 2024', time: '6:00 PM', location: 'Main Hall', status: 'completed' },
    { id: 'session-bible-may1', title: 'Bible Study', date: 'May 1, 2024', time: '7:00 PM', location: 'Room 204', status: 'completed' },
    { id: 'session-prayer-apr24', title: 'Prayer Meeting', date: 'Apr 24, 2024', time: '6:30 PM', location: 'Prayer Room', status: 'completed' },
  ],
  attendanceRecords: [],
  feedbackEntries: [],
  chatMessages: [],
  sessionSummaries: [],
  meetingGroups: [],
  meetingInvites: [],
  groupChatMessages: [],
  meetingLogs: [],
};

const AppRoleContext = createContext<AppRoleContextValue | undefined>(undefined);

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  initials: string;
  created_at?: string;
  phone?: string | null;
  birth_date?: string | null;
  address?: string | null;
};

type SessionRow = {
  id: string;
  title: string;
  session_date: string;
  session_time: string;
  location: string;
  status: FellowshipSession['status'];
};

type AttendanceRow = {
  id: string;
  user_id: string;
  user_name: string;
  session_id: string;
  session: string;
  attendance_date: string;
  status: AttendanceStatus;
  notes: string;
  checked_in_at?: string | null;
};

type FeedbackRow = {
  id: string;
  user_id: string;
  user_name: string;
  session_id: string;
  session: string;
  feedback_date: string;
  rating: number;
  learned: string;
  suggestions: string;
  submitted_at: string;
};

type ChatRow = {
  id: string;
  user_id: string;
  author: 'ai' | 'user';
  text: string;
  created_at: string;
};

type SummaryRow = {
  id: string;
  session_id: string;
  session: string;
  user_id: string;
  user_name: string;
  type: SummaryType;
  transcript: string;
  summary: string;
  scriptures: string[];
  created_at: string;
};

function cloneSeedData() {
  return JSON.parse(JSON.stringify(seedData)) as DemoData;
}

function isRemovedSampleUser(user: DemoUser) {
  return (
    REMOVED_SAMPLE_USER_IDS.includes(user.id) ||
    REMOVED_SAMPLE_USER_EMAILS.includes(user.email.toLowerCase())
  );
}

function removeRemovedSampleData(data: DemoData): DemoData {
  const users = data.users.filter((user) => !isRemovedSampleUser(user));
  const activeUserIds = new Set(users.map((user) => user.id));

  return {
    ...data,
    users,
    attendanceRecords: data.attendanceRecords.filter((record) => activeUserIds.has(record.userId)),
    feedbackEntries: data.feedbackEntries.filter((entry) => activeUserIds.has(entry.userId)),
    chatMessages: data.chatMessages.filter((message) => activeUserIds.has(message.userId)),
    sessionSummaries: (data.sessionSummaries ?? []).filter((summary) => activeUserIds.has(summary.userId)),
    meetingGroups: (data.meetingGroups ?? []).filter((group) => activeUserIds.has(group.createdById)),
    meetingInvites: (data.meetingInvites ?? []).filter((invite) => activeUserIds.has(invite.senderId) && activeUserIds.has(invite.recipientId)),
    groupChatMessages: (data.groupChatMessages ?? []).filter((message) => activeUserIds.has(message.senderId)),
    meetingLogs: (data.meetingLogs ?? []).filter((log) => activeUserIds.has(log.startedById)),
  };
}

function upsertDataUser(data: DemoData, nextUser: DemoUser): DemoData {
  const existingIndex = data.users.findIndex(
    (user) => user.id === nextUser.id || user.email.toLowerCase() === nextUser.email.toLowerCase()
  );

  if (existingIndex < 0) {
    return {
      ...data,
      users: [...data.users, nextUser],
    };
  }

  return {
    ...data,
    users: data.users.map((user, index) => (index === existingIndex ? { ...user, ...nextUser } : user)),
  };
}

function mergeSeedUsers(data: DemoData) {
  const users = [...data.users];

  seedData.users.forEach((seedUser) => {
    const existingIndex = users.findIndex((user) => user.id === seedUser.id || user.email.toLowerCase() === seedUser.email.toLowerCase());

    if (existingIndex >= 0) {
      users[existingIndex] = {
        ...users[existingIndex],
        ...seedUser,
      };
      return;
    }

    users.push({ ...seedUser });
  });

  return {
    ...data,
    users,
    sessionSummaries: data.sessionSummaries ?? [],
    meetingGroups: data.meetingGroups ?? [],
    meetingInvites: data.meetingInvites ?? [],
    groupChatMessages: data.groupChatMessages ?? [],
    meetingLogs: data.meetingLogs ?? [],
  };
}

function mergeLocalSecurityFields(remoteData: DemoData, localData: DemoData) {
  return {
    ...remoteData,
    meetingGroups: localData.meetingGroups ?? [],
    meetingInvites: localData.meetingInvites ?? [],
    groupChatMessages: localData.groupChatMessages ?? [],
    meetingLogs: localData.meetingLogs ?? [],
    users: remoteData.users.map((remoteUser) => {
      const localUser = localData.users.find((user) => user.id === remoteUser.id || user.email.toLowerCase() === remoteUser.email.toLowerCase());

      if (!localUser) {
        return remoteUser;
      }

      return {
        ...remoteUser,
        password: localUser.password ?? remoteUser.password,
        twoFactorEnabled: localUser.twoFactorEnabled ?? remoteUser.twoFactorEnabled,
        twoFactorCode: localUser.twoFactorCode ?? remoteUser.twoFactorCode,
      };
    }),
  };
}

function userToRow(user: DemoUser): ProfileRow {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    initials: user.initials,
    phone: user.phone ?? null,
    birth_date: user.birthDate ?? null,
    address: user.address ?? null,
  };
}

function sessionToRow(session: FellowshipSession): SessionRow {
  return {
    id: session.id,
    title: session.title,
    session_date: session.date,
    session_time: session.time,
    location: session.location,
    status: session.status,
  };
}

function attendanceToRow(record: AttendanceRecord): AttendanceRow {
  return {
    id: record.id,
    user_id: record.userId,
    user_name: record.userName,
    session_id: record.sessionId,
    session: record.session,
    attendance_date: record.date,
    status: record.status,
    notes: record.notes,
    checked_in_at: record.checkedInAt ?? null,
  };
}

function feedbackToRow(feedback: FeedbackEntry): FeedbackRow {
  return {
    id: feedback.id,
    user_id: feedback.userId,
    user_name: feedback.userName,
    session_id: feedback.sessionId,
    session: feedback.session,
    feedback_date: feedback.date,
    rating: feedback.rating,
    learned: feedback.learned,
    suggestions: feedback.suggestions,
    submitted_at: feedback.submittedAt,
  };
}

function chatToRow(message: ChatMessage): ChatRow {
  return {
    id: message.id,
    user_id: message.userId,
    author: message.author,
    text: message.text,
    created_at: message.createdAt,
  };
}

function summaryToRow(summary: SessionSummary): SummaryRow {
  return {
    id: summary.id,
    session_id: summary.sessionId,
    session: summary.session,
    user_id: summary.userId,
    user_name: summary.userName,
    type: summary.type,
    transcript: summary.transcript,
    summary: summary.summary,
    scriptures: summary.scriptures,
    created_at: summary.createdAt,
  };
}

function rowToUser(row: ProfileRow): DemoUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    initials: row.initials,
    registeredAt: row.created_at,
    phone: row.phone ?? undefined,
    birthDate: row.birth_date ?? undefined,
    address: row.address ?? undefined,
  };
}

function rowToSession(row: SessionRow): FellowshipSession {
  return {
    id: row.id,
    title: row.title,
    date: row.session_date,
    time: row.session_time,
    location: row.location,
    status: row.status,
  };
}

function rowToAttendance(row: AttendanceRow): AttendanceRecord {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    sessionId: row.session_id,
    session: row.session,
    date: row.attendance_date,
    status: row.status,
    notes: row.notes,
    checkedInAt: row.checked_in_at ?? undefined,
  };
}

function rowToFeedback(row: FeedbackRow): FeedbackEntry {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    sessionId: row.session_id,
    session: row.session,
    date: row.feedback_date,
    rating: row.rating,
    learned: row.learned,
    suggestions: row.suggestions,
    submittedAt: row.submitted_at,
  };
}

function rowToChat(row: ChatRow): ChatMessage {
  return {
    id: row.id,
    userId: row.user_id,
    author: row.author,
    text: row.text,
    createdAt: row.created_at,
  };
}

function rowToSummary(row: SummaryRow): SessionSummary {
  return {
    id: row.id,
    sessionId: row.session_id,
    session: row.session,
    userId: row.user_id,
    userName: row.user_name,
    type: row.type,
    transcript: row.transcript,
    summary: row.summary,
    scriptures: row.scriptures ?? [],
    createdAt: row.created_at,
  };
}

async function syncDataToSupabase(data: DemoData) {
  if (!supabase) return;

  await supabase.from('profiles').upsert(data.users.map(userToRow));
  await supabase.from('fellowship_sessions').upsert(data.sessions.map(sessionToRow));
  await supabase.from('attendance_records').upsert(data.attendanceRecords.map(attendanceToRow));
  await supabase.from('feedback_entries').upsert(data.feedbackEntries.map(feedbackToRow));
  await supabase.from('chat_messages').upsert(data.chatMessages.map(chatToRow));
  await supabase.from('session_summaries').upsert((data.sessionSummaries ?? []).map(summaryToRow));
}

async function readSupabaseData(): Promise<DemoData | null> {
  if (!supabase) return null;

  const [profiles, sessions, attendanceRecords, feedbackEntries, chatMessages, sessionSummaries] = await Promise.all([
    supabase.from('profiles').select('id,name,email,role,initials,created_at,phone,birth_date,address').order('name'),
    supabase.from('fellowship_sessions').select('id,title,session_date,session_time,location,status').order('created_at'),
    supabase.from('attendance_records').select('id,user_id,user_name,session_id,session,attendance_date,status,notes,checked_in_at').order('created_at', { ascending: false }),
    supabase.from('feedback_entries').select('id,user_id,user_name,session_id,session,feedback_date,rating,learned,suggestions,submitted_at').order('submitted_at', { ascending: false }),
    supabase.from('chat_messages').select('id,user_id,author,text,created_at').order('created_at'),
    supabase.from('session_summaries').select('id,session_id,session,user_id,user_name,type,transcript,summary,scriptures,created_at').order('created_at', { ascending: false }),
  ]);

  if (profiles.error || sessions.error || attendanceRecords.error || feedbackEntries.error || chatMessages.error) {
    return null;
  }

  const hasRemoteData = Boolean(profiles.data?.length || sessions.data?.length);

  if (!hasRemoteData) {
    const seeded = cloneSeedData();
    await syncDataToSupabase(seeded);
    return seeded;
  }

  return removeRemovedSampleData({
    users: ((profiles.data ?? []) as ProfileRow[]).map(rowToUser),
    sessions: ((sessions.data ?? []) as SessionRow[]).map(rowToSession),
    attendanceRecords: ((attendanceRecords.data ?? []) as AttendanceRow[]).map(rowToAttendance),
    feedbackEntries: ((feedbackEntries.data ?? []) as FeedbackRow[]).map(rowToFeedback),
    chatMessages: ((chatMessages.data ?? []) as ChatRow[]).map(rowToChat),
    sessionSummaries: sessionSummaries.error ? [] : ((sessionSummaries.data ?? []) as SummaryRow[]).map(rowToSummary),
    meetingGroups: [],
    meetingInvites: [],
    groupChatMessages: [],
    meetingLogs: [],
  });
}

async function deleteRemovedSampleAccountsFromSupabase() {
  if (!supabase) return;
  await supabase.from('profiles').delete().in('id', REMOVED_SAMPLE_USER_IDS);
}

async function saveUserToSupabase(user: DemoUser) {
  if (!supabase) return;
  await supabase.from('profiles').upsert(userToRow(user));
}

async function saveSessionToSupabase(session: FellowshipSession) {
  if (!supabase) return;
  await supabase.from('fellowship_sessions').upsert(sessionToRow(session));
}

async function deleteSessionFromSupabase(sessionId: string) {
  if (!supabase) return;
  await supabase.from('fellowship_sessions').delete().eq('id', sessionId);
}

async function deleteMemberFromSupabase(memberId: string) {
  if (!supabase) return;
  await supabase.from('profiles').delete().eq('id', memberId);
}

async function readSupabaseProfileByUserId(userId: string): Promise<DemoUser | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,email,role,initials,created_at,phone,birth_date,address')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return rowToUser(data as ProfileRow);
}

async function readSupabaseProfileByEmail(email: string): Promise<DemoUser | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,email,role,initials,created_at,phone,birth_date,address')
    .eq('email', email.trim().toLowerCase())
    .limit(1);

  if (error || !data?.length) {
    return null;
  }

  return rowToUser(data[0] as ProfileRow);
}

async function saveAttendanceToSupabase(record: AttendanceRecord) {
  if (!supabase) return;
  await supabase.from('attendance_records').upsert(attendanceToRow(record));
}

async function saveFeedbackToSupabase(feedback: FeedbackEntry) {
  if (!supabase) return;
  await supabase.from('feedback_entries').upsert(feedbackToRow(feedback));
}

async function deleteFeedbackFromSupabase(feedbackId: string) {
  if (!supabase) return;
  await supabase.from('feedback_entries').delete().eq('id', feedbackId);
}

async function saveChatMessagesToSupabase(messages: ChatMessage[]) {
  if (!supabase) return;
  await supabase.from('chat_messages').upsert(messages.map(chatToRow));
}

async function saveSummaryToSupabase(summary: SessionSummary) {
  if (!supabase) return;
  await supabase.from('session_summaries').upsert(summaryToRow(summary));
}

async function deleteSummaryFromSupabase(summaryId: string) {
  if (!supabase) return;
  await supabase.from('session_summaries').delete().eq('id', summaryId);
}

async function readPersistedState(): Promise<PersistedState> {
  const fallback = { sessionUserId: null, themeMode: 'light' as ThemeMode, data: cloneSeedData() };

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : fallback;
    }

    if (!STORE_FILE) return fallback;

    const info = await FileSystem.getInfoAsync(STORE_FILE);
    if (!info.exists) return fallback;

    const raw = await FileSystem.readAsStringAsync(STORE_FILE);
    return JSON.parse(raw) as PersistedState;
  } catch {
    return fallback;
  }
}

async function writePersistedState(state: PersistedState) {
  try {
    const raw = JSON.stringify(state);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(STORE_KEY, raw);
      return;
    }

    if (STORE_FILE) {
      await FileSystem.writeAsStringAsync(STORE_FILE, raw);
    }
  } catch {
    // Demo storage failure should not block the in-memory app.
  }
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toDisplayName(identifier: string) {
  const base = identifier.includes('@') ? identifier.split('@')[0] : identifier;
  const normalized = base
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return 'Member';
  }

  return normalized
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function normalizeDisplayName(value?: string) {
  if (!value?.trim()) {
    return undefined;
  }

  return value
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'MH';
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function findExistingLoginUser(data: DemoData, role: AppRole, identifier: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();

  return data.users.find((user) => {
    const sameRole = user.role === role;
    const sameEmail = user.email.toLowerCase() === normalizedIdentifier;
    return sameRole && sameEmail;
  }) ?? null;
}

function isSeedDemoUser(user: DemoUser) {
  return seedData.users.some((seedUser) => seedUser.id === user.id);
}

function getSeedDemoPassword(user: DemoUser) {
  return seedData.users.find((seedUser) => seedUser.id === user.id)?.password;
}

function isRegisteredLocalUser(user: DemoUser) {
  return Boolean(user.registeredAt);
}

function hasMatchingLocalPassword(user: DemoUser, password: string) {
  const expectedPassword = user.password ?? getSeedDemoPassword(user);
  return Boolean(expectedPassword && expectedPassword === password);
}

function verifyTwoFactorIfNeeded(user: DemoUser, code?: string) {
  if (!user.twoFactorEnabled) {
    return { ok: true };
  }

  if (!code?.trim()) {
    return { ok: false, requiresTwoFactor: true, message: 'Two-factor verification is required.' };
  }

  if (code.trim() !== user.twoFactorCode) {
    return { ok: false, requiresTwoFactor: true, message: 'Invalid verification code.' };
  }

  return { ok: true };
}

function getPasswordResetRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/reset-password`;
  }

  const configuredBaseUrl = (
    process.env.EXPO_PUBLIC_APP_BASE_URL
    ?? process.env.EXPO_PUBLIC_ATTENDANCE_BASE_URL
  )?.replace(/\/$/, '');

  if (configuredBaseUrl) {
    return `${configuredBaseUrl}/reset-password`;
  }

  return 'myapp://reset-password';
}

function getAuthRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/`;
  }

  const configuredBaseUrl = (
    process.env.EXPO_PUBLIC_APP_BASE_URL
    ?? process.env.EXPO_PUBLIC_ATTENDANCE_BASE_URL
  )?.replace(/\/$/, '');

  return configuredBaseUrl ?? 'myapp://';
}

function savePendingGoogleRole(role: AppRole) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.setItem(GOOGLE_ROLE_KEY, role);
  }
}

function readPendingGoogleRole() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return 'member' as AppRole;
  }

  const role = window.localStorage.getItem(GOOGLE_ROLE_KEY);
  return role === 'admin' ? 'admin' : 'member';
}

function clearPendingGoogleRole() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.localStorage.removeItem(GOOGLE_ROLE_KEY);
  }
}

async function readSupabaseAuthenticatedProfile(defaultRole: AppRole = 'member') {
  if (!supabase) return null;

  const { data: authData, error } = await supabase.auth.getUser();
  const authUser = authData.user;

  if (error || !authUser?.email) {
    return null;
  }

  const normalizedEmail = authUser.email.toLowerCase();
  const profile = await readSupabaseProfileByUserId(authUser.id) ?? await readSupabaseProfileByEmail(normalizedEmail);

  if (profile) {
    return {
      ...profile,
      registeredAt: profile.registeredAt ?? authUser.created_at,
    };
  }

  const name = toDisplayName(normalizedEmail);

  return {
    id: authUser.id,
    name,
    email: normalizedEmail,
    role: defaultRole,
    initials: getInitials(name),
    registeredAt: authUser.created_at,
  };
}

function buildAiResponse(data: DemoData, userId: string) {
  const userRecords = data.attendanceRecords.filter((record) => record.userId === userId);
  const present = userRecords.filter((record) => record.status === 'Present').length;
  const rate = userRecords.length ? Math.round((present / userRecords.length) * 100) : 0;
  const feedbackCount = data.feedbackEntries.filter((feedback) => feedback.userId === userId).length;

  return `Your attendance rate is ${rate}% across ${userRecords.length} recorded sessions. You have submitted ${feedbackCount} feedback form${feedbackCount === 1 ? '' : 's'}. Next step: attend the open session and write one reflection note afterward.`;
}

export function AppRoleProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [data, setData] = useState<DemoData>(() => cloneSeedData());

  useEffect(() => {
    let mounted = true;

    readPersistedState().then(async (state) => {
      if (!mounted) return;
      const remoteData = isSupabaseConfigured ? await readSupabaseData() : null;
      let nextData = remoteData ? mergeLocalSecurityFields(remoteData, state.data) : state.data;
      let nextSessionUserId = state.sessionUserId;
      const authenticatedProfile = await readSupabaseAuthenticatedProfile(readPendingGoogleRole());

      if (authenticatedProfile) {
        nextData = upsertDataUser(nextData, authenticatedProfile);
        nextSessionUserId = authenticatedProfile.id;
        clearPendingGoogleRole();
        void saveUserToSupabase(authenticatedProfile);
      }

      setSessionUserId(nextSessionUserId);
      setThemeMode(state.themeMode ?? 'light');
      setData(mergeSeedUsers(nextData));
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      writePersistedState({ sessionUserId, themeMode, data });
    }
  }, [data, loading, sessionUserId, themeMode]);

  const currentUser = useMemo(
    () => data.users.find((user) => user.id === sessionUserId) ?? null,
    [data.users, sessionUserId]
  );

  const role = currentUser?.role ?? 'member';

  const value = useMemo<AppRoleContextValue>(() => ({
    loading,
    role,
    currentUser,
    users: data.users,
    sessions: data.sessions,
    attendanceRecords: data.attendanceRecords,
    feedbackEntries: data.feedbackEntries,
    chatMessages: data.chatMessages,
    sessionSummaries: data.sessionSummaries ?? [],
    meetingGroups: data.meetingGroups ?? [],
    meetingInvites: data.meetingInvites ?? [],
    groupChatMessages: data.groupChatMessages ?? [],
    meetingLogs: data.meetingLogs ?? [],
    themeMode,
    setThemeMode,
    toggleThemeMode: () => setThemeMode((current) => (current === 'light' ? 'dark' : 'light')),
    login: async (identifier, password, nextRole, displayName, twoFactorCode) => {
      if (!identifier.trim() || !password.trim()) {
        return { ok: false, message: 'Please enter your email and password.' };
      }

      const existingLocalUser = findExistingLoginUser(data, nextRole, identifier);

      if (supabase && identifier.includes('@')) {
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: identifier.trim().toLowerCase(),
          password,
        });

        if (!error && authData.user) {
          const profile = await readSupabaseProfileByUserId(authData.user.id)
            ?? await readSupabaseProfileByEmail(identifier);
          const nextUser = profile ?? {
            id: authData.user.id,
            name: normalizeDisplayName(displayName) ?? toDisplayName(identifier),
            email: identifier.trim().toLowerCase(),
            role: nextRole,
            initials: getInitials(normalizeDisplayName(displayName) ?? toDisplayName(identifier)),
            registeredAt: authData.user.created_at,
          };
          const localSecurityUser = existingLocalUser && existingLocalUser.email.toLowerCase() === nextUser.email.toLowerCase()
            ? {
                ...nextUser,
                password: existingLocalUser.password ?? nextUser.password,
                twoFactorEnabled: existingLocalUser.twoFactorEnabled,
                twoFactorCode: existingLocalUser.twoFactorCode,
              }
            : nextUser;
          const twoFactorResult = verifyTwoFactorIfNeeded(localSecurityUser, twoFactorCode);

          if (!twoFactorResult.ok) {
            return twoFactorResult;
          }

          const nextData = {
            ...data,
            users: data.users.some((user) => user.id === localSecurityUser.id)
              ? data.users.map((user) => (user.id === localSecurityUser.id ? localSecurityUser : user))
              : [...data.users, localSecurityUser],
          };

          setData(nextData);
          setSessionUserId(localSecurityUser.id);
          void saveUserToSupabase(localSecurityUser);
          return { ok: true };
        }

        if (error) {
          const existingRemoteUser = await readSupabaseProfileByEmail(identifier);

          if (existingLocalUser && hasMatchingLocalPassword(existingLocalUser, password)) {
            const twoFactorResult = verifyTwoFactorIfNeeded(existingLocalUser, twoFactorCode);

            if (!twoFactorResult.ok) {
              return twoFactorResult;
            }

            setSessionUserId(existingLocalUser.id);
            return { ok: true };
          }

          if (existingLocalUser || existingRemoteUser) {
            return { ok: false, message: 'Invalid password.' };
          }

          return { ok: false, message: 'Invalid email.' };
        }
      }

      if (!existingLocalUser) {
        return { ok: false, message: 'Invalid email.' };
      }

      if (!isSeedDemoUser(existingLocalUser) && !isRegisteredLocalUser(existingLocalUser)) {
        return { ok: false, message: 'Invalid email.' };
      }

      if (!hasMatchingLocalPassword(existingLocalUser, password)) {
        return { ok: false, message: 'Invalid password.' };
      }

      const twoFactorResult = verifyTwoFactorIfNeeded(existingLocalUser, twoFactorCode);

      if (!twoFactorResult.ok) {
        return twoFactorResult;
      }

      setSessionUserId(existingLocalUser.id);
      return { ok: true };
    },
    signInWithGoogle: async (nextRole) => {
      if (!supabase) {
        return { ok: false, message: 'Supabase is not configured yet.' };
      }

      if (Platform.OS !== 'web') {
        return { ok: false, message: 'Google sign-in is currently available on the web version. Use email login on Expo Go for now.' };
      }

      savePendingGoogleRole(nextRole);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthRedirectUrl(),
        },
      });

      if (error) {
        return { ok: false, message: error.message };
      }

      return { ok: true };
    },
    register: async (email, password) => {
      const normalizedEmail = email.trim().toLowerCase();
      const displayName = toDisplayName(normalizedEmail);

      if (!normalizedEmail || !password.trim()) {
        return { ok: false, message: 'Please enter your email and password.' };
      }

      const existingLocalUser = data.users.find((user) => user.email.trim().toLowerCase() === normalizedEmail);

      if (existingLocalUser) {
        return { ok: false, message: 'This email has already been registered.' };
      }

      const createLocalMemberAccount = async (authUser?: { id?: string; created_at?: string }) => {
        const nextUser: DemoUser = {
          id: authUser?.id ?? `member-${slugify(displayName) || Date.now()}`,
          name: displayName,
          email: normalizedEmail,
          role: 'member',
          initials: getInitials(displayName),
          registeredAt: authUser?.created_at ?? new Date().toISOString(),
          password,
        };

        const nextData = {
          ...data,
          users: data.users.some((user) => user.email.toLowerCase() === normalizedEmail)
            ? data.users.map((user) => (user.email.toLowerCase() === normalizedEmail ? nextUser : user))
            : [...data.users, nextUser],
        };

        setData(nextData);
        setSessionUserId(nextUser.id);
        await saveUserToSupabase(nextUser);
      };

      if (supabase) {
        const existingRemoteUser = await readSupabaseProfileByEmail(normalizedEmail);

        if (existingRemoteUser) {
          return { ok: false, message: 'This email has already been registered.' };
        }

        const { data: authData, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
        });

        if (error) {
          if (error.message.toLowerCase().includes('rate limit')) {
            await createLocalMemberAccount();
            return {
              ok: true,
              message: 'Account created. Supabase email verification is temporarily rate limited, so verify email later if needed.',
            };
          }

          if (error.message.toLowerCase().includes('already')) {
            return { ok: false, message: 'This email has already been registered.' };
          }

          return { ok: false, message: error.message };
        }

        if (authData.user && Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
          return { ok: false, message: 'This email has already been registered.' };
        }

        const duplicateAfterSignUp = await readSupabaseProfileByEmail(normalizedEmail);

        if (duplicateAfterSignUp) {
          return { ok: false, message: 'This email has already been registered.' };
        }

        await createLocalMemberAccount(authData.user ?? undefined);
        return { ok: true };
      }

      await createLocalMemberAccount();
      return { ok: true };
    },
    requestPasswordReset: async (email) => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        return { ok: false, message: 'Invalid email.' };
      }

      const existingLocalUser = data.users.find((user) => user.email.toLowerCase() === normalizedEmail);

      if (!supabase) {
        return { ok: true, method: 'code', message: 'Use the verification code shown in the app to reset your password.' };
      }

      // Supabase Auth does not safely reveal whether an email exists.
      // Let Supabase send the reset if the account exists, even if the profile row is not synced yet.
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: getPasswordResetRedirectUrl(),
      });

      if (error) {
        if (existingLocalUser) {
          return { ok: true, method: 'code', message: 'Use the verification code shown in the app to reset your password.' };
        }

        return { ok: false, message: error.message };
      }

      return { ok: true, method: 'email' };
    },
    resetPassword: async (email, nextPassword) => {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        return { ok: false, message: 'Invalid email.' };
      }

      if (nextPassword.length < 6) {
        return { ok: false, message: 'Invalid password.' };
      }

      const existingLocalUser = data.users.find((user) => user.email.trim().toLowerCase() === normalizedEmail);
      const existingRemoteUser = supabase ? await readSupabaseProfileByEmail(normalizedEmail) : null;

      if (!existingLocalUser && !existingRemoteUser) {
        return { ok: false, message: 'Invalid email.' };
      }

      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail);

        if (error) {
          return { ok: false, message: error.message };
        }
      }

      if (existingLocalUser) {
        setData((current) => ({
          ...current,
          users: current.users.map((user) => (
            user.email.toLowerCase() === normalizedEmail
              ? { ...user, password: nextPassword }
              : user
          )),
        }));
      }

      return {
        ok: true,
        message: supabase
          ? 'Password reset saved for this device. Supabase also sent reset instructions if email delivery is enabled.'
          : 'Your password has been changed.',
      };
    },
    updateProfile: async (input) => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in first.' };
      }

      const nextName = normalizeDisplayName(input.name) ?? currentUser.name;

      if (!nextName.trim()) {
        return { ok: false, message: 'Full name is required.' };
      }

      const nextUser: DemoUser = {
        ...currentUser,
        name: nextName,
        initials: getInitials(nextName),
        phone: input.phone?.trim() || undefined,
        birthDate: input.birthDate?.trim() || undefined,
        address: input.address?.trim() || undefined,
      };

      setData((current) => ({
        ...current,
        users: current.users.map((user) => (user.id === currentUser.id ? nextUser : user)),
      }));
      void saveUserToSupabase(nextUser);
      return { ok: true };
    },
    changePassword: async (currentPassword, nextPassword) => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in first.' };
      }

      if (!currentPassword.trim() || !nextPassword.trim()) {
        return { ok: false, message: 'Please enter your current and new password.' };
      }

      if (nextPassword.length < 6) {
        return { ok: false, message: 'New password must be at least 6 characters.' };
      }

      if (!hasMatchingLocalPassword(currentUser, currentPassword)) {
        return { ok: false, message: 'Current password is incorrect.' };
      }

      if (supabase && currentUser.email.includes('@')) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: currentUser.email.toLowerCase(),
          password: currentPassword,
        });

        if (signInError) {
          return { ok: false, message: 'Current password is incorrect.' };
        }

        const { error } = await supabase.auth.updateUser({ password: nextPassword });

        if (error) {
          return { ok: false, message: error.message };
        }
      }

      const nextUser: DemoUser = {
        ...currentUser,
        password: nextPassword,
      };

      setData((current) => ({
        ...current,
        users: current.users.map((user) => (user.id === currentUser.id ? nextUser : user)),
      }));
      void saveUserToSupabase(nextUser);
      return { ok: true };
    },
    enableTwoFactor: async (code) => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in first.' };
      }

      if (!/^\d{6}$/.test(code.trim())) {
        return { ok: false, message: 'Enter the 6-digit verification code.' };
      }

      const nextUser: DemoUser = {
        ...currentUser,
        twoFactorEnabled: true,
        twoFactorCode: code.trim(),
      };

      setData((current) => ({
        ...current,
        users: current.users.map((user) => (user.id === currentUser.id ? nextUser : user)),
      }));

      return { ok: true };
    },
    disableTwoFactor: async () => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in first.' };
      }

      const nextUser: DemoUser = {
        ...currentUser,
        twoFactorEnabled: false,
        twoFactorCode: undefined,
      };

      setData((current) => ({
        ...current,
        users: current.users.map((user) => (user.id === currentUser.id ? nextUser : user)),
      }));

      return { ok: true };
    },
    logout: async () => {
      setSessionUserId(null);
    },
    setRole: (nextRole) => {
      const user = data.users.find((candidate) => candidate.role === nextRole);
      setSessionUserId(user?.id ?? null);
    },
    checkIn: async (sessionId, snapshot) => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in before checking in.' };
      }

      const session = data.sessions.find((candidate) => candidate.id === sessionId) ?? (snapshot?.title && snapshot.date
        ? {
            id: sessionId,
            title: snapshot.title,
            date: snapshot.date,
            time: snapshot.time ?? '',
            location: snapshot.location ?? '',
            status: 'open' as const,
          }
        : null);
      if (!session) {
        return { ok: false, message: 'Session not found.' };
      }

      const duplicate = data.attendanceRecords.some(
        (record) => record.userId === currentUser.id && record.sessionId === sessionId && record.status === 'Present'
      );
      if (duplicate) {
        return { ok: false, duplicate: true, message: 'You are already checked in for this session.' };
      }

      const nextRecord: AttendanceRecord = {
        id: makeId('att'),
        userId: currentUser.id,
        userName: currentUser.name,
        sessionId: session.id,
        session: session.title,
        date: session.date,
        status: 'Present',
        notes: '-',
        checkedInAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        attendanceRecords: [nextRecord, ...current.attendanceRecords],
      }));
      void saveAttendanceToSupabase(nextRecord);

      return { ok: true, message: `You are marked present for ${session.title}.` };
    },
    createSession: async (input) => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in first.' };
      }

      if (!input.title.trim() || !input.date.trim() || !input.time.trim() || !input.location.trim()) {
        return { ok: false, message: 'Please complete the session title, date, time, and location.' };
      }

      const nextSession: FellowshipSession = {
        ...input,
        id: makeId('session'),
        hostId: currentUser.id,
        hostName: currentUser.name,
      };

      setData((current) => {
        const sessions = input.status === 'open'
          ? current.sessions.map((session) => (
              session.status === 'open' ? { ...session, status: 'upcoming' as const } : session
            ))
          : current.sessions;

        return {
          ...current,
          sessions: [nextSession, ...sessions],
        };
      });
      void saveSessionToSupabase(nextSession);
      return { ok: true };
    },
    deleteSession: async (sessionId) => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in first.' };
      }

      const session = data.sessions.find((candidate) => candidate.id === sessionId);

      if (!session) {
        return { ok: false, message: 'Session not found.' };
      }

      const ownsSession = session.hostId === currentUser.id;

      if (role !== 'admin' && !ownsSession) {
        return { ok: false, message: 'You can only delete meetings you host.' };
      }

      setData((current) => ({
        ...current,
        sessions: current.sessions.filter((candidate) => candidate.id !== sessionId),
        attendanceRecords: current.attendanceRecords.filter((record) => record.sessionId !== sessionId),
        feedbackEntries: current.feedbackEntries.filter((feedback) => feedback.sessionId !== sessionId),
        meetingGroups: (current.meetingGroups ?? []).filter((group) => group.sessionId !== sessionId),
        meetingInvites: (current.meetingInvites ?? []).filter((invite) => invite.sessionId !== sessionId),
        groupChatMessages: (current.groupChatMessages ?? []).filter((message) => {
          const group = (current.meetingGroups ?? []).find((candidate) => candidate.id === message.groupId);
          return group?.sessionId !== sessionId;
        }),
        meetingLogs: (current.meetingLogs ?? []).filter((log) => log.sessionId !== sessionId),
      }));
      void deleteSessionFromSupabase(sessionId);
      return { ok: true };
    },
    deleteMember: async (memberId) => {
      if (role !== 'admin') {
        return { ok: false, message: 'Only admins can delete members.' };
      }

      const member = data.users.find((candidate) => candidate.id === memberId && candidate.role === 'member');

      if (!member) {
        return { ok: false, message: 'Member not found.' };
      }

      setData((current) => ({
        ...current,
        users: current.users.filter((user) => user.id !== memberId),
        attendanceRecords: current.attendanceRecords.filter((record) => record.userId !== memberId),
        feedbackEntries: current.feedbackEntries.filter((feedback) => feedback.userId !== memberId),
        chatMessages: current.chatMessages.filter((message) => message.userId !== memberId),
        sessionSummaries: (current.sessionSummaries ?? []).filter((summary) => summary.userId !== memberId),
        meetingGroups: (current.meetingGroups ?? []).filter((group) => group.createdById !== memberId),
        meetingInvites: (current.meetingInvites ?? []).filter((invite) => invite.senderId !== memberId && invite.recipientId !== memberId),
        groupChatMessages: (current.groupChatMessages ?? []).filter((message) => message.senderId !== memberId),
        meetingLogs: (current.meetingLogs ?? []).map((log) => ({
          ...log,
          participantIds: log.participantIds.filter((id) => id !== memberId),
          participantNames: log.participantIds.includes(memberId)
            ? log.participantNames.filter((_, index) => log.participantIds[index] !== memberId)
            : log.participantNames,
        })).filter((log) => log.startedById !== memberId),
      }));
      void deleteMemberFromSupabase(memberId);
      return { ok: true };
    },
    submitFeedback: async (input) => {
      if (!currentUser) return;

      const nextFeedback: FeedbackEntry = {
        ...input,
        id: makeId('fb'),
        userId: currentUser.id,
        userName: currentUser.name,
        submittedAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        feedbackEntries: [nextFeedback, ...current.feedbackEntries],
      }));
      void saveFeedbackToSupabase(nextFeedback);
    },
    deleteFeedback: async (feedbackId) => {
      if (role !== 'admin') {
        return { ok: false, message: 'Only admins can delete feedback.' };
      }

      const feedback = data.feedbackEntries.find((entry) => entry.id === feedbackId);

      if (!feedback) {
        return { ok: false, message: 'Feedback not found.' };
      }

      setData((current) => ({
        ...current,
        feedbackEntries: current.feedbackEntries.filter((entry) => entry.id !== feedbackId),
      }));
      void deleteFeedbackFromSupabase(feedbackId);
      return { ok: true };
    },
    sendAiMessage: async (text) => {
      const trimmed = text.trim();
      if (!currentUser || !trimmed) return;

      const now = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: makeId('chat-user'),
        userId: currentUser.id,
        author: 'user',
        text: trimmed,
        createdAt: now,
      };
      const aiMessage: ChatMessage = {
        id: makeId('chat-ai'),
        userId: currentUser.id,
        author: 'ai',
        text: buildAiResponse(data, currentUser.id),
        createdAt: now,
      };

      setData((current) => ({
        ...current,
        chatMessages: [...current.chatMessages, userMessage, aiMessage],
      }));
      void saveChatMessagesToSupabase([userMessage, aiMessage]);
    },
    saveSessionSummary: async (input) => {
      if (!currentUser) return;

      const nextSummary: SessionSummary = {
        ...input,
        id: makeId('summary'),
        userId: currentUser.id,
        userName: currentUser.name,
        createdAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        sessionSummaries: [
          nextSummary,
          ...(current.sessionSummaries ?? []),
        ],
      }));
      void saveSummaryToSupabase(nextSummary);
    },
    deleteSessionSummary: async (summaryId) => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in first.' };
      }

      const summary = (data.sessionSummaries ?? []).find((candidate) => candidate.id === summaryId);

      if (!summary) {
        return { ok: false, message: 'Summary not found.' };
      }

      if (summary.userId !== currentUser.id && currentUser.role !== 'admin') {
        return { ok: false, message: 'You can only delete your own summaries.' };
      }

      setData((current) => ({
        ...current,
        sessionSummaries: (current.sessionSummaries ?? []).filter((candidate) => candidate.id !== summaryId),
      }));
      void deleteSummaryFromSupabase(summaryId);
      return { ok: true };
    },
    createMeetingGroup: async (input) => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in first.' };
      }

      const name = input.name.trim();
      const session = data.sessions.find((candidate) => candidate.id === input.sessionId);
      const memberIds = [...new Set(input.memberIds)].filter((id) => id !== currentUser.id);
      const members = data.users.filter((user) => memberIds.includes(user.id) && user.role === 'member');

      if (!name) {
        return { ok: false, message: 'Group name is required.' };
      }

      if (!session) {
        return { ok: false, message: 'Please choose a meeting.' };
      }

      if (role !== 'admin' && session.hostId !== currentUser.id) {
        return { ok: false, message: 'Members can only invite people to meetings they host.' };
      }

      if (!members.length) {
        return { ok: false, message: 'Choose at least one member to invite.' };
      }

      const now = new Date().toISOString();
      const groupId = makeId('group');
      const nextGroup: MeetingGroup = {
        id: groupId,
        name,
        sessionId: session.id,
        sessionTitle: session.title,
        createdById: currentUser.id,
        createdByName: currentUser.name,
        memberIds: members.map((member) => member.id),
        createdAt: now,
      };
      const nextInvites: MeetingInvite[] = members.map((member) => ({
        id: makeId('invite'),
        groupId,
        sessionId: session.id,
        sessionTitle: session.title,
        senderId: currentUser.id,
        senderName: currentUser.name,
        recipientId: member.id,
        recipientName: member.name,
        status: 'pending',
        createdAt: now,
      }));

      setData((current) => ({
        ...current,
        meetingGroups: [nextGroup, ...(current.meetingGroups ?? [])],
        meetingInvites: [...nextInvites, ...(current.meetingInvites ?? [])],
      }));

      return { ok: true };
    },
    respondMeetingInvite: async (inviteId, nextStatus) => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in first.' };
      }

      const invite = (data.meetingInvites ?? []).find((candidate) => candidate.id === inviteId);

      if (!invite) {
        return { ok: false, message: 'Invite not found.' };
      }

      if (invite.recipientId !== currentUser.id) {
        return { ok: false, message: 'You can only respond to your own invites.' };
      }

      setData((current) => ({
        ...current,
        meetingInvites: (current.meetingInvites ?? []).map((candidate) => (
          candidate.id === inviteId ? { ...candidate, status: nextStatus } : candidate
        )),
      }));

      return { ok: true };
    },
    sendGroupMessage: async (groupId, text) => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in first.' };
      }

      const trimmed = text.trim();

      if (!trimmed) {
        return { ok: false, message: 'Message cannot be empty.' };
      }

      const group = (data.meetingGroups ?? []).find((candidate) => candidate.id === groupId);

      if (!group) {
        return { ok: false, message: 'Group not found.' };
      }

      const acceptedInvite = (data.meetingInvites ?? []).some((invite) => (
        invite.groupId === groupId
        && invite.recipientId === currentUser.id
        && invite.status === 'accepted'
      ));
      const canChat = group.createdById === currentUser.id || acceptedInvite;

      if (!canChat) {
        return { ok: false, message: 'Accept the invite before sending messages.' };
      }

      const nextMessage: GroupChatMessage = {
        id: makeId('group-chat'),
        groupId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        text: trimmed,
        createdAt: new Date().toISOString(),
      };

      setData((current) => ({
        ...current,
        groupChatMessages: [...(current.groupChatMessages ?? []), nextMessage],
      }));

      return { ok: true };
    },
    startMeeting: async (sessionId) => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in first.' };
      }

      const session = data.sessions.find((candidate) => candidate.id === sessionId);

      if (!session) {
        return { ok: false, message: 'Meeting not found.' };
      }

      const liveLog = (data.meetingLogs ?? []).find((log) => log.sessionId === sessionId && log.status === 'live');

      if (liveLog) {
        return { ok: false, message: 'This meeting is already live.' };
      }

      const nextLog: MeetingLog = {
        id: makeId('meeting-log'),
        sessionId: session.id,
        sessionTitle: session.title,
        startedById: currentUser.id,
        startedByName: currentUser.name,
        startedAt: new Date().toISOString(),
        participantIds: [currentUser.id],
        participantNames: [currentUser.name],
        status: 'live',
      };

      setData((current) => ({
        ...current,
        sessions: current.sessions.map((candidate) => (
          candidate.id === sessionId
            ? { ...candidate, status: 'open' }
            : candidate
        )),
        meetingLogs: [nextLog, ...(current.meetingLogs ?? [])],
      }));

      return { ok: true };
    },
    joinMeeting: async (sessionId) => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in first.' };
      }

      const liveLog = (data.meetingLogs ?? []).find((log) => log.sessionId === sessionId && log.status === 'live');

      if (!liveLog) {
        return { ok: false, message: 'This meeting has not started yet.' };
      }

      if (liveLog.participantIds.includes(currentUser.id)) {
        return { ok: true, message: 'You are already participating.' };
      }

      setData((current) => ({
        ...current,
        meetingLogs: (current.meetingLogs ?? []).map((log) => (
          log.id === liveLog.id
            ? {
                ...log,
                participantIds: [...log.participantIds, currentUser.id],
                participantNames: [...log.participantNames, currentUser.name],
              }
            : log
        )),
      }));

      return { ok: true };
    },
    closeMeeting: async (sessionId) => {
      if (!currentUser) {
        return { ok: false, message: 'Please log in first.' };
      }

      const liveLog = (data.meetingLogs ?? []).find((log) => log.sessionId === sessionId && log.status === 'live');

      if (!liveLog) {
        return { ok: false, message: 'This meeting is not live.' };
      }

      const participant = liveLog.participantIds.includes(currentUser.id);

      if (role !== 'admin' && liveLog.startedById !== currentUser.id && !participant) {
        return { ok: false, message: 'Only a participant can close this meeting.' };
      }

      const endedAt = new Date().toISOString();
      const durationMinutes = Math.max(
        1,
        Math.ceil((new Date(endedAt).getTime() - new Date(liveLog.startedAt).getTime()) / 60000)
      );

      setData((current) => ({
        ...current,
        sessions: current.sessions.map((candidate) => (
          candidate.id === sessionId
            ? { ...candidate, status: 'completed' }
            : candidate
        )),
        meetingLogs: (current.meetingLogs ?? []).map((log) => (
          log.id === liveLog.id
            ? { ...log, endedAt, durationMinutes, status: 'closed' }
            : log
        )),
      }));

      return { ok: true };
    },
  }), [currentUser, data, loading, role, themeMode]);

  return <AppRoleContext.Provider value={value}>{children}</AppRoleContext.Provider>;
}

export function useAppRole() {
  const context = useContext(AppRoleContext);
  if (!context) {
    throw new Error('useAppRole must be used within AppRoleProvider');
  }

  return context;
}
