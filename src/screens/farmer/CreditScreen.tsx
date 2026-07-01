import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { creditApi, farmsApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Button, Badge, SectionTitle, Stepper, FormLabel } from '../../components/ui';
import type { Farm, CreditApplication } from '../../types';

const CREDIT_TYPES = [
  { value: 'direct_financing',    icon: '💰', label: 'Direct Financing',    desc: 'Direct capital for startup, flock acquisition, or equipment' },
  { value: 'farm_inputs',         icon: '🌾', label: 'Farm Inputs',         desc: 'Feed, vaccines, medications, and housing materials in-kind' },
  { value: 'structured_training', icon: '📚', label: 'Structured Training', desc: 'Enrolment in a structured training programme — free' },
  { value: 'mixed',               icon: '🤝', label: 'Mixed',               desc: 'Combination of financing and in-kind support' },
];
const DOC_TYPES = [
  { value: 'ghana_card',    label: 'Ghana Card' },
  { value: 'farm_cert',     label: 'Farm Certificate' },
  { value: 'farm_photo',    label: 'Farm Photo' },
  { value: 'season_record', label: 'Season Record' },
  { value: 'other',         label: 'Other Document' },
];
const STATUS_BADGE: Record<string, any> = {
  draft:'neutral', submitted:'info', under_review:'warning', scored:'warning',
  matched:'info', approved:'success', disbursed:'success', rejected:'danger', withdrawn:'neutral',
};

type Step = 1 | 2 | 3 | 4;

export default function CreditScreen() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [apps,  setApps]  = useState<CreditApplication[]>([]);

  const [step,        setStep]        = useState<Step>(1);
  const [creditType,  setCreditType]  = useState('');
  const [farmId,      setFarmId]      = useState('');
  const [amount,      setAmount]      = useState('');
  const [months,      setMonths]      = useState('');
  const [purpose,     setPurpose]     = useState('');
  const [inputDetails,setInputDetails]= useState('');
  const [docType,     setDocType]     = useState('ghana_card');
  const [docFile,     setDocFile]     = useState<any>(null);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [draftId,     setDraftId]     = useState('');
  const [submitted,   setSubmitted]   = useState(false);

  useEffect(() => {
    farmsApi.list().then(r => setFarms(toArray(r.data))).catch(() => {});
    creditApi.listApps().then(r => setApps(toArray(r.data))).catch(() => {});
  }, []);

  const saveDraft = async () => {
    if (!creditType) return;
    setSaving(true); setError('');
    try {
      const payload: any = { credit_type: creditType, purpose };
      if (farmId) payload.farm = farmId;
      if (amount) payload.amount_requested = String(parseFloat(amount));
      if (months) payload.repayment_period_months = parseInt(months);
      if (creditType === 'farm_inputs') payload.input_details = inputDetails;
      let app: any;
      if (draftId) { const r = await creditApi.updateApp(draftId, payload); app = r.data; }
      else         { const r = await creditApi.createApp(payload); app = r.data; setDraftId(app.id); }
      return app;
    } catch { setError('Could not save draft. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleNext = async () => {
    if (step === 2) await saveDraft();
    setStep(s => (s + 1) as Step);
  };

  const handleUpload = async () => {
    if (!docFile || !draftId) return;
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('document', docFile as any);
      fd.append('document_type', docType);
      await creditApi.uploadDoc(draftId, fd as any);
      setStep(4);
    } catch { setError('Document upload failed. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!draftId) return;
    setSaving(true); setError('');
    try {
      await creditApi.submitApp(draftId);
      setSubmitted(true);
      const r = await creditApi.listApps();
      setApps(toArray(r.data));
    } catch { setError('Submission failed. Please try again.'); }
    finally { setSaving(false); }
  };

  const pickDoc = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf','image/*'] });
    if (!res.canceled && res.assets?.[0]) setDocFile(res.assets[0]);
  };

  const resetAll = () => {
    setSubmitted(false); setStep(1); setCreditType(''); setDraftId('');
    setAmount(''); setMonths(''); setPurpose(''); setInputDetails('');
    setDocFile(null); setFarmId('');
  };

  if (submitted) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }}>
        <PageHeader title="Credit Application" subtitle="Apply for funding, farm inputs, or training enrolment." />
        <Card style={{ alignItems: 'center', padding: Spacing.xl }}>
          <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>🎉</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.sm, textAlign: 'center' }}>Application Submitted!</Text>
          <Text style={{ fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.lg }}>
            Your application has been submitted and is now under review by the FarmAsyst North team. You'll be notified when your status changes.
          </Text>
          <Button onPress={resetAll}>New Application</Button>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
      <PageHeader title="Credit Application" subtitle="Apply for funding, farm inputs, or training enrolment." />

      <Stepper steps={['Credit Type','Details','Documents','Review']} current={step - 1} />

      <Card>
        {error ? <Text style={s.error}>{error}</Text> : null}

        {/* Step 1 — Credit Type */}
        {step === 1 && (
          <View>
            <Text style={s.stepTitle}>What type of support are you applying for?</Text>
            <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: Spacing.md }}>Select the credit type that best matches your needs.</Text>
            {CREDIT_TYPES.map(t => {
              const selected = creditType === t.value;
              return (
                <TouchableOpacity key={t.value} onPress={() => setCreditType(t.value)}
                  style={[s.typeCard, selected && s.typeCardActive]}>
                  <Text style={{ fontSize: 28, marginBottom: 4 }}>{t.icon}</Text>
                  <Text style={[s.typeLabel, selected && { color: Colors.primary }]}>{t.label}</Text>
                  <Text style={s.typeDesc}>{t.desc}</Text>
                  {selected && <View style={s.selectedBadge}><Text style={{ fontSize: 11, color: Colors.primary, fontWeight: '700' }}>Selected ✓</Text></View>}
                </TouchableOpacity>
              );
            })}
            <Button disabled={!creditType} onPress={() => setStep(2)} fullWidth style={{ marginTop: Spacing.md }}>Continue →</Button>
          </View>
        )}

        {/* Step 2 — Details */}
        {step === 2 && (
          <View>
            <Text style={s.stepTitle}>Application details</Text>
            {farms.length > 0 && (
              <>
                <FormLabel>Select farm (optional)</FormLabel>
                <View style={s.pickerWrap}>
                  <TouchableOpacity style={[s.pickerOpt, !farmId && s.pickerOptActive]} onPress={() => setFarmId('')}>
                    <Text style={{ fontSize: 13, color: !farmId ? Colors.primary : Colors.muted }}>— No specific farm —</Text>
                  </TouchableOpacity>
                  {farms.map(f => (
                    <TouchableOpacity key={f.id} style={[s.pickerOpt, farmId === f.id && s.pickerOptActive]} onPress={() => setFarmId(f.id)}>
                      <Text style={{ fontSize: 13, color: farmId === f.id ? Colors.primary : Colors.ink, fontWeight: farmId === f.id ? '600' : '400' }}>{f.name} · {f.district}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            {creditType !== 'structured_training' && (
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <FormLabel>Amount requested (GHS)</FormLabel>
                  <TextInput style={s.input} keyboardType="decimal-pad" placeholder="e.g. 5000" value={amount} onChangeText={setAmount} />
                </View>
                <View style={{ flex: 1 }}>
                  <FormLabel>Repayment period (months)</FormLabel>
                  <TextInput style={s.input} keyboardType="number-pad" placeholder="e.g. 12" value={months} onChangeText={setMonths} />
                </View>
              </View>
            )}
            <FormLabel required>Purpose</FormLabel>
            <TextInput style={[s.input, s.textarea]} multiline numberOfLines={4} placeholder="Describe what you will use this support for and how it will benefit your farm..." value={purpose} onChangeText={setPurpose} />
            {creditType === 'farm_inputs' && (
              <>
                <FormLabel>Input details</FormLabel>
                <TextInput style={[s.input, s.textarea]} multiline numberOfLines={3} placeholder="List the specific feeds, medications, or materials you need..." value={inputDetails} onChangeText={setInputDetails} />
              </>
            )}
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <Button variant="secondary" onPress={() => setStep(1)}>← Back</Button>
              <Button disabled={!purpose || saving} loading={saving} onPress={handleNext} style={{ flex: 1 }}>Continue →</Button>
            </View>
          </View>
        )}

        {/* Step 3 — Documents */}
        {step === 3 && (
          <View>
            <Text style={s.stepTitle}>Upload supporting documents</Text>
            <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: Spacing.md, lineHeight: 20 }}>
              Documents help verify your application and increase approval chances. You can skip this step and upload later.
            </Text>
            <FormLabel>Document type</FormLabel>
            {DOC_TYPES.map(d => (
              <TouchableOpacity key={d.value} style={[s.pickerOpt, docType === d.value && s.pickerOptActive]} onPress={() => setDocType(d.value)}>
                <Text style={{ fontSize: 13, color: docType === d.value ? Colors.primary : Colors.ink, fontWeight: docType === d.value ? '600' : '400' }}>{d.label}</Text>
              </TouchableOpacity>
            ))}
            <Button variant="secondary" onPress={pickDoc} style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
              {docFile ? `📎 ${docFile.name}` : 'Select File (PDF, JPG, PNG)'}
            </Button>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <Button variant="secondary" onPress={() => setStep(2)}>← Back</Button>
              <Button variant="secondary" onPress={() => setStep(4)}>Skip for now</Button>
              <Button disabled={!docFile || saving} loading={saving} onPress={handleUpload}>Upload →</Button>
            </View>
          </View>
        )}

        {/* Step 4 — Review */}
        {step === 4 && (
          <View>
            <Text style={s.stepTitle}>Review your application</Text>
            <View style={s.reviewBlock}>
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Credit type</Text><Text style={s.reviewVal}>{CREDIT_TYPES.find(t => t.value === creditType)?.label}</Text></View>
              {amount && <View style={s.reviewRow}><Text style={s.reviewLabel}>Amount requested</Text><Text style={s.reviewVal}>GHS {parseFloat(amount).toLocaleString()}</Text></View>}
              {months && <View style={s.reviewRow}><Text style={s.reviewLabel}>Repayment period</Text><Text style={s.reviewVal}>{months} months</Text></View>}
              <View style={s.reviewRow}><Text style={s.reviewLabel}>Status</Text><Badge variant="neutral">Draft — will be submitted</Badge></View>
            </View>
            <View style={{ backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.md }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.muted, marginBottom: 6 }}>PURPOSE</Text>
              <Text style={{ fontSize: 13, color: Colors.ink, lineHeight: 20 }}>{purpose}</Text>
            </View>
            <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: Spacing.md, lineHeight: 18 }}>
              By submitting, you confirm all provided information is accurate. FarmAsyst North will review your application and match you with a suitable investor.
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Button variant="secondary" onPress={() => setStep(3)}>← Back</Button>
              <Button disabled={saving} loading={saving} onPress={handleSubmit} style={{ flex: 1 }}>Submit Application ✓</Button>
            </View>
          </View>
        )}
      </Card>

      {/* Previous applications */}
      {apps.length > 0 && (
        <>
          <SectionTitle>Your Previous Applications</SectionTitle>
          <Card>
            {apps.slice(0, 8).map(app => (
              <View key={app.id} style={s.appRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{app.reference}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600' }}>{app.credit_type.replace(/_/g,' ')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontSize: 12 }}>{app.amount_requested ? `GHS ${parseFloat(app.amount_requested).toLocaleString()}` : 'Free'}</Text>
                  <Badge variant={STATUS_BADGE[app.status] ?? 'neutral'}>{app.status.replace(/_/g,' ')}</Badge>
                </View>
              </View>
            ))}
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  input:       { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  textarea:    { height: 100, textAlignVertical: 'top' },
  error:       { fontSize: 13, color: Colors.danger, marginBottom: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.dangerBg, borderRadius: Radius.sm },
  stepTitle:   { fontSize: 16, fontWeight: '700', color: Colors.ink, marginBottom: 4 },
  typeCard:    { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm },
  typeCardActive: { borderColor: Colors.primary, backgroundColor: '#F0F7EB' },
  typeLabel:   { fontSize: 14, fontWeight: '600', color: Colors.ink, marginBottom: 2 },
  typeDesc:    { fontSize: 12, color: Colors.muted, lineHeight: 18 },
  selectedBadge: { marginTop: 6, backgroundColor: '#E8F5E0', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  pickerWrap:  { marginBottom: Spacing.md },
  pickerOpt:   { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerOptActive: { backgroundColor: '#F0F7EB' },
  reviewBlock: { backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: Spacing.md, marginBottom: Spacing.md },
  reviewRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  reviewLabel: { fontSize: 13, color: Colors.muted },
  reviewVal:   { fontSize: 13, fontWeight: '600', color: Colors.ink },
  appRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
});
