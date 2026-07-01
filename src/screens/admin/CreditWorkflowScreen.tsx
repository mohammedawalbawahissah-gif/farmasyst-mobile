import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Modal, TextInput,
} from 'react-native';
import { creditApi, profilesApi, paymentsApi } from '../../api/client';
import { CreditApplication, DisbursementRequest } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, Button, InputField, EmptyState, ErrorBanner, Pill, statusVariant } from '../../components/ui';

const WORKFLOW_TABS = [
  { id: 'submitted',    label: 'New' },
  { id: 'under_review', label: 'In Review' },
  { id: 'approved',     label: 'Approved' },
  { id: 'disbursements',label: 'Disbursements' },
];

export default function CreditWorkflowScreen() {
  const [tab,        setTab]        = useState('submitted');
  const [apps,       setApps]       = useState<CreditApplication[]>([]);
  const [disbs,      setDisbs]      = useState<DisbursementRequest[]>([]);
  const [investors,  setInvestors]  = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  // Reject modal
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectNote,  setRejectNote]  = useState('');
  // Match modal
  const [matchModal,  setMatchModal]  = useState<string | null>(null);
  const [selInv,      setSelInv]      = useState('');
  // Disb action
  const [disbNote,    setDisbNote]    = useState('');
  const [disbModal,   setDisbModal]   = useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [acting,      setActing]      = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError('');
      const isDisb = tab === 'disbursements';
      const [main, inv] = await Promise.all([
        isDisb ? paymentsApi.disbursementRequests() : creditApi.listApplications({ status: tab }),
        profilesApi.listInvestors(),
      ]);
      if (isDisb) setDisbs(main.data.results ?? main.data);
      else        setApps(main.data.results ?? main.data);
      setInvestors(inv.data.results ?? inv.data);
    } catch { setError('Could not load data.'); }
    finally  { setRefreshing(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    setActing(id);
    try { await creditApi.approve(id, {}); load(); }
    catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
    finally { setActing(null); }
  }

  async function confirmReject() {
    if (!rejectModal) return;
    if (!rejectNote.trim()) { Alert.alert('Required', 'Please enter a rejection reason.'); return; }
    setActing(rejectModal);
    try {
      await creditApi.reject(rejectModal, { rejection_reason: rejectNote });
      setRejectModal(null); setRejectNote(''); load();
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
    finally { setActing(null); }
  }

  async function confirmMatch() {
    if (!matchModal || !selInv) { Alert.alert('Select an investor first.'); return; }
    setActing(matchModal);
    try {
      await creditApi.match(matchModal, { investor_id: selInv });
      setMatchModal(null); setSelInv(''); load();
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
    finally { setActing(null); }
  }

  async function handleDisbAction() {
    if (!disbModal) return;
    setActing(disbModal.id);
    try {
      if (disbModal.action === 'approve') {
        await paymentsApi.approveDisbRequest(disbModal.id, { note: disbNote });
        Alert.alert('Approved', 'Disbursement approved and funds will be sent.');
      } else {
        if (!disbNote.trim()) { Alert.alert('Required', 'Please enter a rejection reason.'); setActing(null); return; }
        await paymentsApi.rejectDisbRequest(disbModal.id, { rejection_reason: disbNote });
        Alert.alert('Rejected', 'Disbursement request rejected.');
      }
      setDisbModal(null); setDisbNote(''); load();
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
    finally { setActing(null); }
  }

  return (
    <Screen title="Credit Workflow" subtitle="Review and manage credit applications">
      {error ? <ErrorBanner message={error} /> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
        <View style={styles.tabBar}>
          {WORKFLOW_TABS.map(t => (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, tab === t.id && styles.tabActive]}>
              <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Credit applications */}
        {tab !== 'disbursements' && (
          apps.length === 0
            ? <EmptyState message={`No ${tab.replace('_', ' ')} applications.`} icon="📋" />
            : apps.map(app => (
                <Card key={app.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ref}>{app.reference}</Text>
                      <Text style={styles.farmer}>{app.farmer_name}</Text>
                      <Text style={styles.amount}>GHS {parseFloat(app.amount_requested ?? '0').toLocaleString()}</Text>
                      <Text style={styles.meta}>{app.credit_type} · {app.repayment_period_months} months</Text>
                      {app.credit_score_at_submission && <Text style={styles.meta}>Score: {app.credit_score_at_submission}</Text>}
                      {app.purpose ? <Text style={styles.meta}>{app.purpose}</Text> : null}
                    </View>
                    <Pill label={app.status.replace(/_/g, ' ')} variant={statusVariant(app.status)} />
                  </View>
                  <View style={styles.actions}>
                    {(tab === 'submitted' || tab === 'under_review') && (
                      <>
                        <Button label={acting === app.id ? '…' : 'Approve'} onPress={() => approve(app.id)} loading={acting === app.id} variant="primary"  size="sm" style={{ flex: 1 }} />
                        <Button label="Reject"  onPress={() => { setRejectModal(app.id); setRejectNote(''); }} variant="danger"   size="sm" style={{ flex: 1 }} />
                      </>
                    )}
                    {tab === 'approved' && (
                      <Button label="Match to Investor" onPress={() => { setMatchModal(app.id); setSelInv(''); }} variant="primary" fullWidth size="sm" />
                    )}
                  </View>
                </Card>
              ))
        )}

        {/* Disbursement requests */}
        {tab === 'disbursements' && (
          disbs.length === 0
            ? <EmptyState message="No disbursement requests pending." icon="💸" />
            : disbs.map(d => (
                <Card key={d.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ref}>{d.reference}</Text>
                      <Text style={styles.farmer}>Farmer: {d.farmer_name}</Text>
                      <Text style={styles.farmer}>Requested by: {d.requested_by_name}</Text>
                      <Text style={styles.amount}>GHS {parseFloat(d.amount).toLocaleString()}</Text>
                      <Text style={styles.meta}>Method: {d.method} · Agreement: {d.agreement_reference}</Text>
                      {d.note ? <Text style={styles.meta}>{d.note}</Text> : null}
                    </View>
                    <Pill label={d.status} variant={statusVariant(d.status)} />
                  </View>
                  {d.status === 'pending' && (
                    <View style={styles.actions}>
                      <Button label="Approve" onPress={() => { setDisbModal({ id: d.id, action: 'approve' }); setDisbNote(''); }} variant="primary"  size="sm" style={{ flex: 1 }} />
                      <Button label="Reject"  onPress={() => { setDisbModal({ id: d.id, action: 'reject'  }); setDisbNote(''); }} variant="danger"   size="sm" style={{ flex: 1 }} />
                    </View>
                  )}
                </Card>
              ))
        )}
      </ScrollView>

      {/* Reject modal */}
      <Modal visible={!!rejectModal} transparent animationType="slide" onRequestClose={() => setRejectModal(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setRejectModal(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reject Application</Text>
            <Text style={styles.meta}>Provide a clear reason that will be sent to the farmer:</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Reason for rejection…"
              placeholderTextColor={Colors.muted}
              value={rejectNote}
              onChangeText={setRejectNote}
              multiline
              numberOfLines={4}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Cancel" onPress={() => setRejectModal(null)} variant="secondary" style={{ flex: 1 }} />
              <Button label={acting ? 'Rejecting…' : 'Confirm Reject'} onPress={confirmReject} loading={!!acting} variant="danger" style={{ flex: 1 }} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Match modal */}
      <Modal visible={!!matchModal} transparent animationType="slide" onRequestClose={() => setMatchModal(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setMatchModal(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>Match to Investor</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              {investors.map((inv: any) => {
                const id   = inv.user ? (typeof inv.user === 'string' ? inv.user : inv.user.id) : inv.id;
                const name = inv.user ? `${inv.user.first_name ?? ''} ${inv.user.last_name ?? ''}`.trim() : inv.email;
                return (
                  <TouchableOpacity key={id} onPress={() => setSelInv(id)} style={[styles.pickerRow, selInv === id && styles.pickerRowActive]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.invName, selInv === id && { color: Colors.leaf }]}>{name}</Text>
                      {inv.organisation && <Text style={styles.meta}>{inv.organisation}</Text>}
                    </View>
                    {selInv === id && <Text style={{ color: Colors.leaf, fontSize: 18 }}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Button label="Cancel" onPress={() => setMatchModal(null)} variant="secondary" style={{ flex: 1 }} />
              <Button label={acting ? 'Matching…' : 'Confirm Match'} onPress={confirmMatch} loading={!!acting} disabled={!selInv} style={{ flex: 1 }} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Disbursement action modal */}
      <Modal visible={!!disbModal} transparent animationType="slide" onRequestClose={() => setDisbModal(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setDisbModal(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>{disbModal?.action === 'approve' ? 'Approve Disbursement' : 'Reject Disbursement'}</Text>
            <TextInput
              style={styles.textarea}
              placeholder={disbModal?.action === 'approve' ? 'Optional note for investor…' : 'Rejection reason (required)…'}
              placeholderTextColor={Colors.muted}
              value={disbNote}
              onChangeText={setDisbNote}
              multiline
              numberOfLines={3}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Cancel" onPress={() => setDisbModal(null)} variant="secondary" style={{ flex: 1 }} />
              <Button
                label={acting ? '…' : (disbModal?.action === 'approve' ? 'Approve' : 'Reject')}
                onPress={handleDisbAction}
                loading={!!acting}
                variant={disbModal?.action === 'approve' ? 'primary' : 'danger'}
                style={{ flex: 1 }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar:         { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.border, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  tab:            { paddingVertical: 9, paddingHorizontal: 14, alignItems: 'center' },
  tabActive:      { borderBottomWidth: 2, borderBottomColor: Colors.leaf, marginBottom: -2 },
  tabText:        { fontSize: 13, fontWeight: '500', color: Colors.muted },
  tabTextActive:  { color: Colors.leaf, fontWeight: '700' },
  card:           { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  cardHeader:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  ref:            { fontSize: 14, fontWeight: '700', color: Colors.ink },
  farmer:         { fontSize: 12, color: Colors.muted, marginTop: 2 },
  amount:         { fontSize: 16, fontWeight: '700', color: Colors.leaf, marginTop: 4 },
  meta:           { fontSize: 12, color: Colors.muted, marginTop: 2 },
  actions:        { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  modalBg:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:       { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: Colors.ink, marginBottom: 10 },
  textarea:       { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: 12, fontSize: 14, color: Colors.ink, minHeight: 90, textAlignVertical: 'top', marginBottom: 12 },
  pickerRow:      { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, marginBottom: 6 },
  pickerRowActive:{ borderColor: Colors.leaf, backgroundColor: Colors.sky },
  invName:        { fontSize: 14, fontWeight: '600', color: Colors.ink },
});
