import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { creditApi } from '../../api/client';
import { Card, SectionTitle, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';

function getArr(d: any): any[] { if (!d) return []; if (Array.isArray(d)) return d; return d.results ?? []; }

export default function AdminDisputesScreen() {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const r = await creditApi.listAgreements(); setAgreements(getArr(r.data)); }
    catch { /* ignore */ }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const defaulted = agreements.filter(a => a.status === 'defaulted');
  const cancelled = agreements.filter(a => a.status === 'cancelled');

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={s.title}>Dispute Resolution</Text>
      <Text style={s.sub}>Mediate conflicts between farmers and investors.</Text>

      <View style={s.statsRow}>
        <View style={[s.statCard, { borderColor: Colors.danger + '60' }]}>
          <Text style={[s.statVal, { color: Colors.danger }]}>{defaulted.length}</Text>
          <Text style={s.statLabel}>Defaulted agreements</Text>
        </View>
        <View style={[s.statCard, { borderColor: Colors.warning + '60' }]}>
          <Text style={[s.statVal, { color: Colors.warning }]}>{cancelled.length}</Text>
          <Text style={s.statLabel}>Cancelled agreements</Text>
        </View>
      </View>

      <SectionTitle>Defaulted Agreements</SectionTitle>
      {defaulted.length === 0
        ? <Card><Text style={{ padding: Spacing.sm, color: Colors.muted }}>No defaulted agreements — good standing.</Text></Card>
        : defaulted.map(ag => (
          <Card key={ag.id}>
            <Text style={{ fontWeight: '700', fontSize: 13, fontFamily: 'monospace' }}>{ag.reference}</Text>
            <Text style={{ fontSize: 13, marginTop: 4 }}>
              {ag.credit_type?.replace(/_/g,' ')} · GHS {parseFloat(ag.amount||'0').toLocaleString()}
            </Text>
            <Text style={{ fontSize: 12, color: Colors.muted }}>
              Farmer: {ag.farmer_name} · Investor: {ag.investor_name}
            </Text>
            {ag.start_date
              ? <Text style={{ fontSize: 11, color: Colors.muted }}>
                  Started: {new Date(ag.start_date).toLocaleDateString('en-GH')}
                </Text>
              : null}
          </Card>
        ))
      }

      <SectionTitle>Cancelled Agreements</SectionTitle>
      {cancelled.length === 0
        ? <Card><Text style={{ padding: Spacing.sm, color: Colors.muted }}>No cancelled agreements.</Text></Card>
        : cancelled.map(ag => (
          <Card key={ag.id}>
            <Text style={{ fontWeight: '700', fontSize: 13, fontFamily: 'monospace' }}>{ag.reference}</Text>
            <Text style={{ fontSize: 13, marginTop: 4 }}>
              {ag.credit_type?.replace(/_/g,' ')} · GHS {parseFloat(ag.amount||'0').toLocaleString()}
            </Text>
            <Text style={{ fontSize: 11, color: Colors.muted }}>
              {new Date(ag.created_at).toLocaleDateString('en-GH')}
            </Text>
          </Card>
        ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: Colors.bg },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title:     { fontSize: 22, fontWeight: '700', color: Colors.ink, marginBottom: 2 },
  sub:       { fontSize: 13, color: Colors.muted, marginBottom: Spacing.md },
  statsRow:  { flexDirection: 'row', gap: 12, marginBottom: Spacing.md },
  statCard:  { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  statVal:   { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, color: Colors.muted, marginTop: 4, textAlign: 'center' },
});
