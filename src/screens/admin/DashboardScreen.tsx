import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { usersApi, creditApi, farmsApi } from '../../api/client';
import { Card, Pill, statusVariant, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { getResults, User, CreditApplication } from '../../types';

export default function AdminDashboardScreen() {
  const [users,   setUsers]   = useState<User[]>([]);
  const [apps,    setApps]    = useState<CreditApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,     setTab]     = useState<'users'|'credit'|'farms'>('users');
  const [search,  setSearch]  = useState('');
  const [acting,  setActing]  = useState<string|null>(null);

  // Credit review state
  const [reviewingId,    setReviewingId]    = useState<string|null>(null);
  const [reviewNotes,    setReviewNotes]    = useState('');
  const [rejReason,      setRejReason]      = useState('');
  const [matchInvestor,  setMatchInvestor]  = useState('');
  const [reviewAction,   setReviewAction]   = useState<'approve'|'reject'|'match'|null>(null);

  const load = useCallback(async () => {
    try {
      const [uR, aR] = await Promise.all([usersApi.list(), creditApi.listApplications()]);
      setUsers(getResults<User>(uR.data as any));
      setApps(getResults<CreditApplication>(aR.data as any));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const verifyUser = async (id: string) => {
    setActing(id);
    try { await usersApi.verify(id); load(); Alert.alert('Verified', 'User account has been verified.'); }
    catch { Alert.alert('Error', 'Could not verify user.'); }
    finally { setActing(null); }
  };

  const suspendUser = async (id: string, isSuspended: boolean) => {
    Alert.alert(isSuspended ? 'Unsuspend user?' : 'Suspend user?', '', [
      { text: 'Cancel' },
      { text: isSuspended ? 'Unsuspend' : 'Suspend', style: isSuspended ? 'default' : 'destructive',
        onPress: async () => {
          setActing(id);
          try {
            isSuspended ? await usersApi.unsuspend(id) : await usersApi.suspend(id);
            load();
          } catch { Alert.alert('Error', 'Action failed.'); }
          finally { setActing(null); }
        }},
    ]);
  };

  const handleCreditReview = async () => {
    if (!reviewingId || !reviewAction) return;
    setActing(reviewingId);
    try {
      if (reviewAction === 'approve') {
        await creditApi.approve(reviewingId, { reviewer_notes: reviewNotes });
      } else if (reviewAction === 'reject') {
        await creditApi.reject(reviewingId, { rejection_reason: rejReason });
      } else if (reviewAction === 'match') {
        if (!matchInvestor.trim()) { Alert.alert('Missing field', 'Please enter investor ID.'); return; }
        await creditApi.match(reviewingId, { investor_id: matchInvestor.trim() });
      }
      setReviewingId(null); setReviewNotes(''); setRejReason(''); setMatchInvestor(''); setReviewAction(null);
      load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Action failed.');
    } finally { setActing(null); }
  };

  // Role badge
  const roleVariant = (role: string): 'green'|'blue'|'amber'|'red'|'gray' => {
    const m: Record<string,any> = { admin:'red', farmer:'green', investor:'blue', monitoring_officer:'amber', vet:'blue', input_dealer:'gray', consumer:'gray' };
    return m[role] ?? 'gray';
  };

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.includes(search.toLowerCase())
  );

  const pendingUsers = users.filter(u => !u.is_verified);
  const pendingApps  = apps.filter(a => a.status === 'submitted' || a.status === 'under_review');

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={s.pageTitle}>Admin Panel</Text>
      <Text style={s.pageSub}>Manage users, credit reviews, and platform data.</Text>

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={[s.statCard, pendingUsers.length > 0 && { borderColor: Colors.warning }]}>
          <Text style={[s.statValue, pendingUsers.length > 0 && { color: Colors.warning }]}>{pendingUsers.length}</Text>
          <Text style={s.statLabel}>Pending Users</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{users.length}</Text>
          <Text style={s.statLabel}>Total Users</Text>
        </View>
        <View style={[s.statCard, pendingApps.length > 0 && { borderColor: Colors.warning }]}>
          <Text style={[s.statValue, pendingApps.length > 0 && { color: Colors.warning }]}>{pendingApps.length}</Text>
          <Text style={s.statLabel}>Pending Apps</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['users','credit','farms'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'users' ? `👥 Users` : t === 'credit' ? `📄 Credit` : `🏡 Farms`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Credit review form ── */}
      {reviewingId && (
        <Card style={{ borderColor: Colors.earth, borderWidth: 1.5, marginBottom: Spacing.md }}>
          <Text style={{ fontWeight:'700', fontSize: 15, marginBottom: 8 }}>Review Application</Text>
          <View style={{ flexDirection:'row', gap: 8, marginBottom: Spacing.sm }}>
            {(['approve','reject','match'] as const).map(a => (
              <TouchableOpacity key={a}
                style={[s.reviewActionBtn, reviewAction === a && {
                  backgroundColor: a === 'approve' ? Colors.success : a === 'reject' ? Colors.danger : Colors.earth,
                  borderColor: a === 'approve' ? Colors.success : a === 'reject' ? Colors.danger : Colors.earth,
                }]}
                onPress={() => setReviewAction(a)}>
                <Text style={[{ fontSize: 12, fontWeight:'700' }, reviewAction === a && { color: Colors.white }]}>
                  {a === 'approve' ? '✅ Approve' : a === 'reject' ? '❌ Reject' : '🤝 Match Investor'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {reviewAction === 'approve' && (
            <>
              <Text style={s.fLabel}>Reviewer notes</Text>
              <TextInput style={[s.fInput, { height: 60, textAlignVertical:'top' }]}
                placeholder="Approval notes…" placeholderTextColor={Colors.muted} multiline
                value={reviewNotes} onChangeText={setReviewNotes} />
            </>
          )}
          {reviewAction === 'reject' && (
            <>
              <Text style={s.fLabel}>Rejection reason *</Text>
              <TextInput style={[s.fInput, { height: 60, textAlignVertical:'top' }]}
                placeholder="Reason for rejection…" placeholderTextColor={Colors.muted} multiline
                value={rejReason} onChangeText={setRejReason} />
            </>
          )}
          {reviewAction === 'match' && (
            <>
              <Text style={s.fLabel}>Investor user ID *</Text>
              <TextInput style={s.fInput} placeholder="Investor UUID…" placeholderTextColor={Colors.muted}
                value={matchInvestor} onChangeText={setMatchInvestor} />
            </>
          )}
          {reviewAction && (
            <View style={{ flexDirection:'row', gap: 8, marginTop: 6 }}>
              <TouchableOpacity style={[s.btn, { flex:1 }, acting === reviewingId && s.btnDisabled]}
                disabled={acting === reviewingId} onPress={handleCreditReview}>
                {acting === reviewingId ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={s.btnText}>Confirm Action</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnSec, { flex:1 }]}
                onPress={() => { setReviewingId(null); setReviewAction(null); }}>
                <Text style={s.btnSecText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      )}

      {/* Users */}
      {tab === 'users' && (
        <>
          <TextInput style={s.search} placeholder="Search by name, email or role…"
            placeholderTextColor={Colors.muted} value={search} onChangeText={setSearch} />
          {filteredUsers.length === 0
            ? <EmptyState icon="👥" message="No users found." />
            : filteredUsers.map(u => (
              <Card key={u.id}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <View style={{ flex:1 }}>
                    <Text style={{ fontSize: 14, fontWeight:'700', color: Colors.ink }}>{u.full_name}</Text>
                    <Text style={{ fontSize: 12, color: Colors.muted }}>{u.email}</Text>
                    <Text style={{ fontSize: 12, color: Colors.muted }}>{u.phone}</Text>
                    <View style={{ flexDirection:'row', gap: 6, marginTop: 5, flexWrap:'wrap' }}>
                      <Pill label={u.role.replace(/_/g,' ')} variant={roleVariant(u.role)} />
                      {u.is_verified ? <Pill label="Verified" variant="green" /> : <Pill label="Pending" variant="amber" />}
                      {!u.is_active ? <Pill label="Suspended" variant="red" /> : null}
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection:'row', gap: 8, marginTop: 10 }}>
                  {!u.is_verified && (
                    <TouchableOpacity style={[s.actionBtn, acting === u.id && s.actionBtnDisabled]}
                      disabled={acting === u.id} onPress={() => verifyUser(u.id)}>
                      <Text style={s.actionBtnText}>✅ Verify</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: u.is_active ? Colors.danger : Colors.success }, acting === u.id && s.actionBtnDisabled]}
                    disabled={acting === u.id}
                    onPress={() => suspendUser(u.id, !u.is_active)}>
                    <Text style={s.actionBtnText}>{u.is_active ? '🚫 Suspend' : '✅ Unsuspend'}</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          }
        </>
      )}

      {/* Credit */}
      {tab === 'credit' && (
        apps.length === 0
          ? <EmptyState icon="📄" message="No credit applications." />
          : apps.map(app => (
            <Card key={app.id}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 4 }}>
                <Text style={{ fontWeight:'700', fontSize: 13 }}>{app.reference}</Text>
                <Pill label={app.status.replace(/_/g,' ')} variant={statusVariant(app.status)} />
              </View>
              <Text style={{ fontSize: 14, fontWeight:'600' }}>{app.farmer_name}</Text>
              <Text style={{ fontSize: 13, color: Colors.muted }}>{app.credit_type.replace(/_/g,' ')}</Text>
              {app.amount_requested && (
                <Text style={{ fontSize: 14, fontWeight:'700', color: Colors.earth }}>
                  GHS {parseFloat(app.amount_requested).toLocaleString()}
                </Text>
              )}
              <Text style={{ fontSize: 12, color: Colors.ink, marginTop: 4 }} numberOfLines={2}>{app.purpose}</Text>
              {(app.status === 'submitted' || app.status === 'under_review') && (
                <TouchableOpacity style={[s.reviewBtn, { marginTop: 8 }]}
                  onPress={() => { setReviewingId(app.id); setReviewAction(null); }}>
                  <Text style={s.reviewBtnText}>📋 Review Application</Text>
                </TouchableOpacity>
              )}
            </Card>
          ))
      )}

      {/* Farms tab — loads separately */}
      {tab === 'farms' && <AdminFarmsSection />}
    </ScrollView>
  );
}

function AdminFarmsSection() {
  const [farms,      setFarms]      = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      try { const r = await farmsApi.list(); setFarms(getResults(r.data as any)); }
      catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <ActivityIndicator size="small" color={Colors.leaf} style={{ margin: Spacing.lg }} />;
  if (farms.length === 0) return <EmptyState icon="🏡" message="No farms registered." />;

  return (
    <>
      {farms.map(f => (
        <Card key={f.id}>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
            <View style={{ flex:1 }}>
              <Text style={{ fontSize: 14, fontWeight:'700', color: Colors.ink }}>{f.name}</Text>
              <Text style={{ fontSize: 12, color: Colors.muted }}>{f.owner_name}</Text>
              <Text style={{ fontSize: 12, color: Colors.muted }}>
                {f.flock_type.replace(/_/g,' ')} · {f.flock_size?.toLocaleString()} birds
              </Text>
              <Text style={{ fontSize: 12, color: Colors.muted }}>📍 {f.district}, {f.region}</Text>
            </View>
            <Pill label={f.is_active ? 'Active' : 'Inactive'} variant={f.is_active ? 'green' : 'gray'} />
          </View>
        </Card>
      ))}
    </>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle:      { fontSize: 22, fontWeight: '700', color: Colors.ink, marginBottom: 2 },
  pageSub:        { fontSize: 13, color: Colors.muted, marginBottom: Spacing.md },
  statsRow:       { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  statCard:       { flex: 1, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 10, alignItems: 'center' },
  statValue:      { fontSize: 18, fontWeight: '800', color: Colors.leaf },
  statLabel:      { fontSize: 10, color: Colors.muted, marginTop: 2, textAlign: 'center' },
  tabs:           { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  tab:            { flex: 1, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.white },
  tabActive:      { backgroundColor: Colors.leaf, borderColor: Colors.leaf },
  tabText:        { fontSize: 12, fontWeight: '600', color: Colors.muted },
  tabTextActive:  { color: Colors.white },
  search:         { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.ink, marginBottom: Spacing.md },
  fLabel:         { fontSize: 11, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 4 },
  fInput:         { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  btn:            { backgroundColor: Colors.leaf, borderRadius: Radius.md, paddingVertical: 11, alignItems: 'center' },
  btnDisabled:    { opacity: 0.5 },
  btnText:        { color: Colors.white, fontWeight: '700', fontSize: 14 },
  btnSec:         { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  btnSecText:     { color: Colors.ink, fontWeight: '600', fontSize: 14 },
  actionBtn:      { flex: 1, backgroundColor: Colors.leaf, borderRadius: Radius.sm, paddingVertical: 8, alignItems: 'center' },
  actionBtnDisabled:{ opacity: 0.5 },
  actionBtnText:  { color: Colors.white, fontWeight: '700', fontSize: 12 },
  reviewBtn:      { backgroundColor: Colors.earth, borderRadius: Radius.sm, paddingVertical: 8, alignItems: 'center' },
  reviewBtnText:  { color: Colors.white, fontWeight: '700', fontSize: 13 },
  reviewActionBtn:{ flex:1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: 8, alignItems: 'center', backgroundColor: Colors.white },
});
