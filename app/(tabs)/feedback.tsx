import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Card, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppShell } from '@/components/app-shell';
import { FeedbackEntry, useAppRole } from '@/components/app-role-context';

export default function Feedback() {
  const { deleteFeedback, feedbackEntries, role, sessions, submitFeedback, themeMode } = useAppRole();
  const [rating, setRating] = useState(0);
  const [learned, setLearned] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<FeedbackEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const session = sessions.find((candidate) => candidate.status === 'open') ?? sessions[0];
  const feedbackCount = feedbackEntries.filter((feedback) => feedback.sessionId === session.id).length;
  const averageRating = feedbackEntries.length
    ? (feedbackEntries.reduce((sum, feedback) => sum + feedback.rating, 0) / feedbackEntries.length).toFixed(1)
    : '0.0';
  const dark = themeMode === 'dark';
  const colors = {
    card: dark ? '#111827' : '#ffffff',
    input: dark ? '#1f2937' : '#ffffff',
    border: dark ? '#374151' : '#e5e7eb',
    line: dark ? '#334155' : '#e5e7eb',
    text: dark ? '#f9fafb' : '#111827',
    muted: dark ? '#cbd5e1' : '#374151',
    placeholder: dark ? '#94a3b8' : '#374151',
  };
  const inputTheme = {
    colors: {
      primary: colors.text,
      text: colors.text,
      placeholder: colors.placeholder,
      onSurfaceVariant: colors.placeholder,
      surfaceVariant: colors.input,
      background: colors.input,
    },
  };

  const submit = async () => {
    if (!rating) {
      Alert.alert('Rating needed', 'Please rate the session before submitting feedback.');
      return;
    }

    setSaving(true);
    await submitFeedback({
      sessionId: session.id,
      session: session.title,
      date: session.date,
      rating,
      learned,
      suggestions,
    });
    setSaving(false);
    setRating(0);
    setLearned('');
    setSuggestions('');
    setSuccessVisible(true);
  };

  const deleteSelectedFeedback = async () => {
    if (!feedbackToDelete) {
      return;
    }

    setDeleting(true);
    const result = await deleteFeedback(feedbackToDelete.id);
    setDeleting(false);

    if (!result.ok) {
      Alert.alert('Delete failed', result.message ?? 'Please try again.');
      return;
    }

    setFeedbackToDelete(null);
  };

  return (
    <AppShell
      activeKey="feedback"
      title={role === 'admin' ? 'Member Feedback' : 'Session Feedback'}
      subtitle={role === 'admin' ? 'View feedback submitted by members.' : 'We value your feedback!'}
    >
      <View style={styles.layout}>
        {role === 'admin' ? (
          <>
            <View style={styles.statsGrid}>
              <Card mode="outlined" style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Card.Content>
                  <MaterialCommunityIcons name="message-star-outline" size={26} color={colors.text} />
                  <Text style={[styles.statValue, { color: colors.text }]}>{feedbackEntries.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Total feedback</Text>
                </Card.Content>
              </Card>
              <Card mode="outlined" style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Card.Content>
                  <MaterialCommunityIcons name="star-outline" size={26} color={colors.text} />
                  <Text style={[styles.statValue, { color: colors.text }]}>{averageRating}</Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Average rating</Text>
                </Card.Content>
              </Card>
            </View>

            <Card mode="outlined" style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content>
                <Text style={[styles.listTitle, { color: colors.text }]}>Feedback List</Text>
                {feedbackEntries.length ? (
                  feedbackEntries.map((feedback) => (
                    <View key={feedback.id} style={[styles.feedbackItem, { borderTopColor: colors.line }]}>
                      <View style={styles.feedbackHeader}>
                        <View>
                          <Text style={[styles.memberName, { color: colors.text }]}>{feedback.userName}</Text>
                          <Text style={[styles.feedbackMeta, { color: colors.muted }]}>{feedback.session} - {feedback.date}</Text>
                        </View>
                        <View style={styles.feedbackActions}>
                          <View style={[styles.ratingPill, { borderColor: colors.border }]}>
                            <MaterialCommunityIcons name="star" size={16} color={colors.text} />
                            <Text style={[styles.ratingText, { color: colors.text }]}>{feedback.rating}/5</Text>
                          </View>
                          <Button
                            mode="text"
                            icon="delete-outline"
                            textColor="#b91c1c"
                            onPress={() => setFeedbackToDelete(feedback)}
                          >
                            Delete
                          </Button>
                        </View>
                      </View>
                      <View style={styles.feedbackDetail}>
                        <Text style={[styles.detailLabel, { color: colors.muted }]}>Learned</Text>
                        <Text style={[styles.detailText, { color: colors.text }]}>{feedback.learned || '-'}</Text>
                      </View>
                      <View style={styles.feedbackDetail}>
                        <Text style={[styles.detailLabel, { color: colors.muted }]}>Suggestions</Text>
                        <Text style={[styles.detailText, { color: colors.text }]}>{feedback.suggestions || '-'}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons name="message-text-outline" size={32} color={colors.muted} />
                    <Text style={[styles.emptyText, { color: colors.muted }]}>No member feedback yet.</Text>
                  </View>
                )}
              </Card.Content>
            </Card>

            <Portal>
              <Modal
                visible={Boolean(feedbackToDelete)}
                onDismiss={() => setFeedbackToDelete(null)}
                contentContainerStyle={styles.modalWrap}
              >
                <Card mode="outlined" style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Card.Content style={styles.confirmContent}>
                    <View style={styles.confirmIconWrap}>
                      <MaterialCommunityIcons name="delete-alert-outline" size={34} color="#b91c1c" />
                    </View>
                    <Text variant="titleLarge" style={[styles.confirmTitle, { color: colors.text }]}>Delete feedback?</Text>
                    <Text style={[styles.confirmMessage, { color: colors.muted }]}>
                      {feedbackToDelete
                        ? `Remove feedback from ${feedbackToDelete.userName} for ${feedbackToDelete.session}?`
                        : ''}
                    </Text>
                    <View style={styles.confirmActions}>
                      <Button mode="outlined" textColor={colors.text} onPress={() => setFeedbackToDelete(null)}>
                        Cancel
                      </Button>
                      <Button
                        mode="contained"
                        textColor="#ffffff"
                        style={styles.deleteButton}
                        loading={deleting}
                        disabled={deleting}
                        onPress={deleteSelectedFeedback}
                      >
                        Delete
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              </Modal>
            </Portal>
          </>
        ) : (
          <>
        <Card mode="outlined" style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content>
            <View style={styles.sessionRow}>
              <View>
                <Text style={[styles.sessionLabel, { color: colors.muted }]}>Session</Text>
                <Text style={[styles.sessionValue, { color: colors.text }]}>{session.title}</Text>
              </View>
              <View>
                <Text style={[styles.sessionLabel, { color: colors.muted }]}>Date</Text>
                <Text style={[styles.sessionValue, { color: colors.text }]}>{session.date}</Text>
              </View>
              <View>
                <Text style={[styles.sessionLabel, { color: colors.muted }]}>Responses</Text>
                <Text style={[styles.sessionValue, { color: colors.text }]}>{feedbackCount}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card mode="outlined" style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content>
            <Text style={[styles.label, { color: colors.muted }]}>Rate the session:</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <MaterialCommunityIcons
                  key={star}
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={34}
                  color={colors.text}
                  onPress={() => setRating(star)}
                />
              ))}
            </View>

            <Text style={[styles.label, { color: colors.muted }]}>What did you learn from this session?</Text>
            <TextInput
              value={learned}
              onChangeText={setLearned}
              mode="outlined"
              placeholder="Your answer..."
              multiline
              style={[styles.input, { backgroundColor: colors.input }]}
              theme={inputTheme}
              textColor={colors.text}
            />

            <Text style={[styles.label, { color: colors.muted }]}>Suggestions for improvement:</Text>
            <TextInput
              value={suggestions}
              onChangeText={setSuggestions}
              mode="outlined"
              placeholder="Your suggestions..."
              multiline
              style={[styles.input, { backgroundColor: colors.input }]}
              theme={inputTheme}
              textColor={colors.text}
            />

            <Button mode="contained" onPress={submit} style={styles.button} loading={saving} disabled={saving}>
              Submit Feedback
            </Button>
          </Card.Content>
        </Card>
        <Portal>
          <Modal
            visible={successVisible}
            onDismiss={() => setSuccessVisible(false)}
            contentContainerStyle={styles.modalWrap}
          >
            <Card mode="outlined" style={[styles.successCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content style={styles.confirmContent}>
                <View style={styles.successIconWrap}>
                  <MaterialCommunityIcons name="check-circle-outline" size={34} color="#15803d" />
                </View>
                <Text variant="titleMedium" style={[styles.confirmTitle, { color: colors.text }]}>
                  feedback has been submitted thank you
                </Text>
                <Button mode="contained" textColor="#ffffff" style={styles.successButton} onPress={() => setSuccessVisible(false)}>
                  Close
                </Button>
              </Card.Content>
            </Card>
          </Modal>
        </Portal>
          </>
        )}
      </View>
    </AppShell>
  );
}

const styles = StyleSheet.create({
  layout: { gap: 16 },
  statsGrid: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  statCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb', minWidth: 220, flex: 1 },
  statValue: { color: '#111827', fontSize: 28, fontWeight: '900', marginTop: 8 },
  statLabel: { color: '#374151', fontWeight: '700', marginTop: 4 },
  sessionCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  sessionLabel: { color: '#374151', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  sessionValue: { color: '#111827', fontWeight: '800', marginTop: 4 },
  formCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  label: { color: '#374151', fontWeight: '700', marginBottom: 8, marginTop: 4 },
  stars: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  input: { backgroundColor: '#ffffff', marginBottom: 12 },
  button: { marginTop: 4, alignSelf: 'flex-start' },
  listCard: { backgroundColor: '#ffffff', borderColor: '#e5e7eb' },
  listTitle: { color: '#111827', fontSize: 18, fontWeight: '900', marginBottom: 10 },
  feedbackItem: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingVertical: 14, gap: 10 },
  feedbackHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  feedbackActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  memberName: { color: '#111827', fontWeight: '900', fontSize: 16 },
  feedbackMeta: { color: '#6b7280', marginTop: 2 },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ratingText: { color: '#111827', fontWeight: '800' },
  feedbackDetail: { gap: 4 },
  detailLabel: { color: '#374151', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  detailText: { color: '#111827', lineHeight: 20 },
  modalWrap: { padding: 20 },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  successCard: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
  },
  confirmContent: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  confirmIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmTitle: { color: '#111827', fontWeight: '900', textAlign: 'center' },
  confirmMessage: { color: '#374151', lineHeight: 20, textAlign: 'center' },
  confirmActions: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 8 },
  deleteButton: { backgroundColor: '#b91c1c' },
  successIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButton: { backgroundColor: '#111827', marginTop: 4, minWidth: 120 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 8 },
  emptyText: { color: '#6b7280', fontWeight: '700' },
});
