import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usersApi, creditApi, paymentsApi, farmsApi, notifApi } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { StatCard, ErrorBanner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const MENU = [
  { icon: '👥', title: 'Users & Verification',  sub: 'Verify accounts, manage roles',       key: 'users',     tab: 'Users',     color: '#5C2D8B' },
  { icon: '💳', title: 'Credit Workflow',        sub: 'Review, approve, match applications',  key: 'credit',    tab: 'Credit',    color: Colors.earth },
  { icon: '🌾', title: 'Farm Registry', sub: 'Register & manage farms', key: 'farms', tab: 'Farms', color: Colors.leaf },
  { icon: '🤝', title: 'Farmer Matching', sub: 'Assign approved apps to investors', key: 'matching', tab: 'Matching', color: Colors.investor },
  { icon: '📚', title: 'Training', sub: 'Manage training modules', key: 'training', tab: 'Training', color: '#5C2D8B' },
  { icon: '📊', title: 'Analytics', sub: 'Platform metrics & insights', key: 'analytics', tab: 'Analytics', color: Colors.soil },
  { icon: '🔔', title: 'Notifications',          sub: 'View platform alerts',                 key: 'alerts',    tab: 'Alerts',    color: Colors.info },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [pendingUsers, setPendingUsers] = useState(0);
  const [pendingApps,  setPendingApps]  = useState(0);
  const [pendingDisb,  setPendingDisb]  = useState(0);
  const [totalFarms,   setTotalFarms]   = useState(0);
  const [unread,       setUnread]       = useState(0);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [u, a, d, f, n] = await Promise.all([
        usersApi.list({ verification_status: 'pending' }),
        creditApi.listApplications({ status: 'submitted' }),
        paymentsApi.disbursementRequests({ status: 'pending' }),
        farmsApi.list(),
        notifApi.unreadCount(),
      ]);
      setPendingUsers(u.data.count ?? (u.data.results ?? u.data).length);
      setPendingApps(a.data.count  ?? (a.data.results  ?? a.data).length);
      setPendingDisb(d.data.count  ?? (d.data.results  ?? d.data).length);
      setTotalFarms(f.data.count   ?? (f.data.results  ?? f.data).length);
      setUnread(n.data.unread ?? 0);
    } catch { setError('Could not load admin data.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const badges: Record<string, number> = {
    users: pendingUsers, credit: pendingApps,
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.role}>Admin Panel</Text>
          <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>}
          <TouchableOpacity onPress={logout}><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Sign out</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {error ? <ErrorBanner message={error} /> : null}

        <View style={styles.statsRow}>
          <StatCard label="Pending Users" value={pendingUsers.toString()} changeUp={false} change={pendingUsers > 0 ? 'Needs review' : undefined} />
          <StatCard label="Pending Apps"  value={pendingApps.toString()}  changeUp={false} change={pendingApps  > 0 ? 'Needs review' : undefined} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Pending Disb." value={pendingDisb.toString()} />
          <StatCard label="Total Farms"   value={totalFarms.toString()} />
        </View>

        <Text style={styles.menuTitle}>Admin Actions</Text>
        {/* FIX: TouchableOpacity with navigation.navigate */}
        {MENU.map(item => (
          <TouchableOpacity
            key={item.key}
            onPress={() => navigation.navigate(item.tab)}
            activeOpacity={0.7}
            style={styles.menuItem}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>{item.title}</Text>
              <Text style={styles.menuSub}>{item.sub}</Text>
            </View>
            {badges[item.key] > 0
              ? <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{badges[item.key]}</Text></View>
              : <Text style={{ color: Colors.muted, fontSize: 20 }}>›</Text>
            }
          </TouchableOpacity>
        ))}

        {/* Disbursement requests inline since there's no dedicated tab */}
        {pendingDisb > 0 && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Credit')}
            activeOpacity={0.7}
            style={styles.menuItem}
          >
            <View style={[styles.menuIcon, { backgroundColor: Colors.harvest + '20' }]}>
              <Text style={{ fontSize: 18 }}>💸</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>Disbursements</Text>
              <Text style={styles.menuSub}>Approve disbursement requests</Text>
            </View>
            <View style={styles.menuBadge}><Text style={styles.menuBadgeText}>{pendingDisb}</Text></View>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:        { backgroundColor: '#1A0A30', flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingBottom: 14 },
  role:          { fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 1 },
  name:          { fontSize: 20, fontWeight: '700', color: Colors.white },
  badge:         { backgroundColor: Colors.harvest, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:     { fontSize: 11, fontWeight: '700', color: Colors.white },
  statsRow:      { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  menuTitle:     { fontSize: 16, fontWeight: '700', color: Colors.ink, marginHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm },
  menuItem:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.white, marginHorizontal: Spacing.md, marginBottom: 8, borderRadius: Radius.md, padding: 14, borderWidth: 1, borderColor: Colors.border },
  menuIcon:      { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel:     { fontSize: 14, fontWeight: '700', color: Colors.ink },
  menuSub:       { fontSize: 12, color: Colors.muted, marginTop: 2 },
  menuBadge:     { backgroundColor: Colors.harvest, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  menuBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.white },
});
