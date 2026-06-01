import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppRole } from '@/components/app-role-context';
import { isSupabaseConfigured } from '@/lib/supabase';

function removeWhitespace(value: string) {
  return value.replace(/\s/g, '');
}

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const { currentUser, loading, login, requestPasswordReset, resetPassword, signInWithGoogle } = useAppRole();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setSelectedRole] = useState<'member' | 'admin'>('member');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [resetStep, setResetStep] = useState<'email' | 'code' | 'password' | 'done'>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetEmailError, setResetEmailError] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
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
  const nextRoute = Array.isArray(params.next) ? params.next[0] : params.next;
  const afterLoginRoute = nextRoute?.startsWith('/') ? nextRoute : '/(tabs)/dashboard';

  useEffect(() => {
    if (!loading && currentUser) {
      router.replace(afterLoginRoute);
    }
  }, [afterLoginRoute, currentUser, loading, router]);

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

  const handleLogin = async () => {
    setEmailError('');
    setPasswordError('');

    if (!email.trim()) {
      setEmailError('Invalid email');
      return;
    }

    if (!password.trim()) {
      setPasswordError('Invalid password');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password, role, name);
    setSubmitting(false);
    if (!result.ok) {
      if (result.requiresTwoFactor) {
        setTwoFactorCode('');
        setTwoFactorError('');
        setTwoFactorOpen(true);
        return;
      }

      const message = result.message ?? 'Unable to log in.';

      if (message.toLowerCase().includes('invalid email')) {
        setEmailError('Invalid email');
        return;
      }

      if (message.toLowerCase().includes('invalid password')) {
        setPasswordError('Invalid password');
        return;
      }

      Alert.alert('Login failed', result.message ?? 'Unable to log in.');
      return;
    }

    router.replace(afterLoginRoute);
  };

  const verifyTwoFactorLogin = async () => {
    setTwoFactorError('');

    if (!/^\d{6}$/.test(twoFactorCode)) {
      setTwoFactorError('Invalid verification code');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password, role, name, twoFactorCode);
    setSubmitting(false);

    if (!result.ok) {
      setTwoFactorError(result.message?.toLowerCase().includes('verification') ? 'Invalid verification code' : result.message ?? 'Unable to verify code');
      return;
    }

    setTwoFactorOpen(false);
    setTwoFactorCode('');
    router.replace(afterLoginRoute);
  };

  const handleGoogleLogin = async () => {
    setGoogleSubmitting(true);
    const result = await signInWithGoogle(role);
    setGoogleSubmitting(false);

    if (!result.ok) {
      Alert.alert('Google sign-in failed', result.message ?? 'Unable to continue with Google.');
    }
  };

  const handleForgotPassword = async () => {
    setResetEmail(email.trim());
    setResetEmailError('');
    setVerificationError('');
    setResetPasswordError('');
    setVerificationCode('');
    setEnteredCode('');
    setResetNewPassword('');
    setResetConfirmPassword('');
    setResetDone(false);
    setResetStep('email');
    setResetOpen(true);
  };

  const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

  const sendPasswordResetEmail = async () => {
    setResetEmailError('');
    const normalizedResetEmail = resetEmail.trim().toLowerCase();

    if (!normalizedResetEmail || !normalizedResetEmail.includes('@')) {
      setResetEmailError('Invalid email');
      return;
    }

    setResetSubmitting(true);
    const result = await requestPasswordReset(normalizedResetEmail);
    setResetSubmitting(false);

    if (!result.ok) {
      const message = result.message?.replace(/\.$/, '');
      setResetEmailError(message?.toLowerCase().includes('invalid email') ? 'Unable to send reset email right now' : message ?? 'Unable to send reset email');
      return;
    }

    if (isSupabaseConfigured && result.method !== 'code') {
      setResetDone(true);
      setResetStep('done');
      return;
    }

    setVerificationCode(generateCode());
    setEnteredCode('');
    setVerificationError('');
    setResetStep('code');
  };

  const verifyCode = () => {
    setVerificationError('');

    if (enteredCode.trim() !== verificationCode) {
      setVerificationError('Invalid verification code');
      return;
    }

    setResetStep('password');
  };

  const submitLocalReset = async () => {
    setResetPasswordError('');

    if (resetNewPassword.length < 6) {
      setResetPasswordError('Password must be at least 6 characters');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setResetPasswordError('Passwords do not match');
      return;
    }

    setResetSubmitting(true);
    const result = await resetPassword(resetEmail, resetNewPassword);
    setResetSubmitting(false);

    if (!result.ok) {
      setResetPasswordError(result.message ?? 'Unable to reset password');
      return;
    }

    setPassword(resetNewPassword);
    setResetDone(true);
    setResetStep('done');
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
          <Text variant="headlineMedium" style={styles.title}>FellowshipHub</Text>
          <Text style={styles.subtitle}>Grow Together in Faith</Text>
          <Text style={styles.helper}>Login to your account</Text>

          <TextInput
            left={<TextInput.Icon icon="account-edit-outline" />}
            label="Display Name"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            theme={inputTheme}
            textColor="#111827"
          />

          <TextInput
            left={<TextInput.Icon icon="account-outline" />}
            label="Email or Username"
            value={email}
            onChangeText={(value) => {
              setEmail(removeWhitespace(value));
              setEmailError('');
            }}
            mode="outlined"
            style={styles.input}
            theme={inputTheme}
            textColor="#111827"
            error={Boolean(emailError)}
          />
          {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}

          <TextInput
            left={<TextInput.Icon icon="lock-outline" />}
            right={<TextInput.Icon icon={showPassword ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowPassword((value) => !value)} />}
            label="Password"
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
          />
          {passwordError ? <Text style={styles.fieldError}>{passwordError}</Text> : null}

          <Text style={styles.roleLabel}>Select Role</Text>
          <View style={styles.pickerWrap}>
            <Picker selectedValue={role} onValueChange={(value) => setSelectedRole(value)} style={styles.picker}>
              <Picker.Item label="Member" value="member" />
              <Picker.Item label="Admin" value="admin" />
            </Picker>
          </View>

          <Button mode="contained" onPress={handleLogin} style={styles.button} textColor="#ffffff" loading={submitting} disabled={submitting}>
            Sign In
          </Button>

          <Button
            mode="outlined"
            onPress={handleGoogleLogin}
            style={styles.googleButton}
            textColor="#111827"
            icon="google"
            loading={googleSubmitting}
            disabled={googleSubmitting}
          >
            Continue with Google
          </Button>

          <View style={styles.links}>
            <Button
              compact
              mode="text"
              textColor="#1d4ed8"
              onPress={() => router.push('/register')}
            >
              Don&apos;t have an account? Register
            </Button>
            <Button
              compact
              mode="text"
              textColor="#1d4ed8"
              onPress={handleForgotPassword}
            >
              Forgot Password?
            </Button>
          </View>
        </Card.Content>
      </Card>
      </Animated.View>

      <Portal>
        <Modal
          visible={resetOpen}
          onDismiss={() => setResetOpen(false)}
          contentContainerStyle={styles.modalWrap}
        >
          <Card mode="outlined" style={styles.resetCard}>
            <Card.Content style={styles.resetContent}>
              <View style={styles.resetIconWrap}>
                <MaterialCommunityIcons
                  name={resetDone ? 'check-circle-outline' : resetStep === 'code' ? 'shield-key-outline' : 'lock-reset'}
                  size={34}
                  color="#111827"
                />
              </View>
              <Text variant="titleLarge" style={styles.resetTitle}>
                {resetDone ? (isSupabaseConfigured ? 'Check your email' : 'Password changed') : resetStep === 'code' ? 'Verify your email' : resetStep === 'password' ? 'Create new password' : 'Forgot Password'}
              </Text>
              <Text style={styles.resetMessage}>
                {resetDone && isSupabaseConfigured ? 'Open the password reset link we sent to your email, then choose a new password.' : null}
                {resetDone && !isSupabaseConfigured ? 'You can now sign in using your new password.' : null}
                {!resetDone && resetStep === 'email' ? 'Enter your account email to receive a verification link.' : null}
                {!resetDone && resetStep === 'code' ? 'Enter the verification code to continue.' : null}
                {!resetDone && resetStep === 'password' ? 'Choose and confirm your new password.' : null}
              </Text>

              {resetStep === 'email' && !resetDone ? (
                <>
                  <TextInput
                    left={<TextInput.Icon icon="email-outline" />}
                    label="Email"
                    value={resetEmail}
                    onChangeText={(value) => {
                      setResetEmail(removeWhitespace(value));
                      setResetEmailError('');
                    }}
                    mode="outlined"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.input}
                    theme={inputTheme}
                    textColor="#111827"
                    error={Boolean(resetEmailError)}
                  />
                  {resetEmailError ? <Text style={styles.fieldError}>{resetEmailError}</Text> : null}
                </>
              ) : null}

              {resetStep === 'code' && !resetDone ? (
                <>
                  <View style={styles.demoCodeBox}>
                    <Text style={styles.demoCodeLabel}>Verification code</Text>
                    <Text style={styles.demoCodeValue}>{verificationCode}</Text>
                  </View>
                  <TextInput
                    left={<TextInput.Icon icon="shield-key-outline" />}
                    label="Verification Code"
                    value={enteredCode}
                    onChangeText={(value) => {
                      setEnteredCode(removeWhitespace(value));
                      setVerificationError('');
                    }}
                    mode="outlined"
                    keyboardType="number-pad"
                    style={styles.input}
                    theme={inputTheme}
                    textColor="#111827"
                    error={Boolean(verificationError)}
                  />
                  {verificationError ? <Text style={styles.fieldError}>{verificationError}</Text> : null}
                </>
              ) : null}

              {resetStep === 'password' && !resetDone ? (
                <>
                  <TextInput
                    left={<TextInput.Icon icon="lock-outline" />}
                    right={<TextInput.Icon icon={showResetPassword ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowResetPassword((value) => !value)} />}
                    label="New Password"
                    value={resetNewPassword}
                    onChangeText={(value) => {
                      setResetNewPassword(removeWhitespace(value));
                      setResetPasswordError('');
                    }}
                    mode="outlined"
                    secureTextEntry={!showResetPassword}
                    style={styles.input}
                    theme={inputTheme}
                    textColor="#111827"
                    error={Boolean(resetPasswordError)}
                  />
                  <TextInput
                    left={<TextInput.Icon icon="lock-check-outline" />}
                    right={<TextInput.Icon icon={showResetConfirmPassword ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowResetConfirmPassword((value) => !value)} />}
                    label="Confirm New Password"
                    value={resetConfirmPassword}
                    onChangeText={(value) => {
                      setResetConfirmPassword(removeWhitespace(value));
                      setResetPasswordError('');
                    }}
                    mode="outlined"
                    secureTextEntry={!showResetConfirmPassword}
                    style={styles.input}
                    theme={inputTheme}
                    textColor="#111827"
                    error={Boolean(resetPasswordError)}
                  />
                  {resetPasswordError ? <Text style={styles.fieldError}>{resetPasswordError}</Text> : null}
                </>
              ) : null}

              <View style={styles.resetActions}>
                <Button mode="outlined" textColor="#111827" onPress={() => setResetOpen(false)}>
                  {resetDone ? 'Close' : 'Cancel'}
                </Button>
                {resetStep === 'email' && !resetDone ? (
                  <Button mode="contained" textColor="#ffffff" style={styles.resetButton} loading={resetSubmitting} disabled={resetSubmitting} onPress={sendPasswordResetEmail}>
                    {isSupabaseConfigured ? 'Send Email' : 'Send Code'}
                  </Button>
                ) : null}
                {resetStep === 'code' && !resetDone ? (
                  <Button mode="contained" textColor="#ffffff" style={styles.resetButton} onPress={verifyCode}>
                    Verify
                  </Button>
                ) : null}
                {resetStep === 'password' && !resetDone ? (
                  <Button mode="contained" textColor="#ffffff" style={styles.resetButton} loading={resetSubmitting} disabled={resetSubmitting} onPress={submitLocalReset}>
                    Reset Password
                  </Button>
                ) : null}
              </View>
            </Card.Content>
          </Card>
        </Modal>
        <Modal
          visible={twoFactorOpen}
          onDismiss={() => setTwoFactorOpen(false)}
          contentContainerStyle={styles.modalWrap}
        >
          <Card mode="outlined" style={styles.resetCard}>
            <Card.Content style={styles.resetContent}>
              <View style={styles.resetIconWrap}>
                <MaterialCommunityIcons name="shield-check-outline" size={34} color="#111827" />
              </View>
              <Text variant="titleLarge" style={styles.resetTitle}>Two-Factor Verification</Text>
              <Text style={styles.resetMessage}>Enter the 6-digit code from your profile security setup.</Text>
              <TextInput
                left={<TextInput.Icon icon="shield-key-outline" />}
                label="Verification Code"
                value={twoFactorCode}
                onChangeText={(value) => {
                  setTwoFactorCode(removeWhitespace(value).replace(/\D/g, '').slice(0, 6));
                  setTwoFactorError('');
                }}
                mode="outlined"
                keyboardType="number-pad"
                style={styles.input}
                theme={inputTheme}
                textColor="#111827"
                error={Boolean(twoFactorError)}
              />
              {twoFactorError ? <Text style={styles.fieldError}>{twoFactorError}</Text> : null}
              <View style={styles.resetActions}>
                <Button mode="outlined" textColor="#111827" onPress={() => setTwoFactorOpen(false)}>
                  Cancel
                </Button>
                <Button mode="contained" textColor="#ffffff" style={styles.resetButton} loading={submitting} disabled={submitting} onPress={verifyTwoFactorLogin}>
                  Verify
                </Button>
              </View>
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
  fieldError: { color: '#b91c1c', fontSize: 12, fontWeight: '700', marginTop: -4, marginBottom: 2 },
  roleLabel: { color: '#374151', fontWeight: '700', marginTop: 8 },
  pickerWrap: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 4, overflow: 'hidden', marginTop: -2 },
  picker: { height: 50, width: '100%' },
  button: { marginTop: 10, backgroundColor: '#111827' },
  googleButton: { marginTop: 8, borderColor: '#111827' },
  links: { alignItems: 'center', gap: 4, marginTop: 8 },
  modalWrap: { padding: 20 },
  resetCard: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  resetContent: { gap: 10 },
  resetIconWrap: {
    alignSelf: 'center',
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  resetTitle: { color: '#111827', fontWeight: '900', textAlign: 'center' },
  resetMessage: { color: '#374151', textAlign: 'center', lineHeight: 20, marginBottom: 6 },
  demoCodeBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  demoCodeLabel: { color: '#374151', fontSize: 12, fontWeight: '700' },
  demoCodeValue: { color: '#111827', fontSize: 22, fontWeight: '900', letterSpacing: 0 },
  resetActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  resetButton: { backgroundColor: '#111827' },
});
