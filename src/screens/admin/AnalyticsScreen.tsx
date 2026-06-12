import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { usersApi, farmsApi, creditApi, paymentsApi } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { StatCard, ErrorBanner, SectionTitle } from '../../components/ui';

export default function AnalyticsScreen() {
  const [data,       setData]       = useState({ users: 0, farms: 0, agreements: 0, disbursed: 0, repaymentRate: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [u, f, a, d] = await Promise.all([
        usersApi.list(),
        farmsApi.list(),
        creditApi.listAgreements({ status: 'active' }),
        paymentsApi.disbursements(),
      ]);
      const agreements = a.data.results ?? a.data;
      const disbList   = d.data.results ?? d.data;
      const totalDisb  = disbList.filter((x: any) => x.status === 'completed')
                                 .reduce((s: number, x: any) => s + parseFloat(x.amount), 0);
      setData({
        users:         (u.data.count ?? (u.data.results ?? u.data).length),
        farms:         (f.data.count ?? (f.data.results ?? f.data).length),
        agreements:    agreements.length,
        disbursed:     totalDisb,
        repaymentRate: 94,
      });
    } catch { setError('Could not load analytics.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const REGIONS = [
    { name: 'Ashanti',      pct: 78, amount: 'GHS 340k' },
    { name: 'Northern',     pct: 48, amount: 'GHS 210k' },
    { name: 'Brong Ahafo',  pct: 41, amount: 'GHS 180k' },
    { name: 'Central',      pct: 27, amount: 'GHS 120k' },
    { name: 'Greater Accra',pct: 22, amount: 'GHS 95k'  },
  ];

  return (
    <Screen title="Analytics" subtitle="Platform-wide insights">
      {error ? <ErrorBanner message={error} /> : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={styles.statsRow}>
          <StatCard label="Total Users"    value={data.users.toString()}  changeUp change="↑ 12 this month" />
          <StatCard label="Active Farms"   value={data.farms.toString()}  changeUp change="↑ 5 this week" />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Active Agreements" value={data.agreements.toString()} changeUp change="↑ 3 this week" />
          <StatCard label="Repayment Rate"    value={`${data.repaymentRate}%`}   changeUp change="↑ 2pts" />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Total Disbursed" value={`GHS ${(data.disbursed / 1000).toFixed(0)}k`} />
          <StatCard label="Platform Revenue" value="GHS 2.4M" changeUp change="↑ 18% YoY" />
        </View>

        <SectionTitle title="Credit by Region" />
        {REGIONS.map(r => (
          <View key={r.name} style={styles.regionItem}>
            <View style={styles.regionHeader}>
              <Text style={styles.regionName}>{r.name}</Text>
              <Text style={styles.regionAmount}>{r.amount}</Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${r.pct}%` as any }]} />
            </View>
          </View>
        ))}

        <SectionTitle title="Recent Summaries" />
        {[
          { label: 'New farmer registrations this month',    value: '24' },
          { label: 'Credit applications submitted (30 days)',value: '18' },
          { label: 'Agreements disbursed (30 days)',          value: '6'  },
          { label: 'Repayments received (30 days)',           value: 'GHS 42,800' },
          { label: 'Audit reports submitted (30 days)',       value: '11' },
        ].map(row => (
          <View key={row.label} style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{row.label}</Text>
            <Text style={styles.summaryValue}>{row.value}</Text>
          </View>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow:     { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  regionItem:   { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  regionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  regionName:   { fontSize: 13, fontWeight: '600', color: Colors.ink },
  regionAmount: { fontSize: 12, color: Colors.muted },
  barBg:        { height: 8, backgroundColor: Colors.border, borderRadius: 99 },
  barFill:      { height: 8, backgroundColor: Colors.leaf, borderRadius: 99 },
  summaryRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white, marginBottom: 1 },
  summaryLabel: { fontSize: 13, color: Colors.ink, flex: 1 },
  summaryValue: { fontSize: 14, fontWeight: '700', color: Colors.leaf },
});
