import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { paymentsApi, creditApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Badge, Button, SectionTitle, AlertBanner, FormLabel, EmptyState } from '../../components/ui';
import type { RepaymentSchedule, CreditAgreement } from '../../types';

const SCHEDULE_BADGE: Record<string, any> = {
  upcoming:'neutral', due:'warning', pending:'warning', paid:'success', overdue:'danger', waived:'info',
};
const PAYMENT_METHODS = [
  { value:'mtn_momo',    label:'📱 MTN Mobile Money' },
  { value:'telecel_momo',label:'📲 Telecel MoMo' },
  { value:'bank_transfer',label:'🏦 Bank Transfer' },
  { value:'cash',        label:'💵 Cash' },
];

export default function RepaymentsScreen() {
  const [schedules,  setSchedules]  = useState<RepaymentSchedule[]>([]);
  const [agreements, setAgreements] = useState<CreditAgreement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Payment modal
  const [selAgreement, setSelAgreement] = useState('');
  const [payMethod,    setPayMethod]    = useState('mtn_momo');
  const [momoPhone,    setMomoPhone]    = useState('');
  const [paying,       setPaying]       = useState(false);
  const [payError,     setPayError]     = useState('');
  const [paySuccess,   setPaySuccess]   = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payFull,      setPayFull]      = useState(false);

  const load = async () => {
    const [sc, ag] = await Promise.allSettled([paymentsApi.schedules(), creditApi.listAgreements()]);
    if (sc.status === 'fulfilled') setSchedules(toArray(sc.value.data));
    if (ag.status === 'fulfilled') setAgreements(toArray(ag.value.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const dueNow    = schedules.filter(s => s.status === 'due' || s.status === 'overdue' || s.status === 'pending');
  const overdue   = schedules.filter(s => s.status === 'overdue');
  const totalOwed = dueNow.reduce((acc, s) => acc + parseFloat(s.amount_due || '0') - parseFloat(s.amount_paid || '0'), 0);

  const handlePay = async () => {
    if (!selAgreement) return;
    setPaying(true); setPayError('');
    try {
      const payload: any = { agreement: selAgreement, payment_method: payMethod };
      if (momoPhone) payload.phone = momoPhone;
      if (payFull) await paymentsApi.payFullBalance(payload);
      else         await paymentsApi.initiateRepayment(payload);
      setPaySuccess('Payment initiated! Check your phone to approve the MoMo prompt, or confirm at your bank.');
      setShowPayModal(false); await load();
    } catch (e: any) {
      setPayError(e?.response?.data?.detail || 'Payment failed. Please try again.');
    } finally { setPaying(false); }
  };

  const openPayModal = (agrId: string, full: boolean) => {
    setSelAgreement(agrId); setPayFull(full); setPayMethod('mtn_momo');
    setMomoPhone(''); setPayError(''); setPaySuccess(''); setShowPayModal(true);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader title="Repayments" subtitle="Track and make your loan repayments." />

      {paySuccess ? <AlertBanner variant="success">{paySuccess}</AlertBanner> : null}

      {overdue.length > 0 && (
        <AlertBanner variant="danger">
          ⚠️ You have {overdue.length} overdue payment{overdue.length > 1 ? 's' : ''}. Please pay immediately to protect your credit score.
        </AlertBanner>
      )}

      {/* Summary cards */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
        <View style={[s.summaryCard, { borderColor: Colors.danger }]}>
          <Text style={s.summaryNum}>GHS {totalOwed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
          <Text style={s.summaryLabel}>Total Owed Now</Text>
        </View>
        <View style={[s.summaryCard, { borderColor: Colors.warning }]}>
          <Text style={s.summaryNum}>{dueNow.length}</Text>
          <Text style={s.summaryLabel}>Instalment{dueNow.length !== 1 ? 's' : ''} Due</Text>
        </View>
        <View style={[s.summaryCard, { borderColor: Colors.danger }]}>
          <Text style={s.summaryNum}>{overdue.length}</Text>
          <Text style={s.summaryLabel}>Overdue</Text>
        </View>
      </View>

      {/* Active Agreements */}
      <SectionTitle>Active Agreements</SectionTitle>
      {agreements.filter(a => a.status === 'active').length === 0
        ? <Card><EmptyState icon="📄" text="No active agreements. Approved credit will appear here." /></Card>
        : agreements.filter(a => a.status === 'active').map(ag => (
          <Card key={ag.id} style={{ marginBottom: Spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{ag.reference}</Text>
              <Badge variant="success">Active</Badge>
            </View>
            <View style={s.infoRow}><Text style={s.infoLabel}>Credit Type</Text><Text style={s.infoVal}>{ag.credit_type.replace(/_/g,' ')}</Text></View>
            <View style={s.infoRow}><Text style={s.infoLabel}>Amount</Text><Text style={s.infoVal}>GHS {parseFloat(ag.amount).toLocaleString()}</Text></View>
            <View style={s.infoRow}><Text style={s.infoLabel}>Interest Rate</Text><Text style={s.infoVal}>{ag.interest_rate}%</Text></View>
            <View style={s.infoRow}><Text style={s.infoLabel}>Repayment Period</Text><Text style={s.infoVal}>{ag.repayment_period_months} months</Text></View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <Button size="sm" onPress={() => openPayModal(ag.id, false)}>Pay Instalment</Button>
              <Button size="sm" variant="secondary" onPress={() => openPayModal(ag.id, true)}>Pay Full Balance</Button>
            </View>
          </Card>
        ))
      }

      {/* Payment Modal */}
      {showPayModal && (
        <View style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setShowPayModal(false)} />
          <View style={s.modal}>
            <Text style={s.modalTitle}>{payFull ? 'Pay Full Balance' : 'Pay Instalment'}</Text>
            <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: Spacing.md }}>
              Payments are processed via your selected method. For MoMo, you will receive a prompt on your phone.
            </Text>
            {payError ? <Text style={s.error}>{payError}</Text> : null}

            <FormLabel required>Payment Method</FormLabel>
            {PAYMENT_METHODS.map(m => (
              <TouchableOpacity key={m.value} style={[s.methodOption, payMethod === m.value && s.methodActive]} onPress={() => setPayMethod(m.value)}>
                <Text style={{ fontSize: 13, fontWeight: payMethod === m.value ? '700' : '400', color: payMethod === m.value ? Colors.primary : Colors.ink }}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}

            {(payMethod === 'mtn_momo' || payMethod === 'telecel_momo') && (
              <>
                <FormLabel>MoMo Phone Number</FormLabel>
                <View style={{ backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, marginBottom: Spacing.sm }}>
                  <Text style={{ fontSize: 14, color: Colors.muted }}>Auto-filled from your registered phone</Text>
                </View>
              </>
            )}

            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
              <Button onPress={handlePay} disabled={paying} loading={paying} style={{ flex: 1 }}>
                {payFull ? 'Pay Full Balance' : 'Initiate Repayment'}
              </Button>
              <Button variant="secondary" onPress={() => setShowPayModal(false)}>Cancel</Button>
            </View>
          </View>
        </View>
      )}

      {/* Schedule breakdown */}
      <SectionTitle>Full Repayment Schedule</SectionTitle>
      {schedules.length === 0
        ? <Card><EmptyState icon="📅" text="No repayment schedule yet." /></Card>
        : (
          <Card>
            {schedules.map(sc => (
              <View key={sc.id} style={s.scheduleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: Colors.muted }}>Instalment {sc.installment_number}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600' }}>{new Date(sc.due_date).toLocaleDateString('en-GH', { day:'numeric', month:'short', year:'numeric' })}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700' }}>GHS {parseFloat(sc.amount_due).toLocaleString()}</Text>
                  {parseFloat(sc.amount_paid) > 0 && (
                    <Text style={{ fontSize: 11, color: Colors.success }}>Paid: GHS {parseFloat(sc.amount_paid).toLocaleString()}</Text>
                  )}
                  <Badge variant={SCHEDULE_BADGE[sc.status] ?? 'neutral'}>{sc.status}</Badge>
                </View>
              </View>
            ))}
          </Card>
        )
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  summaryCard:  { flex: 1, borderLeftWidth: 3, backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  summaryNum:   { fontSize: 16, fontWeight: '800', color: Colors.ink },
  summaryLabel: { fontSize: 10, color: Colors.muted, marginTop: 2 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel:    { fontSize: 12, color: Colors.muted },
  infoVal:      { fontSize: 12, fontWeight: '600', color: Colors.ink },
  scheduleRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modal:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, maxHeight: '80%' },
  modalTitle:   { fontSize: 18, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.sm },
  methodOption: { padding: Spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: Colors.border },
  methodActive: { backgroundColor: '#F0F7EB' },
  error:        { fontSize: 13, color: Colors.danger, marginBottom: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.dangerBg, borderRadius: Radius.sm },
});
