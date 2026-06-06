import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Avatar, IconButton, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppRole } from './app-role-context';

type ShellItem = {
  key: string;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  route?: string;
};

const memberItems: ShellItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard', route: '/(tabs)/dashboard' },
  { key: 'attendance', label: 'Attendance', icon: 'calendar-check', route: '/(tabs)/attendance' },
  { key: 'history', label: 'History', icon: 'history', route: '/(tabs)/history' },
  { key: 'sessions', label: 'Meetings', icon: 'clipboard-list-outline', route: '/(tabs)/sessions' },
  { key: 'meeting-room', label: 'Meeting Room', icon: 'video-outline', route: '/(tabs)/meeting-room' },
  { key: 'inbox', label: 'Inbox', icon: 'email-outline', route: '/(tabs)/inbox' },
  { key: 'progress', label: 'AI Progress Check', icon: 'robot', route: '/(tabs)/ai-progress' },
  { key: 'feedback', label: 'Feedback', icon: 'star-outline', route: '/(tabs)/feedback' },
  { key: 'profile', label: 'Profile', icon: 'account-circle-outline', route: '/(tabs)/profile' },
  { key: 'logout', label: 'Logout', icon: 'logout-variant' },
];

const adminItems: ShellItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'view-dashboard', route: '/(tabs)/dashboard' },
  { key: 'members', label: 'Members', icon: 'account-group-outline', route: '/(tabs)/members' },
  { key: 'attendance', label: 'Attendance', icon: 'calendar-check', route: '/(tabs)/attendance' },
  { key: 'history', label: 'History', icon: 'history', route: '/(tabs)/history' },
  { key: 'sessions', label: 'Sessions', icon: 'clipboard-list-outline', route: '/(tabs)/sessions' },
  { key: 'meeting-room', label: 'Meeting Room', icon: 'video-outline', route: '/(tabs)/meeting-room' },
  { key: 'inbox', label: 'Inbox', icon: 'email-outline', route: '/(tabs)/inbox' },
  { key: 'feedback', label: 'Feedback', icon: 'star-outline', route: '/(tabs)/feedback' },
  { key: 'reports', label: 'Reports', icon: 'chart-box-outline', route: '/(tabs)/reports' },
  { key: 'profile', label: 'Profile', icon: 'account-circle-outline', route: '/(tabs)/profile' },
  { key: 'logout', label: 'Logout', icon: 'logout-variant' },
];

export function AppShell({
  activeKey,
  title,
  subtitle,
  children,
}: {
  activeKey: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { currentUser, loading, logout, role, themeMode } = useAppRole();
  const [navMenuOpen, setNavMenuOpen] = useState(false);
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(14)).current;
  const navTranslate = useRef(new Animated.Value(320)).current;
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
  const items = role === 'admin' ? adminItems : memberItems;
  const userLabel = currentUser?.name ?? '';
  const roleLabel = role === 'admin' ? 'Administrator' : 'Member';
  const dark = themeMode === 'dark';
  const shellColors = {
    page: dark ? '#0f172a' : '#ffffff',
    panel: dark ? '#111827' : '#ffffff',
    panelAlt: dark ? '#1f2937' : '#f3f4f6',
    border: dark ? '#374151' : '#e5e7eb',
    text: dark ? '#f9fafb' : '#111827',
    muted: dark ? '#cbd5e1' : '#374151',
    active: dark ? '#334155' : '#f3f4f6',
  };

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (loading || !currentUser) {
      return;
    }

    contentOpacity.setValue(0);
    contentTranslate.setValue(14);
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslate, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeKey, contentOpacity, contentTranslate, currentUser, loading]);

  useEffect(() => {
    Animated.timing(navTranslate, {
      toValue: navMenuOpen ? 0 : 320,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [navMenuOpen, navTranslate]);

  const handleItemPress = (item: ShellItem) => {
    if (item.route) {
      setNavMenuOpen(false);
      router.push(item.route as never);
      return;
    }

    if (item.key === 'logout') {
      handleLogout();
      return;
    }

    Alert.alert(item.label, `${item.label} tools are coming next. This button is now connected.`);
  };

  const handleDrawerItemPress = (item: ShellItem) => {
    setNavMenuOpen(false);
    handleItemPress(item);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  if (loading || !currentUser) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: shellColors.page }]}>
        <Text style={[styles.loadingText, { color: shellColors.muted }]}>Loading FellowshipHub...</Text>
      </View>
    );
  }

  const shellContent = (
    <View style={[styles.shell, { backgroundColor: shellColors.page }, !desktop && styles.mobileShell]}>
      {desktop ? (
        <View style={[styles.sidebar, { backgroundColor: shellColors.panel, borderRightColor: shellColors.border }]}>
          <View style={styles.brandRow}>
            <MaterialCommunityIcons name="cross" size={22} color={shellColors.text} />
            <Text style={[styles.brandText, { color: shellColors.text }]}>FellowshipHub</Text>
          </View>
          <View style={styles.sideNav}>
            {items.map((item) => {
              const active = item.key === activeKey;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => handleItemPress(item)}
                  style={[styles.sideItem, active && { backgroundColor: shellColors.active }]}
                >
                  <MaterialCommunityIcons name={item.icon} size={18} color={active ? shellColors.text : shellColors.muted} />
                  <Text style={[styles.sideLabel, { color: active ? shellColors.text : shellColors.muted }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.main}>
        <View style={[styles.topbar, { backgroundColor: shellColors.panel, borderBottomColor: shellColors.border }]}>
          <View style={styles.topbarLeft}>
            <MaterialCommunityIcons name="cross" size={22} color={shellColors.text} />
            <Text style={[styles.brandText, { color: shellColors.text }]}>FellowshipHub</Text>
          </View>
          {desktop ? (
            <IconButton
              icon="menu"
              mode="contained-tonal"
              size={20}
              onPress={() => Alert.alert('Navigation', 'Use the sidebar to move between sections.')}
            />
          ) : null}
          <View style={styles.topbarRight}>
            <Avatar.Text size={32} label={currentUser.initials} style={[styles.avatar, dark && styles.darkAvatar]} />
            <View style={styles.identity}>
              <Text style={[styles.identityName, { color: shellColors.text }]} numberOfLines={1}>{userLabel}</Text>
              <Text style={[styles.identityRole, { color: shellColors.muted }]} numberOfLines={1}>{roleLabel}</Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.content}>
          <Animated.View style={[styles.contentMotion, { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }]}>
            <View style={styles.headerBlock}>
              <Text variant="headlineSmall" style={[styles.pageTitle, { color: shellColors.text }]}>{title}</Text>
              {subtitle ? <Text style={[styles.pageSubtitle, { color: shellColors.muted }]}>{subtitle}</Text> : null}
            </View>
            {children}
          </Animated.View>
        </ScrollView>

        {!desktop ? (
          <View pointerEvents="box-none" style={styles.mobileLauncherWrap}>
            <IconButton
              icon="menu"
              mode="contained"
              size={24}
              onPress={() => setNavMenuOpen(true)}
              style={styles.mobileLauncher}
              iconColor="#ffffff"
            />
          </View>
        ) : null}
      </View>

      <Portal>
        {!desktop && navMenuOpen ? (
          <View style={styles.drawerBackdrop} pointerEvents="box-none">
            <Pressable style={styles.drawerScrim} onPress={() => setNavMenuOpen(false)} />
            <Animated.View style={[styles.drawer, { backgroundColor: shellColors.panel, borderLeftColor: shellColors.border, transform: [{ translateX: navTranslate }] }]}>
              <View style={[styles.drawerHeader, { borderBottomColor: shellColors.border }]}>
                <Text style={[styles.drawerTitle, { color: shellColors.text }]}>Menu</Text>
                <IconButton icon="close" size={20} onPress={() => setNavMenuOpen(false)} />
              </View>
              <ScrollView contentContainerStyle={styles.drawerContent}>
                {items.map((item) => {
                  const active = item.key === activeKey;
                  return (
                    <Pressable
                      key={item.key}
                      onPress={() => handleDrawerItemPress(item)}
                      style={[
                        styles.drawerItem,
                        { backgroundColor: active ? shellColors.active : shellColors.panelAlt, borderColor: shellColors.border },
                      ]}
                    >
                      <MaterialCommunityIcons name={item.icon} size={18} color={active ? shellColors.text : shellColors.muted} />
                      <Text style={[styles.drawerItemText, { color: shellColors.text }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </View>
        ) : null}
      </Portal>
    </View>
  );

  return shellContent;
}

export function ShellSpacer() {
  return null;
}

const styles = StyleSheet.create({
  shell: { flex: 1, flexDirection: 'row', backgroundColor: '#f5f5f5' },
  mobileShell: { flexDirection: 'column' },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
  loadingText: { color: '#374151', fontWeight: '700' },
  sidebar: {
    width: 240,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    paddingTop: 18,
    paddingHorizontal: 14,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, marginBottom: 18 },
  brandText: { fontSize: 14, fontWeight: '700', color: '#111827' },
  sideNav: { gap: 4 },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  sideItemActive: { backgroundColor: '#f3f4f6' },
  sideLabel: { color: '#4b5563', fontSize: 13, fontWeight: '600' },
  sideLabelActive: { color: '#111827' },
  main: { flex: 1, minWidth: 0, position: 'relative' },
  topbar: {
    height: 60,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topbarRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: { backgroundColor: '#1f2937' },
  darkAvatar: { backgroundColor: '#334155' },
  identity: { marginLeft: 2, maxWidth: 120 },
  identityName: { fontSize: 12, fontWeight: '700', color: '#111827' },
  identityRole: { fontSize: 11, color: '#374151', fontWeight: '600' },
  contentScroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 32, maxWidth: 1180, width: '100%', alignSelf: 'center' },
  contentMotion: { width: '100%' },
  headerBlock: { marginBottom: 18 },
  pageTitle: { fontWeight: '800', color: '#111827' },
  pageSubtitle: { color: '#374151', marginTop: 4, lineHeight: 20, fontWeight: '500' },
  mobileLauncherWrap: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    zIndex: 25,
  },
  mobileLauncher: {
    backgroundColor: '#111827',
    margin: 0,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
  },
  drawerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 24, 39, 0.22)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 300,
    height: '100%',
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: -4, height: 0 },
    elevation: 12,
  },
  drawerHeader: {
    height: 60,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerTitle: { color: '#111827', fontWeight: '800' },
  drawerContent: { padding: 12, gap: 10 },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  drawerItemActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  drawerItemText: { flex: 1, color: '#111827', fontWeight: '700' },
});
