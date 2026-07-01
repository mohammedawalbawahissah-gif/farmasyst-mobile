import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { paymentsApi } from '../../api/client';
import { Card, Pill, statusVariant, SectionTitle, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';

function getArr(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.results ?? [];
}

const METHOD_LABELS: Record<string, string> = {
  momo: 'MTN MoMo', paystack: 'Paystack', cash: 'Cash', in_kind: 'In-Kind',
};
const METHODS = ['momo','paystack','cash','in_kind'] as const;

export default function AdminDisbursementsScreen() {
  const [requests,   setRequests]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId,   setActionId]   = useState<string|null>(null);
  const [actionType, setActionType] = useState<'approve'|'reject'|null>(null);
  const [selMethod,  setSelMethod]  = useState<typeof METHODS[number]>('momo');
  const [adminNote,  setAdminNote]  = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [acting,     setActing]     = useState(false);
  const [msg,        setMsg]        = useState('');
  const [msgErr,     setMsgErr]     = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await paymentsApi.disbursementRequests();
      setRequests(getArr(r.data));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const pending  = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved');
  const rejected = requests.filter(r => r.status === 'rejected');
  const totalPendingGHS = pending.reduce((s, r) => s + parseFloat(r.amount || '0'), 0);

  const openApprove = (id: string, method: string) => {
    setActionId(id); setActionType('approve');
    setSelMethod((method as typeof METHODS[number]) || 'momo');
    setAdminNote(''); setMsg('');
  };
  const openReject = (id: string) => {
    setActionId(id); setActionType('reject'); setRejectReason(''); setMsg('');
  };
  const closeAction = () => { setActionId(null); setActionType(null); };

  const handleApprove = async () => {
    if (!actionId) return;
    setActing(true);
    try {
      await paymentsApi.approveDisbRequest(actionId, { method: selMethod, notes: adminNote });
      setMsg('Disbursement approved. Repayment schedule has been generated.');
      setMsgErr(false); closeAction(); load();
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || 'Approval failed.');
      setMsgErr(true);
    } finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!actionId || !rejectReason.trim()) {
      Alert.alert('Required', 'Please provide a rejection reason.'); return;
    }
    setActing(true);
    try {
      await paymentsApi.rejectDisbRequest(actionId, { rejection_reason: rejectReason });
      setMsg('Request rejected. Investor notified.'); setMsgErr(false); closeAction(); load();
    } catch (e: any) {
      setMsg(e?.response?.data?.detail || 'Rejection failed.'); setMsgErr(true);
    } finally { setActing(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;

  const req = requests.find(r => r.id === actionId);

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={s.title}>Disbursements</Text>
      <Text style={s.sub}>Review and process investor-initiated disbursement requests.</Text>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label:'Pending', value: pending.length,  sub:`GHS ${totalPendingGHS.toLocaleString()}`, color: Colors.warning },
          { label:'Approved',value: approved.length, sub:'Funds disbursed',   color: Colors.success },
          { label:'Rejected',value: rejected.length, sub:'Requests declined', color: Colors.danger },
          { label:'Total',   value: requests.length, sub:'All time',          color: Colors.leaf },
        ].map(st => (
          <View key={st.label} style={s.statCard}>
            <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
            <Text style={s.statSub}>{st.sub}</Text>
          </View>
        ))}
      </View>

      {msg ? (
        <View style={[s.msgBox, { backgroundColor: msgErr ? '#FFEBEE' : '#E8F5E9', borderColor: msgErr ? Colors.danger : Colors.success }]}>
          <Text style={{ color: msgErr ? Colors.danger : Colors.success, fontSize: 13 }}>{msg}</Text>
        </View>
      ) : null}

      {/* Action panel */}
      {actionId && actionType === 'approve' && req && (
        <Card style={{ borderLeftWidth: 3, borderLeftColor: Colors.success, marginBottom: Spacing.md }}>
          <SectionTitle>Approve — {req.reference}</SectionTitle>
          <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: Spacing.sm }}>
            Farmer: {req.farmer_name} · Amount: GHS {parseFloat(req.amount||'0').toLocaleString()}
          </Text>
          <Text style={s.fLabel}>Disbursement Method</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm }}>
            {METHODS.map(m => (
              <TouchableOpacity key={m} style={[s.methodBtn, selMethod === m && s.methodBtnActive]}
                onPress={() => setSelMethod(m)}>
                <Text style={[{ fontSize: 12, fontWeight: '600' }, selMethod === m && { color: Colors.white }]}>
                  {METHOD_LABELS[m]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.fLabel}>Admin Note (optional)</Text>
          <TextInput style={[s.input, { height: 60, textAlignVertical: 'top', marginBottom: Spacing.sm }]}
            placeholder="Internal notes…" placeholderTextColor={Colors.muted} multiline
            value={adminNote} onChangeText={setAdminNote} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[s.btn, { flex: 1 }, acting && s.btnDisabled]} disabled={acting} onPress={handleApprove}>
              {acting ? <ActivityIndicator size="small" color={Colors.white} />
                : <Text style={s.btnText}>✓ Approve & Disburse</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnSec, { flex: 1 }]} onPress={closeAction}>
              <Text style={s.btnSecText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 6 }}>
            ⚠️ This will trigger the payout and auto-generate the farmer's repayment schedule.
          </Text>
        </Card>
      )}

      {actionId && actionType === 'reject' && req && (
        <Card style={{ borderLeftWidth: 3, borderLeftColor: Colors.danger, marginBottom: Spacing.md }}>
          <SectionTitle>Reject — {req.reference}</SectionTitle>
          <Text style={s.fLabel}>Rejection Reason *</Text>
          <TextInput style={[s.input, { height: 80, textAlignVertical: 'top', marginBottom: Spacing.sm }]}
            placeholder="Explain why this request is being rejected…" placeholderTextColor={Colors.muted} multiline
            value={rejectReason} onChangeText={setRejectReason} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: Colors.danger }, acting && s.btnDisabled]}
              disabled={acting} onPress={handleReject}>
              {acting ? <ActivityIndicator size="small" color={Colors.white} />
                : <Text style={s.btnText}>✗ Reject Request</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnSec, { flex: 1 }]} onPress={closeAction}>
              <Text style={s.btnSecText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <>
          <SectionTitle>Pending Review ({pending.length})</SectionTitle>
          {pending.map(r => (
            <Card key={r.id} style={{ borderLeftWidth: 3, borderLeftColor: Colors.warning }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', marginBottom: 3 }}>{r.reference}</Text>
                  <Text style={{ fontSize: 13 }}>Farmer: <Text style={{ fontWeight: '600' }}>{r.farmer_name}</Text></Text>
                  <Text style={{ fontSize: 13 }}>Investor: <Text style={{ fontWeight: '600' }}>{r.requested_by_name}</Text></Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.earth, marginTop: 4 }}>
                    GHS {parseFloat(r.amount||'0').toLocaleString()} · {METHOD_LABELS[r.method] || r.method}
                  </Text>
                  {r.note ? <Text style={{ fontSize: 12, color: Colors.muted, fontStyle: 'italic' }}>"{r.note}"</Text> : null}
                  <Text style={{ fontSize: 11, color: Colors.muted }}>{new Date(r.created_at).toLocaleDateString('en-GH')}</Text>
                </View>
                <View style={{ gap: 6, marginLeft: 8 }}>
                  <TouchableOpacity style={[s.btn, { paddingHorizontal: 12, paddingVertical: 7 }]} onPress={() => openApprove(r.id, r.method)}>
                    <Text style={[s.btnText, { fontSize: 12 }]}>✓ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btn, { backgroundColor: Colors.danger, paddingHorizontal: 12, paddingVertical: 7 }]} onPress={() => openReject(r.id)}>
                    <Text style={[s.btnText, { fontSize: 12 }]}>✗ Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* All requests */}
      <SectionTitle>All Requests ({requests.length})</SectionTitle>
      {requests.length === 0
        ? <EmptyState icon="💸" message="No disbursement requests yet." />
        : requests.map(r => (
          <Card key={r.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontWeight: '700', fontSize: 13 }}>{r.reference}</Text>
              <Pill label={r.status} variant={statusVariant(r.status)} />
            </View>
            <Text style={{ fontSize: 13 }}>{r.farmer_name} · {r.requested_by_name}</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.earth }}>
              GHS {parseFloat(r.amount||'0').toLocaleString()} · {METHOD_LABELS[r.method] || r.method}
            </Text>
            {r.status === 'rejected' && r.rejection_reason
              ? <Text style={{ fontSize: 12, color: Colors.danger, marginTop: 4 }}>{r.rejection_reason}</Text>
              : null}
            <Text style={{ fontSize: 11, color: Colors.muted }}>{new Date(r.created_at).toLocaleDateString('en-GH')}</Text>
          </Card>
        ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title:         { fontSize: 22, fontWeight: '700', color: Colors.ink, marginBottom: 2 },
  sub:           { fontSize: 13, color: Colors.muted, marginBottom: Spacing.md },
  statsRow:      { flexDirection: 'row', gap: 8, marginBottom: Spacing.md, flexWrap: 'wrap' },
  statCard:      { flex: 1, minWidth: 70, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  statVal:       { fontSize: 20, fontWeight: '800' },
  statLabel:     { fontSize: 11, fontWeight: '600', color: Colors.ink, marginTop: 1 },
  statSub:       { fontSize: 9, color: Colors.muted, textAlign: 'center' },
  msgBox:        { borderWidth: 1, borderRadius: Radius.sm, padding: 10, marginBottom: Spacing.sm },
  fLabel:        { fontSize: 11, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 4 },
  input:         { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink },
  methodBtn:     { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: Colors.white },
  methodBtnActive:{ backgroundColor: Colors.leaf, borderColor: Colors.leaf },
  btn:           { backgroundColor: Colors.leaf, borderRadius: Radius.md, paddingVertical: 11, alignItems: 'center' },
  btnDisabled:   { opacity: 0.5 },
  btnText:       { color: Colors.white, fontWeight: '700', fontSize: 14 },
  btnSec:        { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  btnSecText:    { color: Colors.ink, fontWeight: '600', fontSize: 14 },
});
