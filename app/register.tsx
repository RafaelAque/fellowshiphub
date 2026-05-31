import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppRole } from '@/components/app-role-context';

function removeWhitespace(value: string) {
  return value.replace(/\s/g, '');
}

export default function Register() {
  const router = useRouter();
  const { currentUser, loading, register } = useAppRole();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
    success: boolean;
  }>({
    visible: false,
    title: '',
    message: '',
    icon: 'check-circle-outline',
    success: true,
  });
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
    if (!loading && currentUser) {
      router.replace('/(tabs)/dashboard');
    }
  }, [currentUser, loading, router]);

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

  const showDialog = (
    title: string,
    message: string,
    icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'],
    success: boolean
  ) => {
    setDialog({ visible: true, title, message, icon, success });
  };

  const handleRegister = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password.trim() || !confirmPassword.trim()) {
      showDialog('Registration incomplete', 'Please enter your email, password, and confirmation password.', 'alert-circle-outline', false);
      return;
    }

    if (!trimmedEmail.includes('@')) {
      showDialog('Email needed', 'Please enter a valid email address.', 'email-alert-outline', false);
      return;
    }

    if (password.length < 6) {
      showDialog('Password too short', 'Please use at least 6 characters.', 'lock-alert-outline', false);
      return;
    }

    if (password !== confirmPassword) {
      showDialog('Passwords do not match', 'Please confirm the same password.', 'lock-alert-outline', false);
      return;
    }

    setSubmitting(true);
    const result = await register(trimmedEmail, password);
    setSubmitting(false);

    if (!result.ok) {
      const duplicate = result.message?.toLowerCase().includes('already registered');
      showDialog(
        duplicate ? 'Email already registered' : 'Registration failed',
        result.message ?? 'Unable to register.',
        duplicate ? 'account-alert-outline' : 'alert-circle-outline',
        false
      );
      return;
    }

    showDialog('Account registered', result.message ?? 'Your FellowshipHub member account has been created.', 'check-circle-outline', true);
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
              <MaterialCommunityIcons name="cross" size={36} color="#111827" />
            </View>
            <Text variant="headlineMedium" style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>FellowshipHub</Text>
            <Text style={styles.helper}>Register as a member</Text>

            <TextInput
              left={<TextInput.Icon icon="email-outline" />}
              label="Email"
              value={email}
              onChangeText={(value) => setEmail(removeWhitespace(value))}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              theme={inputTheme}
              textColor="#111827"
            />

            <TextInput
              left={<TextInput.Icon icon="lock-outline" />}
              right={<TextInput.Icon icon={showPassword ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowPassword((value) => !value)} />}
              label="Password"
              value={password}
              onChangeText={(value) => setPassword(removeWhitespace(value))}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={styles.input}
              theme={inputTheme}
              textColor="#111827"
            />

            <TextInput
              left={<TextInput.Icon icon="lock-check-outline" />}
              right={<TextInput.Icon icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowConfirmPassword((value) => !value)} />}
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(value) => setConfirmPassword(removeWhitespace(value))}
              mode="outlined"
              secureTextEntry={!showConfirmPassword}
              style={styles.input}
              theme={inputTheme}
              textColor="#111827"
            />

            <Button mode="contained" onPress={handleRegister} style={styles.button} textColor="#ffffff" loading={submitting} disabled={submitting}>
              Register
            </Button>

            <View style={styles.links}>
              <Button
                compact
                mode="text"
                textColor="#1d4ed8"
                onPress={() => router.replace('/login')}
              >
                Already have an account? Sign in
              </Button>
            </View>
          </Card.Content>
        </Card>
      </Animated.View>

      <Portal>
        <Modal
          visible={dialog.visible}
          onDismiss={() => setDialog((current) => ({ ...current, visible: false }))}
          contentContainerStyle={styles.modalWrap}
        >
          <Card mode="outlined" style={styles.dialogCard}>
            <Card.Content style={styles.dialogContent}>
              <View style={[styles.dialogIconWrap, dialog.success ? styles.successIconWrap : styles.errorIconWrap]}>
                <MaterialCommunityIcons
                  name={dialog.icon}
                  size={34}
                  color={dialog.success ? '#166534' : '#991b1b'}
                />
              </View>
              <Text variant="titleLarge" style={styles.dialogTitle}>{dialog.title}</Text>
              <Text style={styles.dialogMessage}>{dialog.message}</Text>
              <Button
                mode="contained"
                textColor="#ffffff"
                style={styles.dialogButton}
                onPress={() => {
                  setDialog((current) => ({ ...current, visible: false }));
                  if (dialog.success) {
                    router.replace('/(tabs)/dashboard');
                  }
                }}
              >
                {dialog.success ? 'Continue' : 'Try again'}
              </Button>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', backgroundColor: '#ffffff', borderColor: '#d1d5db' },
  content: { alignItems: 'stretch', gap: 8 },
  brandMark: { alignSelf: 'center', width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', color: '#111827', fontWeight: '800' },
  subtitle: { textAlign: 'center', color: '#374151', marginTop: -2 },
  helper: { textAlign: 'center', color: '#374151', marginBottom: 10, fontWeight: '500' },
  input: { backgroundColor: '#ffffff' },
  button: { marginTop: 10, backgroundColor: '#111827' },
  links: { alignItems: 'center', gap: 4, marginTop: 8 },
  modalWrap: { padding: 20 },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  dialogContent: { alignItems: 'center', gap: 10, paddingVertical: 22 },
  dialogIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconWrap: { backgroundColor: '#dcfce7' },
  errorIconWrap: { backgroundColor: '#fee2e2' },
  dialogTitle: { color: '#111827', fontWeight: '900', textAlign: 'center' },
  dialogMessage: { color: '#374151', textAlign: 'center', lineHeight: 20 },
  dialogButton: { alignSelf: 'stretch', marginTop: 8, backgroundColor: '#111827' },
});
