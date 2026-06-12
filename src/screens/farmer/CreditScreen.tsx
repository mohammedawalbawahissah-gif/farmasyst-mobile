import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Modal,
} from 'react-native';
import { creditApi, paymentsApi, farmsApi } from '../../api/client';
import { CreditApplication, RepaymentSchedule, CreditAgreement, Farm } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, SectionTitle, Button, InputField, EmptyState, ErrorBanner, Pill, statusVariant } from '../../components/ui';

const CREDIT_TYPES = [
  { id: 'funding',  emoji: '💵', label: 'Funding',     desc: 'Direct capital for startup, flock acquisition, or equipment' },
  { id: 'inputs',   emoji: '🌾', label: 'Farm Inputs', desc: 'Feed, vaccines, medications, and housing materials in-kind' },
  { id: 'training', emoji: '📚', label: 'Training',    desc: 'Enrolment in a structured training programme — free' },
] as const;
type CreditType = typeof CREDIT_TYPES[number]['id'];

const DOC_TYPES = [
  { value: 'ghana_card',    label: 'Ghana Card' },
  { value: 'farm_cert',     label: 'Farm Certificate' },
  { value: 'farm_photo',    label: 'Farm Photo' },
  { value: 'season_record', label: 'Season Record' },
  { value: 'other',         label: 'Other Document' },
];

const PAYMENT_METHODS = [
  { value: 'momo',     label: '📱 MTN MoMo' },
  { value: 'paystack', label: '💳 Card / Paystack' },
];

export default function CreditScreen() {
  const [activeTab, setActiveTab] = useState<'apps' | 'apply' | 'repay' | 'contracts'>('apps');
  const [apps,       setApps]       = useState<CreditApplication[]>([]);
  const [schedules,  setSchedules]  = useState<RepaymentSchedule[]>([]);
  const [agreements, setAgreements] = useState<CreditAgreement[]>([]);
  const [farms,      setFarms]      = useState<Farm[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  // Apply — 4-step wizard
  const [step,        setStep]       = useState<1|2|3|4>(1);
  const [creditType,  setCreditType] = useState<CreditType | ''>('');
  const [farmId,      setFarmId]     = useState('');
  const [amount,      setAmount]     = useState('');
  const [months,      setMonths]     = useState('');
  const [purpose,     setPurpose]    = useState('');
  const [inputDetail, setInputDetail]= useState('');
  const [draftId,     setDraftId]    = useState('');
  const [docType,     setDocType]    = useState('ghana_card');
  const [saving,      setSaving]     = useState(false);
  const [submitted,   setSubmitted]  = useState(false);

  // Pay modal
  const [payModal,     setPayModal]    = useState<{ scheduleId: string; amount: string } | null>(null);
  const [payMode,      setPayMode]     = useState<'full' | 'partial'>('full');
  const [payMethod,    setPayMethod]   = useState<'momo' | 'paystack'>('momo');
  const [payPhone,     setPayPhone]    = useState('');
  const [customAmount, setCustomAmount]= useState('');
  const [paying,       setPaying]      = useState(false);

  // Full balance modal
  const [fullPayModal, setFullPayModal] = useState<{ agreementId: string; remaining: number } | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const [a, s, ag, f] = await Promise.all([
        creditApi.listApplications(),
        paymentsApi.schedules(),
        creditApi.listAgreements(),
        farmsApi.list(),
      ]);
      setApps(a.data.results ?? a.data);
      setSchedules(s.data.results ?? s.data);
      setAgreements(ag.data.results ?? ag.data);
      setFarms(f.data.results ?? f.data);
    } catch { setError('Could not load credit data.'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Draft save ────────────────────────────────────────────────────────────
  async function saveDraft() {
    if (!creditType) return;
    setSaving(true);
    try {
      const payload: any = {
        credit_type: creditType, purpose,
        ...(farmId && { farm: farmId }),
        ...(amount && { amount_requested: amount }),
        ...(months && { repayment_period_months: parseInt(months) }),
        ...(creditType === 'inputs' && { input_details: inputDetail }),
      };
      let res;
      if (draftId) { res = await creditApi.updateApplication(draftId, payload); }
      else         { res = await creditApi.createApplication({ credit_type: creditType, purpose, ...payload }); setDraftId(res.data.id); }
      return res.data;
    } catch (e: any) {
      Alert.alert('Error', 'Could not save draft. Please try again.');
    } finally { setSaving(false); }
  }

  async function handleNext() {
    if (step === 2) { const d = await saveDraft(); if (!d) return; }
    setStep(s => (s + 1) as any);
  }

  async function handleSubmit() {
    if (!draftId) return;
    setSaving(true);
    try {
      await creditApi.submit(draftId);
      setSubmitted(true);
      load();
    } catch { Alert.alert('Error', 'Submission failed. Please try again.'); }
    finally  { setSaving(false); }
  }

  function resetWizard() {
    setStep(1); setCreditType(''); setFarmId(''); setAmount(''); setMonths('');
    setPurpose(''); setInputDetail(''); setDraftId(''); setDocType('ghana_card');
    setSubmitted(false);
  }

  // ── Repayment ─────────────────────────────────────────────────────────────
  async function initiatePayment() {
    if (!payModal) return;
    if (payMethod === 'momo' && !payPhone) { Alert.alert('Missing', 'Enter your MoMo number.'); return; }
    if (payMode === 'partial' && !customAmount) { Alert.alert('Missing', 'Enter an amount.'); return; }
    setPaying(true);
    try {
      const payload: any = {
        schedule_id: payModal.scheduleId,
        method: payMethod,
        phone_number: payPhone,
        ...(payMode === 'partial' && { amount: parseFloat(customAmount) }),
      };
      await paymentsApi.initiateRepayment(payload);
      Alert.alert('Initiated', payMethod === 'momo' ? 'MoMo prompt sent to your phone.' : 'Redirecting to Paystack…');
      setPayModal(null); setPayPhone(''); setCustomAmount('');
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Payment failed.');
    } finally { setPaying(false); }
  }

  async function payFullBalance() {
    if (!fullPayModal) return;
    if (payMethod === 'momo' && !payPhone) { Alert.alert('Missing', 'Enter your MoMo number.'); return; }
    setPaying(true);
    try {
      await paymentsApi.payFullBalance({ agreement_id: fullPayModal.agreementId, method: payMethod, phone_number: payPhone });
      Alert.alert('Initiated', `Full balance payment of GHS ${fullPayModal.remaining.toLocaleString()} initiated.`);
      setFullPayModal(null); setPayPhone('');
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Payment failed.');
    } finally { setPaying(false); }
  }

  async function signAgreement(id: string) {
    Alert.alert('Sign Agreement', 'By signing, you confirm you have read and agree to the terms of this agreement.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign', onPress: async () => {
          try { await creditApi.signAgreement(id); Alert.alert('Signed', 'Agreement signed. Once the investor also signs, it becomes active.'); load(); }
          catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Signing failed.'); }
        }},
    ]);
  }

  const PAYABLE = new Set(['upcoming', 'due', 'pending', 'overdue']);
  const unpaidForAg = (agId: string) => schedules.filter(s => s.agreement === agId && PAYABLE.has(s.status));
  const remainingForAg = (agId: string) => unpaidForAg(agId).reduce((s, r) => s + parseFloat(r.amount_due), 0);
  const schedulesForAg = (agId: string) => schedules.filter(s => s.agreement === agId);

  const needsSign = agreements.filter(a => a.status === 'pending_signature' && !a.farmer_signed_at);

  return (
    <Screen title="Credit" subtitle="Applications, repayments & contracts">
      {error ? <ErrorBanner message={error} /> : null}

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        <View style={styles.tabBar}>
          {[
            { id: 'apps',      label: 'Applications' },
            { id: 'apply',     label: 'Apply' },
            { id: 'repay',     label: 'Repayments' },
            { id: 'contracts', label: 'Contracts' },
          ].map(t => (
            <TouchableOpacity key={t.id} onPress={() => setActiveTab(t.id as any)} style={[styles.tab, activeTab === t.id && styles.tabActive]}>
              <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>

        {/* ── Applications ── */}
        {activeTab === 'apps' && (
          apps.length === 0
            ? <EmptyState message="No applications yet. Tap 'Apply' to get started." icon="📋" />
            : apps.map(app => (
                <Card key={app.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.ref}>{app.reference}</Text>
                      <Text style={styles.meta}>{app.credit_type} · {app.repayment_period_months ? `${app.repayment_period_months} months` : 'Free'}</Text>
                    </View>
                    <Pill label={app.status.replace(/_/g, ' ')} variant={statusVariant(app.status)} />
                  </View>
                  <Text style={styles.amount}>GHS {parseFloat(app.amount_requested ?? '0').toLocaleString()}</Text>
                  {app.purpose ? <Text style={styles.purpose}>{app.purpose}</Text> : null}
                  {app.status === 'matched' && (
                    <View style={styles.actionRow}>
                      <Button label="Accept"  onPress={() => creditApi.accept(app.id).then(load)} variant="primary"   style={{ flex: 1 }} size="sm" />
                      <Button label="Decline" onPress={() => creditApi.declineMatch(app.id).then(load)} variant="danger" style={{ flex: 1 }} size="sm" />
                    </View>
                  )}
                </Card>
              ))
        )}

        {/* ── Apply wizard ── */}
        {activeTab === 'apply' && (
          submitted ? (
            <View style={styles.successBox}>
              <Text style={styles.successIcon}>🎉</Text>
              <Text style={styles.successTitle}>Application Submitted!</Text>
              <Text style={styles.successBody}>Your application is now under review. You'll be notified when your status changes.</Text>
              <Button label="New Application" onPress={resetWizard} fullWidth style={{ marginTop: 16 }} />
            </View>
          ) : (
            <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.sm }}>
              {/* Stepper */}
              <View style={styles.stepper}>
                {['Type', 'Details', 'Docs', 'Review'].map((l, i) => (
                  <View key={l} style={styles.stepItem}>
                    <View style={[styles.stepDot, step > i + 1 && styles.stepDone, step === i + 1 && styles.stepActive]}>
                      <Text style={[styles.stepNum, (step > i + 1 || step === i + 1) && { color: Colors.white }]}>
                        {step > i + 1 ? '✓' : i + 1}
                      </Text>
                    </View>
                    <Text style={[styles.stepLabel, step === i + 1 && { color: Colors.leaf, fontWeight: '700' }]}>{l}</Text>
                  </View>
                ))}
              </View>

              {/* Step 1 — Credit type */}
              {step === 1 && (
                <>
                  <Text style={styles.stepTitle}>What type of support are you applying for?</Text>
                  {CREDIT_TYPES.map(ct => (
                    <TouchableOpacity key={ct.id} onPress={() => setCreditType(ct.id)} style={[styles.typeCard, creditType === ct.id && styles.typeCardActive]}>
                      <Text style={styles.typeEmoji}>{ct.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.typeLabel, creditType === ct.id && { color: Colors.leaf }]}>{ct.label}</Text>
                        <Text style={styles.typeDesc}>{ct.desc}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  <Button label="Continue →" onPress={() => setStep(2)} disabled={!creditType} fullWidth style={{ marginTop: 12 }} />
                </>
              )}

              {/* Step 2 — Details */}
              {step === 2 && (
                <>
                  <Text style={styles.stepTitle}>Application details</Text>
                  {farms.length > 0 && (
                    <>
                      <Text style={styles.fieldLabel}>Farm (optional)</Text>
                      {farms.map(f => (
                        <TouchableOpacity key={f.id} onPress={() => setFarmId(f.id === farmId ? '' : f.id)} style={[styles.pickerItem, farmId === f.id && styles.pickerItemActive]}>
                          <Text style={[styles.pickerText, farmId === f.id && { color: Colors.leaf }]}>{f.name} · {f.district}</Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}
                  {creditType !== 'training' && (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}><InputField label="Amount (GHS)" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="e.g. 5000" /></View>
                      <View style={{ flex: 1 }}><InputField label="Period (months)" value={months} onChangeText={setMonths} keyboardType="numeric" placeholder="e.g. 12" /></View>
                    </View>
                  )}
                  <InputField label="Purpose *" value={purpose} onChangeText={setPurpose} placeholder="Describe what you will use this support for…" multiline numberOfLines={4} style={{ height: 90, textAlignVertical: 'top' }} />
                  {creditType === 'inputs' && (
                    <InputField label="Input Details" value={inputDetail} onChangeText={setInputDetail} placeholder="List the specific feeds, medications, or materials…" multiline numberOfLines={3} style={{ height: 70, textAlignVertical: 'top' }} />
                  )}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button label="← Back" onPress={() => setStep(1)} variant="secondary" style={{ flex: 1 }} />
                    <Button label={saving ? 'Saving…' : 'Continue →'} onPress={handleNext} disabled={!purpose || saving} loading={saving} style={{ flex: 1 }} />
                  </View>
                </>
              )}

              {/* Step 3 — Documents */}
              {step === 3 && (
                <>
                  <Text style={styles.stepTitle}>Upload supporting documents</Text>
                  <Text style={styles.stepSub}>Documents help verify your application. You can skip this for now.</Text>
                  <Text style={styles.fieldLabel}>Document type</Text>
                  {DOC_TYPES.map(d => (
                    <TouchableOpacity key={d.value} onPress={() => setDocType(d.value)} style={[styles.pickerItem, docType === d.value && styles.pickerItemActive]}>
                      <Text style={[styles.pickerText, docType === d.value && { color: Colors.leaf }]}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                  <Text style={[styles.meta, { marginTop: 8 }]}>📎 File upload is available on the web portal. Select your document type and continue.</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                    <Button label="← Back"         onPress={() => setStep(2)} variant="secondary" style={{ flex: 1 }} />
                    <Button label="Skip for now"    onPress={() => setStep(4)} variant="secondary" style={{ flex: 1 }} />
                    <Button label="Continue →"      onPress={() => setStep(4)} style={{ flex: 1 }} />
                  </View>
                </>
              )}

              {/* Step 4 — Review */}
              {step === 4 && (
                <>
                  <Text style={styles.stepTitle}>Review your application</Text>
                  {[
                    ['Credit type', CREDIT_TYPES.find(t => t.id === creditType)?.label ?? ''],
                    ...(amount ? [['Amount', `GHS ${parseFloat(amount).toLocaleString()}`]] : []),
                    ...(months ? [['Repayment', `${months} months`]] : []),
                    ['Status', 'Draft — will be submitted'],
                  ].map(([k, v]) => (
                    <View key={k} style={styles.reviewRow}>
                      <Text style={styles.reviewKey}>{k}</Text>
                      <Text style={styles.reviewVal}>{v}</Text>
                    </View>
                  ))}
                  <View style={[styles.card, { marginTop: 8 }]}>
                    <Text style={styles.fieldLabel}>Purpose</Text>
                    <Text style={styles.meta}>{purpose}</Text>
                  </View>
                  <Text style={[styles.meta, { marginTop: 8, marginBottom: 12 }]}>
                    By submitting, you confirm all provided information is accurate.
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Button label="← Back"              onPress={() => setStep(3)} variant="secondary" style={{ flex: 1 }} />
                    <Button label={saving ? 'Submitting…' : 'Submit ✓'} onPress={handleSubmit} loading={saving} style={{ flex: 1 }} />
                  </View>
                </>
              )}
            </View>
          )
        )}

        {/* ── Repayments ── */}
        {activeTab === 'repay' && (
          <>
            {/* Stats */}
            <View style={styles.statsRow}>
              {[
                { label: 'All', count: schedules.length },
                { label: 'Upcoming', count: schedules.filter(s => PAYABLE.has(s.status)).length },
                { label: 'Overdue', count: schedules.filter(s => s.status === 'overdue').length },
                { label: 'Paid', count: schedules.filter(s => s.status === 'paid').length },
              ].map(({ label, count }) => (
                <View key={label} style={styles.statBox}>
                  <Text style={styles.statVal}>{count}</Text>
                  <Text style={styles.statKey}>{label}</Text>
                </View>
              ))}
            </View>

            {agreements.length === 0
              ? <EmptyState message="No repayment schedules yet." icon="💳" />
              : agreements.map(ag => {
                  const agSchedules = schedulesForAg(ag.id);
                  const remaining   = unpaidForAg(ag.id).length;
                  const totalRem    = remainingForAg(ag.id);
                  return (
                    <Card key={ag.id} style={styles.card}>
                      <View style={styles.cardHeader}>
                        <View>
                          <Text style={styles.ref}>{ag.reference}</Text>
                          <Text style={styles.meta}>{ag.credit_type} · {ag.repayment_period_months}mo · {ag.interest_rate}%</Text>
                          <Text style={styles.amount}>GHS {parseFloat(ag.amount).toLocaleString()}</Text>
                        </View>
                        <Pill label={ag.status.replace(/_/g, ' ')} variant={statusVariant(ag.status)} />
                      </View>
                      {ag.status === 'active' && remaining > 0 && (
                        <Button label={`Pay Full Balance · GHS ${totalRem.toLocaleString()}`} onPress={() => setFullPayModal({ agreementId: ag.id, remaining: totalRem })} variant="secondary" size="sm" style={{ marginBottom: 8 }} />
                      )}
                      {agSchedules.map(s => (
                        <View key={s.id} style={styles.schedRow}>
                          <View style={[styles.schedNum, { backgroundColor: s.status === 'paid' ? Colors.success : s.status === 'overdue' ? Colors.danger : Colors.harvest }]}>
                            <Text style={{ color: Colors.white, fontSize: 11, fontWeight: '700' }}>{s.installment_number}</Text>
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.schedDate}>Due {s.due_date}</Text>
                            <Text style={styles.schedAmt}>GHS {parseFloat(s.amount_due).toLocaleString()}</Text>
                          </View>
                          {PAYABLE.has(s.status) ? (
                            <View style={{ flexDirection: 'row', gap: 4 }}>
                              <Button label="Pay" onPress={() => { setPayModal({ scheduleId: s.id, amount: s.amount_due }); setPayMode('full'); setPayPhone(''); setCustomAmount(''); }} size="sm" />
                              <Button label="Partial" onPress={() => { setPayModal({ scheduleId: s.id, amount: s.amount_due }); setPayMode('partial'); setPayPhone(''); setCustomAmount(''); }} size="sm" variant="secondary" />
                            </View>
                          ) : (
                            <Pill label={s.status} variant={statusVariant(s.status)} />
                          )}
                        </View>
                      ))}
                      {agSchedules.length === 0 && (
                        <Text style={[styles.meta, { marginTop: 8 }]}>No schedule yet. Awaiting disbursement.</Text>
                      )}
                    </Card>
                  );
                })
            }
          </>
        )}

        {/* ── Contracts ── */}
        {activeTab === 'contracts' && (
          <>
            {needsSign.length > 0 && (
              <View style={[styles.banner, { borderLeftColor: Colors.warning }]}>
                <Text style={[styles.bannerText, { color: '#92400E' }]}>
                  ⚠️ You have {needsSign.length} contract{needsSign.length > 1 ? 's' : ''} waiting for your signature.
                </Text>
              </View>
            )}
            {agreements.length === 0
              ? <EmptyState message="No contracts yet. Once your application is approved and matched, your contract appears here." icon="📄" />
              : agreements.map(ag => (
                  <Card key={ag.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.ref}>{ag.reference}</Text>
                        <Text style={styles.meta}>{ag.credit_type} · GHS {parseFloat(ag.amount).toLocaleString()} · {ag.repayment_period_months}mo · {ag.interest_rate}%</Text>
                      </View>
                      <Pill label={ag.status.replace(/_/g, ' ')} variant={statusVariant(ag.status)} />
                    </View>
                    <View style={{ marginTop: 8, gap: 4 }}>
                      <Text style={styles.meta}>Your signature: {ag.farmer_signed_at ? '✅ Signed' : '⏳ Pending'}</Text>
                      <Text style={styles.meta}>Investor signature: {ag.investor_signed_at ? '✅ Signed' : '⏳ Pending'}</Text>
                    </View>
                    {ag.status === 'pending_signature' && !ag.farmer_signed_at && (
                      <View style={{ marginTop: 8 }}>
                        {!ag.contract_document && (
                          <Text style={[styles.meta, { color: Colors.warning, marginBottom: 6 }]}>
                            Contract document not yet generated. You'll be notified when it's ready.
                          </Text>
                        )}
                        {ag.contract_document && (
                          <Button label="Sign Agreement" onPress={() => signAgreement(ag.id)} fullWidth />
                        )}
                      </View>
                    )}
                    {ag.farmer_signed_at && !ag.investor_signed_at && (
                      <Text style={[styles.meta, { marginTop: 8 }]}>⏳ You've signed — waiting for investor to sign.</Text>
                    )}
                  </Card>
                ))
            }
          </>
        )}
      </ScrollView>

      {/* Pay instalment modal */}
      <Modal visible={!!payModal} transparent animationType="slide" onRequestClose={() => setPayModal(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setPayModal(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>{payMode === 'full' ? 'Pay Full Instalment' : 'Pay Custom Amount'}</Text>
            <Text style={styles.meta}>Amount due: GHS {parseFloat(payModal?.amount ?? '0').toLocaleString()}</Text>
            {payMode === 'partial' && (
              <InputField label="Amount (GHS) *" value={customAmount} onChangeText={setCustomAmount} keyboardType="decimal-pad" placeholder="e.g. 200" containerStyle={{ marginTop: 12 }} />
            )}
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Payment Method</Text>
            {PAYMENT_METHODS.map(m => (
              <TouchableOpacity key={m.value} onPress={() => setPayMethod(m.value as any)} style={[styles.pickerItem, payMethod === m.value && styles.pickerItemActive]}>
                <Text style={[styles.pickerText, payMethod === m.value && { color: Colors.leaf }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
            {payMethod === 'momo' && (
              <InputField label="MoMo Number" value={payPhone} onChangeText={setPayPhone} keyboardType="phone-pad" placeholder="024XXXXXXX" containerStyle={{ marginTop: 12 }} />
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Button label="Cancel"  onPress={() => setPayModal(null)} variant="secondary" style={{ flex: 1 }} />
              <Button label={paying ? 'Processing…' : 'Confirm Payment'} onPress={initiatePayment} loading={paying} style={{ flex: 1 }}
                disabled={paying || (payMethod === 'momo' && !payPhone) || (payMode === 'partial' && !customAmount)} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Full balance modal */}
      <Modal visible={!!fullPayModal} transparent animationType="slide" onRequestClose={() => setFullPayModal(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setFullPayModal(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>Pay Full Balance</Text>
            <View style={styles.warnBanner}>
              <Text style={{ fontSize: 13, color: '#7c5800' }}>
                ⚠️ This pays ALL remaining instalments totalling GHS {fullPayModal?.remaining.toLocaleString()}.
              </Text>
            </View>
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Payment Method</Text>
            {PAYMENT_METHODS.map(m => (
              <TouchableOpacity key={m.value} onPress={() => setPayMethod(m.value as any)} style={[styles.pickerItem, payMethod === m.value && styles.pickerItemActive]}>
                <Text style={[styles.pickerText, payMethod === m.value && { color: Colors.leaf }]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
            {payMethod === 'momo' && (
              <InputField label="MoMo Number" value={payPhone} onChangeText={setPayPhone} keyboardType="phone-pad" placeholder="024XXXXXXX" containerStyle={{ marginTop: 12 }} />
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Button label="Cancel" onPress={() => setFullPayModal(null)} variant="secondary" style={{ flex: 1 }} />
              <Button label={paying ? 'Processing…' : 'Confirm Full Payment'} onPress={payFullBalance} loading={paying} style={{ flex: 1 }}
                disabled={paying || (payMethod === 'momo' && !payPhone)} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar:         { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.border, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  tab:            { paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center' },
  tabActive:      { borderBottomWidth: 2, borderBottomColor: Colors.leaf, marginBottom: -2 },
  tabText:        { fontSize: 13, fontWeight: '500', color: Colors.muted },
  tabTextActive:  { color: Colors.leaf, fontWeight: '700' },
  card:           { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  ref:            { fontSize: 14, fontWeight: '700', color: Colors.ink },
  meta:           { fontSize: 12, color: Colors.muted, marginTop: 2 },
  amount:         { fontSize: 18, fontWeight: '700', color: Colors.leaf, marginTop: 4 },
  purpose:        { fontSize: 12, color: Colors.ink, marginTop: 4 },
  actionRow:      { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  stepper:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  stepItem:       { alignItems: 'center', flex: 1 },
  stepDot:        { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stepActive:     { backgroundColor: Colors.leaf },
  stepDone:       { backgroundColor: Colors.success },
  stepNum:        { fontSize: 12, fontWeight: '700', color: Colors.muted },
  stepLabel:      { fontSize: 10, color: Colors.muted, textAlign: 'center' },
  stepTitle:      { fontSize: 16, fontWeight: '700', color: Colors.ink, marginBottom: 12 },
  stepSub:        { fontSize: 13, color: Colors.muted, marginBottom: 12 },
  typeCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, marginBottom: 8 },
  typeCardActive: { borderColor: Colors.leaf, backgroundColor: Colors.sky },
  typeEmoji:      { fontSize: 24 },
  typeLabel:      { fontSize: 14, fontWeight: '700', color: Colors.ink },
  typeDesc:       { fontSize: 12, color: Colors.muted, marginTop: 2 },
  fieldLabel:     { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  pickerItem:     { padding: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, marginBottom: 6, backgroundColor: Colors.white },
  pickerItemActive:{ borderColor: Colors.leaf, backgroundColor: Colors.sky },
  pickerText:     { fontSize: 13, color: Colors.ink },
  reviewRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  reviewKey:      { fontSize: 13, color: Colors.muted },
  reviewVal:      { fontSize: 13, fontWeight: '600', color: Colors.ink },
  statsRow:       { flexDirection: 'row', marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: 4, gap: 6 },
  statBox:        { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statVal:        { fontSize: 20, fontWeight: '700', color: Colors.ink },
  statKey:        { fontSize: 10, color: Colors.muted, marginTop: 2 },
  schedRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 4 },
  schedNum:       { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  schedDate:      { fontSize: 13, fontWeight: '600', color: Colors.ink },
  schedAmt:       { fontSize: 12, color: Colors.muted },
  banner:         { marginHorizontal: Spacing.md, marginTop: Spacing.sm, padding: 12, borderRadius: Radius.sm, backgroundColor: '#FFF8E1', borderLeftWidth: 4 },
  bannerText:     { fontSize: 13 },
  successBox:     { padding: Spacing.lg, alignItems: 'center', marginTop: 32 },
  successIcon:    { fontSize: 48, marginBottom: 12 },
  successTitle:   { fontSize: 20, fontWeight: '700', color: Colors.ink, marginBottom: 8 },
  successBody:    { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  modalBg:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:       { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: Colors.ink, marginBottom: 8 },
  warnBanner:     { backgroundColor: '#FFF8E1', borderRadius: 8, padding: 10 },
});
