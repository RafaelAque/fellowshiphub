import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, DataTable, Menu, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppShell } from '@/components/app-shell';
import { FellowshipSession, MeetingTranscriptSegment, SessionSummary, useAppRole } from '@/components/app-role-context';

type SessionStatus = FellowshipSession['status'];

type SpeechRecognitionResultItem = {
  transcript: string;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  0: SpeechRecognitionResultItem;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
};

type SpeechRecognitionErrorEvent = {
  error?: string;
};

type SpeechRecognitionController = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionController;

const fallbackSummaryEndpoint = 'https://kvmnuivdxcqdvqvpcipq.supabase.co/functions/v1/summarize-session';
const summaryEndpoint = process.env.EXPO_PUBLIC_AI_SUMMARY_ENDPOINT ?? fallbackSummaryEndpoint;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

function getSpeechRecognitionConstructor() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function detectScriptures(text: string) {
  const books = [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
    'Samuel', 'Kings', 'Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalm', 'Psalms',
    'Proverbs', 'Ecclesiastes', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
    'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', 'Corinthians', 'Galatians',
    'Ephesians', 'Philippians', 'Colossians', 'Hebrews', 'James', 'Peter', 'Jude', 'Revelation',
  ];
  const pattern = new RegExp(`\\b(?:[1-3]\\s*)?(?:${books.join('|')})\\s+\\d{1,3}:\\d{1,3}(?:-\\d{1,3})?\\b`, 'gi');
  return Array.from(new Set((text.match(pattern) ?? []).map((match) => match.replace(/\s+/g, ' ').trim())));
}

async function requestMeetingSummary(input: { transcript: string; sessionTitle?: string }) {
  const response = await fetch(summaryEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(supabaseAnonKey ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } : {}),
    },
    body: JSON.stringify({
      transcript: input.transcript,
      type: 'detailed',
      scriptures: detectScriptures(input.transcript),
      sessionTitle: input.sessionTitle,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI summary service is unavailable (${response.status}). ${errorText}`);
  }

  const data = await response.json() as { summary?: string; provider?: string };
  return {
    summary: data.summary?.trim() ?? '',
    provider: data.provider === 'groq' ? 'Groq' : 'AI',
  };
}

function titleCaseStatus(status: SessionStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatSessionDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMonthTitle(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
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

function isSameCalendarDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()
  );
}

function parseSessionDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarDayKey(day: Date | null, index: number) {
  if (!day) {
    return `empty-${index}`;
  }

  return day.toISOString();
}

function getSelectedTimeParts(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);

  if (!match) {
    return { hour: '', minute: '', period: '' };
  }

  return {
    hour: match[1],
    minute: match[2],
    period: match[3],
  };
}

function buildTime(hour: string, minute: string, period: string) {
  if (!hour || !minute || !period) {
    return '';
  }

  return `${hour}:${minute} ${period}`;
}

function getUniqueTimeParts() {
  const options = getTimeOptions();
  const hours = new Set<string>();
  const minutes = new Set<string>();
  const periods = new Set<string>();

  options.forEach((option) => {
    const parts = getSelectedTimeParts(option);
    if (parts.hour) hours.add(parts.hour);
    if (parts.minute) minutes.add(parts.minute);
    if (parts.period) periods.add(parts.period);
  });

  return {
    hours: [...hours],
    minutes: [...minutes],
    periods: [...periods],
  };
}

function getTimeOptions() {
  const options: string[] = [];

  for (let hour = 5; hour <= 22; hour += 1) {
    for (const minute of [0, 30]) {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      options.push(`${displayHour}:${String(minute).padStart(2, '0')} ${period}`);
    }
  }

  return options;
}

function formatMeetingDuration(minutes?: number) {
  if (!minutes) {
    return 'Less than 1 min';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (!hours) {
    return `${minutes} min`;
  }

  return `${hours} hr${hours === 1 ? '' : 's'} ${remainingMinutes} min`;
}

function formatClockFromMs(totalMs: number) {
  const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function normalizeSpeakerLabel(name?: string) {
  const value = name?.trim() || 'Speaker';

  if (value.toLowerCase() === 'pastor') {
    return 'PASTOR';
  }

  if (value.toLowerCase().startsWith('church member')) {
    return value.toUpperCase();
  }

  return value.toUpperCase();
}

function formatTranscriptSegments(segments: Pick<MeetingTranscriptSegment, 'speaker' | 'text'>[]) {
  return segments
    .map((segment) => `${normalizeSpeakerLabel(segment.speaker)}: ${segment.text.trim()}`)
    .join('\n\n');
}

function renderFormattedSummary(summary: string) {
  const sections = summary
    .split(/\n(?=##\s+)/)
    .map((section) => section.trim())
    .filter(Boolean);

  return sections.map((section, index) => {
    const lines = section.split('\n');
    const heading = lines[0]?.replace(/^##\s*/, '').trim();
    const body = lines.slice(1).join('\n').trim();

    if (!heading) {
      return (
        <Text key={`summary-text-${index}`} style={styles.meetingSummaryText}>
          {section}
        </Text>
      );
    }

    return (
      <View key={`${heading}-${index}`} style={styles.summarySection}>
        <Text style={styles.summarySectionTitle}>{heading}</Text>
        {body ? <Text style={styles.meetingSummaryText}>{body}</Text> : null}
      </View>
    );
  });
}

function getLiveMinutes(startedAt: string, now: number) {
  return Math.max(1, Math.ceil((now - new Date(startedAt).getTime()) / 60000));
}

export function SessionsScreen({ roomOnly = false }: { roomOnly?: boolean }) {
  const { addMeetingTranscriptSegment, clearMeetingTranscript, closeMeeting, correctMeetingTranscriptSpeaker, createMeetingGroup, createSession, currentUser, deleteSession, deleteSessionSummary, joinMeeting, leaveMeeting, meetingLogs, meetingTranscriptSegments, role, saveSessionSummary, sessionSummaries, sessions, startMeeting, users } = useAppRole();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<SessionStatus>('upcoming');
  const [statusOpen, setStatusOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [timeDraft, setTimeDraft] = useState(() => getSelectedTimeParts(''));
  const [saving, setSaving] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<FellowshipSession | null>(null);
  const [sessionToInvite, setSessionToInvite] = useState<FellowshipSession | null>(null);
  const [resetConversationPending, setResetConversationPending] = useState(false);
  const [inviteGroupName, setInviteGroupName] = useState('');
  const [inviteMemberIds, setInviteMemberIds] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const [selectedRoomSessionId, setSelectedRoomSessionId] = useState(sessions[0]?.id ?? '');
  const [meetingTranscript, setMeetingTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [activeSpeakerName, setActiveSpeakerName] = useState('');
  const [memberSpeakerNames, setMemberSpeakerNames] = useState<Record<string, string>>({});
  const [speakerNameTouched, setSpeakerNameTouched] = useState(false);
  const [speakerMenuOpen, setSpeakerMenuOpen] = useState(false);
  const [speakerCorrectionId, setSpeakerCorrectionId] = useState<string | null>(null);
  const [meetingSummary, setMeetingSummary] = useState('');
  const [meetingSummaryProvider, setMeetingSummaryProvider] = useState('Groq');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summarySaving, setSummarySaving] = useState(false);
  const [summaryDeletingId, setSummaryDeletingId] = useState<string | null>(null);
  const [summaryHiddenIds, setSummaryHiddenIds] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [meetingChatText, setMeetingChatText] = useState('');
  const [meetingChatMessages, setMeetingChatMessages] = useState<{ id: string; author: string; text: string; createdAt: string; sessionId: string }[]>([]);
  const [meetingChatOpen, setMeetingChatOpen] = useState(false);
  const [meetingAiOpen, setMeetingAiOpen] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionController | null>(null);
  const transcriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const activeSpeakerRef = useRef('');
  const speakerOptionsRef = useRef<string[]>([]);
  const sortedSessions = useMemo(() => [...sessions], [sessions]);
  const sortedLogs = useMemo(() => [...(meetingLogs ?? [])], [meetingLogs]);
  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);
  const selectedDate = useMemo(() => parseSessionDate(date), [date]);
  const timeParts = useMemo(() => getUniqueTimeParts(), []);
  const inviteMembers = useMemo(() => (
    users.filter((user) => user.role === 'member' && user.id !== currentUser?.id)
  ), [currentUser?.id, users]);
  const openCount = sessions.filter((session) => session.status === 'open').length;
  const upcomingCount = sessions.filter((session) => session.status === 'upcoming').length;
  const completedCount = sessions.filter((session) => session.status === 'completed').length;
  const selectedRoomSession = sessions.find((session) => session.id === selectedRoomSessionId) ?? sessions[0];
  const selectedLiveLog = sortedLogs.find((log) => log.sessionId === selectedRoomSession?.id && log.status === 'live');
  const selectedLatestLog = selectedLiveLog ?? sortedLogs.find((log) => log.sessionId === selectedRoomSession?.id);
  const selectedIsParticipant = Boolean(
    selectedLiveLog
    && currentUser
    && (
      selectedLiveLog.participantIds.includes(currentUser.id)
      || selectedLiveLog.participantNames.includes(currentUser.name)
    )
  );
  const selectedCanEndMeeting = Boolean(
    selectedLiveLog
    && currentUser
    && (
      selectedRoomSession?.hostId
        ? selectedRoomSession.hostId === currentUser.id
        : selectedLiveLog.startedById === currentUser.id
    )
  );
  const selectedCanResetConversation = Boolean(
    selectedRoomSession
    && currentUser
    && (
      selectedRoomSession.hostId === currentUser.id
      || selectedLiveLog?.startedById === currentUser.id
    )
  );
  const memberMustEnterSpeakerName = Boolean(currentUser);
  const selectedMemberSpeakerName = selectedRoomSession ? (memberSpeakerNames[selectedRoomSession.id] ?? '') : '';
  const memberSpeakerNameValid = selectedMemberSpeakerName.trim().length >= 2;
  const canUseSpeakingControls = !memberMustEnterSpeakerName || memberSpeakerNameValid;
  const selectedElapsedMs = selectedLiveLog ? clockNow - new Date(selectedLiveLog.startedAt).getTime() : 0;
  const selectedMeetingChat = meetingChatMessages.filter((message) => message.sessionId === selectedRoomSession?.id);
  const selectedTranscriptSegments = useMemo(() => (
    (meetingTranscriptSegments ?? [])
      .filter((segment) => segment.sessionId === selectedRoomSession?.id)
      .sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime())
  ), [meetingTranscriptSegments, selectedRoomSession?.id]);
  const speakerOptions = useMemo(() => {
    const participantNames = selectedLatestLog?.participantNames ?? [];
    return [
      'Pastor',
      'Unknown Speaker',
      ...(currentUser?.role === 'member' ? ['Church Member 1'] : []),
      ...participantNames,
      ...(currentUser?.name ? [currentUser.name] : []),
    ].filter((name, index, names) => Boolean(name) && names.indexOf(name) === index);
  }, [currentUser?.name, currentUser?.role, selectedLatestLog?.participantNames]);
  const correctionSpeakerOptions = useMemo(() => (
    speakerOptions.filter((speaker) => speaker !== 'Unknown Speaker')
  ), [speakerOptions]);
  const selectedSavedSummaries = useMemo(() => (
    (sessionSummaries ?? [])
      .filter((summary) => summary.sessionId === selectedRoomSession?.id)
      .filter((summary) => !summaryHiddenIds.includes(summary.id))
      .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
  ), [selectedRoomSession?.id, sessionSummaries, summaryHiddenIds]);
  const inputTheme = {
    colors: {
      primary: '#111827',
      text: '#111827',
      placeholder: '#374151',
      onSurfaceVariant: '#374151',
    },
  };

  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionConstructor()));

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    transcriptRef.current = meetingTranscript;
  }, [meetingTranscript]);

  useEffect(() => {
    const nextTranscript = formatTranscriptSegments(selectedTranscriptSegments);
    transcriptRef.current = nextTranscript;
    setMeetingTranscript(nextTranscript);
  }, [selectedTranscriptSegments]);

  useEffect(() => {
    activeSpeakerRef.current = activeSpeakerName;
  }, [activeSpeakerName]);

  useEffect(() => {
    speakerOptionsRef.current = speakerOptions;
  }, [speakerOptions]);

  useEffect(() => {
    setInterimTranscript('');
    interimTranscriptRef.current = '';
    setMeetingSummary('');
    setSummaryHiddenIds([]);
    setActiveSpeakerName(currentUser?.role === 'admin' ? 'Pastor' : (currentUser?.name ?? 'Church Member 1'));
  }, [currentUser?.name, currentUser?.role, selectedRoomSession?.id]);

  useEffect(() => {
    if (!activeSpeakerName && speakerOptions.length) {
      setActiveSpeakerName(speakerOptions[0]);
    }
  }, [activeSpeakerName, speakerOptions]);

  useEffect(() => {
    if (memberMustEnterSpeakerName) {
      setActiveSpeakerName(selectedMemberSpeakerName.trim());
      activeSpeakerRef.current = selectedMemberSpeakerName.trim();
    }
  }, [memberMustEnterSpeakerName, selectedMemberSpeakerName]);

  useEffect(() => {
    setSpeakerNameTouched(false);
  }, [selectedRoomSession?.id]);

  const resetForm = () => {
    setTitle('');
    setDate('');
    setTime('');
    setLocation('');
    setStatus('upcoming');
  };

  const openDatePicker = () => {
    setCalendarMonth(selectedDate ?? new Date());
    setDateOpen(true);
  };

  const openTimePicker = () => {
    const parts = getSelectedTimeParts(time);
    setTimeDraft({
      hour: parts.hour || '6',
      minute: parts.minute || '00',
      period: parts.period || 'PM',
    });
    setTimeOpen(true);
  };

  const saveTimePicker = () => {
    const nextTime = buildTime(timeDraft.hour, timeDraft.minute, timeDraft.period);
    setTime(nextTime);
    setTimeOpen(false);
  };

  const submit = async () => {
    setSaving(true);
    const result = await createSession({
      title,
      date: normalizeDate(date),
      time: time.trim(),
      location: location.trim(),
      status,
    });
    setSaving(false);

    if (!result.ok) {
      Alert.alert('Meeting not saved', result.message ?? 'Please check the meeting details.');
      return;
    }

    resetForm();
    Alert.alert('Meeting created', 'The meeting is now available in FellowshipHub.');
  };

  const confirmDelete = (session: FellowshipSession) => {
    setSessionToDelete(session);
  };

  const openInviteModal = (session: FellowshipSession) => {
    setSessionToInvite(session);
    setInviteGroupName(`${session.title} Group`);
    setInviteMemberIds([]);
  };

  const toggleInviteMember = (memberId: string) => {
    setInviteMemberIds((current) => (
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId]
    ));
  };

  const sendMeetingInvites = async () => {
    if (!sessionToInvite) {
      return;
    }

    setInviting(true);
    const result = await createMeetingGroup({
      name: inviteGroupName,
      sessionId: sessionToInvite.id,
      memberIds: inviteMemberIds,
    });
    setInviting(false);

    if (!result.ok) {
      Alert.alert('Invites not sent', result.message ?? 'Please select at least one member.');
      return;
    }

    setSessionToInvite(null);
    setInviteGroupName('');
    setInviteMemberIds([]);
    Alert.alert('Invites sent', 'The selected members can now see this meeting in their inbox.');
  };

  const deleteSelectedSession = async () => {
    if (!sessionToDelete) {
      return;
    }

    setDeleting(true);
    const result = await deleteSession(sessionToDelete.id);
    setDeleting(false);

    if (!result.ok) {
      Alert.alert('Session not deleted', result.message ?? 'Unable to delete this session.');
      return;
    }

    setSessionToDelete(null);
  };

  const handleStartMeeting = async (sessionId: string) => {
    const result = await startMeeting(sessionId);

    if (!result.ok) {
      Alert.alert('Meeting not started', result.message ?? 'Please try again.');
      return;
    }

    setMeetingTranscript('');
    setInterimTranscript('');
    setMeetingSummary('');
  };

  const handleJoinMeeting = async (sessionId: string) => {
    const result = await joinMeeting(sessionId);

    if (!result.ok) {
      Alert.alert('Meeting not joined', result.message ?? 'Please try again.');
      return;
    }

    if (result.message) {
      Alert.alert('Meeting participation', result.message);
    }
  };

  const handleCloseMeeting = async (sessionId: string) => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);

    const result = await closeMeeting(sessionId);

    if (!result.ok) {
      Alert.alert('Meeting not closed', result.message ?? 'Please try again.');
      return;
    }

    Alert.alert('Meeting closed', 'The meeting duration and participant log have been saved.');
  };

  const handleLeaveMeeting = async (sessionId: string) => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);

    const result = await leaveMeeting(sessionId);

    if (!result.ok) {
      Alert.alert('Could not leave meeting', result.message ?? 'Please try again.');
      return;
    }

    Alert.alert(
      result.closed ? 'Meeting ended' : 'Left meeting',
      result.closed
        ? 'The meeting has been turned off and the duration was saved.'
        : 'You have left this meeting.'
    );
  };

  const appendTranscriptSegment = (text: string) => {
    const cleanText = text.replace(/\s+/g, ' ').trim();

    if (!cleanText || !selectedRoomSession) {
      return;
    }

    const speaker = memberMustEnterSpeakerName
      ? selectedMemberSpeakerName.trim()
      : activeSpeakerRef.current || speakerOptionsRef.current[0] || currentUser?.name || 'Speaker';
    const participantNames = selectedLatestLog?.participantNames ?? [];
    const confidence = speaker === 'Unknown Speaker'
      ? 35
      : participantNames.includes(speaker) || speaker === 'Pastor' || speaker === currentUser?.name
        ? 95
        : 75;

    void addMeetingTranscriptSegment({
      sessionId: selectedRoomSession.id,
      speaker,
      text: cleanText,
      confidence,
      possibleSpeaker: confidence < 70 ? participantNames[0] : undefined,
    });
  };

  const correctTranscriptSpeaker = async (fromSpeaker: string, toSpeaker: string) => {
    if (!selectedRoomSession || !selectedCanResetConversation) {
      Alert.alert('Correction unavailable', 'Only the meeting creator or host can correct speaker labels.');
      return;
    }

    await correctMeetingTranscriptSpeaker({
      sessionId: selectedRoomSession.id,
      fromSpeaker,
      toSpeaker,
    });
    setActiveSpeakerName(toSpeaker);
    activeSpeakerRef.current = toSpeaker;
    setSpeakerCorrectionId(null);
  };

  const startListening = () => {
    if (memberMustEnterSpeakerName && !memberSpeakerNameValid) {
      setSpeakerNameTouched(true);
      Alert.alert('Name required', 'Please enter your name before speaking.');
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      Alert.alert(
        'Speech listening unavailable',
        Platform.OS === 'web'
          ? 'Use Chrome or Edge for live speech recognition, or type the meeting notes manually.'
          : 'Expo Go needs a native speech package for live microphone transcription. You can type or paste meeting notes here for AI summary.'
      );
      return;
    }

    if (!selectedLiveLog) {
      Alert.alert('Start the meeting first', 'Press Start Meeting before using live listening.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript ?? '';

        if (result.isFinal) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      if (finalText.trim()) {
        appendTranscriptSegment(finalText);
      }

      interimTranscriptRef.current = interimText.trim();
      setInterimTranscript(interimText.trim());
    };
    recognition.onerror = () => {
      setListening(false);
      Alert.alert('Listening stopped', 'The browser stopped speech recognition. You can press Listen again.');
    };
    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  };

  const summarizeMeeting = async () => {
    const notes = [meetingTranscript, interimTranscript].filter(Boolean).join(' ').trim();

    if (!notes) {
      Alert.alert('No discussion captured', 'Listen to the meeting or type/paste notes first.');
      return;
    }

    setSummaryLoading(true);

    try {
      const result = await requestMeetingSummary({
        transcript: notes,
        sessionTitle: selectedRoomSession?.title,
      });

      if (!result.summary) {
        throw new Error('Groq did not return a summary.');
      }

      setMeetingSummary(result.summary);
      setMeetingSummaryProvider(result.provider);
      await persistMeetingSummary(result.summary, notes, false);
      Alert.alert('Summary saved', 'The AI summary was saved under this meeting.');
    } catch (error) {
      Alert.alert('AI summary failed', error instanceof Error ? error.message : 'Groq is unavailable right now.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const clearMeetingNotes = () => {
    setMeetingTranscript('');
    setInterimTranscript('');
    setMeetingSummary('');
    if (selectedRoomSession) {
      void clearMeetingTranscript(selectedRoomSession.id);
    }
    transcriptRef.current = '';
    interimTranscriptRef.current = '';
  };

  const resetConversation = () => {
    if (!selectedRoomSession || !selectedCanResetConversation) {
      Alert.alert('Reset unavailable', 'Only the meeting creator or host can reset this conversation.');
      return;
    }

    setMeetingTranscript('');
    setInterimTranscript('');
    setMeetingSummary('');
    setMeetingSummaryProvider('Groq');
    transcriptRef.current = '';
    interimTranscriptRef.current = '';
    void clearMeetingTranscript(selectedRoomSession.id);
    setResetConversationPending(false);
    Alert.alert('Conversation reset', 'The meeting transcript has been cleared.');
  };

  const persistMeetingSummary = async (summaryText: string, transcriptText: string, showAlert = true) => {
    if (!selectedRoomSession) {
      Alert.alert('Meeting not selected', 'Choose a meeting before saving a summary.');
      return;
    }

    if (!summaryText.trim()) {
      Alert.alert('No summary yet', 'Generate an AI summary before saving.');
      return;
    }

    setSummarySaving(true);
    await saveSessionSummary({
      sessionId: selectedRoomSession.id,
      session: selectedRoomSession.title,
      type: 'detailed',
      transcript: transcriptText,
      summary: summaryText,
      scriptures: detectScriptures(transcriptText || summaryText),
    });
    setSummarySaving(false);

    if (showAlert) {
      Alert.alert('Summary saved', 'This meeting summary has been saved.');
    }
  };

  const saveMeetingSummary = async () => {
    const transcript = [meetingTranscript, interimTranscript].filter(Boolean).join(' ').trim();
    await persistMeetingSummary(meetingSummary, transcript, true);
  };

  const saveMeetingTranscript = async () => {
    const transcript = [meetingTranscript, interimTranscript].filter(Boolean).join(' ').trim();

    if (!transcript) {
      Alert.alert('No transcript yet', 'Listen to the meeting or type notes before saving.');
      return;
    }

    await persistMeetingSummary(
      'Meeting transcript saved for later review. Open this item to review the complete speaker-labeled transcript.',
      transcript,
      true
    );
  };

  const openSavedMeetingSummary = (summary: typeof selectedSavedSummaries[number]) => {
    setMeetingTranscript(summary.transcript);
    setInterimTranscript('');
    setMeetingSummary(summary.summary);
    setMeetingSummaryProvider('Saved');
    transcriptRef.current = summary.transcript;
    interimTranscriptRef.current = '';
  };

  const deleteSavedMeetingSummary = async (summary: SessionSummary) => {
    setSummaryDeletingId(summary.id);
    setSummaryHiddenIds((current) => [...new Set([...current, summary.id])]);
    const result = await deleteSessionSummary(summary.id);
    setSummaryDeletingId(null);

    if (!result.ok) {
      setSummaryHiddenIds((current) => current.filter((id) => id !== summary.id));
      Alert.alert('Summary not deleted', result.message ?? 'Please try again.');
      return;
    }

    if (meetingSummary === summary.summary) {
      setMeetingSummary('');
      setMeetingSummaryProvider('Groq');
    }

    Alert.alert('Summary deleted', 'The saved meeting summary was removed.');
  };

  const sendMeetingChat = () => {
    const text = meetingChatText.trim();

    if (!text || !selectedRoomSession || !currentUser) {
      return;
    }

    setMeetingChatMessages((current) => [
      ...current,
      {
        id: `meeting-chat-${Date.now()}`,
        author: currentUser.name,
        text,
        createdAt: new Date().toISOString(),
        sessionId: selectedRoomSession.id,
      },
    ]);
    setMeetingChatText('');
  };

  return (
    <AppShell
      activeKey={roomOnly ? 'meeting-room' : 'sessions'}
      title={roomOnly ? 'Meeting Room' : role === 'admin' ? 'Sessions' : 'Meetings'}
      subtitle={
        roomOnly
          ? 'Start meetings, track participants, chat, capture notes, and summarize the discussion with AI.'
          : role === 'admin'
            ? 'Create, invite, and manage fellowship meetings.'
            : 'Host meetings and invite members from your inbox.'
      }
    >
        <View style={styles.layout}>
          {roomOnly ? (
            <Card mode="outlined" style={styles.formCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>Add Meeting</Text>
                <View style={styles.formGrid}>
                  <TextInput
                    left={<TextInput.Icon icon="clipboard-text-outline" />}
                    label="Meeting Title"
                    value={title}
                    onChangeText={setTitle}
                    mode="outlined"
                    style={styles.input}
                    theme={inputTheme}
                    textColor="#111827"
                  />
                  <Button
                    mode="outlined"
                    textColor="#374151"
                    icon="calendar-outline"
                    onPress={openDatePicker}
                    style={styles.pickerButton}
                    contentStyle={styles.pickerButtonContent}
                  >
                    {date || 'Select Date'}
                  </Button>
                  <Button
                    mode="outlined"
                    textColor="#374151"
                    icon="clock-outline"
                    onPress={openTimePicker}
                    style={styles.pickerButton}
                    contentStyle={styles.pickerButtonContent}
                  >
                    {time || 'Select Time'}
                  </Button>
                  <TextInput
                    left={<TextInput.Icon icon="map-marker-outline" />}
                    label="Location"
                    value={location}
                    onChangeText={setLocation}
                    mode="outlined"
                    placeholder="Main Hall"
                    style={styles.input}
                    theme={inputTheme}
                    textColor="#111827"
                  />
                </View>
                <View style={styles.formActions}>
                  <Menu
                    visible={statusOpen}
                    onDismiss={() => setStatusOpen(false)}
                    anchor={
                      <Button mode="outlined" textColor="#111827" icon="chevron-down" onPress={() => setStatusOpen(true)}>
                        {titleCaseStatus(status)}
                      </Button>
                    }
                  >
                    <Menu.Item onPress={() => { setStatus('open'); setStatusOpen(false); }} title="Open" />
                    <Menu.Item onPress={() => { setStatus('upcoming'); setStatusOpen(false); }} title="Upcoming" />
                    <Menu.Item onPress={() => { setStatus('completed'); setStatusOpen(false); }} title="Completed" />
                  </Menu>
                  <Button mode="outlined" textColor="#111827" icon="refresh" onPress={resetForm}>
                    Clear
                  </Button>
                  <Button mode="contained" textColor="#ffffff" icon="plus" onPress={submit} loading={saving} disabled={saving} style={styles.createButton}>
                    Add Meeting
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ) : null}

          {!roomOnly ? (
            <>
              <View style={styles.statsGrid}>
                <Card mode="outlined" style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <MaterialCommunityIcons name="calendar-clock" size={28} color="#111827" />
                    <Text variant="headlineSmall" style={styles.statValue}>{sessions.length}</Text>
                    <Text style={styles.statLabel}>Total meetings</Text>
                  </Card.Content>
                </Card>
                <Card mode="outlined" style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <MaterialCommunityIcons name="calendar-check" size={28} color="#111827" />
                    <Text variant="headlineSmall" style={styles.statValue}>{openCount}</Text>
                    <Text style={styles.statLabel}>Open now</Text>
                  </Card.Content>
                </Card>
                <Card mode="outlined" style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <MaterialCommunityIcons name="calendar-plus" size={28} color="#111827" />
                    <Text variant="headlineSmall" style={styles.statValue}>{upcomingCount}</Text>
                    <Text style={styles.statLabel}>Upcoming</Text>
                  </Card.Content>
                </Card>
                <Card mode="outlined" style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <MaterialCommunityIcons name="calendar-remove" size={28} color="#111827" />
                    <Text variant="headlineSmall" style={styles.statValue}>{completedCount}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </Card.Content>
                </Card>
              </View>

              <Card mode="outlined" style={styles.formCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Add Meeting</Text>
                  <View style={styles.formGrid}>
                    <TextInput
                      left={<TextInput.Icon icon="clipboard-text-outline" />}
                      label="Meeting Title"
                      value={title}
                      onChangeText={setTitle}
                      mode="outlined"
                      style={styles.input}
                      theme={inputTheme}
                      textColor="#111827"
                    />
                    <Button
                      mode="outlined"
                      textColor="#374151"
                      icon="calendar-outline"
                      onPress={openDatePicker}
                      style={styles.pickerButton}
                      contentStyle={styles.pickerButtonContent}
                    >
                      {date || 'Select Date'}
                    </Button>
                    <Button
                      mode="outlined"
                      textColor="#374151"
                      icon="clock-outline"
                      onPress={openTimePicker}
                      style={styles.pickerButton}
                      contentStyle={styles.pickerButtonContent}
                    >
                      {time || 'Select Time'}
                    </Button>
                    <TextInput
                      left={<TextInput.Icon icon="map-marker-outline" />}
                      label="Location"
                      value={location}
                      onChangeText={setLocation}
                      mode="outlined"
                      placeholder="Main Hall"
                      style={styles.input}
                      theme={inputTheme}
                      textColor="#111827"
                    />
                  </View>

                  <View style={styles.formActions}>
                    <Menu
                      visible={statusOpen}
                      onDismiss={() => setStatusOpen(false)}
                      anchor={
                        <Button mode="outlined" textColor="#111827" icon="chevron-down" onPress={() => setStatusOpen(true)}>
                          {titleCaseStatus(status)}
                        </Button>
                      }
                    >
                      <Menu.Item onPress={() => { setStatus('open'); setStatusOpen(false); }} title="Open" />
                      <Menu.Item onPress={() => { setStatus('upcoming'); setStatusOpen(false); }} title="Upcoming" />
                      <Menu.Item onPress={() => { setStatus('completed'); setStatusOpen(false); }} title="Completed" />
                    </Menu>
                    <Button mode="outlined" textColor="#111827" icon="refresh" onPress={resetForm}>
                      Clear
                    </Button>
                    <Button mode="contained" textColor="#ffffff" icon="plus" onPress={submit} loading={saving} disabled={saving} style={styles.createButton}>
                      Add Meeting
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </>
          ) : null}

          {roomOnly ? (
          <Card mode="outlined" style={styles.tableCard}>
            <Card.Content>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Teams-style Meeting Room</Text>
                  <Text style={styles.sectionSubtitle}>Start a meeting, track participants, chat, capture notes, and summarize the discussion with AI.</Text>
                </View>
                <MaterialCommunityIcons name="robot-outline" size={26} color="#111827" />
              </View>
              <View style={styles.teamsRoom}>
                <View style={styles.teamsSidebar}>
                  <View style={styles.meetingSidebarHeader}>
                    <Text style={styles.teamsSidebarTitle}>Meetings</Text>
                  </View>
                  <ScrollView style={styles.meetingPicker} contentContainerStyle={styles.meetingPickerContent}>
                    {sortedSessions.map((session) => {
                      const active = session.id === selectedRoomSession?.id;
                      const liveLog = sortedLogs.find((log) => log.sessionId === session.id && log.status === 'live');
                      const canManageSession = role === 'admin' || session.hostId === currentUser?.id;

                      return (
                        <View key={`room-${session.id}`} style={[styles.meetingRoomListItem, active && styles.meetingRoomListItemActive]}>
                          <Button
                            mode="text"
                            textColor={active ? '#ffffff' : '#111827'}
                            icon={liveLog ? 'broadcast' : 'calendar-outline'}
                            onPress={() => setSelectedRoomSessionId(session.id)}
                            style={styles.meetingRoomSelectButton}
                            contentStyle={styles.meetingPickContent}
                          >
                            {session.title}
                          </Button>
                          <View style={styles.meetingRoomItemActions}>
                            <Button compact mode="text" textColor={active ? '#ffffff' : '#111827'} icon="email-outline" onPress={() => openInviteModal(session)}>
                              Invite
                            </Button>
                            {canManageSession ? (
                              <Button compact mode="text" textColor={active ? '#fecaca' : '#b91c1c'} icon="delete-outline" onPress={() => confirmDelete(session)}>
                                Delete
                              </Button>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>

                {selectedRoomSession ? (
                  <View style={styles.teamsMain}>
                    <View style={styles.teamsCallArea}>
                      <View style={styles.teamsTopBar}>
                        <View>
                          <Text style={styles.teamsEyebrow}>{selectedLiveLog ? 'LIVE NOW' : 'MEETING ROOM'}</Text>
                          <Text style={styles.teamsTitle}>{selectedRoomSession.title}</Text>
                          <Text style={styles.teamsMeta}>{selectedRoomSession.date} at {selectedRoomSession.time} - {selectedRoomSession.location}</Text>
                        </View>
                        <View style={[styles.liveBadge, selectedLiveLog ? styles.liveBadgeActive : styles.teamsBadgeIdle]}>
                          <MaterialCommunityIcons name={selectedLiveLog ? 'record-circle-outline' : 'timer-outline'} size={18} color={selectedLiveLog ? '#ffffff' : '#111827'} />
                          <Text style={[styles.liveBadgeText, { color: selectedLiveLog ? '#ffffff' : '#111827' }]}>
                            {selectedLiveLog ? 'Live' : titleCaseStatus(selectedRoomSession.status)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.teamsStage}>
                        <View style={styles.speakerTile}>
                          <View style={styles.speakerAvatar}>
                            <Text style={styles.speakerInitials}>{(selectedLiveLog?.startedByName ?? currentUser?.name ?? 'FH').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</Text>
                          </View>
                          <Text style={styles.speakerName}>{selectedLiveLog?.startedByName ?? 'Ready to start'}</Text>
                          <Text style={styles.speakerStatus}>
                            {selectedLiveLog ? `Meeting time ${formatClockFromMs(selectedElapsedMs)}` : 'Press Start Meeting to open the room'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.teamsParticipantStrip}>
                        {selectedLatestLog?.participantNames.length ? selectedLatestLog.participantNames.map((name, index) => {
                          const participantActive = normalizeSpeakerLabel(name) === normalizeSpeakerLabel(activeSpeakerName);
                          return (
                          <View key={`${name}-${index}`} style={[styles.teamsParticipantTile, participantActive && styles.teamsParticipantTileActive]}>
                            <View style={styles.teamsMiniAvatar}>
                              <Text style={styles.teamsMiniInitials}>{name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</Text>
                            </View>
                            <Text style={styles.teamsParticipantName}>{name}</Text>
                            {participantActive ? <Text style={styles.activeSpeakerPill}>Speaking</Text> : null}
                          </View>
                        );
                        }) : (
                          <Text style={styles.teamsNoParticipants}>No participants yet.</Text>
                        )}
                      </View>

                      <View style={styles.teamsControls}>
                        {selectedLiveLog ? (
                          <>
                            <Button mode="contained-tonal" textColor="#111827" icon={selectedIsParticipant ? 'check-circle-outline' : 'account-plus-outline'} disabled={selectedIsParticipant} onPress={() => handleJoinMeeting(selectedRoomSession.id)} style={styles.teamsControlButton}>
                              {selectedIsParticipant ? 'Joined' : 'Join'}
                            </Button>
                            <Button mode="contained-tonal" textColor="#111827" icon="message-text-outline" onPress={() => setMeetingChatOpen(true)} style={styles.teamsControlButton}>
                              Chat
                            </Button>
                            {listening ? (
                              <Button mode="contained-tonal" buttonColor="#e5e7eb" textColor="#111827" icon="microphone-off" onPress={stopListening} style={styles.teamsControlButton}>
                                Stop AI
                              </Button>
                            ) : (
                              <Button mode="contained-tonal" textColor="#111827" icon="microphone" disabled={!canUseSpeakingControls} onPress={startListening} style={styles.teamsControlButton}>
                                AI Listen
                              </Button>
                            )}
                            <Button mode="contained-tonal" textColor="#111827" icon="auto-fix" onPress={() => setMeetingAiOpen(true)} style={styles.teamsControlButton}>
                              AI Summary
                            </Button>
                            {selectedIsParticipant ? (
                              <Button mode="contained" textColor="#ffffff" buttonColor="#b91c1c" icon="phone-hangup" onPress={() => handleLeaveMeeting(selectedRoomSession.id)} style={styles.teamsEndButton}>
                                Leave
                              </Button>
                            ) : null}
                            {selectedCanEndMeeting ? (
                              <Button mode="contained" textColor="#ffffff" buttonColor="#7f1d1d" icon="stop-circle-outline" onPress={() => handleCloseMeeting(selectedRoomSession.id)} style={styles.teamsEndButton}>
                                End Meeting
                              </Button>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <Button mode="contained-tonal" textColor="#111827" icon="message-text-outline" onPress={() => setMeetingChatOpen(true)} style={styles.teamsControlButton}>
                              Chat
                            </Button>
                            <Button mode="contained-tonal" textColor="#111827" icon="auto-fix" onPress={() => setMeetingAiOpen(true)} style={styles.teamsControlButton}>
                              AI Summary
                            </Button>
                            <Button mode="contained" textColor="#ffffff" icon="video-outline" onPress={() => handleStartMeeting(selectedRoomSession.id)} style={styles.teamsStartButton}>
                              Start Meeting
                            </Button>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.emptyLog}>Create a meeting first before using the tracker.</Text>
                )}
              </View>
            </Card.Content>
          </Card>
          ) : null}

          {!roomOnly ? (
            <Card mode="outlined" style={styles.tableCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Meeting List</Text>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Meeting</DataTable.Title>
                  <DataTable.Title>Date</DataTable.Title>
                  <DataTable.Title>Time</DataTable.Title>
                  <DataTable.Title>Location</DataTable.Title>
                  <DataTable.Title>Status</DataTable.Title>
                  <DataTable.Title>Action</DataTable.Title>
                </DataTable.Header>
                {sortedSessions.map((session) => (
                  <DataTable.Row key={session.id}>
                    <DataTable.Cell>{session.title}</DataTable.Cell>
                    <DataTable.Cell>{session.date}</DataTable.Cell>
                    <DataTable.Cell>{session.time}</DataTable.Cell>
                    <DataTable.Cell>{session.location}</DataTable.Cell>
                    <DataTable.Cell>{titleCaseStatus(session.status)}</DataTable.Cell>
                    <DataTable.Cell>
                      {role === 'admin' || session.hostId === currentUser?.id ? (
                        <View style={styles.tableActions}>
                          <Button compact mode="text" textColor="#111827" icon="email-outline" onPress={() => openInviteModal(session)}>
                            Invite
                          </Button>
                          <Button compact mode="text" textColor="#b91c1c" icon="delete-outline" onPress={() => confirmDelete(session)}>
                            Delete
                          </Button>
                        </View>
                      ) : (
                        <Text style={styles.lockedAction}>Hosted</Text>
                      )}
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </Card.Content>
          </Card>
          ) : null}

          {!roomOnly ? (
            <Card mode="outlined" style={styles.tableCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>Meeting Time Logs</Text>
              {sortedLogs.length ? (
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title>Meeting</DataTable.Title>
                    <DataTable.Title>Started By</DataTable.Title>
                    <DataTable.Title>Duration</DataTable.Title>
                    <DataTable.Title numeric>Participants</DataTable.Title>
                    <DataTable.Title>Names</DataTable.Title>
                  </DataTable.Header>
                  {sortedLogs.map((log) => (
                    <DataTable.Row key={log.id}>
                      <DataTable.Cell>{log.sessionTitle}</DataTable.Cell>
                      <DataTable.Cell>{log.startedByName}</DataTable.Cell>
                      <DataTable.Cell>
                        {log.status === 'live'
                          ? `${formatMeetingDuration(getLiveMinutes(log.startedAt, clockNow))} live`
                          : formatMeetingDuration(log.durationMinutes)}
                      </DataTable.Cell>
                      <DataTable.Cell numeric>{log.participantIds.length}</DataTable.Cell>
                      <DataTable.Cell>{log.participantNames.join(', ') || '-'}</DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>
              ) : (
                <Text style={styles.emptyLog}>No meeting time logs yet. Start and close a meeting to create one.</Text>
              )}
            </Card.Content>
          </Card>
          ) : null}

          <Portal>
            <Modal
              visible={meetingChatOpen}
              onDismiss={() => setMeetingChatOpen(false)}
              contentContainerStyle={styles.modalWrap}
            >
              <Card mode="outlined" style={styles.meetingToolModal}>
                <Card.Content style={styles.meetingToolContent}>
                  <View style={styles.teamsPanelHeader}>
                    <View>
                      <Text style={styles.meetingToolTitle}>Meeting chat</Text>
                      <Text style={styles.meetingToolSubtitle}>{selectedRoomSession?.title ?? 'Selected meeting'}</Text>
                    </View>
                    <Button compact mode="outlined" textColor="#111827" onPress={() => setMeetingChatOpen(false)}>
                      Close
                    </Button>
                  </View>
                  <ScrollView style={styles.teamsChatListLarge} contentContainerStyle={styles.teamsChatContent}>
                    {selectedMeetingChat.length ? selectedMeetingChat.map((message) => (
                      <View key={message.id} style={styles.teamsChatBubble}>
                        <Text style={styles.teamsChatAuthor}>{message.author}</Text>
                        <Text style={styles.teamsChatText}>{message.text}</Text>
                      </View>
                    )) : (
                      <Text style={styles.teamsEmptyText}>No chat yet. Send a message during the meeting.</Text>
                    )}
                  </ScrollView>
                  <View style={styles.teamsComposer}>
                    <TextInput
                      label="Message"
                      value={meetingChatText}
                      onChangeText={setMeetingChatText}
                      mode="outlined"
                      dense
                      style={styles.teamsChatInput}
                      theme={inputTheme}
                      textColor="#111827"
                    />
                    <Button mode="contained" textColor="#ffffff" icon="send" style={styles.teamsSendButton} onPress={sendMeetingChat}>
                      Send
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </Modal>

            <Modal
              visible={meetingAiOpen}
              onDismiss={() => setMeetingAiOpen(false)}
              contentContainerStyle={styles.modalWrap}
            >
              <Card mode="outlined" style={styles.meetingToolModal}>
                <ScrollView style={styles.meetingToolScroll} contentContainerStyle={styles.meetingToolScrollContent}>
                  <View style={styles.teamsPanelHeader}>
                    <View>
                      <Text style={styles.meetingToolTitle}>AI meeting summarizer</Text>
                      <Text style={styles.meetingToolSubtitle}>
                        {speechSupported ? (listening ? 'Listening now' : 'Capture notes, then summarize with Groq') : 'Type or paste notes, then summarize with Groq'}
                      </Text>
                    </View>
                    <Button compact mode="outlined" textColor="#111827" onPress={() => setMeetingAiOpen(false)}>
                      Close
                    </Button>
                  </View>

                  <View style={styles.meetingToolActions}>
                    {listening ? (
                      <Button mode="contained-tonal" buttonColor="#e5e7eb" textColor="#111827" icon="microphone-off" onPress={stopListening}>
                        Stop listening
                      </Button>
                    ) : (
                      <Button mode="outlined" textColor="#111827" icon="microphone" disabled={!selectedLiveLog || !canUseSpeakingControls} onPress={startListening}>
                        Listen
                      </Button>
                    )}
                    <Button mode="contained" textColor="#ffffff" icon="text-box-search-outline" loading={summaryLoading} disabled={summaryLoading} style={styles.teamsSendButton} onPress={summarizeMeeting}>
                      Summarize
                    </Button>
                    <Button mode="outlined" textColor="#111827" icon="content-save-outline" loading={summarySaving} disabled={summarySaving || !meetingSummary.trim()} onPress={saveMeetingSummary}>
                      Save Summary
                    </Button>
                    <Button mode="outlined" textColor="#111827" icon="file-document-outline" loading={summarySaving} disabled={summarySaving || !meetingTranscript.trim()} onPress={saveMeetingTranscript}>
                      Save Transcript
                    </Button>
                  </View>
                  {memberMustEnterSpeakerName && !memberSpeakerNameValid ? (
                    <View style={styles.speakerNameNotice}>
                      <MaterialCommunityIcons name="account-alert-outline" size={20} color="#b91c1c" />
                      <Text style={styles.speakerNameNoticeText}>Please enter your name before speaking.</Text>
                    </View>
                  ) : null}

                  <View style={styles.liveTranscriptPanel}>
                    <View style={styles.liveTranscriptHeader}>
                      <View>
                        <Text style={styles.liveTranscriptTitle}>Live speaker transcript</Text>
                        <Text style={styles.liveTranscriptHint}>Choose who is speaking before they talk.</Text>
                      </View>
                      <View style={styles.liveTranscriptHeaderActions}>
                        {selectedCanResetConversation ? (
                          <Button compact mode="text" textColor="#b91c1c" icon="restart" onPress={() => setResetConversationPending(true)}>
                            Reset Conversation
                          </Button>
                        ) : null}
                        {memberMustEnterSpeakerName ? (
                          <View style={styles.memberSpeakerNameBox}>
                            <TextInput
                              label="Your speaking name"
                              value={selectedMemberSpeakerName}
                              onChangeText={(value) => {
                                if (selectedRoomSession) {
                                  setMemberSpeakerNames((current) => ({ ...current, [selectedRoomSession.id]: value }));
                                }
                              }}
                              onBlur={() => setSpeakerNameTouched(true)}
                              mode="outlined"
                              dense
                              placeholder="Enter your name"
                              style={styles.memberSpeakerNameInput}
                              theme={inputTheme}
                              textColor="#111827"
                              error={speakerNameTouched && !memberSpeakerNameValid}
                            />
                            {speakerNameTouched && !memberSpeakerNameValid ? (
                              <Text style={styles.memberSpeakerNameError}>Please enter your name before speaking.</Text>
                            ) : (
                              <Text style={styles.memberSpeakerNameHint}>This name will appear in the live transcript.</Text>
                            )}
                          </View>
                        ) : (
                          <Menu
                            visible={speakerMenuOpen}
                            onDismiss={() => setSpeakerMenuOpen(false)}
                            anchor={(
                              <Button mode="outlined" textColor="#111827" icon="account-voice" onPress={() => setSpeakerMenuOpen(true)}>
                                {normalizeSpeakerLabel(activeSpeakerName || speakerOptions[0])}
                              </Button>
                            )}
                          >
                            {speakerOptions.map((speaker) => (
                              <Menu.Item
                                key={speaker}
                                title={normalizeSpeakerLabel(speaker)}
                                onPress={() => {
                                  setActiveSpeakerName(speaker);
                                  setSpeakerMenuOpen(false);
                                }}
                              />
                            ))}
                          </Menu>
                        )}
                      </View>
                    </View>
                    <ScrollView style={styles.liveTranscriptList} contentContainerStyle={styles.liveTranscriptContent}>
                      {selectedTranscriptSegments.length ? selectedTranscriptSegments.map((segment) => (
                        <View key={segment.id} style={styles.transcriptLine}>
                          <View style={styles.transcriptSpeakerRow}>
                            <View>
                              <Text style={styles.transcriptSpeaker}>{normalizeSpeakerLabel(segment.speaker)}</Text>
                            </View>
                            {selectedCanResetConversation ? (
                              <Menu
                                visible={speakerCorrectionId === segment.id}
                                onDismiss={() => setSpeakerCorrectionId(null)}
                                anchor={(
                                  <Button compact mode="text" textColor="#111827" icon="account-edit-outline" onPress={() => setSpeakerCorrectionId(segment.id)}>
                                    Correct
                                  </Button>
                                )}
                              >
                                {correctionSpeakerOptions.map((speaker) => (
                                  <Menu.Item
                                    key={`${segment.id}-${speaker}`}
                                    title={normalizeSpeakerLabel(speaker)}
                                    onPress={() => correctTranscriptSpeaker(segment.speaker, speaker)}
                                  />
                                ))}
                              </Menu>
                            ) : null}
                          </View>
                          <Text style={styles.transcriptText}>{segment.text}</Text>
                        </View>
                      )) : (
                        <Text style={styles.meetingSummaryPlaceholder}>Shared transcript messages will stay here for the whole meeting.</Text>
                      )}
                      {interimTranscript ? (
                        <View style={[styles.transcriptLine, styles.transcriptLineInterim]}>
                          <Text style={styles.transcriptSpeaker}>{normalizeSpeakerLabel(activeSpeakerName || speakerOptions[0])}</Text>
                          <Text style={styles.transcriptText}>{interimTranscript}</Text>
                        </View>
                      ) : null}
                    </ScrollView>
                  </View>

                  <TextInput
                    label="Transcript or notes"
                    value={meetingTranscript}
                    onChangeText={setMeetingTranscript}
                    mode="outlined"
                    multiline
                    placeholder="Live transcript or typed meeting notes..."
                    style={styles.meetingToolNotesInput}
                    theme={inputTheme}
                    textColor="#111827"
                  />
                  {interimTranscript ? <Text style={styles.interimTranscript}>Listening: {interimTranscript}</Text> : null}
                  <View style={styles.teamsSummaryBox}>
                    <Text style={styles.meetingSummaryTitle}>AI summary {meetingSummary ? `(${meetingSummaryProvider})` : ''}</Text>
                    {meetingSummary ? (
                      <View style={styles.summarySections}>{renderFormattedSummary(meetingSummary)}</View>
                    ) : (
                      <Text style={styles.meetingSummaryPlaceholder}>Capture the discussion, then press Summarize.</Text>
                    )}
                  </View>
                  <Button compact mode="text" textColor="#6b7280" icon="delete-outline" onPress={clearMeetingNotes}>
                    Clear notes
                  </Button>
                  <View style={styles.savedMeetingSummaries}>
                    <View style={styles.summaryHeaderRow}>
                      <Text style={styles.meetingSummaryTitle}>Saved summaries for this meeting</Text>
                      <Text style={styles.savedSummaryCount}>{selectedSavedSummaries.length}</Text>
                    </View>
                    {selectedSavedSummaries.length ? selectedSavedSummaries.map((summary) => (
                      <View key={summary.id} style={styles.savedSummaryItem}>
                        <View style={styles.savedSummaryCopy}>
                          <Text style={styles.savedSummaryTitle} numberOfLines={1}>{summary.session}</Text>
                          <Text style={styles.savedSummaryMeta}>
                            {new Date(summary.createdAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </Text>
                        </View>
                        <View style={styles.savedSummaryActions}>
                          <Button compact mode="outlined" textColor="#111827" icon="folder-open-outline" onPress={() => openSavedMeetingSummary(summary)}>
                            Open
                          </Button>
                          <Button
                            compact
                            mode="text"
                            textColor="#b91c1c"
                            icon="delete-outline"
                            loading={summaryDeletingId === summary.id}
                            disabled={summaryDeletingId === summary.id}
                            onPress={() => deleteSavedMeetingSummary(summary)}
                          >
                            Delete
                          </Button>
                        </View>
                      </View>
                    )) : (
                      <Text style={styles.meetingSummaryPlaceholder}>No saved summaries yet. Press Summarize to generate and save one.</Text>
                    )}
                  </View>
                </ScrollView>
              </Card>
            </Modal>

            <Modal
              visible={dateOpen}
              onDismiss={() => setDateOpen(false)}
              contentContainerStyle={styles.modalWrap}
            >
              <Card mode="outlined" style={styles.calendarCard}>
                <Card.Content>
                  <View style={styles.calendarHeader}>
                    <Button compact mode="text" textColor="#111827" icon="chevron-left" onPress={() => setCalendarMonth((current) => shiftMonth(current, -1))}>
                      Prev
                    </Button>
                    <Text style={styles.calendarTitle}>{formatMonthTitle(calendarMonth)}</Text>
                    <Button compact mode="text" textColor="#111827" contentStyle={styles.nextMonthButton} onPress={() => setCalendarMonth((current) => shiftMonth(current, 1))}>
                      Next
                    </Button>
                  </View>
                  <View style={styles.weekdayGrid}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((weekday) => (
                      <Text key={weekday} style={styles.weekdayText}>{weekday}</Text>
                    ))}
                  </View>
                  <View style={styles.calendarGrid}>
                    {calendarDays.map((day, index) => {
                      const isSelected = day && selectedDate ? isSameCalendarDay(day, selectedDate) : false;
                      const isToday = day ? isSameCalendarDay(day, new Date()) : false;

                      return (
                        <Button
                          key={getCalendarDayKey(day, index)}
                          mode={isSelected ? 'contained' : 'text'}
                          compact
                          disabled={!day}
                          textColor={isSelected ? '#ffffff' : '#111827'}
                          style={[styles.dayButton, isToday && !isSelected ? styles.todayButton : null]}
                          contentStyle={styles.dayButtonContent}
                          onPress={() => {
                            if (!day) return;
                            setDate(formatSessionDate(day));
                            setDateOpen(false);
                          }}
                        >
                          {day ? String(day.getDate()) : ' '}
                        </Button>
                      );
                    })}
                  </View>
                  <View style={styles.pickerActions}>
                    <Button mode="outlined" textColor="#111827" onPress={() => setDateOpen(false)}>
                      Cancel
                    </Button>
                    <Button mode="contained" textColor="#ffffff" style={styles.createButton} onPress={() => {
                      const today = new Date();
                      setDate(formatSessionDate(today));
                      setCalendarMonth(today);
                      setDateOpen(false);
                    }}>
                      Today
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </Modal>

            <Modal
              visible={timeOpen}
              onDismiss={() => setTimeOpen(false)}
              contentContainerStyle={styles.modalWrap}
            >
              <Card mode="outlined" style={styles.timeCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.pickerTitle}>Select Time</Text>
                  <View style={styles.timePreview}>
                    <MaterialCommunityIcons name="clock-outline" size={24} color="#111827" />
                    <Text style={styles.timePreviewText}>{buildTime(timeDraft.hour, timeDraft.minute, timeDraft.period) || 'Choose a time'}</Text>
                  </View>
                  <View style={styles.timeColumns}>
                    <ScrollView style={styles.timeColumn}>
                      {timeParts.hours.map((hour) => (
                        <Button
                          key={hour}
                          mode={timeDraft.hour === hour ? 'contained' : 'text'}
                          textColor={timeDraft.hour === hour ? '#ffffff' : '#111827'}
                          style={styles.timeOption}
                          onPress={() => setTimeDraft((current) => ({ ...current, hour }))}
                        >
                          {hour}
                        </Button>
                      ))}
                    </ScrollView>
                    <ScrollView style={styles.timeColumn}>
                      {timeParts.minutes.map((minute) => (
                        <Button
                          key={minute}
                          mode={timeDraft.minute === minute ? 'contained' : 'text'}
                          textColor={timeDraft.minute === minute ? '#ffffff' : '#111827'}
                          style={styles.timeOption}
                          onPress={() => setTimeDraft((current) => ({ ...current, minute }))}
                        >
                          {minute}
                        </Button>
                      ))}
                    </ScrollView>
                    <View style={styles.periodColumn}>
                      {timeParts.periods.map((period) => (
                        <Button
                          key={period}
                          mode={timeDraft.period === period ? 'contained' : 'outlined'}
                          textColor={timeDraft.period === period ? '#ffffff' : '#111827'}
                          style={styles.timeOption}
                          onPress={() => setTimeDraft((current) => ({ ...current, period }))}
                        >
                          {period}
                        </Button>
                      ))}
                    </View>
                  </View>
                  <View style={styles.pickerActions}>
                    <Button mode="outlined" textColor="#111827" onPress={() => setTimeOpen(false)}>
                      Cancel
                    </Button>
                    <Button mode="contained" textColor="#ffffff" style={styles.createButton} onPress={saveTimePicker}>
                      Set Time
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </Modal>

            <Modal
              visible={Boolean(sessionToInvite)}
              onDismiss={() => setSessionToInvite(null)}
              contentContainerStyle={styles.modalWrap}
            >
              <Card mode="outlined" style={styles.inviteCard}>
                <Card.Content style={styles.inviteContent}>
                  <View style={styles.teamsPanelHeader}>
                    <View>
                      <Text variant="titleLarge" style={styles.confirmTitle}>Invite members</Text>
                      <Text style={styles.confirmMessage}>
                        {sessionToInvite ? `${sessionToInvite.title} - ${sessionToInvite.date} at ${sessionToInvite.time}` : ''}
                      </Text>
                    </View>
                    <Button compact mode="outlined" textColor="#111827" onPress={() => setSessionToInvite(null)}>
                      Close
                    </Button>
                  </View>
                  <TextInput
                    label="Group name"
                    value={inviteGroupName}
                    onChangeText={setInviteGroupName}
                    mode="outlined"
                    style={styles.input}
                    theme={inputTheme}
                    textColor="#111827"
                  />
                  <Text style={styles.inviteLabel}>Members to invite</Text>
                  <View style={styles.inviteChips}>
                    {inviteMembers.length ? inviteMembers.map((member) => {
                      const selected = inviteMemberIds.includes(member.id);
                      return (
                        <Chip
                          key={member.id}
                          selected={selected}
                          showSelectedOverlay={false}
                          icon={selected ? 'check' : 'account-outline'}
                          onPress={() => toggleInviteMember(member.id)}
                          style={[styles.inviteChip, selected && styles.inviteChipSelected]}
                          textStyle={[styles.inviteChipText, selected && styles.inviteChipTextSelected]}
                        >
                          {member.name}
                        </Chip>
                      );
                    }) : (
                      <Text style={styles.emptyLog}>No members available to invite yet.</Text>
                    )}
                  </View>
                  <View style={styles.confirmActions}>
                    <Button mode="outlined" textColor="#111827" onPress={() => setSessionToInvite(null)}>
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      textColor="#ffffff"
                      style={styles.createButton}
                      loading={inviting}
                      disabled={inviting}
                      icon="send"
                      onPress={sendMeetingInvites}
                    >
                      Send Invites
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </Modal>

            <Modal
              visible={resetConversationPending}
              onDismiss={() => setResetConversationPending(false)}
              contentContainerStyle={styles.modalWrap}
            >
              <Card mode="outlined" style={styles.confirmCard}>
                <Card.Content style={styles.confirmContent}>
                  <View style={styles.confirmIconWrap}>
                    <MaterialCommunityIcons name="restart-alert" size={34} color="#b91c1c" />
                  </View>
                  <Text variant="titleLarge" style={styles.confirmTitle}>Reset conversation?</Text>
                  <Text style={styles.confirmMessage}>
                    This will clear the current speaker transcript for {selectedRoomSession?.title ?? 'this meeting'} and start a new empty transcript.
                  </Text>
                  <View style={styles.confirmActions}>
                    <Button mode="outlined" textColor="#111827" onPress={() => setResetConversationPending(false)}>
                      Cancel
                    </Button>
                    <Button mode="contained" textColor="#ffffff" style={styles.deleteButton} onPress={resetConversation}>
                      Reset
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </Modal>

            <Modal
              visible={Boolean(sessionToDelete)}
              onDismiss={() => setSessionToDelete(null)}
              contentContainerStyle={styles.modalWrap}
            >
              <Card mode="outlined" style={styles.confirmCard}>
                <Card.Content style={styles.confirmContent}>
                  <View style={styles.confirmIconWrap}>
                    <MaterialCommunityIcons name="delete-alert-outline" size={34} color="#b91c1c" />
                  </View>
                  <Text variant="titleLarge" style={styles.confirmTitle}>Delete session?</Text>
                  <Text style={styles.confirmMessage}>
                    {sessionToDelete
                      ? `Delete ${sessionToDelete.title} from ${sessionToDelete.date}? Attendance and feedback for this session will also be removed.`
                      : ''}
                  </Text>
                  <View style={styles.confirmActions}>
                    <Button mode="outlined" textColor="#111827" onPress={() => setSessionToDelete(null)}>
                      Cancel
                    </Button>
                    <Button
                      mode="contained"
                      textColor="#ffffff"
                      style={styles.deleteButton}
                      loading={deleting}
                      disabled={deleting}
                      onPress={deleteSelectedSession}
                    >
                      Delete
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            </Modal>
          </Portal>
        </View>
    </AppShell>
  );
}

export default function Sessions() {
  return <SessionsScreen />;
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
  formCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  sectionTitle: { color: '#111827', fontWeight: '900', marginBottom: 14 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 },
  input: { flexBasis: 240, flexGrow: 1, minHeight: 50, backgroundColor: '#ffffff' },
  pickerButton: {
    flexBasis: 240,
    flexGrow: 1,
    minHeight: 50,
    justifyContent: 'center',
    borderColor: '#6b7280',
    borderRadius: 4,
  },
  pickerButtonContent: {
    minHeight: 50,
    justifyContent: 'flex-start',
  },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  createButton: { backgroundColor: '#111827' },
  tableCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  tableActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  sectionSubtitle: { color: '#374151', lineHeight: 20 },
  trackerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teamsRoom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  teamsSidebar: {
    flexBasis: 230,
    flexGrow: 1,
    maxHeight: 620,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 10,
  },
  meetingSidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  teamsSidebarTitle: { color: '#111827', fontWeight: '900', fontSize: 15 },
  teamsMain: {
    flexBasis: 720,
    flexGrow: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  teamsCallArea: {
    flexBasis: 460,
    flexGrow: 3,
    borderRadius: 14,
    backgroundColor: '#202124',
    padding: 14,
    gap: 12,
  },
  teamsTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  teamsEyebrow: { color: '#a7f3d0', fontSize: 12, fontWeight: '900', letterSpacing: 0 },
  teamsTitle: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  teamsMeta: { color: '#d1d5db', marginTop: 4 },
  teamsBadgeIdle: { backgroundColor: '#e5e7eb' },
  teamsStage: {
    minHeight: 280,
    borderRadius: 14,
    backgroundColor: '#2f3136',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  speakerTile: { alignItems: 'center', gap: 10 },
  speakerAvatar: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerInitials: { color: '#ffffff', fontSize: 36, fontWeight: '900' },
  speakerName: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  speakerStatus: { color: '#d1d5db', textAlign: 'center' },
  teamsParticipantStrip: {
    minHeight: 88,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teamsParticipantTile: {
    width: 112,
    borderRadius: 10,
    backgroundColor: '#111827',
    padding: 8,
    alignItems: 'center',
    gap: 6,
  },
  teamsParticipantTileActive: {
    borderWidth: 2,
    borderColor: '#a7f3d0',
  },
  teamsMiniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamsMiniInitials: { color: '#ffffff', fontWeight: '900' },
  teamsParticipantName: { color: '#ffffff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  activeSpeakerPill: {
    color: '#bbf7d0',
    fontSize: 10,
    fontWeight: '900',
  },
  teamsNoParticipants: {
    color: '#d1d5db',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 10,
    padding: 12,
    flex: 1,
  },
  teamsControls: {
    minHeight: 58,
    borderRadius: 999,
    backgroundColor: '#111827',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    padding: 10,
  },
  teamsControlButton: { borderRadius: 999 },
  teamsStartButton: { backgroundColor: '#111827', borderRadius: 999 },
  teamsEndButton: { borderRadius: 999 },
  teamsSidePanel: {
    flexBasis: 300,
    flexGrow: 2,
    gap: 12,
  },
  teamsPanelSection: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 10,
  },
  teamsPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  teamsPanelTitle: { color: '#111827', fontWeight: '900', fontSize: 15 },
  teamsChatList: { maxHeight: 190 },
  teamsChatListLarge: { maxHeight: 380 },
  teamsChatContent: { gap: 8, paddingVertical: 4 },
  teamsChatBubble: {
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    padding: 10,
    gap: 2,
  },
  teamsChatAuthor: { color: '#111827', fontSize: 12, fontWeight: '900' },
  teamsChatText: { color: '#111827', lineHeight: 19 },
  teamsEmptyText: { color: '#6b7280', lineHeight: 20 },
  teamsComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  teamsChatInput: { flex: 1, backgroundColor: '#ffffff' },
  teamsSendButton: { backgroundColor: '#111827', marginBottom: 2 },
  speakerNameNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
  },
  speakerNameNoticeText: { color: '#991b1b', fontWeight: '700' },
  teamsNotesInput: {
    minHeight: 100,
    backgroundColor: '#ffffff',
  },
  teamsSummaryBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    padding: 10,
    gap: 6,
  },
  liveTranscriptPanel: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 10,
  },
  liveTranscriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  liveTranscriptHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexWrap: 'wrap',
  },
  memberSpeakerNameBox: {
    minWidth: 220,
    maxWidth: 320,
    gap: 4,
  },
  memberSpeakerNameInput: {
    backgroundColor: '#ffffff',
  },
  memberSpeakerNameError: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
  },
  memberSpeakerNameHint: {
    color: '#6b7280',
    fontSize: 12,
  },
  liveTranscriptTitle: { color: '#111827', fontWeight: '900', fontSize: 15 },
  liveTranscriptHint: { color: '#6b7280', marginTop: 2 },
  liveTranscriptList: {
    maxHeight: 240,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  liveTranscriptContent: { padding: 10, gap: 8 },
  transcriptLine: {
    borderLeftWidth: 4,
    borderLeftColor: '#111827',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  transcriptLineInterim: {
    opacity: 0.7,
    borderLeftColor: '#6b7280',
  },
  transcriptSpeaker: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
  },
  transcriptSpeakerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  transcriptText: {
    color: '#111827',
    lineHeight: 20,
  },
  meetingToolModal: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '88%',
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  meetingToolContent: { gap: 12 },
  meetingToolScroll: { maxHeight: 720 },
  meetingToolScrollContent: { gap: 12, padding: 16 },
  meetingToolTitle: { color: '#111827', fontSize: 22, fontWeight: '900' },
  meetingToolSubtitle: { color: '#6b7280', marginTop: 2 },
  meetingToolActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meetingToolNotesInput: {
    minHeight: 150,
    backgroundColor: '#ffffff',
  },
  meetRoom: {
    flexDirection: 'row',
    gap: 14,
    flexWrap: 'wrap',
  },
  meetingPicker: {
    flexBasis: 220,
    flexGrow: 1,
    maxHeight: 360,
  },
  meetingPickerContent: { gap: 8 },
  meetingPickButton: {
    borderRadius: 8,
    alignItems: 'stretch',
  },
  meetingPickContent: {
    minHeight: 48,
    justifyContent: 'flex-start',
  },
  meetingRoomListItem: {
    borderWidth: 1,
    borderColor: '#6b7280',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 2,
  },
  meetingRoomListItemActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  meetingRoomSelectButton: {
    alignItems: 'stretch',
    borderRadius: 6,
  },
  meetingRoomItemActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  roomStage: {
    flexBasis: 520,
    flexGrow: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 16,
    gap: 14,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  roomEyebrow: { color: '#6b7280', fontSize: 12, fontWeight: '900', letterSpacing: 0 },
  roomTitle: { color: '#111827', fontSize: 24, fontWeight: '900', marginTop: 4 },
  roomMeta: { color: '#374151', marginTop: 4 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  liveBadgeActive: { backgroundColor: '#dc2626' },
  liveBadgeIdle: { backgroundColor: '#e5e7eb' },
  liveBadgeText: { fontWeight: '900' },
  timerPanel: {
    borderRadius: 12,
    backgroundColor: '#111827',
    padding: 18,
    alignItems: 'center',
  },
  timerLabel: { color: '#cbd5e1', fontWeight: '800' },
  timerValue: { color: '#ffffff', fontSize: 48, fontWeight: '900', marginVertical: 4 },
  timerSubtext: { color: '#e5e7eb', textAlign: 'center' },
  participantsPanel: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 10,
  },
  participantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  participantsTitle: { color: '#111827', fontWeight: '900' },
  participantsCount: { color: '#111827', fontWeight: '900' },
  participantChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  participantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
  },
  participantName: { color: '#111827', fontWeight: '700' },
  noParticipants: { color: '#6b7280' },
  roomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  roomButton: { borderRadius: 999 },
  startMeetingButton: { backgroundColor: '#111827' },
  meetingAiPanel: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 12,
  },
  meetingAiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 12,
  },
  meetingAiTitle: { color: '#111827', fontSize: 16, fontWeight: '900' },
  meetingAiSubtitle: { color: '#6b7280', marginTop: 2 },
  meetingAiActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meetingNotesInput: {
    minHeight: 110,
    backgroundColor: '#f8fafc',
  },
  interimTranscript: {
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  meetingAiFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  meetingAiHint: { color: '#6b7280', flexShrink: 1 },
  meetingSummaryBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    padding: 12,
    gap: 8,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  meetingSummaryTitle: { color: '#111827', fontWeight: '900' },
  meetingSummaryText: { color: '#111827', lineHeight: 22, fontWeight: '500', fontSize: 14 },
  meetingSummaryPlaceholder: { color: '#6b7280', lineHeight: 20 },
  summarySections: { gap: 16 },
  summarySection: { gap: 5 },
  summarySectionTitle: { color: '#111827', fontSize: 18, fontWeight: '900', lineHeight: 24 },
  savedMeetingSummaries: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 10,
  },
  savedSummaryCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    color: '#111827',
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 28,
  },
  savedSummaryItem: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  savedSummaryCopy: { flex: 1 },
  savedSummaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 4,
  },
  savedSummaryTitle: { color: '#111827', fontWeight: '900' },
  savedSummaryMeta: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  emptyLog: {
    color: '#374151',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 14,
    lineHeight: 20,
  },
  modalWrap: { padding: 20 },
  calendarCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calendarTitle: { color: '#111827', fontSize: 18, fontWeight: '900', textAlign: 'center' },
  nextMonthButton: { flexDirection: 'row-reverse' },
  weekdayGrid: { flexDirection: 'row', marginBottom: 6 },
  weekdayText: {
    width: `${100 / 7}%`,
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 0 },
  dayButton: {
    width: `${100 / 7}%`,
    minWidth: 0,
    borderRadius: 999,
    marginVertical: 2,
  },
  todayButton: { borderWidth: 1, borderColor: '#111827' },
  dayButtonContent: { minHeight: 38, paddingHorizontal: 0 },
  pickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  timeCard: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  pickerTitle: { color: '#111827', fontWeight: '900', marginBottom: 12 },
  timePreview: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  timePreviewText: { color: '#111827', fontSize: 22, fontWeight: '900' },
  timeColumns: { flexDirection: 'row', gap: 10 },
  timeColumn: {
    flex: 1,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  periodColumn: { width: 92, gap: 8 },
  timeOption: { borderRadius: 8, margin: 4 },
  lockedAction: { color: '#6b7280', fontWeight: '700' },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  inviteCard: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  inviteContent: { gap: 14 },
  inviteLabel: { color: '#111827', fontWeight: '900' },
  inviteChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  inviteChip: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#d1d5db' },
  inviteChipSelected: { backgroundColor: '#111827', borderColor: '#111827' },
  inviteChipText: { color: '#111827', fontWeight: '700' },
  inviteChipTextSelected: { color: '#ffffff' },
  confirmContent: { alignItems: 'center', gap: 10, paddingVertical: 22 },
  confirmIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
  },
  confirmTitle: { color: '#111827', fontWeight: '900', textAlign: 'center' },
  confirmMessage: { color: '#374151', lineHeight: 20, textAlign: 'center' },
  confirmActions: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 8 },
  deleteButton: { backgroundColor: '#b91c1c' },
  noticeCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  noticeContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: '#111827', fontWeight: '800' },
  noticeText: { color: '#374151', marginTop: 2 },
});
