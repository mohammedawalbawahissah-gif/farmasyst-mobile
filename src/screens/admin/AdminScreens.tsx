import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { usersApi, creditApi, farmsApi, adminApi, profilesApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Badge, Button, SectionTitle, StatCard, EmptyState, AlertBanner, FormLabel } from '../../components/ui';
import type { User, CreditApplication, Farm } from '../../types';

// ── Admin Dashboard ──────────────────────────────────────────────────────────
export function AdminDashboard() {
  const [analytics,  setAnalytics]  = useState<any>({});
  const [users,      setUsers]      = useState<User[]>([]);
  const [apps,       setApps]       = useState<CreditApplication[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [an, us, ap] = await Promise.allSettled([adminApi.analytics(), usersApi.list(), creditApi.listApps()]);
    if (an.status === 'fulfilled') setAnalytics(an.value.data);
    if (us.status === 'fulfilled') setUsers(toArray(us.value.data));
    if (ap.status === 'fulfilled') setApps(toArray(ap.value.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const pendingUsers = users.filter(u => !u.is_verified && u.is_active);
  const pendingApps  = apps.filter(a => a.status === 'submitted' || a.status === 'under_review');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <PageHeader title="Admin Dashboard" subtitle="Overview of FarmAsyst North platform activity." />

      {pendingUsers.length > 0 && <AlertBanner variant="warning">👤 {pendingUsers.length} user{pendingUsers.length>1?'s':''} pending verification.</AlertBanner>}
      {pendingApps.length  > 0 && <AlertBanner variant="info">📄 {pendingApps.length} credit application{pendingApps.length>1?'s':''} awaiting review.</AlertBanner>}

      <StatCard label="Total Users"    value={analytics.total_users    ?? users.length}                        accent={Colors.leaf} />
      <StatCard label="Pending Verify" value={analytics.pending_users  ?? pendingUsers.length}                 accent={Colors.warning} />
      <StatCard label="Credit Apps"    value={analytics.total_applications ?? apps.length}                     accent={Colors.info} />
      <StatCard label="Disbursed"      value={`GHS ${(analytics.total_disbursed ?? 0).toLocaleString()}`}       accent={Colors.harvest} />

      <SectionTitle>Recent Users</SectionTitle>
      <Card>
        {users.slice(0,6).map(u => (
          <View key={u.id} style={s.tableRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '600' }}>{u.full_name || `${u.first_name} ${u.last_name}`}</Text>
              <Text style={{ fontSize: 11, color: Colors.muted }}>{u.role.replace(/_/g,' ')} · {u.email}</Text>
            </View>
            <Badge variant={u.is_verified ? 'success' : 'warning'}>{u.is_verified ? 'Verified' : 'Pending'}</Badge>
          </View>
        ))}
      </Card>

      <SectionTitle>Recent Applications</SectionTitle>
      <Card>
        {apps.slice(0,6).map(a => (
          <View key={a.id} style={s.tableRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{a.reference}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600' }}>{typeof a.farmer === 'object' ? a.farmer.full_name : 'Farmer'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              {a.amount_requested && <Text style={{ fontSize: 12 }}>GHS {parseFloat(a.amount_requested).toLocaleString()}</Text>}
              <Badge variant={
                a.status === 'approved' || a.status === 'disbursed' ? 'success' :
                a.status === 'rejected' ? 'danger' :
                a.status === 'submitted' || a.status === 'under_review' ? 'warning' : 'neutral'
              }>{a.status.replace(/_/g,' ')}</Badge>
            </View>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

// ── Admin Users Screen ────────────────────────────────────────────────────────
export function AdminUsers() {
  const [users,      setUsers]      = useState<User[]>([]);
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [acting,     setActing]     = useState<string|null>(null);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  // Credit score modal
  const [scoreUserId, setScoreUserId] = useState<string|null>(null);
  const [newScore,    setNewScore]    = useState('');

  const load = async () => {
    const r = await usersApi.list();
    setUsers(toArray(r.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleVerify = async (id: string) => {
    setActing(id); setError(''); setSuccess('');
    try { await usersApi.verify(id); setSuccess('User verified!'); await load(); }
    catch (e: any) { setError(e?.response?.data?.detail || 'Could not verify user.'); }
    finally { setActing(null); }
  };
  const handleSuspend = async (id: string, isSuspended: boolean) => {
    setActing(id); setError('');
    try {
      if (isSuspended) await usersApi.unsuspend(id);
      else             await usersApi.suspend(id);
      await load();
    } catch { setError('Action failed.'); }
    finally { setActing(null); }
  };
  const handleUpdateScore = async () => {
    if (!scoreUserId || !newScore) return;
    setActing(scoreUserId);
    try { await usersApi.updateCreditScore(scoreUserId, parseFloat(newScore)); setScoreUserId(null); setNewScore(''); await load(); }
    catch { setError('Failed to update score.'); }
    finally { setActing(null); }
  };

  const ROLES = ['farmer','investor','consumer','monitoring_officer','vet','input_dealer'];
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const name = (u.full_name || `${u.first_name} ${u.last_name}`).toLowerCase();
    const matchQ = !q || name.includes(q) || u.email.toLowerCase().includes(q) || u.phone?.includes(q);
    const matchR = !roleFilter || u.role === roleFilter;
    return matchQ && matchR;
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader title="User Management" subtitle="Verify, suspend, and manage all platform users." />
      {error   ? <AlertBanner variant="danger">{error}</AlertBanner>   : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      <TextInput
        style={s.search}
        placeholder="🔍  Search by name, email, or phone…"
        placeholderTextColor={Colors.muted}
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
        <TouchableOpacity style={[s.chip, !roleFilter && s.chipActive]} onPress={() => setRoleFilter('')}>
          <Text style={[s.chipText, !roleFilter && { color: '#fff' }]}>All Roles</Text>
        </TouchableOpacity>
        {ROLES.map(r => (
          <TouchableOpacity key={r} style={[s.chip, roleFilter === r && s.chipActive]} onPress={() => setRoleFilter(roleFilter === r ? '' : r)}>
            <Text style={[s.chipText, roleFilter === r && { color: '#fff' }]}>{r.replace(/_/g,' ')}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm }}>{filtered.length} users</Text>

      {/* Credit score modal */}
      {scoreUserId && (
        <Card style={{ borderColor: Colors.primary, borderWidth: 1.5, marginBottom: Spacing.md }}>
          <Text style={{ fontSize: 15, fontWeight: '700', marginBottom: Spacing.sm }}>Update Credit Score</Text>
          <FormLabel>New Credit Score (0–999)</FormLabel>
          <TextInput style={s.input} keyboardType="decimal-pad" placeholder="e.g. 720" value={newScore} onChangeText={setNewScore} />
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button onPress={handleUpdateScore} disabled={!newScore||!!acting}>Update Score</Button>
            <Button variant="secondary" onPress={() => { setScoreUserId(null); setNewScore(''); }}>Cancel</Button>
          </View>
        </Card>
      )}

      {filtered.length === 0
        ? <EmptyState icon="👤" text="No users match your search." />
        : filtered.map(u => {
          const isSuspended = !u.is_active;
          return (
            <Card key={u.id} style={!u.is_verified ? { borderColor: Colors.warning, borderWidth: 1.5 } : {}}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '700' }}>{u.full_name || `${u.first_name} ${u.last_name}`}</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <Badge variant={u.is_verified ? 'success' : 'warning'}>{u.is_verified ? 'Verified' : 'Pending'}</Badge>
                  {isSuspended && <Badge variant="danger">Suspended</Badge>}
                </View>
              </View>
              <Text style={{ fontSize: 12, color: Colors.muted }}>{u.email}</Text>
              <Text style={{ fontSize: 12, color: Colors.muted }}>{u.phone} · {u.role.replace(/_/g,' ')}</Text>
              {!!u.credit_score && <Text style={{ fontSize: 12, color: Colors.muted }}>Credit score: {u.credit_score}</Text>}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm }}>
                {!u.is_verified && (
                  <Button size="sm" onPress={() => handleVerify(u.id)} disabled={acting===u.id} loading={acting===u.id}>
                    ✅ Verify
                  </Button>
                )}
                <Button size="sm" variant={isSuspended ? 'secondary' : 'danger'} onPress={() => handleSuspend(u.id, isSuspended)} disabled={acting===u.id}>
                  {isSuspended ? '▶️ Unsuspend' : '⛔ Suspend'}
                </Button>
                {u.role === 'farmer' && (
                  <Button size="sm" variant="ghost" onPress={() => { setScoreUserId(u.id); setNewScore(u.credit_score ?? ''); }}>
                    📊 Score
                  </Button>
                )}
              </View>
            </Card>
          );
        })
      }
    </ScrollView>
  );
}

// ── Admin Credit Workflow ────────────────────────────────────────────────────
export function AdminCreditWorkflow() {
  const [apps,       setApps]       = useState<CreditApplication[]>([]);
  const [investors,  setInvestors]  = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [acting,     setActing]     = useState<string|null>(null);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Action modal
  const [activeApp,   setActiveApp]  = useState<CreditApplication|null>(null);
  const [actionType,  setActionType] = useState<'approve'|'reject'|'match'|null>(null);
  const [notes,       setNotes]      = useState('');
  const [matchInv,    setMatchInv]   = useState('');
  const [interest,    setInterest]   = useState('12');
  const [rejReason,   setRejReason]  = useState('');

  const load = async () => {
    const [a, inv] = await Promise.allSettled([creditApi.listApps(), profilesApi.listInvestors()]);
    if (a.status   === 'fulfilled') setApps(toArray(a.value.data));
    if (inv.status === 'fulfilled') setInvestors(toArray(inv.value.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAction = async () => {
    if (!activeApp) return;
    setActing(activeApp.id); setError(''); setSuccess('');
    try {
      if (actionType === 'approve') {
        await creditApi.approveApp(activeApp.id, { reviewer_notes: notes });
        setSuccess('Application approved!');
      } else if (actionType === 'reject') {
        if (!rejReason) { setError('Rejection reason is required.'); return; }
        await creditApi.rejectApp(activeApp.id, { rejection_reason: rejReason, reviewer_notes: notes });
        setSuccess('Application rejected.');
      } else if (actionType === 'match') {
        if (!matchInv) { setError('Please select an investor.'); return; }
        await creditApi.matchApp(activeApp.id, { investor_id: matchInv, interest_rate: parseFloat(interest) });
        setSuccess('Application matched to investor!');
      }
      setActiveApp(null); setActionType(null); setNotes(''); setMatchInv(''); setRejReason('');
      await load();
    } catch (e: any) { setError(e?.response?.data?.detail || 'Action failed.'); }
    finally { setActing(null); }
  };

  const STATUS_OPTIONS = ['submitted','under_review','matched','approved','disbursed','rejected'];
  const STATUS_BADGE: Record<string, any> = {
    draft:'neutral', submitted:'info', under_review:'warning', scored:'warning',
    matched:'info', approved:'success', disbursed:'success', rejected:'danger',
  };

  const filtered = statusFilter ? apps.filter(a => a.status === statusFilter) : apps;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader title="Credit Workflow" subtitle="Review, approve, and match credit applications." />
      {error   ? <AlertBanner variant="danger">{error}</AlertBanner>   : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
        <TouchableOpacity style={[s.chip, !statusFilter && s.chipActive]} onPress={() => setStatusFilter('')}>
          <Text style={[s.chipText, !statusFilter && { color: '#fff' }]}>All ({apps.length})</Text>
        </TouchableOpacity>
        {STATUS_OPTIONS.map(st => {
          const count = apps.filter(a => a.status === st).length;
          return (
            <TouchableOpacity key={st} style={[s.chip, statusFilter === st && s.chipActive]} onPress={() => setStatusFilter(statusFilter === st ? '' : st)}>
              <Text style={[s.chipText, statusFilter === st && { color: '#fff' }]}>{st.replace(/_/g,' ')} ({count})</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Action modal */}
      {activeApp && actionType && (
        <Card style={{ borderColor: Colors.primary, borderWidth: 1.5, marginBottom: Spacing.lg }}>
          <SectionTitle>
            {actionType === 'approve' ? '✅ Approve Application' : actionType === 'reject' ? '❌ Reject Application' : '🔗 Match to Investor'}
          </SectionTitle>
          <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm }}>{activeApp.reference}</Text>

          {actionType === 'match' && (
            <>
              <FormLabel required>Select Investor</FormLabel>
              <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, marginBottom: Spacing.sm, overflow: 'hidden' }}>
                {investors.map(inv => (
                  <TouchableOpacity key={inv.id} style={[{ padding: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border }, matchInv === inv.user?.id && { backgroundColor: '#F0F7EB' }]}
                    onPress={() => setMatchInv(inv.user?.id || inv.id)}>
                    <Text style={{ fontSize: 13, fontWeight: matchInv === inv.user?.id ? '700' : '400', color: matchInv === inv.user?.id ? Colors.primary : Colors.ink }}>
                      {inv.user?.full_name || inv.organisation} · {inv.organisation}
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.muted }}>Max: GHS {parseFloat(inv.max_investment_amount||'0').toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <FormLabel>Interest Rate (%)</FormLabel>
              <TextInput style={s.input} keyboardType="decimal-pad" placeholder="12" value={interest} onChangeText={setInterest} />
            </>
          )}

          {actionType === 'reject' && (
            <>
              <FormLabel required>Rejection Reason</FormLabel>
              <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} multiline placeholder="Explain why this application is being rejected…" value={rejReason} onChangeText={setRejReason} />
            </>
          )}

          <FormLabel>Reviewer Notes</FormLabel>
          <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} multiline placeholder="Internal notes (optional)…" value={notes} onChangeText={setNotes} />

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button onPress={handleAction} disabled={!!acting} loading={acting===activeApp.id} style={{ flex: 1 }}>Confirm</Button>
            <Button variant="secondary" onPress={() => { setActiveApp(null); setActionType(null); }}>Cancel</Button>
          </View>
        </Card>
      )}

      {filtered.length === 0
        ? <EmptyState icon="📋" text="No applications found." />
        : filtered.map(app => (
          <Card key={app.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{app.reference}</Text>
              <Badge variant={STATUS_BADGE[app.status] ?? 'neutral'}>{app.status.replace(/_/g,' ')}</Badge>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 4 }}>
              {typeof app.farmer === 'object' ? app.farmer.full_name : 'Farmer'}
            </Text>
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Type</Text><Text style={{ fontWeight: '600' }}>{app.credit_type.replace(/_/g,' ')}</Text></View>
            {app.amount_requested && <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Amount</Text><Text style={{ fontWeight: '700', color: Colors.primary }}>GHS {parseFloat(app.amount_requested).toLocaleString()}</Text></View>}
            {app.purpose && (
              <View style={{ backgroundColor: Colors.surface, padding: Spacing.sm, borderRadius: Radius.sm, marginTop: Spacing.sm }}>
                <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: 2 }}>PURPOSE</Text>
                <Text style={{ fontSize: 13 }} numberOfLines={3}>{app.purpose}</Text>
              </View>
            )}
            {/* Admin actions */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm }}>
              {app.status === 'submitted' && (
                <>
                  <Button size="sm" onPress={() => { setActiveApp(app); setActionType('approve'); }}>✅ Approve</Button>
                  <Button size="sm" variant="danger" onPress={() => { setActiveApp(app); setActionType('reject'); }}>❌ Reject</Button>
                </>
              )}
              {(app.status === 'approved' || app.status === 'scored') && (
                <Button size="sm" onPress={() => { setActiveApp(app); setActionType('match'); }}>🔗 Match Investor</Button>
              )}
            </View>
          </Card>
        ))
      }
    </ScrollView>
  );
}

// ── Admin Farms ──────────────────────────────────────────────────────────────
export function AdminFarms() {
  const [farms,      setFarms]      = useState<Farm[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [officers,   setOfficers]   = useState<User[]>([]);
  const [assigning,  setAssigning]  = useState<string|null>(null);

  const load = async () => {
    const [f, u] = await Promise.allSettled([farmsApi.list(), usersApi.list({ role: 'monitoring_officer' })]);
    if (f.status === 'fulfilled') setFarms(toArray(f.value.data));
    if (u.status === 'fulfilled') setOfficers(toArray(u.value.data).filter((u: User) => u.role === 'monitoring_officer'));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleAssign = async (farmId: string, officerId: string) => {
    setAssigning(farmId);
    try { await farmsApi.assignOfficer(farmId, officerId); await load(); }
    catch {}
    finally { setAssigning(null); }
  };

  const filtered = farms.filter(f => {
    const q = search.toLowerCase();
    return !q || f.name.toLowerCase().includes(q) || f.district.toLowerCase().includes(q) || f.owner_name?.toLowerCase().includes(q);
  });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader title="Farm List" subtitle="View all registered farms and assign monitoring officers." />

      <TextInput style={s.search} placeholder="🔍  Search farms…" placeholderTextColor={Colors.muted} value={search} onChangeText={setSearch} />

      <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm }}>{filtered.length} farms</Text>

      {filtered.length === 0
        ? <EmptyState icon="🏠" text="No farms found." />
        : filtered.map(f => (
          <Card key={f.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', flex: 1 }}>{f.name}</Text>
              <Badge variant={f.is_active ? 'success' : 'neutral'}>{f.is_active ? 'Active' : 'Inactive'}</Badge>
            </View>
            <Text style={{ fontSize: 12, color: Colors.muted }}>{f.owner_name} · {f.district}, {f.region}</Text>
            <Text style={{ fontSize: 12, color: Colors.muted }}>{f.flock_type.replace(/_/g,' ')} · {f.flock_size.toLocaleString()} birds</Text>
            <Text style={{ fontSize: 12, color: f.monitoring_officer_name ? Colors.success : Colors.warning, marginTop: 4 }}>
              👁 {f.monitoring_officer_name ?? 'No officer assigned'}
            </Text>
            {officers.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.sm }}>
                {officers.map(o => (
                  <TouchableOpacity key={o.id} style={[s.chip, { marginRight: 6 }]} onPress={() => handleAssign(f.id, o.id)} disabled={assigning===f.id}>
                    <Text style={s.chipText}>Assign: {o.first_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </Card>
        ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  search:   { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  input:    { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  chip:     { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.sm, backgroundColor: Colors.white },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, color: Colors.muted, fontWeight: '600' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.border },
});
