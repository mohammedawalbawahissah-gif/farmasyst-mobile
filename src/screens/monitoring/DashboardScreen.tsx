import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  Alert, TouchableOpacity, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { farmsApi } from '../../api/client';
import { Farm, FarmAuditReport } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, SectionTitle, Button, Pill, EmptyState, ErrorBanner, StatCard, InputField } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function MonitoringDashboard() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [farms,      setFarms]      = useState<Farm[]>([]);
  const [reports,    setReports]    = useState<FarmAuditReport[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [f, r] = await Promise.all([farmsApi.list(), farmsApi.auditReports()]);
      setFarms(f.data.results ?? f.data);
      setReports(r.data.results ?? r.data);
    } catch { setError('Could not load data.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dueFarms = farms.filter(f => !reports.find(r => r.farm === f.id));

  return (
    <Screen title="Field Monitor" subtitle={`${user?.first_name} ${user?.last_name}`}>
      {error ? <ErrorBanner message={error} /> : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.sm }}>
          <StatCard label="Assigned Farms" value={farms.length.toString()} />
          <StatCard label="Audits Pending" value={dueFarms.length.toString()} changeUp={false} change={dueFarms.length > 0 ? 'Action needed' : undefined} />
        </View>

        {/* Quick nav */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: 4 }}>
          <Button label="View Farms"     onPress={() => navigation.navigate('Menu', { screen: 'Farms' })}  variant="secondary" style={{ flex: 1 }} />
          <Button label="Submit Report"  onPress={() => navigation.navigate('Menu', { screen: 'Report' })} variant="primary"   style={{ flex: 1 }} />
        </View>

        <SectionTitle title="Assigned Farms" action="View all" onAction={() => navigation.navigate('Menu', { screen: 'Farms' })} />
        {farms.length === 0
          ? <EmptyState message="No farms assigned to you yet." icon="🌾" />
          : farms.slice(0, 4).map(f => {
              const lastReport = reports.find(r => r.farm === f.id);
              return (
                <Card key={f.id} style={styles.farmCard}>
                  <View style={styles.farmRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.farmName}>{f.name}</Text>
                      <Text style={styles.farmMeta}>{f.region} · {f.district}</Text>
                      <Text style={styles.farmMeta}>{lastReport ? `Last audit: ${lastReport.visit_date}` : 'Never audited'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Pill label={!lastReport ? 'Audit Due' : 'Current'} variant={!lastReport ? 'amber' : 'green'} />
                      {!lastReport && (
                        <Button label="Audit" onPress={() => navigation.navigate('Menu', { screen: 'Report' })} size="sm" variant="primary" />
                      )}
                    </View>
                  </View>
                </Card>
              );
            })
        }

        <SectionTitle title="Recent Reports" />
        {reports.length === 0
          ? <EmptyState message="No audit reports submitted yet." icon="📋" />
          : reports.slice(0, 4).map(r => (
              <Card key={r.id} style={styles.farmCard}>
                <View style={styles.farmRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.farmName}>{r.farm_name}</Text>
                    <Text style={styles.farmMeta}>Visit: {r.visit_date}</Text>
                    <Text style={styles.farmMeta}>
                      Infra: {r.infrastructure_score}/10 · Mgmt: {r.management_score}/10 · Bio: {r.biosecurity_score}/10
                    </Text>
                  </View>
                  <Pill label={r.outcome} variant={r.outcome === 'satisfactory' ? 'green' : r.outcome === 'concerns' ? 'amber' : 'red'} />
                </View>
              </Card>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

export default MonitoringDashboard;

// ── Farms List ────────────────────────────────────────────────────────────────
export function MonitoringFarmsScreen() {
  const navigation = useNavigation<any>();
  const [farms,      setFarms]      = useState<Farm[]>([]);
  const [search,     setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await farmsApi.list({ search });
      setFarms(res.data.results ?? res.data);
    } catch {} finally { setRefreshing(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen title="Assigned Farms" subtitle="View and manage">
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search farms..."
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          onSubmitEditing={load}
        />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {farms.length === 0
          ? <EmptyState message="No farms found." icon="🌾" />
          : farms.map(f => (
              <Card key={f.id} style={styles.farmCard}>
                <View style={styles.farmRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.farmName}>{f.name}</Text>
                    <Text style={styles.farmMeta}>{f.region} · {f.district} · {f.community}</Text>
                    <Text style={styles.farmMeta}>Flock: {f.flock_size.toLocaleString()} · Type: {f.flock_type}</Text>
                    <Pill label={f.is_active ? 'Active' : 'Inactive'} variant={f.is_active ? 'green' : 'gray'} style={{ marginTop: 6 }} />
                  </View>
                  <Button label="Audit" onPress={() => navigation.navigate('Menu', { screen: 'Report' })} size="sm" variant="primary" />
                </View>
              </Card>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

// ── Submit Audit Report ───────────────────────────────────────────────────────
export function SubmitReportScreen() {
  const [farms,   setFarms]   = useState<Farm[]>([]);
  const [farmId,  setFarmId]  = useState('');
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0]);
  const [flock,   setFlock]   = useState('');
  const [infra,   setInfra]   = useState('');
  const [mgmt,    setMgmt]    = useState('');
  const [bio,     setBio]     = useState('');
  const [outcome, setOutcome] = useState<'satisfactory' | 'concerns' | 'unsatisfactory'>('satisfactory');
  const [summary, setSummary] = useState('');
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    farmsApi.list().then(r => setFarms(r.data.results ?? r.data)).catch(() => {});
  }, []);

  async function submit() {
    if (!farmId || !flock || !infra || !mgmt || !bio || !summary) {
      Alert.alert('Missing Fields', 'Please complete all fields before submitting.');
      return;
    }
    const infraNum = parseInt(infra), mgmtNum = parseInt(mgmt), bioNum = parseInt(bio);
    if ([infraNum, mgmtNum, bioNum].some(n => isNaN(n) || n < 0 || n > 10)) {
      Alert.alert('Invalid Scores', 'Scores must be between 0 and 10.');
      return;
    }
    setSaving(true);
    try {
      await farmsApi.submitAudit({
        farm: farmId, visit_date: date, outcome,
        flock_verified:        parseInt(flock),
        infrastructure_score:  infraNum,
        management_score:      mgmtNum,
        biosecurity_score:     bioNum,
        summary,
      });
      Alert.alert('Submitted!', 'Audit report submitted successfully.');
      setFarmId(''); setFlock(''); setInfra(''); setMgmt(''); setBio(''); setSummary('');
      setOutcome('satisfactory');
    } catch (e: any) {
      console.log('AUDIT ERROR:', JSON.stringify(e?.response?.data));
      const msg = e?.response?.data?.detail
               ?? Object.values(e?.response?.data ?? {}).flat().join('\n')
               ?? 'Could not submit report.';
      Alert.alert('Error', msg);
    } finally { setSaving(false); }
  }

  const OUTCOMES: Array<'satisfactory' | 'concerns' | 'unsatisfactory'> = ['satisfactory', 'concerns', 'unsatisfactory'];

  return (
    <Screen title="Submit Audit Report">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.md, paddingBottom: 32 }}>
        <Text style={styles.fieldLabel}>Farm *</Text>
        <View style={styles.pickerWrap}>
          {farms.length === 0
            ? <Text style={{ color: Colors.muted, fontSize: 13 }}>No farms loaded. Pull down to refresh.</Text>
            : farms.map(f => (
                <TouchableOpacity key={f.id} onPress={() => setFarmId(f.id)} style={[styles.pickerItem, farmId === f.id && styles.pickerItemActive]}>
                  <Text style={[styles.pickerText, farmId === f.id && { color: Colors.leaf, fontWeight: '700' }]}>{f.name}</Text>
                  <Text style={styles.pickerSub}>{f.district} · {f.region}</Text>
                </TouchableOpacity>
              ))
          }
        </View>

        <InputField label="Visit Date *"           value={date}  onChangeText={setDate}  placeholder="YYYY-MM-DD" />
        <InputField label="Flock Count Verified *"  value={flock} onChangeText={setFlock} keyboardType="numeric" placeholder="e.g. 2400" />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><InputField label="Infrastructure (0-10) *" value={infra} onChangeText={setInfra} keyboardType="numeric" placeholder="0-10" /></View>
          <View style={{ flex: 1 }}><InputField label="Management (0-10) *"     value={mgmt}  onChangeText={setMgmt}  keyboardType="numeric" placeholder="0-10" /></View>
        </View>
        <InputField label="Biosecurity (0-10) *" value={bio} onChangeText={setBio} keyboardType="numeric" placeholder="0-10" />

        <Text style={styles.fieldLabel}>Outcome *</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.md }}>
          {OUTCOMES.map(o => {
            const isActive = outcome === o;
            const activeColor = o === 'satisfactory' ? Colors.success : o === 'concerns' ? Colors.warning : Colors.danger;
            return (
              <TouchableOpacity
                key={o}
                onPress={() => setOutcome(o)}
                style={[styles.outcomeBtn, isActive && { backgroundColor: activeColor, borderColor: activeColor }]}
              >
                <Text style={[styles.outcomeText, isActive && { color: Colors.white }]}>{o}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <InputField
          label="Summary / Observations *"
          value={summary}
          onChangeText={setSummary}
          placeholder="Detailed field observations..."
          multiline
          numberOfLines={5}
          style={{ height: 100, textAlignVertical: 'top' }}
        />
        <Button label="Submit Audit Report" onPress={submit} loading={saving} fullWidth size="lg" />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  farmCard:        { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  farmRow:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  farmName:        { fontSize: 14, fontWeight: '700', color: Colors.ink },
  farmMeta:        { fontSize: 12, color: Colors.muted, marginTop: 2 },
  searchWrap:      { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  search:          { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.ink },
  fieldLabel:      { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  pickerWrap:      { marginBottom: Spacing.md },
  pickerItem:      { padding: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, marginBottom: 8, backgroundColor: Colors.white },
  pickerItemActive:{ borderColor: Colors.leaf, backgroundColor: Colors.sky },
  pickerText:      { fontSize: 14, color: Colors.ink },
  pickerSub:       { fontSize: 11, color: Colors.muted, marginTop: 2 },
  outcomeBtn:      { flex: 1, padding: 10, borderRadius: Radius.sm, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' as const },
  outcomeText:     { fontSize: 11, fontWeight: '600', color: Colors.muted, textTransform: 'capitalize' },
});
