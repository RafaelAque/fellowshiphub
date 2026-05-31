// app/ai-progress.tsx
import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, TextInput as RNTextInput } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';

export default function AIProgress() {
  const [messages, setMessages] = useState([
    { type: 'ai', text: 'Hello John! You attended 4 out of 5 sessions this month.' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input) return;
    setMessages([...messages, { type: 'user', text: input }, { type: 'ai', text: 'Thanks for sharing! Keep going.' }]);
    setInput('');
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>AI Progress Assistant</Text>

      {messages.map((msg, idx) => (
        <Card
          key={idx}
          style={[styles.messageCard, msg.type === 'ai' ? styles.aiCard : styles.userCard]}
        >
          <Card.Content>
            <Text>{msg.text}</Text>
          </Card.Content>
        </Card>
      ))}

      <View style={styles.inputContainer}>
        <RNTextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Type your message..."
        />
        <Button onPress={handleSend}>Send</Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f5f5f5' },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  messageCard: { marginBottom: 10, borderRadius: 12, elevation: 2 },
  aiCard: { backgroundColor: '#e1f5fe' },
  userCard: { backgroundColor: '#c8e6c9' },
  inputContainer: { flexDirection: 'row', marginTop: 10, alignItems: 'center' },
  textInput: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 10, marginRight: 10 },
}); 