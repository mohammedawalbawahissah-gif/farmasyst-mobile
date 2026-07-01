import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { creditApi, paymentsApi } from '../../api/client';
import { Card, Pill, statusVariant, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { getResults, CreditApplication, CreditAgreement, DisbursementRequest } from '../../types';

export default function InvestorDashboardScreen() {
  const [apps,       setApps]       = useState<CreditApplication[]>([]);
  const [agreements, setAgreements] = useState<CreditAgreement[]>([]);
  const [disbReqs,   setDisbReqs]   = useState<DisbursementRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState<'matched'|'agreements'|'disbursements'>('matched');
  const [acting,     setActing]     = useState<string|null>(null);

  const load = useCallback(async () => {
    try {
      const [aR, agR, dR] = await Promise.all([
        creditApi.listApplications({ status: 'matched' }),
        creditApi.listAgreements(),
        paymentsApi.disbursementRequests(),
      ]);
      setApps(getResults<CreditApplication>(aR.data as any));
      setAgreements(getResults<CreditAgreement>(agR.data as any));
      setDisbReqs(getResults<DisbursementRequest>(dR.data as any));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const acceptMatch = async (appId: string) => {
    Alert.alert('Accept match?', 'You will be connected with this farmer for a funding agreement.', [
      { text: 'Cancel' },
      { text: 'Accept', onPress: async () => {
        setActing(appId);
        try { await creditApi.accept(appId); load(); Alert.alert('Accepted', 'Match accepted. An agreement will be generated.'); }
        catch { Alert.alert('Error', 'Could not accept match.'); }
        finally { setActing(null); }
      }},
    ]);
  };

  const declineMatch = async (appId: string) => {
    Alert.alert('Decline match?', 'The application will be returned for re-matching.', [
      { text: 'Cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
        setActing(appId);
        try { await creditApi.declineMatch(appId); load(); }
        catch { Alert.alert('Error', 'Could not decline match.'); }
        finally { setActing(null); }
      }},
    ]);
  };

  const signAgreement = async (agId: string) => {
    Alert.alert('Sign agreement?', 'This action confirms your commitment to fund the farmer.', [
      { text: 'Cancel' },
      { text: 'Sign', onPress: async () => {
        setActing(agId);
        try { await creditApi.signAgreement(agId); load(); Alert.alert('Signed', 'Agreement signed successfully.'); }
        catch { Alert.alert('Error', 'Could not sign agreement.'); }
        finally { setActing(null); }
      }},
    ]);
  };

  const approveDisbursement = async (id: string) => {
    Alert.alert('Approve disbursement?', 'Funds will be sent to the farmer.', [
      { text: 'Cancel' },
      { text: 'Approve', onPress: async () => {
        setActing(id);
        try { await paymentsApi.approveDisbRequest(id, {}); load(); Alert.alert('Approved', 'Disbursement approved.'); }
        catch { Alert.alert('Error', 'Could not approve disbursement.'); }
        finally { setActing(null); }
      }},
    ]);
  };

  // Stats
  const activeAgreements  = agreements.filter(a => a.status === 'active').length;
  const totalInvested     = agreements
    .filter(a => ['active','completed'].includes(a.status))
    .reduce((sum, a) => sum + parseFloat(a.amount), 0);
  const pendingDisbursals = disbReqs.filter(d => d.status === 'pending').length;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={s.pageTitle}>Investor Dashboard</Text>
      <Text style={s.pageSub}>Manage your poultry farm funding portfolio.</Text>

      {/* Stats row */}
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{apps.length}</Text>
          <Text style={s.statLabel}>Matched Apps</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>{activeAgreements}</Text>
          <Text style={s.statLabel}>Active Deals</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statValue}>GHS {totalInvested > 0 ? (totalInvested/1000).toFixed(0)+'K' : '0'}</Text>
          <Text style={s.statLabel}>Invested</Text>
        </View>
        <View style={[s.statCard, pendingDisbursals > 0 && { borderColor: Colors.warning }]}>
          <Text style={[s.statValue, pendingDisbursals > 0 && { color: Colors.warning }]}>{pendingDisbursals}</Text>
          <Text style={s.statLabel}>Pending Disb.</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {(['matched','agreements','disbursements'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'matched' ? `🤝 Matches (${apps.length})` : t === 'agreements' ? `📑 Agreements (${agreements.length})` : `💸 Disbursements`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Matched applications */}
      {tab === 'matched' && (
        apps.length === 0
          ? <EmptyState icon="🤝" message="No matched applications at the moment." />
          : apps.map(app => (
            <Card key={app.id}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 4 }}>
                <Text style={{ fontWeight:'700', fontSize: 14 }}>{app.farmer_name}</Text>
                <Pill label={app.status.replace(/_/g,' ')} variant={statusVariant(app.status)} />
              </View>
              <Text style={{ fontSize: 13, color: Colors.muted }}>{app.credit_type.replace(/_/g,' ')}</Text>
              {app.amount_requested && (
                <Text style={{ fontSize: 15, fontWeight:'700', color: Colors.earth, marginTop: 4 }}>
                  GHS {parseFloat(app.amount_requested).toLocaleString()}
                  {app.repayment_period_months ? ` · ${app.repayment_period_months} months` : ''}
                </Text>
              )}
              <Text style={{ fontSize: 13, color: Colors.ink, marginTop: 6 }}>{app.purpose}</Text>
              <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 4 }}>
                Submitted: {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString('en-GH') : '—'}
              </Text>
              {app.credit_score_at_submission && (
                <Text style={{ fontSize: 12, color: Colors.muted }}>Credit score: {app.credit_score_at_submission}</Text>
              )}
              <View style={{ flexDirection:'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity style={[s.actionBtn, acting === app.id && s.actionBtnDisabled]}
                  disabled={acting === app.id} onPress={() => acceptMatch(app.id)}>
                  <Text style={s.actionBtnText}>✅ Accept Match</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.muted }, acting === app.id && s.actionBtnDisabled]}
                  disabled={acting === app.id} onPress={() => declineMatch(app.id)}>
                  <Text style={s.actionBtnText}>✗ Decline</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
      )}

      {/* Agreements */}
      {tab === 'agreements' && (
        agreements.length === 0
          ? <EmptyState icon="📑" message="No agreements yet." />
          : agreements.map(agr => (
            <Card key={agr.id}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 4 }}>
                <Text style={{ fontWeight:'700', fontSize: 13, fontFamily:'monospace' }}>{agr.reference}</Text>
                <Pill label={agr.status.replace(/_/g,' ')} variant={statusVariant(agr.status)} />
              </View>
              <Text style={{ fontSize: 14, fontWeight:'700', color: Colors.ink }}>{agr.farmer_name}</Text>
              <Text style={{ fontSize: 15, fontWeight:'700', color: Colors.earth, marginTop: 4 }}>
                GHS {parseFloat(agr.amount).toLocaleString()}
              </Text>
              <Text style={{ fontSize: 12, color: Colors.muted }}>
                {agr.repayment_period_months} months · {agr.interest_rate}% p.a.
              </Text>
              {agr.start_date && (
                <Text style={{ fontSize: 12, color: Colors.muted }}>
                  {new Date(agr.start_date).toLocaleDateString('en-GH')} → {agr.end_date ? new Date(agr.end_date).toLocaleDateString('en-GH') : '—'}
                </Text>
              )}
              {agr.status === 'pending_signature' && !agr.investor_signed_at && (
                <TouchableOpacity style={[s.btn, { marginTop: 10 }, acting === agr.id && s.btnDisabled]}
                  disabled={acting === agr.id} onPress={() => signAgreement(agr.id)}>
                  {acting === agr.id ? <ActivityIndicator size="small" color={Colors.white} />
                    : <Text style={s.btnText}>✍️ Sign Agreement</Text>}
                </TouchableOpacity>
              )}
            </Card>
          ))
      )}

      {/* Disbursements */}
      {tab === 'disbursements' && (
        disbReqs.length === 0
          ? <EmptyState icon="💸" message="No disbursement requests." />
          : disbReqs.map(d => (
            <Card key={d.id}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', marginBottom: 4 }}>
                <Text style={{ fontWeight:'700', fontSize: 13 }}>{d.reference}</Text>
                <Pill label={d.status} variant={statusVariant(d.status)} />
              </View>
              <Text style={{ fontSize: 15, fontWeight:'700', color: Colors.earth }}>
                GHS {parseFloat(d.amount).toLocaleString()}
              </Text>
              <Text style={{ fontSize: 12, color: Colors.muted }}>Method: {d.method?.replace(/_/g,' ')}</Text>
              {d.note ? <Text style={{ fontSize: 13, color: Colors.ink, marginTop: 4 }}>{d.note}</Text> : null}
              <Text style={{ fontSize: 11, color: Colors.muted }}>{new Date(d.created_at).toLocaleDateString('en-GH')}</Text>
              {d.status === 'pending' && (
                <View style={{ flexDirection:'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity style={[s.actionBtn, acting === d.id && s.actionBtnDisabled]}
                    disabled={acting === d.id} onPress={() => approveDisbursement(d.id)}>
                    <Text style={s.actionBtnText}>✅ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.danger }, acting === d.id && s.actionBtnDisabled]}
                    disabled={acting === d.id} onPress={async () => {
                      setActing(d.id);
                      try { await paymentsApi.rejectDisbRequest(d.id, { rejection_reason: 'Declined by investor' }); load(); }
                      catch { Alert.alert('Error', 'Could not reject disbursement.'); }
                      finally { setActing(null); }
                    }}>
                    <Text style={s.actionBtnText}>✗ Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle:      { fontSize: 22, fontWeight: '700', color: Colors.ink, marginBottom: 2 },
  pageSub:        { fontSize: 13, color: Colors.muted, marginBottom: Spacing.md },
  statsRow:       { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  statCard:       { flex: 1, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 10, alignItems: 'center' },
  statValue:      { fontSize: 16, fontWeight: '800', color: Colors.leaf },
  statLabel:      { fontSize: 10, color: Colors.muted, marginTop: 2, textAlign: 'center' },
  tabs:           { flexDirection: 'row', gap: 6, marginBottom: Spacing.md },
  tab:            { flex: 1, paddingVertical: 8, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.white },
  tabActive:      { backgroundColor: Colors.leaf, borderColor: Colors.leaf },
  tabText:        { fontSize: 10, fontWeight: '600', color: Colors.muted, textAlign: 'center' },
  tabTextActive:  { color: Colors.white },
  actionBtn:      { flex: 1, backgroundColor: Colors.leaf, borderRadius: Radius.sm, paddingVertical: 9, alignItems: 'center' },
  actionBtnDisabled:{ opacity: 0.5 },
  actionBtnText:  { color: Colors.white, fontWeight: '700', fontSize: 13 },
  btn:            { backgroundColor: Colors.leaf, borderRadius: Radius.md, paddingVertical: 11, alignItems: 'center' },
  btnDisabled:    { opacity: 0.5 },
  btnText:        { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
