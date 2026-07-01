import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { farmsApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Badge, Button, SectionTitle, FormLabel, EmptyState, AlertBanner } from '../../components/ui';
import type { Farm, FarmAuditReport } from '../../types';

const OUTCOMES = [
  { value:'satisfactory',   label:'✅ Satisfactory',   desc:'Farm meets all expected standards' },
  { value:'concerns',       label:'⚠️ Concerns',       desc:'Some issues noted, requires follow-up' },
  { value:'unsatisfactory', label:'❌ Unsatisfactory',  desc:'Significant issues found, immediate action needed' },
];
const OUTCOME_BADGE: Record<string, any> = { satisfactory:'success', concerns:'warning', unsatisfactory:'danger' };

function ScoreInput({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const n = parseInt(value) || 0;
  const color = n >= 8 ? Colors.success : n >= 5 ? Colors.warning : Colors.danger;
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color }}>{n} / 10</Text>
      </View>
      {hint && <Text style={{ fontSize: 11, color: Colors.muted, marginBottom: 4 }}>{hint}</Text>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {[0,1,2,3,4,5,6,7,8,9,10].map(v => (
          <TouchableOpacity key={v} style={[{
            width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
            borderColor: n === v ? Colors.primary : Colors.border,
            backgroundColor: n === v ? Colors.primary : Colors.white,
            alignItems: 'center', justifyContent: 'center',
          }]} onPress={() => onChange(String(v))}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: n === v ? '#fff' : Colors.muted }}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function SubmitReportScreen() {
  const [farms,     setFarms]     = useState<Farm[]>([]);
  const [reports,   setReports]   = useState<FarmAuditReport[]>([]);
  const [refreshing,setRefreshing]= useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  // Form
  const [farmId,         setFarmId]         = useState('');
  const [visitDate,      setVisitDate]      = useState(new Date().toISOString().split('T')[0]);
  const [outcome,        setOutcome]        = useState('satisfactory');
  const [flockVerified,  setFlockVerified]  = useState('');
  const [infra,          setInfra]          = useState('8');
  const [mgmt,           setMgmt]           = useState('8');
  const [biosec,         setBiosec]         = useState('8');
  const [summary,        setSummary]        = useState('');
  const [reportDoc,      setReportDoc]      = useState<any>(null);

  // Variance check
  const selectedFarm = farms.find(f => f.id === farmId);
  const declaredFlock = selectedFarm?.flock_size ?? 0;
  const verifiedNum   = parseInt(flockVerified) || 0;
  const variance      = declaredFlock > 0 ? Math.abs(verifiedNum - declaredFlock) / declaredFlock * 100 : 0;
  const hasVariance   = variance > 20;

  const load = async () => {
    const [f, r] = await Promise.allSettled([farmsApi.list(), farmsApi.auditReports()]);
    if (f.status === 'fulfilled') {
      const list = toArray<Farm>(f.value.data);
      setFarms(list);
      if (!farmId && list.length > 0) setFarmId(list[0].id);
    }
    if (r.status === 'fulfilled') setReports(toArray<FarmAuditReport>(r.value.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const pickDoc = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: ['application/pdf','image/*'] });
    if (!r.canceled && r.assets?.[0]) setReportDoc(r.assets[0]);
  };

  const resetForm = () => {
    setFlockVerified(''); setInfra('8'); setMgmt('8'); setBiosec('8');
    setSummary(''); setOutcome('satisfactory'); setReportDoc(null);
  };

  const handleSubmit = async () => {
    if (!farmId || !flockVerified || !summary.trim()) {
      setError('Please fill all required fields: farm, flock count, and summary.'); return;
    }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('farm',                   farmId);
      fd.append('visit_date',             visitDate);
      fd.append('outcome',                outcome);
      fd.append('flock_verified',         flockVerified);
      fd.append('infrastructure_score',   infra);
      fd.append('management_score',       mgmt);
      fd.append('biosecurity_score',      biosec);
      fd.append('summary',                summary);
      if (reportDoc) fd.append('report_document', reportDoc as any);
      await farmsApi.submitAudit(fd as any);
      setSuccess('Audit report submitted successfully!');
      resetForm();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Submission failed. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader title="Submit Audit Report" subtitle="Conduct farm audits and submit field inspection reports." />

      {error   ? <AlertBanner variant="danger">{error}</AlertBanner>   : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      <SectionTitle>Audit Report Form</SectionTitle>
      <Card>
        <FormLabel required>Select Farm</FormLabel>
        <View style={s.pickerWrap}>
          {farms.map(f => (
            <TouchableOpacity key={f.id} style={[s.pickerOpt, farmId === f.id && s.pickerOptActive]} onPress={() => setFarmId(f.id)}>
              <Text style={{ fontSize: 13, fontWeight: farmId === f.id ? '700' : '400', color: farmId === f.id ? Colors.primary : Colors.ink }}>{f.name}</Text>
              <Text style={{ fontSize: 11, color: Colors.muted }}>{f.district}, {f.region} · Declared: {f.flock_size.toLocaleString()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FormLabel required>Visit Date</FormLabel>
        <TextInput style={s.input} placeholder="YYYY-MM-DD" value={visitDate} onChangeText={setVisitDate} />

        <FormLabel required>Actual Flock Count (Verified on site)</FormLabel>
        <TextInput style={s.input} keyboardType="number-pad" placeholder="e.g. 980" value={flockVerified} onChangeText={setFlockVerified} />

        {hasVariance && (
          <AlertBanner variant="warning">
            ⚠️ Significant variance detected: declared {declaredFlock.toLocaleString()} vs verified {verifiedNum.toLocaleString()} — {variance.toFixed(1)}% difference. Please explain in summary.
          </AlertBanner>
        )}

        {/* Scores */}
        <View style={{ borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, marginTop: Spacing.sm }}>
          <Text style={{ fontSize: 13, fontWeight: '700', marginBottom: Spacing.md }}>Assessment Scores (0–10)</Text>
          <ScoreInput label="Infrastructure Score" value={infra} onChange={setInfra}
            hint="Housing condition, equipment, water access, electricity" />
          <ScoreInput label="Management Score" value={mgmt} onChange={setMgmt}
            hint="Record keeping, feeding schedule, medication management, biosecurity practices" />
          <ScoreInput label="Biosecurity Score" value={biosec} onChange={setBiosec}
            hint="Perimeter security, visitor protocols, disinfection, disease prevention" />
        </View>

        {/* Outcome */}
        <View style={{ borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: 13, fontWeight: '700', marginBottom: Spacing.sm }}>Overall Outcome</Text>
          {OUTCOMES.map(o => (
            <TouchableOpacity key={o.value} style={[s.outcomeCard, outcome === o.value && s.outcomeCardActive]} onPress={() => setOutcome(o.value)}>
              <Text style={[s.outcomeLabel, outcome === o.value && { color: Colors.primary }]}>{o.label}</Text>
              <Text style={s.outcomeDesc}>{o.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FormLabel required>Summary</FormLabel>
        <TextInput
          style={[s.input, { height: 100, textAlignVertical: 'top' }]}
          multiline
          placeholder="Describe your observations, key findings, issues noted, and any recommended follow-up actions. Include explanation if there's a significant flock variance."
          value={summary}
          onChangeText={setSummary}
        />

        <FormLabel>Upload Report Document (PDF or Photo)</FormLabel>
        <Button variant="secondary" onPress={pickDoc} style={{ marginBottom: Spacing.sm }}>
          {reportDoc ? `📎 ${reportDoc.name}` : '📎 Attach Report Document (Optional)'}
        </Button>

        <Button fullWidth disabled={!farmId||!flockVerified||!summary||saving} loading={saving} onPress={handleSubmit}>
          Submit Audit Report
        </Button>
      </Card>

      {/* Previous reports */}
      <SectionTitle>Recent Audit Reports ({reports.length})</SectionTitle>
      {reports.length === 0
        ? <EmptyState icon="📋" text="No audit reports submitted yet." />
        : reports.map(r => (
          <Card key={r.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: Colors.muted }}>{new Date(r.visit_date).toLocaleDateString('en-GH', { day:'numeric', month:'short', year:'numeric' })}</Text>
              <Badge variant={OUTCOME_BADGE[r.outcome] ?? 'neutral'}>{r.outcome}</Badge>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700' }}>{r.farm_name || r.farm}</Text>
            <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>Verified: {r.flock_verified.toLocaleString()} birds</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: 4 }}>
              <Text style={{ fontSize: 11, color: Colors.muted }}>🏗 {r.infrastructure_score}/10</Text>
              <Text style={{ fontSize: 11, color: Colors.muted }}>⚙️ {r.management_score}/10</Text>
              <Text style={{ fontSize: 11, color: Colors.muted }}>🛡 {r.biosecurity_score}/10</Text>
            </View>
          </Card>
        ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  input:          { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  pickerWrap:     { marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, overflow: 'hidden' },
  pickerOpt:      { padding: Spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerOptActive:{ backgroundColor: '#F0F7EB' },
  outcomeCard:    { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm, padding: Spacing.sm + 2, marginBottom: Spacing.sm },
  outcomeCardActive: { borderColor: Colors.primary, backgroundColor: '#F0F7EB' },
  outcomeLabel:   { fontSize: 14, fontWeight: '600', color: Colors.ink },
  outcomeDesc:    { fontSize: 12, color: Colors.muted, marginTop: 2 },
});
