import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { farmsApi, creditApi, paymentsApi, trainingApi, authApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, StatCard, Card, Badge, Button, SectionTitle, AlertBanner, ScreenScroll } from '../../components/ui';
import type { CreditApplication, Farm, RepaymentSchedule, TrainingEnrolment, CreditAgreement } from '../../types';

const STATUS_BADGE: Record<string, any> = {
  draft: 'neutral', submitted: 'info', under_review: 'warning',
  scored: 'warning', matched: 'info', approved: 'success',
  disbursed: 'success', rejected: 'danger', withdrawn: 'neutral',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review',
  scored: 'Scored', matched: 'Matched', approved: 'Approved',
  disbursed: 'Disbursed', rejected: 'Rejected', withdrawn: 'Withdrawn',
};

export default function FarmerDashboard({ navigation }: any) {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [apps,        setApps]        = useState<CreditApplication[]>([]);
  const [farms,       setFarms]       = useState<Farm[]>([]);
  const [schedules,   setSchedules]   = useState<RepaymentSchedule[]>([]);
  const [enrols,      setEnrols]      = useState<TrainingEnrolment[]>([]);
  const [agreements,  setAgreements]  = useState<CreditAgreement[]>([]);
  const [farmerProf,  setFarmerProf]  = useState<any>(null);
  const [loading,     setLoading]     = useState(true);

  const load = async () => {
    try {
      const [a, f, sc, en, ag, fp] = await Promise.allSettled([
        creditApi.listApps(),
        farmsApi.list(),
        paymentsApi.schedules(),
        trainingApi.enrolments(),
        creditApi.listAgreements(),
        authApi.farmerProfile(),
      ]);
      if (a.status === 'fulfilled') setApps(toArray(a.value.data));
      if (f.status === 'fulfilled') setFarms(toArray(f.value.data));
      if (sc.status === 'fulfilled') setSchedules(toArray(sc.value.data));
      if (en.status === 'fulfilled') setEnrols(toArray(en.value.data));
      if (ag.status === 'fulfilled') setAgreements(toArray(ag.value.data));
      if (fp.status === 'fulfilled') setFarmerProf(fp.value.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const recentApps     = apps.slice(0, 5);
  const primaryFarm    = farms[0];
  const dueSchedules   = schedules.filter(s => s.status === 'pending' || s.status === 'due' || s.status === 'overdue');
  const nextDue        = dueSchedules[0] ?? null;
  const completedMods  = enrols.filter(e => e.status === 'completed').length;
  const contractsToSign = agreements.filter(a => a.status === 'pending_signature' && !a.farmer_signed_at);
  const totalDisbursed = schedules.reduce((s, r) => s + parseFloat(r.amount_due || '0'), 0);
  const totalRepaid    = schedules.filter(s => s.status === 'paid').reduce((s, r) => s + parseFloat(r.amount_paid || '0'), 0);
  const repayPct       = totalDisbursed > 0 ? Math.round((totalRepaid / totalDisbursed) * 100) : 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <PageHeader
        title={`Welcome back, ${user?.first_name ?? ''} 👋`}
        subtitle="Here's what's happening on your farm today."
        action={<Button size="sm" onPress={() => navigation.navigate('Menu', { screen: 'Credit' })}>+ New Application</Button>}
      />

      {nextDue && (
        <AlertBanner variant="warning">
          ⚠️ Your next repayment of{' '}
          <Text style={{ fontWeight: '700' }}>GHS {parseFloat(nextDue.amount_due).toLocaleString()}</Text>{' '}
          is due on {new Date(nextDue.due_date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short', year: 'numeric' })}.
        </AlertBanner>
      )}

      {contractsToSign.length > 0 && (
        <AlertBanner variant="warning">
          📄 You have{' '}<Text style={{ fontWeight: '700' }}>{contractsToSign.length}</Text>{' '}investment agreement{contractsToSign.length > 1 ? 's' : ''} waiting for your signature.
        </AlertBanner>
      )}

      {/* Stats */}
      <StatCard label="Active Credit" value={`GHS ${(totalDisbursed - totalRepaid).toLocaleString()}`} sub={`${apps.filter(a => a.status === 'disbursed').length} active agreements`} accent="#4A7C2F" />
      <StatCard label="Flock Size" value={primaryFarm?.flock_size?.toLocaleString() ?? '—'} sub={primaryFarm?.flock_type ? `${primaryFarm.flock_type.replace(/_/g,' ')} birds` : primaryFarm ? 'Type not set' : 'No farm yet'} accent="#E8A020" />
      <StatCard label="Repayment Rate" value={`${repayPct}%`} sub="On-time payments" accent="#1A4A6B" />
      <StatCard label="Training Done" value={`${completedMods} / ${enrols.length}`} sub="Modules completed" accent="#5C2D8B" />

      {/* Recent Applications */}
      <SectionTitle>Recent Applications</SectionTitle>
      <Card>
        {loading ? (
          <Text style={{ color: Colors.muted, padding: Spacing.sm }}>Loading…</Text>
        ) : recentApps.length === 0 ? (
          <Text style={{ color: Colors.muted, padding: Spacing.sm }}>No applications yet. Tap "+ New Application" to start.</Text>
        ) : recentApps.map(app => (
          <View key={app.id} style={s.tableRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: Colors.muted, fontFamily: 'monospace' }}>{app.reference}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.ink }}>{app.credit_type.replace(/_/g,' ')}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={{ fontSize: 13, fontWeight: '700' }}>{app.amount_requested ? `GHS ${parseFloat(app.amount_requested).toLocaleString()}` : 'Free'}</Text>
              <Badge variant={STATUS_BADGE[app.status] ?? 'neutral'}>{STATUS_LABEL[app.status] ?? app.status}</Badge>
            </View>
          </View>
        ))}
      </Card>

      {/* Repayment Summary */}
      <SectionTitle>Repayment Summary</SectionTitle>
      <Card>
        <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Total Disbursed</Text><Text style={{ fontWeight: '700' }}>GHS {totalDisbursed.toLocaleString()}</Text></View>
        <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Total Repaid</Text><Text style={{ fontWeight: '700', color: Colors.success }}>GHS {totalRepaid.toLocaleString()}</Text></View>
        <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Outstanding</Text><Text style={{ fontWeight: '700', color: Colors.danger }}>GHS {(totalDisbursed - totalRepaid).toLocaleString()}</Text></View>
        <View style={{ height: 8, backgroundColor: Colors.border, borderRadius: 4, marginTop: Spacing.sm }}>
          <View style={{ width: `${repayPct}%`, height: 8, backgroundColor: Colors.success, borderRadius: 4 }} />
        </View>
        <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 4 }}>{repayPct}% repaid</Text>
        <Button fullWidth onPress={() => navigation.navigate('Menu', { screen: 'Repayments' })} style={{ marginTop: Spacing.sm }}>Make a Repayment</Button>
      </Card>

      {/* Credit Score */}
      {!!farmerProf?.credit_score && (
        <>
          <SectionTitle>Credit Score</SectionTitle>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 36, fontWeight: '800', color: Colors.primary }}>{parseFloat(farmerProf.credit_score).toFixed(1)}</Text>
              <Text style={{ fontSize: 11, color: Colors.muted }}>/ 999</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Badge variant={user?.is_verified ? 'success' : 'warning'}>{user?.is_verified ? 'Verified' : 'Pending Verification'}</Badge>
              <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 6, lineHeight: 17 }}>Based on farm activity, repayment history, and verification status.</Text>
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
});
