import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

function removeWhitespace(value: string) {
  return value.replace(/\s/g, '');
}

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(16)).current;
  const inputTheme = {
    colors: {
      primary: '#111827',
      text: '#111827',
      placeholder: '#374151',
      onSurfaceVariant: '#374151',
    },
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslate, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardTranslate]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async () => {
    setPasswordError('');

    if (!supabase) {
      setPasswordError('Supabase is not configured yet.');
      return;
    }

    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      setPasswordError(error.message);
      return;
    }

    Alert.alert('Password changed', 'You can now sign in with your new password.', [
      { text: 'Sign in', onPress: () => router.replace('/login') },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View style={{ width: '100%', maxWidth: 420, opacity: cardOpacity, transform: [{ translateY: cardTranslate }] }}>
        <Card mode="outlined" style={styles.card}>
          <Card.Content style={styles.content}>
            <View style={styles.brandMark}>
              <MaterialCommunityIcons name="lock-reset" size={36} color="#111827" />
            </View>
            <Text variant="headlineMedium" style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>Create a new password for your account.</Text>

            {!ready ? (
              <Card mode="outlined" style={styles.noticeCard}>
                <Card.Content>
                  <Text style={styles.noticeText}>
                    Open this page using the password reset link from your email.
                  </Text>
                </Card.Content>
              </Card>
            ) : null}

            <TextInput
              left={<TextInput.Icon icon="lock-outline" />}
              right={<TextInput.Icon icon={showPassword ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowPassword((value) => !value)} />}
              label="New Password"
              value={password}
              onChangeText={(value) => {
                setPassword(removeWhitespace(value));
                setPasswordError('');
              }}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              theme={inputTheme}
              textColor="#111827"
              error={Boolean(passwordError)}
              disabled={!ready}
            />

            <TextInput
              left={<TextInput.Icon icon="lock-check-outline" />}
              right={<TextInput.Icon icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowConfirmPassword((value) => !value)} />}
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(value) => {
                setConfirmPassword(removeWhitespace(value));
                setPasswordError('');
              }}
              mode="outlined"
              secureTextEntry={!showConfirmPassword}
              style={styles.input}
              theme={inputTheme}
              textColor="#111827"
              error={Boolean(passwordError)}
              disabled={!ready}
            />
            {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

            <Button
              mode="contained"
              onPress={updatePassword}
              style={styles.button}
              textColor="#ffffff"
              loading={saving}
              disabled={saving || !ready}
            >
              Change Password
            </Button>

            <Button mode="text" textColor="#1d4ed8" onPress={() => router.replace('/login')}>
              Back to sign in
            </Button>
          </Card.Content>
        </Card>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', backgroundColor: '#ffffff', borderColor: '#d1d5db' },
  content: { alignItems: 'stretch', gap: 10 },
  brandMark: { alignSelf: 'center', width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', color: '#111827', fontWeight: '800' },
  subtitle: { textAlign: 'center', color: '#374151', marginBottom: 10 },
  input: { backgroundColor: '#ffffff' },
  fieldError: { color: '#b91c1c', fontSize: 12, fontWeight: '700', marginTop: -4 },
  button: { marginTop: 8, backgroundColor: '#111827' },
  noticeCard: { backgroundColor: '#f8fafc', borderColor: '#d1d5db' },
  noticeText: { color: '#374151', textAlign: 'center', lineHeight: 20 },
});
