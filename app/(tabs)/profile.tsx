import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Avatar, Button, Card, DataTable, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { AppShell } from '@/components/app-shell';
import { useAppRole } from '@/components/app-role-context';

function formatMemberSince(value?: string) {
  if (!value) {
    return 'May 1, 2024';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'May 1, 2024';
  }

  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Profile() {
  const { attendanceRecords, changePassword, currentUser, disableTwoFactor, enableTwoFactor, feedbackEntries, role, themeMode, toggleThemeMode, updateProfile } = useAppRole();
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);
  const [savingTwoFactor, setSavingTwoFactor] = useState(false);
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState('');
  const [twoFactorConfirmCode, setTwoFactorConfirmCode] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNextPassword, setShowNextPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const stripSpaces = (value: string) => value.replace(/\s/g, '');
  const generateTwoFactorCode = () => String(Math.floor(100000 + Math.random() * 900000));
  const roleLabel = role === 'admin' ? 'Administrator' : 'Member';
  const memberSince = formatMemberSince(currentUser?.registeredAt);
  const dark = themeMode === 'dark';
  const colors = {
    card: dark ? '#111827' : '#ffffff',
    soft: dark ? '#1f2937' : '#e5e7eb',
    border: dark ? '#374151' : '#d1d5db',
    line: dark ? '#334155' : '#e5e7eb',
    text: dark ? '#f9fafb' : '#111827',
    muted: dark ? '#cbd5e1' : '#374151',
    avatarText: dark ? '#f8fafc' : '#6b7280',
  };
  const inputTheme = {
    colors: {
      primary: colors.text,
      text: colors.text,
      placeholder: colors.muted,
      onSurfaceVariant: colors.muted,
      surfaceVariant: colors.soft,
      background: colors.soft,
    },
  };
  const themeLabel = themeMode === 'light' ? 'Light ☀️' : 'Dark 🌙';
  const nextThemeLabel = themeMode === 'light' ? 'Dark 🌙' : 'Light ☀️';
  const personalRows = [
    ['Full Name', currentUser?.name ?? '-'],
    ['Email Address', currentUser?.email ?? '-'],
    ['Role', roleLabel],
    ['Member Since', memberSince],
    ['Phone Number', currentUser?.phone ?? '-'],
    ['Date of Birth', currentUser?.birthDate ?? '-'],
    ['Address', currentUser?.address ?? '-'],
  ];
  const recentActivity = useMemo(() => {
    const recentAttendance = attendanceRecords
      .filter((record) => role === 'admin' || record.userId === currentUser?.id)
      .slice(0, 2)
      .map((record) => ({
        id: `attendance-${record.id}`,
        activity: record.status === 'Present' ? 'Checked in' : 'Attendance recorded',
        date: record.date,
        details: `${record.session} - ${record.status}`,
      }));
    const recentFeedback = feedbackEntries
      .filter((feedback) => role === 'admin' || feedback.userId === currentUser?.id)
      .slice(0, 2)
      .map((feedback) => ({
        id: `feedback-${feedback.id}`,
        activity: 'Submitted feedback',
        date: feedback.date,
        details: `${feedback.session} - ${feedback.rating}/5`,
      }));

    return [
      { id: 'login-now', activity: 'Logged in', date: 'Today', details: 'Current session' },
      ...recentAttendance,
      ...recentFeedback,
    ].slice(0, 4);
  }, [attendanceRecords, currentUser?.id, feedbackEntries, role]);

  useEffect(() => {
    if (!editing) {
      return;
    }

    setEditName(currentUser?.name ?? '');
    setEditPhone(currentUser?.phone ?? '');
    setEditBirthDate(currentUser?.birthDate ?? '');
    setEditAddress(currentUser?.address ?? '');
  }, [currentUser, editing]);

  const saveProfile = async () => {
    setSavingProfile(true);
    const result = await updateProfile({
      name: editName,
      phone: editPhone,
      birthDate: editBirthDate,
      address: editAddress,
    });
    setSavingProfile(false);

    if (!result.ok) {
      Alert.alert('Profile not saved', result.message ?? 'Please try again.');
      return;
    }

    setEditing(false);
  };

  const savePassword = async () => {
    if (nextPassword !== confirmPassword) {
      Alert.alert('Password not changed', 'New password and confirm password do not match.');
      return;
    }

    setSavingPassword(true);
    const result = await changePassword(currentPassword, nextPassword);
    setSavingPassword(false);

    if (!result.ok) {
      Alert.alert('Password not changed', result.message ?? 'Please try again.');
      return;
    }

    setPasswordModalOpen(false);
    setCurrentPassword('');
    setNextPassword('');
    setConfirmPassword('');
    Alert.alert('Password changed', 'Your password has been updated.');
  };

  const openTwoFactorSetup = () => {
    setTwoFactorSetupCode(generateTwoFactorCode());
    setTwoFactorConfirmCode('');
    setTwoFactorModalOpen(true);
  };

  const confirmTwoFactorSetup = async () => {
    if (twoFactorConfirmCode !== twoFactorSetupCode) {
      Alert.alert('Two-factor not enabled', 'The verification code does not match.');
      return;
    }

    setSavingTwoFactor(true);
    const result = await enableTwoFactor(twoFactorSetupCode);
    setSavingTwoFactor(false);

    if (!result.ok) {
      Alert.alert('Two-factor not enabled', result.message ?? 'Please try again.');
      return;
    }

    setTwoFactorModalOpen(false);
    Alert.alert('Two-factor enabled', 'You will need this 6-digit code the next time you sign in.');
  };

  const turnOffTwoFactor = async () => {
    setSavingTwoFactor(true);
    const result = await disableTwoFactor();
    setSavingTwoFactor(false);

    if (!result.ok) {
      Alert.alert('Two-factor not changed', result.message ?? 'Please try again.');
      return;
    }

    Alert.alert('Two-factor disabled', 'Your account will no longer ask for a verification code at sign in.');
  };

  return (
    <AppShell
      activeKey="profile"
      title="My Profile"
      subtitle="View and manage your account information."
    >
      <View style={styles.layout}>
        <Card mode="outlined" style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content style={styles.heroContent}>
            <View style={styles.heroIdentity}>
              <Avatar.Text
                size={92}
                label={currentUser?.initials ?? 'FH'}
                style={[styles.profileAvatar, { backgroundColor: colors.soft }]}
                labelStyle={[styles.avatarLabel, { color: colors.avatarText }]}
              />
              <View style={styles.heroCopy}>
                <View style={styles.nameRow}>
                  <Text variant="titleLarge" style={[styles.profileName, { color: colors.text }]}>
                    {currentUser?.name ?? 'FellowshipHub User'}
                  </Text>
                  <View style={[styles.rolePill, { borderColor: colors.border }]}>
                    <Text style={[styles.rolePillText, { color: colors.text }]}>{roleLabel}</Text>
                  </View>
                </View>
                <Text style={[styles.emailText, { color: colors.text }]}>{currentUser?.email ?? '-'}</Text>
                <Text style={[styles.memberSince, { color: colors.text }]}>Member since {memberSince}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.infoGrid}>
          <Card mode="outlined" style={[styles.personalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Card.Content>
              <Text variant="titleMedium" style={[styles.cardTitle, { color: colors.text }]}>Personal Information</Text>
              <View style={styles.infoRows}>
                {personalRows.map(([label, value]) => (
                  <View key={label} style={[styles.infoRow, { borderBottomColor: colors.line }]}>
                    <Text style={[styles.infoLabel, { color: colors.text }]}>{label}</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
                  </View>
                ))}
              </View>
              <Button
                mode="outlined"
                textColor={colors.text}
                icon="pencil-outline"
                onPress={() => setEditing(true)}
                style={[styles.centerButton, { borderColor: colors.border }]}
              >
                Edit Information
              </Button>
            </Card.Content>
          </Card>

          <View style={styles.sideStack}>
            <Card mode="outlined" style={[styles.sideCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content>
                <Text variant="titleMedium" style={[styles.cardTitle, { color: colors.text }]}>Security</Text>
                <View style={styles.actionRow}>
                  <View>
                    <Text style={[styles.infoLabel, { color: colors.text }]}>Password</Text>
                    <Text style={[styles.maskedValue, { color: colors.text }]}>********</Text>
                  </View>
                  <Button mode="outlined" textColor={colors.text} onPress={() => setPasswordModalOpen(true)}>
                    Change Password
                  </Button>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.line }]} />
                <View style={styles.actionRow}>
                  <View>
                    <Text style={[styles.infoLabel, { color: colors.text }]}>Two-Factor Authentication</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{currentUser?.twoFactorEnabled ? 'Enabled' : 'Not enabled'}</Text>
                  </View>
                  <Button
                    mode="outlined"
                    textColor={colors.text}
                    loading={savingTwoFactor}
                    disabled={savingTwoFactor}
                    onPress={currentUser?.twoFactorEnabled ? turnOffTwoFactor : openTwoFactorSetup}
                  >
                    {currentUser?.twoFactorEnabled ? 'Disable' : 'Enable'}
                  </Button>
                </View>
              </Card.Content>
            </Card>

            <Card mode="outlined" style={[styles.sideCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content>
                <Text variant="titleMedium" style={[styles.cardTitle, { color: colors.text }]}>Preferences</Text>
                <View style={styles.actionRow}>
                  <View>
                    <Text style={[styles.infoLabel, { color: colors.text }]}>Email Notifications</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>Enabled</Text>
                  </View>
                  <Button mode="outlined" textColor={colors.text} onPress={() => Alert.alert('Preferences', 'Notification preferences are coming next.')}>
                    Manage
                  </Button>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.line }]} />
                <View style={styles.actionRow}>
                  <View>
                    <Text style={[styles.infoLabel, { color: colors.text }]}>Theme</Text>
                    <Text style={[styles.infoValue, { color: colors.text }]}>{themeLabel}</Text>
                  </View>
                  <Button mode="outlined" textColor={colors.text} onPress={toggleThemeMode}>
                    {nextThemeLabel}
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </View>
        </View>

        <Card mode="outlined" style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Card.Content>
            <Text variant="titleMedium" style={[styles.cardTitle, { color: colors.text }]}>Recent Activity</Text>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title textStyle={{ color: colors.muted }}>Activity</DataTable.Title>
                <DataTable.Title textStyle={{ color: colors.muted }}>Date</DataTable.Title>
                <DataTable.Title textStyle={{ color: colors.muted }}>Details</DataTable.Title>
              </DataTable.Header>
              {recentActivity.map((activity) => (
                <DataTable.Row key={activity.id}>
                  <DataTable.Cell textStyle={{ color: colors.text }}>{activity.activity}</DataTable.Cell>
                  <DataTable.Cell textStyle={{ color: colors.text }}>{activity.date}</DataTable.Cell>
                  <DataTable.Cell textStyle={{ color: colors.text }}>{activity.details}</DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
            <Button
              mode="outlined"
              textColor={colors.text}
              onPress={() => Alert.alert('Activity', 'You are viewing the latest profile activity.')}
              style={[styles.activityButton, { borderColor: colors.border }]}
            >
              View All Activity
            </Button>
          </Card.Content>
        </Card>

        <Portal>
          <Modal
            visible={editing}
            onDismiss={() => setEditing(false)}
            contentContainerStyle={styles.modalWrap}
          >
            <Card mode="outlined" style={[styles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content style={styles.editContent}>
                <Text variant="titleLarge" style={[styles.editTitle, { color: colors.text }]}>Edit Personal Information</Text>
                <TextInput
                  label="Full Name"
                  value={editName}
                  onChangeText={setEditName}
                  mode="outlined"
                  style={[styles.editInput, { backgroundColor: colors.soft }]}
                  theme={inputTheme}
                  textColor={colors.text}
                />
                <TextInput
                  label="Phone Number"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  mode="outlined"
                  style={[styles.editInput, { backgroundColor: colors.soft }]}
                  theme={inputTheme}
                  textColor={colors.text}
                />
                <TextInput
                  label="Date of Birth"
                  value={editBirthDate}
                  onChangeText={setEditBirthDate}
                  mode="outlined"
                  placeholder="Month Day, Year"
                  style={[styles.editInput, { backgroundColor: colors.soft }]}
                  theme={inputTheme}
                  textColor={colors.text}
                />
                <TextInput
                  label="Address"
                  value={editAddress}
                  onChangeText={setEditAddress}
                  mode="outlined"
                  multiline
                  style={[styles.editInput, { backgroundColor: colors.soft }]}
                  theme={inputTheme}
                  textColor={colors.text}
                />
                <View style={styles.editActions}>
                  <Button mode="outlined" textColor={colors.text} onPress={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    textColor="#ffffff"
                    style={styles.saveButton}
                    loading={savingProfile}
                    disabled={savingProfile}
                    onPress={saveProfile}
                  >
                    Save
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </Modal>
          <Modal
            visible={passwordModalOpen}
            onDismiss={() => setPasswordModalOpen(false)}
            contentContainerStyle={styles.modalWrap}
          >
            <Card mode="outlined" style={[styles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content style={styles.editContent}>
                <Text variant="titleLarge" style={[styles.editTitle, { color: colors.text }]}>Change Password</Text>
                <TextInput
                  label="Current Password"
                  value={currentPassword}
                  onChangeText={(value) => setCurrentPassword(stripSpaces(value))}
                  mode="outlined"
                  secureTextEntry={!showCurrentPassword}
                  right={<TextInput.Icon icon={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowCurrentPassword((current) => !current)} />}
                  style={[styles.editInput, { backgroundColor: colors.soft }]}
                  theme={inputTheme}
                  textColor={colors.text}
                />
                <TextInput
                  label="New Password"
                  value={nextPassword}
                  onChangeText={(value) => setNextPassword(stripSpaces(value))}
                  mode="outlined"
                  secureTextEntry={!showNextPassword}
                  right={<TextInput.Icon icon={showNextPassword ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowNextPassword((current) => !current)} />}
                  style={[styles.editInput, { backgroundColor: colors.soft }]}
                  theme={inputTheme}
                  textColor={colors.text}
                />
                <TextInput
                  label="Confirm Password"
                  value={confirmPassword}
                  onChangeText={(value) => setConfirmPassword(stripSpaces(value))}
                  mode="outlined"
                  secureTextEntry={!showConfirmPassword}
                  right={<TextInput.Icon icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} onPress={() => setShowConfirmPassword((current) => !current)} />}
                  style={[styles.editInput, { backgroundColor: colors.soft }]}
                  theme={inputTheme}
                  textColor={colors.text}
                />
                <View style={styles.editActions}>
                  <Button mode="outlined" textColor={colors.text} onPress={() => setPasswordModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    textColor="#ffffff"
                    style={styles.saveButton}
                    loading={savingPassword}
                    disabled={savingPassword}
                    onPress={savePassword}
                  >
                    Save
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </Modal>
          <Modal
            visible={twoFactorModalOpen}
            onDismiss={() => setTwoFactorModalOpen(false)}
            contentContainerStyle={styles.modalWrap}
          >
            <Card mode="outlined" style={[styles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Card.Content style={styles.editContent}>
                <Text variant="titleLarge" style={[styles.editTitle, { color: colors.text }]}>Enable Two-Factor Authentication</Text>
                <View style={[styles.twoFactorCodeBox, { backgroundColor: colors.soft, borderColor: colors.border }]}>
                  <Text style={[styles.twoFactorCodeLabel, { color: colors.muted }]}>Your verification code</Text>
                  <Text style={[styles.twoFactorCodeValue, { color: colors.text }]}>{twoFactorSetupCode}</Text>
                </View>
                <Text style={[styles.twoFactorHelp, { color: colors.muted }]}>
                  Save this code somewhere safe. You will enter it when signing in.
                </Text>
                <TextInput
                  label="Confirm Verification Code"
                  value={twoFactorConfirmCode}
                  onChangeText={(value) => setTwoFactorConfirmCode(stripSpaces(value).replace(/\D/g, '').slice(0, 6))}
                  mode="outlined"
                  keyboardType="number-pad"
                  style={[styles.editInput, { backgroundColor: colors.soft }]}
                  theme={inputTheme}
                  textColor={colors.text}
                />
                <View style={styles.editActions}>
                  <Button mode="outlined" textColor={colors.text} onPress={() => setTwoFactorModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    textColor="#ffffff"
                    style={styles.saveButton}
                    loading={savingTwoFactor}
                    disabled={savingTwoFactor}
                    onPress={confirmTwoFactorSetup}
                  >
                    Enable
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
  heroCard: { backgroundColor: '#ffffff', borderColor: '#d1d5db' },
  heroContent: {
    minHeight: 120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 18,
  },
  heroIdentity: { flexDirection: 'row', alignItems: 'center', gap: 24, flex: 1, minWidth: 280 },
  profileAvatar: { backgroundColor: '#e5e7eb' },
  avatarLabel: { color: '#6b7280', fontWeight: '800' },
  heroCopy: { flex: 1, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  profileName: { color: '#111827', fontWeight: '900' },
  rolePill: {
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  rolePillText: { color: '#111827', fontSize: 12, fontWeight: '700' },
  emailText: { color: '#111827', fontWeight: '500' },
  memberSince: { color: '#111827', fontWeight: '500' },
  infoGrid: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  personalCard: { flex: 1.05, minWidth: 330, backgroundColor: '#ffffff', borderColor: '#d1d5db' },
  sideStack: { flex: 1, minWidth: 320, gap: 16 },
  sideCard: { backgroundColor: '#ffffff', borderColor: '#d1d5db' },
  cardTitle: { color: '#111827', fontWeight: '900', marginBottom: 18 },
  infoRows: { marginBottom: 20 },
  infoRow: {
    minHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  infoLabel: { color: '#111827', fontWeight: '500' },
  infoValue: { color: '#111827', fontWeight: '500', textAlign: 'right', flexShrink: 1 },
  maskedValue: { color: '#111827', fontWeight: '800', marginTop: 6 },
  centerButton: { alignSelf: 'center', borderColor: '#9ca3af' },
  actionRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },
  activityCard: { backgroundColor: '#ffffff', borderColor: '#d1d5db' },
  activityButton: { alignSelf: 'center', marginTop: 18, borderColor: '#9ca3af' },
  modalWrap: { padding: 20 },
  editCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
  },
  editContent: { gap: 12 },
  editTitle: { color: '#111827', fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  editInput: { backgroundColor: '#ffffff' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  saveButton: { backgroundColor: '#111827', minWidth: 96 },
  twoFactorCodeBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  twoFactorCodeLabel: { fontSize: 12, fontWeight: '800' },
  twoFactorCodeValue: { fontSize: 28, fontWeight: '900', letterSpacing: 0 },
  twoFactorHelp: { textAlign: 'center', lineHeight: 20 },
});
