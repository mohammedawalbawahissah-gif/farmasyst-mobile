import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { usersApi } from '../../api/client';
import { User } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, Pill, statusVariant, Button, EmptyState, ErrorBanner } from '../../components/ui';

const TABS = ['All', 'Pending', 'Verified', 'Rejected'];

export default function UsersScreen() {
  const [users,      setUsers]      = useState<User[]>([]);
  const [search,     setSearch]     = useState('');
  const [tab,        setTab]        = useState('Pending');
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const params: any = {};
      if (search) params.search = search;
      if (tab !== 'All') params.verification_status = tab.toLowerCase();
      const res = await usersApi.list(params);
      setUsers(res.data.results ?? res.data);
    } catch { setError('Could not load users.'); }
    finally  { setRefreshing(false); }
  }, [search, tab]);

  useEffect(() => { load(); }, [load]);

  async function verify(id: string, name: string) {
    Alert.alert('Verify User', `Verify account for ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Verify', onPress: async () => {
          try { await usersApi.verify(id); load(); }
          catch (e: any) { console.log('USER ACTION ERROR:', JSON.stringify(e?.response?.data)); Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
        }},
    ]);
  }

  async function suspend(id: string, name: string) {
    Alert.alert('Suspend User', `Suspend account for ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: async () => {
          try { await usersApi.suspend(id); load(); }
          catch (e: any) { console.log('USER ACTION ERROR:', JSON.stringify(e?.response?.data)); Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
        }},
    ]);
  }

  const roleColor: Record<string, string> = {
    farmer: Colors.leaf, investor: Colors.investor, admin: '#5C2D8B',
    consumer: Colors.consumer, monitoring_officer: Colors.soil,
    vet: Colors.info, input_dealer: Colors.harvest,
  };

  return (
    <Screen title="Users" subtitle="Manage platform accounts">
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search by name, email..."
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={load}
        />
      </View>

      <View style={styles.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {users.length === 0
          ? <EmptyState message={`No ${tab.toLowerCase()} users found.`} icon="👤" />
          : users.map(u => (
              <Card key={u.id} style={styles.userCard}>
                <View style={styles.userRow}>
                  <View style={[styles.avatar, { backgroundColor: (roleColor[u.role] ?? Colors.leaf) + '20' }]}>
                    <Text style={[styles.avatarText, { color: roleColor[u.role] ?? Colors.leaf }]}>
                      {(u.first_name?.[0] ?? '?').toUpperCase()}{(u.last_name?.[0] ?? '').toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{u.first_name} {u.last_name}</Text>
                    <Text style={styles.userEmail}>{u.email}</Text>
                    <Text style={[styles.userRole, { color: roleColor[u.role] ?? Colors.leaf }]}>{u.role.replace(/_/g, ' ')}</Text>
                  </View>
                  <Pill label={u.is_verified ? 'Verified' : 'Pending'} variant={u.is_verified ? 'green' : 'amber'} />
                </View>
                {!u.is_verified && (
                  <View style={styles.userActions}>
                    <Button label="Verify"  onPress={() => verify(u.id, u.first_name)}  variant="primary"  size="sm" style={{ flex: 1 }} />
                    <Button label="Reject"  onPress={() => suspend(u.id, u.first_name)} variant="danger"   size="sm" style={{ flex: 1 }} />
                  </View>
                )}
              </Card>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap:    { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  search:        { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.ink },
  tabBar:        { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.border, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  tab:           { flex: 1, paddingVertical: 9, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: Colors.leaf, marginBottom: -2 },
  tabText:       { fontSize: 12, fontWeight: '500', color: Colors.muted },
  tabTextActive: { color: Colors.leaf, fontWeight: '700' },
  userCard:      { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  userRow:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:        { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: 16, fontWeight: '700' },
  userName:      { fontSize: 14, fontWeight: '700', color: Colors.ink },
  userEmail:     { fontSize: 12, color: Colors.muted, marginTop: 1 },
  userRole:      { fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  userActions:   { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});
