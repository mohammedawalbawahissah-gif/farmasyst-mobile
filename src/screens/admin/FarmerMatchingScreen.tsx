import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { creditApi, profileApi } from '../../api/client';
import { CreditApplication, CreditAgreement } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, SectionTitle, Button, Pill, statusVariant, EmptyState, ErrorBanner } from '../../components/ui';

export default function FarmerMatchingScreen() {
  const [apps,       setApps]       = useState<CreditApplication[]>([]);
  const [agreements, setAgreements] = useState<CreditAgreement[]>([]);
  const [investors,  setInvestors]  = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [matching,   setMatching]   = useState<string | null>(null);
  const [selectedInv,setSelInv]     = useState('');
  const [acting,     setActing]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const [a, ag, inv] = await Promise.all([
        creditApi.listApplications({ status: 'approved' }),
        creditApi.listAgreements(),
        profileApi.listInvestors(),
      ]);
      setApps(a.data.results ?? a.data);
      setAgreements(ag.data.results ?? ag.data);
      setInvestors(inv.data.results ?? inv.data);
    } catch { setError('Could not load matching data.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const agByApp = Object.fromEntries(agreements.map(ag => {
    const appId = typeof ag.application === 'string' ? ag.application : (ag.application as any)?.id;
    return [appId, ag];
  }));

  // Pipeline counts
  const readyToMatch  = apps.filter(a => a.status === 'approved');
  const pendingSign   = agreements.filter(a => a.status === 'pending_signature');
  const activeAgs     = agreements.filter(a => a.status === 'active');

  async function confirmMatch(appId: string) {
    if (!selectedInv) { Alert.alert('Select an investor first.'); return; }
    setActing(appId);
    try {
      await creditApi.match(appId, { investor_id: selectedInv });
      Alert.alert('Matched!', 'Agreement created and awaiting signatures.');
      setMatching(null); setSelInv(''); load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Match failed.');
    } finally { setActing(null); }
  }

  return (
    <Screen title="Farmer–Investor Matching" subtitle="Assign approved applications to investors">
      {error ? <ErrorBanner message={error} /> : null}

      {/* Pipeline summary */}
      <View style={styles.pipeline}>
        {[
          { label: 'Ready to Match', count: readyToMatch.length, color: Colors.harvest },
          { label: 'Pending Sig.',   count: pendingSign.length,   color: Colors.investor },
          { label: 'Active Ags.',    count: activeAgs.length,     color: '#5C2D8B' },
        ].map(({ label, count, color }) => (
          <View key={label} style={[styles.pipelineCard, { borderTopColor: color }]}>
            <Text style={[styles.pipelineCount, { color }]}>{count}</Text>
            <Text style={styles.pipelineLabel}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Step 1 — Ready to Match */}
        <SectionTitle title={`Step 1 — Assign to Investor (${readyToMatch.length})`} />
        {readyToMatch.length === 0
          ? <EmptyState message="No approved applications waiting. Approve applications in Credit Workflow first." icon="📋" />
          : readyToMatch.map(app => {
              const ag = agByApp[app.id];
              const isExpanded = matching === app.id;
              return (
                <Card key={app.id} style={isExpanded ? [styles.card, { borderLeftWidth: 4, borderLeftColor: Colors.leaf }] as any : styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ref}>{app.reference}</Text>
                      <Text style={styles.farmer}>{app.farmer_name}</Text>
                      <Text style={styles.amount}>GHS {parseFloat(app.amount_requested ?? '0').toLocaleString()}</Text>
                      <Text style={styles.meta}>{app.repayment_period_months} months · {app.credit_type}</Text>
                      {app.credit_score_at_submission
                        ? <Text style={styles.meta}>Score: {app.credit_score_at_submission}</Text>
                        : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      {ag ? (
                        ag.status === 'pending_signature'
                          ? <><Pill label="Awaiting Sigs" variant="amber" /><Text style={styles.sigDetail}>Farmer: {ag.farmer_signed_at ? '✓' : '✗'} · Investor: {ag.investor_signed_at ? '✓' : '✗'}</Text></>
                          : ag.status === 'active'
                            ? <><Pill label="Agreement Active" variant="green" /><Text style={styles.sigDetail}>{ag.reference}</Text></>
                            : <Pill label={ag.status} variant={statusVariant(ag.status)} />
                      ) : !isExpanded ? (
                        <Button label="Assign →" onPress={() => { setMatching(app.id); setSelInv(''); }} size="sm" />
                      ) : (
                        <Button label="Cancel" onPress={() => setMatching(null)} variant="secondary" size="sm" />
                      )}
                    </View>
                  </View>
                  {/* Expanded investor picker */}
                  {isExpanded && !ag && (
                    <View style={styles.investorPicker}>
                      <Text style={styles.pickerLabel}>Select Investor</Text>
                      {investors.map((inv: any) => {
                        const id   = inv.user ? (typeof inv.user === 'string' ? inv.user : inv.user.id) : inv.id;
                        const name = inv.user ? `${inv.user.first_name ?? ''} ${inv.user.last_name ?? ''}`.trim() : inv.email;
                        const org  = inv.organisation ?? '';
                        return (
                          <TouchableOpacity
                            key={id}
                            onPress={() => setSelInv(id)}
                            style={[styles.investorRow, selectedInv === id && styles.investorRowActive]}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.investorName}>{name}</Text>
                              {org ? <Text style={styles.investorOrg}>{org}</Text> : null}
                            </View>
                            {selectedInv === id && <Text style={{ color: Colors.leaf, fontSize: 18 }}>✓</Text>}
                          </TouchableOpacity>
                        );
                      })}
                      <Button
                        label={acting === app.id ? 'Matching…' : 'Confirm Match'}
                        onPress={() => confirmMatch(app.id)}
                        loading={acting === app.id}
                        disabled={!selectedInv}
                        fullWidth
                        style={{ marginTop: 8 }}
                      />
                    </View>
                  )}
                </Card>
              );
            })
        }

        {/* Step 2 — Pending Signatures */}
        <SectionTitle title={`Step 2 — Pending Signatures (${pendingSign.length})`} />
        {pendingSign.length === 0
          ? <EmptyState message="No agreements awaiting signature." icon="✍️" />
          : pendingSign.map(ag => (
              <Card key={ag.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ref}>{ag.reference}</Text>
                    <Text style={styles.farmer}>Farmer: {ag.farmer_name}</Text>
                    <Text style={styles.meta}>Investor: {ag.investor_name}</Text>
                    <Text style={styles.amount}>GHS {parseFloat(ag.amount).toLocaleString()} · {ag.credit_type}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.sigDetail}>Farmer: {ag.farmer_signed_at ? '✓ Signed' : '✗ Pending'}</Text>
                    <Text style={styles.sigDetail}>Investor: {ag.investor_signed_at ? '✓ Signed' : '✗ Pending'}</Text>
                  </View>
                </View>
              </Card>
            ))
        }

        {/* Step 3 — Active */}
        <SectionTitle title={`Step 3 — Active Agreements (${activeAgs.length})`} />
        {activeAgs.length === 0
          ? <EmptyState message="No active agreements yet." icon="📄" />
          : activeAgs.map(ag => (
              <Card key={ag.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ref}>{ag.reference}</Text>
                    <Text style={styles.farmer}>Farmer: {ag.farmer_name}</Text>
                    <Text style={styles.meta}>Investor: {ag.investor_name}</Text>
                    <Text style={styles.amount}>GHS {parseFloat(ag.amount).toLocaleString()}</Text>
                  </View>
                  <Pill label="Active" variant="green" />
                </View>
              </Card>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pipeline:         { flexDirection: 'row', gap: 8, marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: 4 },
  pipelineCard:     { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 10, borderTopWidth: 3, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  pipelineCount:    { fontSize: 22, fontWeight: '700' },
  pipelineLabel:    { fontSize: 10, color: Colors.muted, marginTop: 2, textAlign: 'center' },
  card:             { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  cardHeader:       { flexDirection: 'row', alignItems: 'flex-start' },
  ref:              { fontSize: 14, fontWeight: '700', color: Colors.ink },
  farmer:           { fontSize: 12, color: Colors.muted, marginTop: 2 },
  amount:           { fontSize: 16, fontWeight: '700', color: Colors.earth, marginTop: 4 },
  meta:             { fontSize: 12, color: Colors.muted, marginTop: 2 },
  sigDetail:        { fontSize: 11, color: Colors.muted, marginTop: 2 },
  investorPicker:   { marginTop: 12, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  pickerLabel:      { fontSize: 12, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  investorRow:      { flexDirection: 'row', alignItems: 'center', padding: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, marginBottom: 6, backgroundColor: Colors.white },
  investorRowActive:{ borderColor: Colors.leaf, backgroundColor: Colors.sky },
  investorName:     { fontSize: 14, fontWeight: '600', color: Colors.ink },
  investorOrg:      { fontSize: 11, color: Colors.muted, marginTop: 1 },
});
