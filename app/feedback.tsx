// app/feedback.tsx
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, Pressable } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Feedback() {
  const [rating, setRating] = useState(0);
  const [learned, setLearned] = useState('');
  const [suggestions, setSuggestions] = useState('');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Session Feedback</Text>

      <Text style={styles.label}>Rate the session:</Text>
      <View style={styles.starsContainer}>
        {[1,2,3,4,5].map((star) => (
          <Pressable key={star} onPress={() => setRating(star)}>
            <MaterialCommunityIcons
              name={star <= rating ? 'star' : 'star-outline'}
              size={36}
              color="#FFD700"
            />
          </Pressable>
        ))}
      </View>

      <TextInput
        label="What did you learn?"
        value={learned}
        onChangeText={setLearned}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Suggestions for improvement"
        value={suggestions}
        onChangeText={setSuggestions}
        mode="outlined"
        style={styles.input}
      />

      <Button mode="contained" onPress={() => Alert.alert('Feedback submitted', 'Thank you for your feedback.')} style={styles.button}>
        Submit Feedback
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 16, marginBottom: 10 },
  starsContainer: { flexDirection: 'row', marginBottom: 20 },
  input: { marginBottom: 15 },
  button: { marginTop: 10 },
});
