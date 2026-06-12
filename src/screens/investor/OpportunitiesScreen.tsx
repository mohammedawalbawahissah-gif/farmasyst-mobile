import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Modal } from 'react-native';
import { creditApi, paymentsApi } from '../../api/client';
import { CreditApplication, CreditAgreement, RepaymentSchedule } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, SectionTitle, Button, InputField, EmptyState, ErrorBanner, Pill, statusVariant } from '../../components/ui';

// ── Opportunities ─────────────────────────────────────────────────────────────
export function OpportunitiesScreen() {
  const [apps,       setApps]       = useState<CreditApplication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [expanded,   setExpanded]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await creditApi.listApplications({ status: 'matched' });
      setApps(res.data.results ?? res.data);
    } catch { setError('Could not load opportunities.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function accept(app: CreditApplication) {
    Alert.alert('Accept Investment', `Invest GHS ${parseFloat(app.amount_requested ?? '0').toLocaleString()} in ${app.farmer_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Accept', onPress: async () => {
          try { await creditApi.accept(app.id); Alert.alert('Accepted', 'Agreement will be generated shortly.'); load(); }
          catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
        }},
    ]);
  }

  async function decline(app: CreditApplication) {
    Alert.alert('Decline Opportunity', 'Are you sure you want to decline this application?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
          try { await creditApi.declineMatch(app.id); load(); }
          catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
        }},
    ]);
  }

  return (
    <Screen title="Opportunities" subtitle="Applications matched to you">
      {error ? <ErrorBanner message={error} /> : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {apps.length === 0
          ? <EmptyState message="No open opportunities right now. Check back soon." icon="💡" />
          : apps.map(app => (
              <Card key={app.id} style={expanded === app.id ? [styles.card, { borderLeftWidth: 3, borderLeftColor: Colors.leaf }] as any : styles.card}>
                <TouchableOpacity onPress={() => setExpanded(expanded === app.id ? null : app.id)} activeOpacity={0.8}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ref}>{app.reference}</Text>
                      <Text style={styles.farmer}>{app.farmer_name}</Text>
                      <Text style={styles.amount}>GHS {parseFloat(app.amount_requested ?? '0').toLocaleString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Pill label={app.credit_type} variant="blue" />
                      <Text style={{ color: Colors.muted, fontSize: 18 }}>{expanded === app.id ? '▲' : '▼'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {expanded === app.id && (
                  <View style={styles.expandedBody}>
                    {[
                      ['Repayment Period', `${app.repayment_period_months} months`],
                      ['Credit Score', app.credit_score_at_submission ?? 'Not scored'],
                      ['Purpose', app.purpose || '—'],
                      ['Submitted', app.submitted_at?.split('T')[0] ?? '—'],
                    ].map(([k, v]) => (
                      <View key={k} style={styles.detailRow}>
                        <Text style={styles.detailKey}>{k}</Text>
                        <Text style={styles.detailVal}>{v}</Text>
                      </View>
                    ))}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                      <Button label="Decline"        onPress={() => decline(app)} variant="secondary" style={{ flex: 1 }} />
                      <Button label="Accept & Invest" onPress={() => accept(app)}  variant="primary"   style={{ flex: 1 }} />
                    </View>
                  </View>
                )}
              </Card>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

export default OpportunitiesScreen;

// ── Portfolio ─────────────────────────────────────────────────────────────────
export function PortfolioScreen() {
  const [agreements, setAgreements] = useState<CreditAgreement[]>([]);
  const [tab,        setTab]        = useState<'active' | 'completed' | 'defaulted'>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [disbModal,  setDisbModal]  = useState<string | null>(null);
  const [disbMethod, setDisbMethod] = useState<'momo' | 'paystack' | 'bank_transfer'>('momo');
  const [disbNote,   setDisbNote]   = useState('');
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await creditApi.listAgreements();
      setAgreements(res.data.results ?? res.data);
    } catch { setError('Could not load portfolio.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function requestDisb() {
    if (!disbModal) return;
    setSaving(true);
    try {
      await paymentsApi.createDisbRequest({ agreement: disbModal, method: disbMethod, note: disbNote });
      Alert.alert('Submitted', 'Disbursement request submitted for admin approval.');
      setDisbModal(null); setDisbNote('');
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Failed.');
    } finally { setSaving(false); }
  }

  const shown = agreements.filter(a =>
    tab === 'active'    ? a.status === 'active' :
    tab === 'completed' ? a.status === 'completed' :
    a.status === 'defaulted'
  );

  const totalDeployed   = agreements.filter(a => a.status === 'active').reduce((s, a) => s + parseFloat(a.amount), 0);
  const totalCompleted  = agreements.filter(a => a.status === 'completed').reduce((s, a) => s + parseFloat(a.amount), 0);
  const METHODS = [
    { value: 'momo',         label: '📱 MoMo' },
    { value: 'paystack',     label: '💳 Card' },
    { value: 'bank_transfer',label: '🏦 Bank' },
  ];

  return (
    <Screen title="Portfolio" subtitle="Your investment agreements">
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.summaryRow}>
        {[
          { label: 'Active',    val: `GHS ${totalDeployed.toLocaleString()}`,  color: Colors.leaf },
          { label: 'Completed', val: `GHS ${totalCompleted.toLocaleString()}`, color: Colors.success },
          { label: '# Farmers', val: agreements.length.toString(),              color: Colors.investor },
        ].map(({ label, val, color }) => (
          <View key={label} style={[styles.summaryCard, { borderTopColor: color }]}>
            <Text style={[styles.summaryVal, { color }]}>{val}</Text>
            <Text style={styles.summaryKey}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.tabBar}>
        {(['active', 'completed', 'defaulted'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {shown.length === 0
          ? <EmptyState message={`No ${tab} agreements.`} icon="📊" />
          : shown.map(ag => (
              <Card key={ag.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ref}>{ag.reference}</Text>
                    <Text style={styles.farmer}>{ag.farmer_name}</Text>
                    <Text style={styles.amount}>GHS {parseFloat(ag.amount).toLocaleString()}</Text>
                    <Text style={styles.meta}>{ag.repayment_period_months} months · {ag.interest_rate}% · {ag.credit_type}</Text>
                    {ag.start_date && <Text style={styles.meta}>Started: {ag.start_date}</Text>}
                    {ag.end_date   && <Text style={styles.meta}>Ends: {ag.end_date}</Text>}
                  </View>
                  <Pill label={ag.status.replace(/_/g, ' ')} variant={statusVariant(ag.status)} />
                </View>
                {ag.status === 'active' && !ag.disbursed_at && (
                  <Button label="Request Disbursement" onPress={() => { setDisbModal(ag.id); setDisbMethod('momo'); setDisbNote(''); }} size="sm" variant="secondary" style={{ marginTop: 8, alignSelf: 'flex-start' }} />
                )}
                {ag.disbursed_at && (
                  <Text style={[styles.meta, { color: Colors.success, marginTop: 6 }]}>✅ Disbursed {ag.disbursed_at.split('T')[0]}</Text>
                )}
              </Card>
            ))
        }
      </ScrollView>

      <Modal visible={!!disbModal} transparent animationType="slide" onRequestClose={() => setDisbModal(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setDisbModal(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>Request Disbursement</Text>
            <Text style={styles.meta}>Choose how the funds should be sent to the farmer:</Text>
            <View style={{ gap: 6, marginTop: 12 }}>
              {METHODS.map(m => (
                <TouchableOpacity key={m.value} onPress={() => setDisbMethod(m.value as any)} style={[styles.pickerItem, disbMethod === m.value && styles.pickerItemActive]}>
                  <Text style={[{ fontSize: 14, color: Colors.ink }, disbMethod === m.value && { color: Colors.leaf, fontWeight: '600' }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <InputField label="Notes (optional)" value={disbNote} onChangeText={setDisbNote} placeholder="Any instructions for admin…" containerStyle={{ marginTop: 12 }} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button label="Cancel" onPress={() => setDisbModal(null)} variant="secondary" style={{ flex: 1 }} />
              <Button label={saving ? 'Submitting…' : 'Submit Request'} onPress={requestDisb} loading={saving} style={{ flex: 1 }} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

// ── Contracts ─────────────────────────────────────────────────────────────────
export function ContractsScreen() {
  const [agreements, setAgreements] = useState<CreditAgreement[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await creditApi.listAgreements();
      setAgreements(res.data.results ?? res.data);
    } catch { setError('Could not load contracts.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function sign(id: string) {
    Alert.alert('Sign Agreement', 'By signing you confirm you have read and agreed to the full terms.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign', onPress: async () => {
          try { await creditApi.signAgreement(id); Alert.alert('Signed', 'Awaiting farmer to countersign.'); load(); }
          catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
        }},
    ]);
  }

  const needsSign = agreements.filter(a => a.status === 'pending_signature' && !a.investor_signed_at);

  return (
    <Screen title="Contracts" subtitle="Your signed agreements">
      {error ? <ErrorBanner message={error} /> : null}
      {needsSign.length > 0 && (
        <View style={styles.warnBanner}>
          <Text style={styles.warnText}>⚠️ {needsSign.length} contract{needsSign.length > 1 ? 's' : ''} awaiting your signature</Text>
        </View>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {agreements.length === 0
          ? <EmptyState message="No contracts yet." icon="📝" />
          : agreements.map(ag => (
              <Card key={ag.id} style={styles.card}>
                <View style={[styles.agHeader, { backgroundColor: Colors.investor }]}>
                  <Text style={styles.agHeaderRef}>{ag.reference}</Text>
                  <Pill label={ag.status.replace(/_/g, ' ')} variant={statusVariant(ag.status)} />
                </View>
                <View style={{ padding: Spacing.sm }}>
                  {[
                    ['Farmer',   ag.farmer_name],
                    ['Amount',   `GHS ${parseFloat(ag.amount).toLocaleString()}`],
                    ['Period',   `${ag.repayment_period_months} months`],
                    ['Interest', `${ag.interest_rate}%`],
                    ['Start',    ag.start_date ?? '—'],
                    ['End',      ag.end_date   ?? '—'],
                  ].map(([k, v]) => (
                    <View key={k} style={styles.detailRow}>
                      <Text style={styles.detailKey}>{k}</Text>
                      <Text style={styles.detailVal}>{v}</Text>
                    </View>
                  ))}
                  <View style={{ marginTop: 8, gap: 3 }}>
                    <Text style={styles.meta}>Your signature: {ag.investor_signed_at ? '✅ Signed' : '⏳ Pending'}</Text>
                    <Text style={styles.meta}>Farmer signature: {ag.farmer_signed_at ? '✅ Signed' : '⏳ Pending'}</Text>
                  </View>
                  {ag.status === 'pending_signature' && !ag.investor_signed_at && (
                    <Button label="Sign Agreement" onPress={() => sign(ag.id)} fullWidth style={{ marginTop: 10 }} />
                  )}
                </View>
              </Card>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card:           { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  cardHeader:     { flexDirection: 'row', alignItems: 'flex-start' },
  ref:            { fontSize: 14, fontWeight: '700', color: Colors.ink },
  farmer:         { fontSize: 12, color: Colors.muted, marginTop: 2 },
  amount:         { fontSize: 18, fontWeight: '700', color: Colors.investor, marginTop: 4 },
  meta:           { fontSize: 12, color: Colors.muted, marginTop: 2 },
  expandedBody:   { marginTop: 10, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailKey:      { fontSize: 12, color: Colors.muted },
  detailVal:      { fontSize: 12, fontWeight: '600', color: Colors.ink, flex: 1, textAlign: 'right' },
  summaryRow:     { flexDirection: 'row', gap: 8, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  summaryCard:    { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 10, borderTopWidth: 3, borderWidth: 1, borderColor: Colors.border },
  summaryVal:     { fontSize: 14, fontWeight: '700' },
  summaryKey:     { fontSize: 10, color: Colors.muted, marginTop: 2 },
  tabBar:         { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.border, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  tab:            { flex: 1, paddingVertical: 9, alignItems: 'center' },
  tabActive:      { borderBottomWidth: 2, borderBottomColor: Colors.leaf, marginBottom: -2 },
  tabText:        { fontSize: 12, fontWeight: '500', color: Colors.muted },
  tabTextActive:  { color: Colors.leaf, fontWeight: '700' },
  agHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.sm },
  agHeaderRef:    { fontSize: 14, fontWeight: '700', color: Colors.white },
  warnBanner:     { marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: 12, backgroundColor: '#FFF8E1', borderRadius: Radius.sm, borderLeftWidth: 4, borderLeftColor: Colors.warning },
  warnText:       { fontSize: 13, color: '#7C5800' },
  modalBg:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:       { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: Colors.ink, marginBottom: 6 },
  pickerItem:     { padding: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm },
  pickerItemActive:{ borderColor: Colors.leaf, backgroundColor: Colors.sky },
});
