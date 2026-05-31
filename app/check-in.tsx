import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppRole } from '@/components/app-role-context';

function getParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function CheckInPage() {
  const { attendanceRecords, checkIn, currentUser, sessions, themeMode } = useAppRole();
  const params = useLocalSearchParams<{ sessionId?: string; title?: string; date?: string; time?: string; location?: string }>();
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('Preparing your attendance check-in...');
  const hasChecked = useRef(false);
  const sessionId = getParam(params.sessionId);
  const fallbackSession = useMemo(() => ({
    title: getParam(params.title) ?? '',
    date: getParam(params.date) ?? '',
    time: getParam(params.time) ?? '',
    location: getParam(params.location) ?? '',
  }), [params.date, params.location, params.time, params.title]);
  const loginNextRoute = useMemo(() => {
    const loginParams = new URLSearchParams();
    if (sessionId) loginParams.set('sessionId', sessionId);
    if (fallbackSession.title) loginParams.set('title', fallbackSession.title);
    if (fallbackSession.date) loginParams.set('date', fallbackSession.date);
    if (fallbackSession.time) loginParams.set('time', fallbackSession.time);
    if (fallbackSession.location) loginParams.set('location', fallbackSession.location);
    return loginParams.size ? `/check-in?${loginParams.toString()}` : '/(tabs)/attendance';
  }, [fallbackSession, sessionId]);
  const session = sessions.find((candidate) => candidate.id === sessionId);
  const displaySession = useMemo(() => session ?? (fallbackSession.title && fallbackSession.date
    ? {
        id: sessionId ?? '',
        title: fallbackSession.title,
        date: fallbackSession.date,
        time: fallbackSession.time,
        location: fallbackSession.location,
      }
    : null), [fallbackSession, session, sessionId]);
  const dark = themeMode === 'dark';
  const colors = {
    page: dark ? '#0f172a' : '#f3f4f6',
    card: dark ? '#111827' : '#ffffff',
    border: dark ? '#374151' : '#d1d5db',
    text: dark ? '#f9fafb' : '#111827',
    muted: dark ? '#cbd5e1' : '#374151',
    soft: dark ? '#1f2937' : '#f9fafb',
  };
  const alreadyCheckedIn = useMemo(() => (
    Boolean(currentUser && sessionId && attendanceRecords.some(
      (record) => record.userId === currentUser.id && record.sessionId === sessionId && record.status === 'Present'
    ))
  ), [attendanceRecords, currentUser, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage('This QR code is missing a session. Please ask an admin for a new attendance QR.');
      return;
    }

    if (!displaySession) {
      setStatus('error');
      setMessage('This attendance QR is missing session details. Please ask an admin to refresh the QR code.');
      return;
    }

    if (!currentUser) {
      setStatus('error');
      setMessage('Please sign in first, then scan the attendance QR again.');
      return;
    }

    if (alreadyCheckedIn) {
      setStatus('success');
      setMessage(`You are already checked in for ${displaySession.title}.`);
      return;
    }

    if (hasChecked.current) {
      return;
    }

    hasChecked.current = true;
    setStatus('checking');
    setMessage(`Checking you in for ${displaySession.title}...`);

    void checkIn(sessionId, fallbackSession.title && fallbackSession.date ? fallbackSession : undefined).then((result) => {
      setStatus(result.ok || result.duplicate ? 'success' : 'error');
      setMessage(result.message);
    });
  }, [alreadyCheckedIn, checkIn, currentUser, displaySession, fallbackSession, sessionId]);

  const iconName = status === 'success'
    ? 'check-circle-outline'
    : status === 'checking'
      ? 'qrcode-scan'
      : 'alert-circle-outline';
  const iconColor = status === 'success' ? '#16a34a' : status === 'checking' ? '#2563eb' : '#dc2626';

  return (
    <View style={[styles.page, { backgroundColor: colors.page }]}>
      <Card mode="outlined" style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Card.Content style={styles.content}>
          <View style={[styles.iconWrap, { backgroundColor: colors.soft }]}>
            <MaterialCommunityIcons name={iconName} size={42} color={iconColor} />
          </View>
          <Text variant="headlineSmall" style={[styles.title, { color: colors.text }]}>QR Attendance</Text>
          {displaySession ? (
            <View style={styles.sessionBlock}>
              <Text style={[styles.label, { color: colors.muted }]}>Session</Text>
              <Text style={[styles.sessionTitle, { color: colors.text }]}>{displaySession.title}</Text>
              <Text style={[styles.sessionMeta, { color: colors.muted }]}>
                {displaySession.date} at {displaySession.time || 'Time TBA'} - {displaySession.location || 'Location TBA'}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.message, { color: colors.muted }]}>{message}</Text>
          <View style={styles.actions}>
            {!currentUser ? (
              <Button
                mode="contained"
                style={styles.primaryButton}
                textColor="#ffffff"
                onPress={() => router.replace({ pathname: '/login', params: { next: loginNextRoute } })}
              >
                Sign in
              </Button>
            ) : (
              <Button mode="contained" style={styles.primaryButton} textColor="#ffffff" onPress={() => router.replace('/(tabs)/attendance')}>
                Back to Attendance
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
  },
  content: {
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
  },
  iconWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
  },
  sessionBlock: {
    width: '100%',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sessionTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  sessionMeta: {
    textAlign: 'center',
    fontWeight: '500',
  },
  message: {
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '600',
  },
  actions: {
    width: '100%',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#111827',
  },
});
