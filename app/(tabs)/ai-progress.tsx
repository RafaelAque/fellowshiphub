import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { Button, Card, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppShell } from '@/components/app-shell';
import { SessionSummary, SummaryType, useAppRole } from '@/components/app-role-context';

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
const fallbackBibleAssistantEndpoint = 'https://kvmnuivdxcqdvqvpcipq.supabase.co/functions/v1/bible-assistant';
const summaryEndpoint = process.env.EXPO_PUBLIC_AI_SUMMARY_ENDPOINT ?? fallbackSummaryEndpoint;
const bibleAssistantEndpoint = process.env.EXPO_PUBLIC_BIBLE_ASSISTANT_ENDPOINT ?? fallbackBibleAssistantEndpoint;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
type SummarySource = 'Local' | 'Groq' | 'OpenAI' | 'AI';
const summaryHeadings = new Set([
  'Discussion Summary',
  'Main Topic',
  'Explanation',
  'Encouragement',
  'Moral Lesson',
  'How to Apply It',
  'Bible Reference Mentioned',
]);
const bibleAssistantHeadings = new Set([
  'Gentle Answer',
  'Bible Verse',
  'What It Means',
  'Practical Step',
  'Prayer',
]);

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

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function getKeywordSummary(text: string) {
  const stopWords = new Set([
    'about', 'after', 'again', 'also', 'and', 'are', 'because', 'been', 'but', 'can', 'for',
    'from', 'has', 'have', 'into', 'our', 'that', 'the', 'their', 'them', 'then', 'there',
    'this', 'through', 'was', 'were', 'what', 'when', 'where', 'with', 'you', 'your',
    'says', 'they', 'them', 'some', 'many', 'good', 'will', 'would', 'could', 'should',
    'everyone', 'discussion', 'session', 'topic', 'lesson',
  ]);
  const counts = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .reduce<Record<string, number>>((acc, word) => {
      acc[word] = (acc[word] ?? 0) + 1;
      return acc;
    }, {});

  return Object.entries(counts)
    .sort((first, second) => second[1] - first[1])
    .slice(0, 6)
    .map(([word]) => word);
}

function detectScriptures(text: string) {
  const books = [
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
    'Samuel', 'Kings', 'Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalm', 'Psalms',
    'Proverbs', 'Ecclesiastes', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
    'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
    'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
    'Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', 'Thessalonians',
    'Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', 'Peter', 'Jude', 'Revelation',
  ];
  const pattern = new RegExp(`\\b(?:[1-3]\\s*)?(?:${books.join('|')})\\s+\\d{1,3}:\\d{1,3}(?:-\\d{1,3})?\\b`, 'gi');
  const matches = text.match(pattern) ?? [];
  return Array.from(new Set(matches.map((match) => match.replace(/\s+/g, ' ').trim())));
}

function normalizeSummaryHeading(line: string) {
  return line.replace(/^#+\s*/, '').replace(/:$/, '').trim();
}

function stripSummaryBullet(line: string) {
  return line.replace(/^[-*]\s*/, '').trim();
}

function shortenTitle(value: string) {
  const trimmed = value.replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim();

  if (trimmed.length <= 70) {
    return trimmed;
  }

  return `${trimmed.slice(0, 67).trim()}...`;
}

function getMainTopicFromSummary(summary: string) {
  const lines = summary.split('\n');
  const topicIndex = lines.findIndex((line) => normalizeSummaryHeading(line) === 'Main Topic');

  if (topicIndex < 0) {
    return '';
  }

  const topicLine = lines.slice(topicIndex + 1).find((line) => line.trim());
  return topicLine ? stripSummaryBullet(topicLine) : '';
}

function makeDiscussionTitle(summary: string, transcript: string, fallback?: string) {
  const topic = getMainTopicFromSummary(summary);

  if (topic) {
    return shortenTitle(topic);
  }

  const transcriptTitle = transcript
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 8)
    .join(' ');

  return shortenTitle(transcriptTitle || fallback || 'Session Reflection');
}

function cleanSentence(sentence: string) {
  return sentence
    .replace(/\b(good day everyone|thank you|amen)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,.\s-]+|[,.\s-]+$/g, '');
}

function makeReadableSentence(sentence: string) {
  const cleaned = cleanSentence(sentence);

  if (!cleaned) {
    return '';
  }

  return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1).replace(/[.!?]*$/, '.')}`;
}

function sentenceScore(sentence: string, keywords: string[]) {
  const lower = sentence.toLowerCase();
  return keywords.reduce((score, keyword) => score + (lower.includes(keyword) ? 1 : 0), 0);
}

function getMainTopic(text: string, keywords: string[], overview: string) {
  const lower = text.toLowerCase();

  if (lower.includes('animal') && (lower.includes('god') || lower.includes('bible') || lower.includes('genesis'))) {
    return 'Caring for animals as part of God\'s creation';
  }

  if (lower.includes('animal')) {
    return 'Respecting and caring for animals';
  }

  if (lower.includes('forgive')) {
    return 'Learning to forgive others with a humble heart';
  }

  if (lower.includes('prayer') || lower.includes('pray')) {
    return 'The importance of prayer and staying close to God';
  }

  if (lower.includes('faith')) {
    return 'Growing in faith through trust and obedience';
  }

  if (lower.includes('love')) {
    return 'Showing love through our words and actions';
  }

  if (keywords.length >= 2) {
    return `Understanding ${keywords.slice(0, 3).join(', ')}`;
  }

  return overview.replace(/\.$/, '');
}

function getMoralLesson(text: string) {
  const lower = text.toLowerCase();

  if (lower.includes('animal') && (lower.includes('god') || lower.includes('creation') || lower.includes('genesis'))) {
    return 'The moral lesson is that every part of God\'s creation has value, so people should care for animals and the environment with kindness and responsibility.';
  }

  if (lower.includes('animal')) {
    return 'The moral lesson is to be kind and responsible toward living things because our choices affect the world around us.';
  }

  if (lower.includes('forgive')) {
    return 'The moral lesson is that forgiveness brings peace, heals relationships, and helps people follow God with a cleaner heart.';
  }

  if (lower.includes('prayer') || lower.includes('pray')) {
    return 'The moral lesson is that prayer keeps people connected to God and helps them face life with faith instead of fear.';
  }

  if (lower.includes('faith')) {
    return 'The moral lesson is to trust God even when things are difficult and to show that faith through daily actions.';
  }

  return 'The moral lesson is to understand the message, reflect on it honestly, and choose one good action that shows growth in daily life.';
}

function buildSessionSummary(text: string, type: SummaryType = 'brief') {
  const cleaned = text.replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    return '';
  }

  const sentences = splitSentences(cleaned);
  const keywords = getKeywordSummary(cleaned);
  const candidates = sentences.length > 1
    ? sentences
    : cleaned
        .split(/\b(?:and|but|however|so|because|while)\b/i)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
  const keySentences = [...candidates]
    .sort((first, second) => sentenceScore(second, keywords) - sentenceScore(first, keywords))
    .slice(0, 4)
    .map(makeReadableSentence)
    .filter(Boolean);
  const fallbackOverview = makeReadableSentence(cleaned.slice(0, 220));
  const overview = keySentences[0] ?? fallbackOverview;
  const supportPoints = keySentences
    .filter((sentence) => sentence !== overview)
    .slice(0, 2);
  const scriptures = detectScriptures(cleaned);
  const mainTopic = getMainTopic(cleaned, keywords, overview);
  const moralLesson = getMoralLesson(cleaned);
  const explanation = [
    overview,
    ...supportPoints,
  ].join(' ');

  return [
    'Discussion Summary',
    '',
    'Main Topic:',
    `- ${mainTopic}`,
    '',
    'Explanation:',
    `- ${explanation || 'The discussion shared an important lesson that members can understand and apply in daily life.'}`,
    '',
    'Moral Lesson:',
    `- ${moralLesson}`,
    '',
    'How to Apply It:',
    '- Remember the lesson during the week.',
    '- Choose one simple action that shows the lesson in real life.',
    '- Share what you learned with another member or your group.',
    ...(scriptures.length ? ['', 'Bible Reference Mentioned:', ...scriptures.map((scripture) => `- ${scripture}`)] : []),
  ].join('\n');
}

async function requestAiSummary(input: {
  transcript: string;
  type: SummaryType;
  scriptures: string[];
  sessionTitle?: string;
}) {
  if (!summaryEndpoint) {
    throw new Error('AI summary endpoint is not configured.');
  }

  const response = await fetch(summaryEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(supabaseAnonKey ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI summary service is unavailable (${response.status}). ${errorText}`);
  }

  const data = await response.json() as { summary?: string; provider?: string };
  const summary = data.summary?.trim();

  if (!summary) {
    return null;
  }

  const source: SummarySource = data.provider === 'groq'
    ? 'Groq'
    : data.provider === 'openai'
      ? 'OpenAI'
      : 'AI';

  return { summary, source };
}

async function requestBibleAssistant(input: { question: string; memberName?: string }) {
  const response = await fetch(bibleAssistantEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(supabaseAnonKey ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bible assistant is unavailable (${response.status}). ${errorText}`);
  }

  const data = await response.json() as { answer?: string; provider?: string };
  return data.answer?.trim() || '';
}

export default function AIProgress() {
  const { attendanceRecords, currentUser, deleteSessionSummary, feedbackEntries, saveSessionSummary, sessionSummaries, sessions, themeMode } = useAppRole();
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [sessionSummary, setSessionSummary] = useState('');
  const [discussionTitle, setDiscussionTitle] = useState('');
  const [lastSummaryTranscript, setLastSummaryTranscript] = useState('');
  const [lastSummaryScriptures, setLastSummaryScriptures] = useState<string[]>([]);
  const [summarySaving, setSummarySaving] = useState(false);
  const [summarySaveLoading, setSummarySaveLoading] = useState(false);
  const [summaryDeleteLoading, setSummaryDeleteLoading] = useState(false);
  const [summaryPendingDelete, setSummaryPendingDelete] = useState<SessionSummary | null>(null);
  const [summarySource, setSummarySource] = useState<SummarySource>('Local');
  const [bibleAssistantOpen, setBibleAssistantOpen] = useState(false);
  const [bibleQuestion, setBibleQuestion] = useState('');
  const [bibleAnswer, setBibleAnswer] = useState('');
  const [bibleAssistantLoading, setBibleAssistantLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionController | null>(null);
  const transcriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const bibleModalOpacity = useRef(new Animated.Value(0)).current;
  const bibleModalTranslate = useRef(new Animated.Value(18)).current;
  const bibleAnswerOpacity = useRef(new Animated.Value(0)).current;
  const bibleAnswerTranslate = useRef(new Animated.Value(10)).current;
  const openSession = sessions.find((session) => session.status === 'open') ?? sessions[0];
  const savedSummaries = sessionSummaries.filter((summary) => summary.userId === currentUser?.id);
  const currentSessionIds = useMemo(() => new Set(sessions.map((session) => session.id)), [sessions]);
  const memberRecords = attendanceRecords.filter(
    (record) => record.userId === currentUser?.id && currentSessionIds.has(record.sessionId)
  );
  const present = memberRecords.filter((record) => record.status === 'Present').length;
  const rate = sessions.length ? Math.round((present / sessions.length) * 100) : 0;
  const memberFeedback = feedbackEntries.filter((feedback) => feedback.userId === currentUser?.id);
  const avgFeedback = memberFeedback.length
    ? (memberFeedback.reduce((sum, feedback) => sum + feedback.rating, 0) / memberFeedback.length).toFixed(1)
    : '0.0';
  const summary = useMemo(
    () => `You attended ${present} out of ${sessions.length} recorded sessions and your average feedback score is ${avgFeedback}/5.`,
    [avgFeedback, present, sessions.length]
  );
  const dark = themeMode === 'dark';
  const colors = {
    card: dark ? '#111827' : '#ffffff',
    input: dark ? '#1f2937' : '#ffffff',
    soft: dark ? '#1f2937' : '#f9fafb',
    border: dark ? '#374151' : '#e5e7eb',
    fieldBorder: dark ? '#475569' : '#d1d5db',
    line: dark ? '#334155' : '#e5e7eb',
    text: dark ? '#f9fafb' : '#111827',
    muted: dark ? '#cbd5e1' : '#374151',
    placeholder: dark ? '#94a3b8' : '#6b7280',
  };
  const inputTheme = {
    colors: {
      primary: colors.text,
      text: colors.text,
      placeholder: colors.placeholder,
      onSurfaceVariant: colors.placeholder,
      surfaceVariant: colors.soft,
      background: colors.soft,
    },
  };
  const summaryType: SummaryType = 'brief';

  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionConstructor()));

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!bibleAssistantOpen) {
      bibleModalOpacity.setValue(0);
      bibleModalTranslate.setValue(18);
      return;
    }

    Animated.parallel([
      Animated.timing(bibleModalOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bibleModalTranslate, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [bibleAssistantOpen, bibleModalOpacity, bibleModalTranslate]);

  useEffect(() => {
    if (!bibleAnswer) {
      bibleAnswerOpacity.setValue(0);
      bibleAnswerTranslate.setValue(10);
      return;
    }

    Animated.parallel([
      Animated.timing(bibleAnswerOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bibleAnswerTranslate, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [bibleAnswer, bibleAnswerOpacity, bibleAnswerTranslate]);

  const summarizeMeetingNotes = async (meetingNotes: string) => {
    const scriptures = detectScriptures(meetingNotes);
    setSummarySaving(true);

    try {
      const aiResult = await requestAiSummary({
        transcript: meetingNotes,
        type: summaryType,
        scriptures,
        sessionTitle: openSession?.title,
      });
      if (!aiResult?.summary) {
        throw new Error('Groq did not return a summary.');
      }

      const nextSummary = aiResult.summary;
      setSessionSummary(nextSummary);
      setSummarySource(aiResult.source);
      setLastSummaryTranscript(meetingNotes);
      setLastSummaryScriptures(scriptures);
      setDiscussionTitle(makeDiscussionTitle(nextSummary, meetingNotes, openSession?.title));
    } catch (error) {
      setSessionSummary('');
      setSummarySource('Groq');
      const message = error instanceof Error && error.message.includes('Invalid API Key')
        ? 'Groq rejected the saved API key. Add a fresh Groq key to Supabase, then try again.'
        : 'Groq is unavailable right now. Please check the Groq key and Supabase function, then try again.';
      Alert.alert('Groq summary failed', message);
    } finally {
      setSummarySaving(false);
    }
  };

  const startListening = () => {
    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      Alert.alert(
        'Speech to text unavailable',
        Platform.OS === 'web'
          ? 'This browser does not support live speech recognition. Try Chrome or Edge.'
          : 'Speech to text on mobile needs a native speech recognition package before it can listen in Expo Go.'
      );
      return;
    }

    const recognition = new Recognition();
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
        setTranscript((current) => {
          const nextTranscript = `${current}${current ? ' ' : ''}${finalText.trim()}`;
          transcriptRef.current = nextTranscript;
          return nextTranscript;
        });
      }

      interimTranscriptRef.current = interimText.trim();
      setInterimTranscript(interimText.trim());
    };
    recognition.onerror = (event) => {
      setListening(false);
      Alert.alert('Speech recognition stopped', event.error ? `Reason: ${event.error}` : 'Please try again.');
    };
    recognition.onend = () => {
      setListening(false);
      const meetingNotes = [transcriptRef.current, interimTranscriptRef.current].filter(Boolean).join(' ').trim();
      setInterimTranscript('');
      interimTranscriptRef.current = '';

      if (meetingNotes) {
        void summarizeMeetingNotes(meetingNotes);
      }
    };

    recognitionRef.current = recognition;
    transcriptRef.current = '';
    interimTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setSessionSummary('');
    setDiscussionTitle('');
    setLastSummaryTranscript('');
    setLastSummaryScriptures([]);
    setListening(true);
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const summarizeTranscript = async () => {
    const meetingNotes = [transcript, interimTranscript].filter(Boolean).join(' ').trim();

    if (!meetingNotes) {
      Alert.alert('No transcript yet', 'Start listening to the pastor first, then summarize the session.');
      return;
    }

    await summarizeMeetingNotes(meetingNotes);
  };

  const openSavedSummary = (summary: typeof savedSummaries[number]) => {
    setSessionSummary(summary.summary);
    setSummarySource('Groq');
    setDiscussionTitle(summary.session);
    setLastSummaryTranscript(summary.transcript);
    setLastSummaryScriptures(summary.scriptures);
  };

  const saveCurrentSummary = async () => {
    if (!sessionSummary.trim()) {
      Alert.alert('No summary yet', 'Generate a session summary before saving.');
      return;
    }

    if (!discussionTitle.trim()) {
      Alert.alert('Title needed', 'Please add a title for this discussion before saving.');
      return;
    }

    if (!openSession) {
      Alert.alert('Session not found', 'Please create or open a session before saving a summary.');
      return;
    }

    setSummarySaveLoading(true);
    await saveSessionSummary({
      sessionId: openSession.id,
      session: discussionTitle.trim(),
      type: summaryType,
      transcript: lastSummaryTranscript || transcript,
      summary: sessionSummary,
      scriptures: lastSummaryScriptures,
    });
    setSummarySaveLoading(false);
    Alert.alert('Summary saved', 'This discussion summary has been saved.');
  };

  const confirmDeleteSavedSummary = (summary: typeof savedSummaries[number]) => {
    setSummaryPendingDelete(summary);
  };

  const deleteSavedSummary = async () => {
    if (!summaryPendingDelete) {
      return;
    }

    setSummaryDeleteLoading(true);
    const result = await deleteSessionSummary(summaryPendingDelete.id);
    setSummaryDeleteLoading(false);

    if (!result.ok) {
      Alert.alert('Summary not deleted', result.message ?? 'Please try again.');
      return;
    }

    setSummaryPendingDelete(null);
  };

  const askBibleAssistant = async () => {
    const question = bibleQuestion.trim();

    if (!question) {
      Alert.alert('Question needed', 'Please type what you want to ask the Bible assistant.');
      return;
    }

    setBibleAssistantLoading(true);

    try {
      const answer = await requestBibleAssistant({
        question,
        memberName: currentUser?.name,
      });

      if (!answer) {
        throw new Error('Groq did not return an answer.');
      }

      setBibleAnswer(answer);
    } catch (error) {
      const message = error instanceof Error && error.message.includes('Invalid API Key')
        ? 'Groq rejected the saved API key. Add a fresh Groq key to Supabase, then try again.'
        : 'Groq Bible Assistant is unavailable right now. Please check the Groq key and Supabase function, then try again.';
      Alert.alert('Bible Assistant failed', message);
    } finally {
      setBibleAssistantLoading(false);
    }
  };

  const openBibleAssistant = () => {
    setBibleAssistantOpen(true);
  };

  return (
    <AppShell
      activeKey="progress"
      title="AI Progress Assistant"
      subtitle="Capture sessions and generate helpful AI reflections."
    >
      <View style={styles.layout}>
        <Card mode="outlined" style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content>
            <View style={styles.summaryHeader}>
              <View>
                <Text style={[styles.kicker, { color: colors.muted }]}>Progress Score</Text>
                <Text style={[styles.score, { color: colors.text }]}>{rate}%</Text>
              </View>
              <Button
                mode="contained"
                icon="book-cross"
                textColor="#ffffff"
                style={styles.bibleAssistantButton}
                onPress={openBibleAssistant}
              >
                Speak to Luce
              </Button>
            </View>
            <Text style={[styles.summaryText, { color: colors.text }]}>
              {summary}
            </Text>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={[styles.speechCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content>
            <View style={styles.speechHeader}>
              <View style={styles.speechTitleRow}>
                <MaterialCommunityIcons name={listening ? 'microphone' : 'microphone-outline'} size={24} color={colors.text} />
                <View>
                  <Text style={[styles.speechTitle, { color: colors.text }]}>Meeting speech to text</Text>
                  <Text style={[styles.speechStatus, { color: colors.muted }]}>
                    {speechSupported ? (listening ? 'Listening now' : 'Ready to capture speech') : 'Available on supported web browsers'}
                  </Text>
                </View>
              </View>
              <Button
                mode={listening ? 'outlined' : 'contained'}
                icon={listening ? 'stop' : 'microphone'}
                onPress={listening ? stopListening : startListening}
                textColor={listening ? colors.text : '#ffffff'}
              >
                {listening ? 'Stop' : 'Start'}
              </Button>
            </View>

            <View style={[styles.transcriptBox, { backgroundColor: colors.soft, borderColor: colors.fieldBorder }]}>
              <Text style={transcript || interimTranscript ? [styles.transcriptText, { color: colors.text }] : [styles.transcriptPlaceholder, { color: colors.placeholder }]}>
                {transcript || interimTranscript
                  ? `${transcript}${interimTranscript ? ` ${interimTranscript}` : ''}`
                  : 'Transcript will appear here while someone is speaking in the meeting.'}
              </Text>
            </View>

            <View style={styles.speechActions}>
              <Button mode="contained-tonal" textColor={colors.text} icon="text-box-search-outline" loading={summarySaving} disabled={summarySaving} onPress={summarizeTranscript}>
                Summarize session
              </Button>
              <Button
                mode="text"
                textColor={colors.text}
                icon="delete-outline"
                onPress={() => {
                  setTranscript('');
                  setInterimTranscript('');
                  setSessionSummary('');
                  setDiscussionTitle('');
                  setLastSummaryTranscript('');
                  setLastSummaryScriptures([]);
                }}
              >
                Clear
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={[styles.summaryOutputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content>
            <View style={styles.summaryOutputHeader}>
              <View style={styles.speechTitleRow}>
                <MaterialCommunityIcons name="text-box-check-outline" size={24} color={colors.text} />
                <View>
                  <Text style={[styles.speechTitle, { color: colors.text }]}>AI session summary</Text>
                  <Text style={[styles.speechStatus, { color: colors.muted }]}>
                    {sessionSummary ? `Generated from the captured discussion (${summarySource})` : 'Capture the discussion, then generate a warm session reflection'}
                  </Text>
                </View>
              </View>
              {sessionSummary ? (
                <Button
                  mode="contained"
                  textColor="#ffffff"
                  icon="content-save-outline"
                  loading={summarySaveLoading}
                  disabled={summarySaveLoading}
                  onPress={saveCurrentSummary}
                  style={styles.saveSummaryButton}
                >
                  Save
                </Button>
              ) : null}
            </View>
            {sessionSummary ? (
              <TextInput
                label="Discussion Title"
                value={discussionTitle}
                onChangeText={setDiscussionTitle}
                mode="outlined"
                style={[styles.titleInput, { backgroundColor: colors.soft }]}
                theme={inputTheme}
                textColor={colors.text}
              />
            ) : null}
            <View style={[styles.summaryBox, { backgroundColor: colors.soft, borderColor: colors.fieldBorder }]}>
              {sessionSummary ? (
                <View style={styles.summaryFormatted}>
                  {sessionSummary.split('\n').map((line, index) => {
                    const heading = normalizeSummaryHeading(line);
                    const isHeading = summaryHeadings.has(heading);

                    if (!line.trim()) {
                      return <View key={`space-${index}`} style={styles.summaryGap} />;
                    }

                    return (
                      <Text
                        key={`${line}-${index}`}
                        style={[
                          isHeading ? styles.summaryHeadingText : styles.summaryOutputText,
                          { color: colors.text },
                        ]}
                      >
                        {isHeading ? heading : line}
                      </Text>
                    );
                  })}
                </View>
              ) : (
                <Text style={[styles.transcriptPlaceholder, { color: colors.placeholder }]}>
                  The AI summary will explain the main discussion, share encouragement, name the moral lesson, and suggest practical ways to apply it.
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={[styles.summaryOutputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content>
            <View style={styles.savedHeader}>
              <View>
                <Text variant="titleMedium" style={[styles.savedTitle, { color: colors.text }]}>Saved session summaries</Text>
                <Text style={[styles.savedSubtitle, { color: colors.muted }]}>
                  Reopen, review, or clean up AI reflections from previous sessions.
                </Text>
              </View>
              <View style={[styles.savedCountPill, { borderColor: colors.border, backgroundColor: colors.soft }]}>
                <Text style={[styles.savedCountText, { color: colors.text }]}>{savedSummaries.length}</Text>
              </View>
            </View>
            {savedSummaries.length ? (
              savedSummaries.slice(0, 4).map((summary) => (
                <View key={summary.id} style={[styles.savedSummaryRow, { borderTopColor: colors.line }]}>
                  <View style={styles.savedSummaryCopy}>
                    <View style={styles.savedSummaryTitleRow}>
                      <MaterialCommunityIcons name="file-document-check-outline" size={20} color={colors.text} />
                      <Text style={[styles.savedSummaryTitle, { color: colors.text }]}>{summary.session}</Text>
                    </View>
                    <Text style={[styles.savedSummaryMeta, { color: colors.placeholder }]}>
                      Saved {new Date(summary.createdAt).toLocaleString()} - {summary.type}
                    </Text>
                    <Text numberOfLines={2} style={[styles.savedSummaryPreview, { color: colors.muted }]}>
                      {summary.summary.replace(/\s+/g, ' ').trim()}
                    </Text>
                  </View>
                  <View style={styles.savedSummaryActions}>
                    <Button
                      mode="outlined"
                      compact
                      textColor={colors.text}
                      icon="folder-open-outline"
                      onPress={() => openSavedSummary(summary)}
                    >
                      Open
                    </Button>
                    <Button
                      mode="text"
                      compact
                      textColor="#ef4444"
                      icon="delete-outline"
                      onPress={() => confirmDeleteSavedSummary(summary)}
                    >
                      Delete
                    </Button>
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.emptySavedBox, { borderColor: colors.fieldBorder, backgroundColor: colors.soft }]}>
                <MaterialCommunityIcons name="archive-outline" size={24} color={colors.placeholder} />
                <Text style={[styles.transcriptPlaceholder, { color: colors.placeholder }]}>
                  No saved summaries yet. After Groq summarizes a session, it will appear here so you can reopen it later.
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
        <Portal>
          <Modal
            visible={bibleAssistantOpen}
            onDismiss={() => setBibleAssistantOpen(false)}
            contentContainerStyle={styles.modalWrap}
          >
            <Animated.View style={{ opacity: bibleModalOpacity, transform: [{ translateY: bibleModalTranslate }] }}>
              <Card mode="outlined" style={[styles.bibleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Card.Content style={styles.bibleContent}>
                  <View style={styles.bibleHeader}>
                    <View style={styles.speechTitleRow}>
                      <View style={[styles.bibleIconWrap, { backgroundColor: colors.soft }]}>
                        <MaterialCommunityIcons name="book-cross" size={28} color={colors.text} />
                      </View>
                      <View>
                        <Text variant="titleLarge" style={[styles.bibleTitle, { color: colors.text }]}>Speak to Luce</Text>
                        <Text style={[styles.bibleSubtitle, { color: colors.muted }]}>Ask for guidance, encouragement, and Bible references.</Text>
                      </View>
                    </View>
                  </View>
                  <TextInput
                    label="Ask a question"
                    value={bibleQuestion}
                    onChangeText={setBibleQuestion}
                    mode="outlined"
                    multiline
                    placeholder="Example: What Bible verse can help me when I feel worried?"
                    style={[styles.bibleQuestionInput, { backgroundColor: colors.soft }]}
                    theme={inputTheme}
                    textColor={colors.text}
                  />
                  <View style={styles.bibleActions}>
                    <Button mode="outlined" textColor={colors.text} onPress={() => setBibleAssistantOpen(false)}>
                      Close
                    </Button>
                    <Button
                      mode="contained"
                      icon="send"
                      textColor="#ffffff"
                      loading={bibleAssistantLoading}
                      disabled={bibleAssistantLoading}
                      style={styles.bibleAskButton}
                      onPress={askBibleAssistant}
                    >
                      Ask Groq
                    </Button>
                  </View>
                  <View style={[styles.bibleAnswerBox, { backgroundColor: colors.soft, borderColor: colors.fieldBorder }]}>
                    {bibleAnswer ? (
                      <Animated.View style={{ opacity: bibleAnswerOpacity, transform: [{ translateY: bibleAnswerTranslate }] }}>
                        {bibleAnswer.split('\n').map((line, index) => {
                          const heading = normalizeSummaryHeading(line);
                          const isHeading = bibleAssistantHeadings.has(heading);

                          if (!line.trim()) {
                            return <View key={`bible-space-${index}`} style={styles.summaryGap} />;
                          }

                          return (
                            <Text
                              key={`${line}-${index}`}
                              style={[
                                isHeading ? styles.summaryHeadingText : styles.summaryOutputText,
                                { color: colors.text },
                              ]}
                            >
                              {isHeading ? heading : line}
                            </Text>
                          );
                        })}
                      </Animated.View>
                    ) : (
                      <Text style={[styles.transcriptPlaceholder, { color: colors.placeholder }]}>
                        Your Groq-powered answer will appear here with gentle advice, the full Bible verse text, and a short prayer.
                      </Text>
                    )}
                  </View>
                </Card.Content>
              </Card>
            </Animated.View>
          </Modal>
          <Modal
            visible={Boolean(summaryPendingDelete)}
            onDismiss={() => setSummaryPendingDelete(null)}
            contentContainerStyle={styles.modalWrap}
          >
            <Card mode="outlined" style={[styles.deleteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content style={styles.deleteContent}>
                <View style={[styles.deleteIconWrap, { backgroundColor: colors.soft }]}>
                  <MaterialCommunityIcons name="delete-outline" size={30} color="#ef4444" />
                </View>
                <Text variant="titleLarge" style={[styles.deleteTitle, { color: colors.text }]}>Delete saved summary?</Text>
                <Text style={[styles.deleteMessage, { color: colors.muted }]}>
                  This will remove {summaryPendingDelete?.session ?? 'this discussion'} from your saved session summaries.
                </Text>
                <View style={styles.deleteActions}>
                  <Button mode="outlined" textColor={colors.text} onPress={() => setSummaryPendingDelete(null)}>
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    textColor="#ffffff"
                    icon="delete-outline"
                    loading={summaryDeleteLoading}
                    disabled={summaryDeleteLoading}
                    style={styles.deleteButton}
                    onPress={deleteSavedSummary}
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

const styles = StyleSheet.create({
  layout: { gap: 16 },
  summaryCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: '#374151', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  score: { fontSize: 28, fontWeight: '900', color: '#111827', marginTop: 4 },
  summaryText: { color: '#111827', marginTop: 10, lineHeight: 20, fontWeight: '500' },
  bibleAssistantButton: { backgroundColor: '#111827' },
  speechCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  speechHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  speechTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  speechTitle: { color: '#111827', fontWeight: '800' },
  speechStatus: { color: '#374151', marginTop: 2, fontWeight: '500' },
  transcriptBox: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    padding: 12,
    marginTop: 14,
    borderRadius: 6,
  },
  transcriptText: { color: '#111827', lineHeight: 20 },
  transcriptPlaceholder: { color: '#6b7280', lineHeight: 20 },
  speechActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  summaryOutputCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  summaryOutputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  saveSummaryButton: { backgroundColor: '#111827' },
  titleInput: { marginTop: 14 },
  summaryBox: {
    minHeight: 150,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    padding: 12,
    marginTop: 14,
    borderRadius: 6,
  },
  summaryFormatted: { gap: 2 },
  summaryGap: { height: 8 },
  summaryHeadingText: {
    color: '#111827',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  summaryOutputText: { color: '#111827', lineHeight: 22, fontWeight: '500' },
  savedHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  savedTitle: { color: '#111827', fontWeight: '800' },
  savedSubtitle: { color: '#374151', marginTop: 3, lineHeight: 18, fontWeight: '500' },
  savedCountPill: {
    minWidth: 40,
    minHeight: 34,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  savedCountText: { color: '#111827', fontWeight: '900' },
  savedSummaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 14,
    flexWrap: 'wrap',
  },
  savedSummaryCopy: { flex: 1 },
  savedSummaryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savedSummaryTitle: { color: '#111827', fontWeight: '800', textTransform: 'capitalize' },
  savedSummaryMeta: { color: '#6b7280', marginTop: 2, fontSize: 12 },
  savedSummaryPreview: { color: '#374151', marginTop: 8, lineHeight: 20, fontWeight: '500' },
  savedSummaryActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 },
  emptySavedBox: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalWrap: { padding: 20 },
  bibleCard: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    borderColor: '#e5e7eb',
  },
  bibleContent: { gap: 12 },
  bibleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  bibleIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bibleTitle: { fontWeight: '900' },
  bibleSubtitle: { marginTop: 2, lineHeight: 18, fontWeight: '500' },
  bibleQuestionInput: { minHeight: 92 },
  bibleActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 10 },
  bibleAskButton: { backgroundColor: '#111827' },
  bibleAnswerBox: {
    minHeight: 180,
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
  deleteCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
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
  },
  deleteTitle: { fontWeight: '900', textAlign: 'center' },
  deleteMessage: { textAlign: 'center', lineHeight: 20 },
  deleteActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  deleteButton: { backgroundColor: '#dc2626' },
});
