import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { creditApi } from '../../api/client';
import { Card, Pill, statusVariant, SectionTitle, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';

function getArr(d: any): any[] { if (!d) return []; if (Array.isArray(d)) return d; return d.results ?? []; }

const CREDIT_TYPES = [
  { value: 'direct_financing',    label: 'Direct Financing' },
  { value: 'farm_inputs',         label: 'Farm Inputs' },
  { value: 'structured_training', label: 'Structured Training' },
  { value: 'mixed',               label: 'Mixed' },
];

export default function AdminProjectApplicationsScreen() {
  const [projects,   setProjects]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting,     setActing]     = useState<string|null>(null);
  const [detail,     setDetail]     = useState<any|null>(null);
  const [reviewId,   setReviewId]   = useState<string|null>(null);
  const [reviewAction, setReviewAction] = useState<'approve'|'reject'|null>(null);
  const [notes,      setNotes]      = useState('');
  const [rejReason,  setRejReason]  = useState('');
  const [msg,        setMsg]        = useState({ text: '', err: false });

  // New project form
  const [showForm,      setShowForm]      = useState(false);
  const [projName,      setProjName]      = useState('');
  const [organisation,  setOrganisation]  = useState('');
  const [creditType,    setCreditType]    = useState('direct_financing');
  const [amount,        setAmount]        = useState('');
  const [months,        setMonths]        = useState('');
  const [purpose,       setPurpose]       = useState('');
  const [saving,        setSaving]        = useState(false);

  const flash = (text: string, err = false) => { setMsg({ text, err }); setTimeout(() => setMsg({ text: '', err: false }), 4000); };

  const load = useCallback(async () => {
    try {
      const r = await creditApi.listProjects();
      setProjects(getArr(r.data));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const handleCreate = async () => {
    if (!projName.trim() || !organisation.trim() || !purpose.trim()) {
      Alert.alert('Missing fields', 'Project name, organisation, and purpose are required.'); return;
    }
    setSaving(true);
    try {
      await creditApi.createProject({
        project_name: projName,
        organisation,
        credit_type: creditType,
        total_amount_requested: amount ? parseFloat(amount) : null,
        repayment_period_months: months ? parseInt(months) : null,
        purpose,
      });
      flash('Project application created.');
      setShowForm(false); setProjName(''); setOrganisation(''); setAmount(''); setMonths(''); setPurpose('');
      load();
    } catch (e: any) { flash(e?.response?.data?.detail || 'Failed to create project.', true); }
    finally { setSaving(false); }
  };

  const submitProject = async (id: string) => {
    setActing(id);
    try { await creditApi.submitProject(id); flash('Project submitted for review.'); load(); }
    catch { flash('Submission failed.', true); }
    finally { setActing(null); }
  };

  const handleReview = async () => {
    if (!reviewId || !reviewAction) return;
    setActing(reviewId);
    try {
      if (reviewAction === 'approve') {
        await creditApi.updateProject(reviewId, { status: 'approved', reviewer_notes: notes });
        flash('Project approved.');
      } else {
        if (!rejReason.trim()) { Alert.alert('Required', 'Rejection reason is required.'); setActing(null); return; }
        await creditApi.updateProject(reviewId, { status: 'rejected', rejection_reason: rejReason });
        flash('Project rejected.');
      }
      setReviewId(null); setReviewAction(null); setNotes(''); setRejReason('');
      load();
    } catch { flash('Review action failed.', true); }
    finally { setActing(null); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;

  const pending   = projects.filter(p => p.status === 'draft' || p.status === 'submitted');
  const reviewed  = projects.filter(p => p.status === 'approved' || p.status === 'rejected');

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm }}>
        <View>
          <Text style={s.title}>Project Applications</Text>
          <Text style={s.sub}>Investor-initiated project credit applications.</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowForm(!showForm)}>
          <Text style={s.addBtnText}>{showForm ? '✕ Close' : '＋ New'}</Text>
        </TouchableOpacity>
      </View>

      {msg.text ? (
        <View style={[s.msgBox, { backgroundColor: msg.err ? '#FFEBEE' : '#E8F5E9', borderColor: msg.err ? Colors.danger : Colors.success }]}>
          <Text style={{ color: msg.err ? Colors.danger : Colors.success, fontSize: 13 }}>{msg.text}</Text>
        </View>
      ) : null}

      {/* New project form */}
      {showForm && (
        <Card style={{ borderColor: Colors.leaf, borderWidth: 1.5, marginBottom: Spacing.md }}>
          <Text style={{ fontSize: 15, fontWeight: '700', marginBottom: Spacing.sm }}>New Project Application</Text>
          {[
            { label: 'Project Name *', value: projName, setter: setProjName, placeholder: 'e.g. Northern Ghana Broiler Programme' },
            { label: 'Organisation *',  value: organisation, setter: setOrganisation, placeholder: 'Investor or NGO name' },
          ].map(f => (
            <View key={f.label}>
              <Text style={s.fLabel}>{f.label}</Text>
              <TextInput style={s.fInput} placeholder={f.placeholder} placeholderTextColor={Colors.muted}
                value={f.value} onChangeText={f.setter} />
            </View>
          ))}
          <Text style={s.fLabel}>Credit Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
            {CREDIT_TYPES.map(ct => (
              <TouchableOpacity key={ct.value} style={[s.typeBtn, creditType === ct.value && s.typeBtnActive]}
                onPress={() => setCreditType(ct.value)}>
                <Text style={[{ fontSize: 12, fontWeight: '600' }, creditType === ct.value && { color: Colors.white }]}>
                  {ct.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fLabel}>Amount (GHS)</Text>
              <TextInput style={s.fInput} keyboardType="decimal-pad" placeholder="Optional"
                placeholderTextColor={Colors.muted} value={amount} onChangeText={setAmount} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fLabel}>Repayment (months)</Text>
              <TextInput style={s.fInput} keyboardType="number-pad" placeholder="Optional"
                placeholderTextColor={Colors.muted} value={months} onChangeText={setMonths} />
            </View>
          </View>
          <Text style={s.fLabel}>Purpose *</Text>
          <TextInput style={[s.fInput, { height: 80, textAlignVertical: 'top', marginBottom: Spacing.sm }]}
            placeholder="Describe the project objectives…" placeholderTextColor={Colors.muted}
            multiline value={purpose} onChangeText={setPurpose} />
          <TouchableOpacity style={[s.btn, saving && s.btnDisabled]} disabled={saving} onPress={handleCreate}>
            {saving ? <ActivityIndicator size="small" color={Colors.white} />
              : <Text style={s.btnText}>Create Project</Text>}
          </TouchableOpacity>
        </Card>
      )}

      {/* Review panel */}
      {reviewId && (
        <Card style={{ borderColor: Colors.earth, borderWidth: 1.5, marginBottom: Spacing.md }}>
          <Text style={{ fontSize: 15, fontWeight: '700', marginBottom: Spacing.sm }}>Review Application</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.sm }}>
            {(['approve','reject'] as const).map(a => (
              <TouchableOpacity key={a} style={[s.reviewBtn, reviewAction === a && {
                backgroundColor: a === 'approve' ? Colors.success : Colors.danger,
                borderColor: a === 'approve' ? Colors.success : Colors.danger,
              }]} onPress={() => setReviewAction(a)}>
                <Text style={[{ fontSize: 13, fontWeight: '700' }, reviewAction === a && { color: Colors.white }]}>
                  {a === 'approve' ? '✓ Approve' : '✗ Reject'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {reviewAction === 'approve' && (
            <>
              <Text style={s.fLabel}>Reviewer Notes</Text>
              <TextInput style={[s.fInput, { height: 60, textAlignVertical: 'top', marginBottom: Spacing.sm }]}
                placeholder="Optional notes…" placeholderTextColor={Colors.muted} multiline
                value={notes} onChangeText={setNotes} />
            </>
          )}
          {reviewAction === 'reject' && (
            <>
              <Text style={s.fLabel}>Rejection Reason *</Text>
              <TextInput style={[s.fInput, { height: 60, textAlignVertical: 'top', marginBottom: Spacing.sm }]}
                placeholder="Explain the rejection…" placeholderTextColor={Colors.muted} multiline
                value={rejReason} onChangeText={setRejReason} />
            </>
          )}
          {reviewAction && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity style={[s.btn, { flex: 1 }, acting === reviewId && s.btnDisabled]}
                disabled={acting === reviewId} onPress={handleReview}>
                <Text style={s.btnText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.btn, s.btnSec, { flex: 1 }]}
                onPress={() => { setReviewId(null); setReviewAction(null); }}>
                <Text style={s.btnSecText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </Card>
      )}

      <SectionTitle>Pending Review ({pending.length})</SectionTitle>
      {pending.length === 0
        ? <Card><Text style={{ padding: Spacing.sm, color: Colors.muted }}>No pending project applications.</Text></Card>
        : pending.map(p => (
          <TouchableOpacity key={p.id} onPress={() => setDetail(p)} activeOpacity={0.8}>
            <Card style={{ borderLeftWidth: 3, borderLeftColor: Colors.warning }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontFamily: 'monospace', color: Colors.muted }}>{p.reference}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', marginTop: 2 }}>{p.project_name}</Text>
                  <Text style={{ fontSize: 13, color: Colors.muted }}>{p.organisation}</Text>
                  <Text style={{ fontSize: 12, color: Colors.muted }}>
                    {CREDIT_TYPES.find(ct => ct.value === p.credit_type)?.label ?? p.credit_type}
                    {p.total_amount_requested ? ` · GHS ${parseFloat(p.total_amount_requested).toLocaleString()}` : ''}
                  </Text>
                  <Pill label={p.status} variant={statusVariant(p.status)} />
                </View>
                {p.status === 'submitted' && (
                  <View style={{ gap: 6, marginLeft: 8 }}>
                    <TouchableOpacity style={s.btn} onPress={() => { setReviewId(p.id); setReviewAction(null); }}>
                      <Text style={s.btnText}>Review</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {p.status === 'draft' && (
                  <TouchableOpacity style={[s.btn, { marginLeft: 8 }, acting === p.id && s.btnDisabled]}
                    disabled={acting === p.id} onPress={() => submitProject(p.id)}>
                    <Text style={s.btnText}>Submit</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        ))
      }

      <SectionTitle>Reviewed ({reviewed.length})</SectionTitle>
      {reviewed.length === 0
        ? <Card><Text style={{ padding: Spacing.sm, color: Colors.muted }}>No reviewed applications yet.</Text></Card>
        : reviewed.map(p => (
          <Card key={p.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={{ fontWeight: '700', fontSize: 14 }}>{p.project_name}</Text>
              <Pill label={p.status} variant={statusVariant(p.status)} />
            </View>
            <Text style={{ fontSize: 13, color: Colors.muted }}>{p.organisation}</Text>
            {p.total_amount_requested
              ? <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.earth }}>
                  GHS {parseFloat(p.total_amount_requested).toLocaleString()}
                </Text>
              : null}
            {p.rejection_reason
              ? <Text style={{ fontSize: 12, color: Colors.danger, marginTop: 4 }}>{p.rejection_reason}</Text>
              : null}
            <Text style={{ fontSize: 11, color: Colors.muted }}>{new Date(p.created_at).toLocaleDateString('en-GH')}</Text>
          </Card>
        ))
      }

      {/* Detail modal */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} onPress={() => setDetail(null)} activeOpacity={1} />
          <View style={s.modalPanel}>
            {detail && (
              <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', flex: 1 }}>{detail.project_name}</Text>
                  <TouchableOpacity onPress={() => setDetail(null)}>
                    <Text style={{ fontSize: 18, color: Colors.muted, fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                </View>
                {[
                  ['Reference',    detail.reference],
                  ['Organisation', detail.organisation],
                  ['Credit Type',  CREDIT_TYPES.find(ct => ct.value === detail.credit_type)?.label ?? detail.credit_type],
                  ['Amount',       detail.total_amount_requested ? `GHS ${parseFloat(detail.total_amount_requested).toLocaleString()}` : '—'],
                  ['Repayment',    detail.repayment_period_months ? `${detail.repayment_period_months} months` : '—'],
                  ['Status',       detail.status],
                  ['Submitted',    detail.submitted_at ? new Date(detail.submitted_at).toLocaleDateString('en-GH') : '—'],
                ].map(([k, v]) => (
                  <View key={k} style={s.detailRow}>
                    <Text style={s.detailKey}>{k}</Text>
                    <Text style={s.detailVal}>{v}</Text>
                  </View>
                ))}
                <Text style={s.fLabel}>Purpose</Text>
                <Text style={{ fontSize: 13, color: Colors.ink, lineHeight: 20, marginBottom: Spacing.md }}>{detail.purpose}</Text>
                {detail.reviewer_notes ? (
                  <>
                    <Text style={s.fLabel}>Reviewer Notes</Text>
                    <Text style={{ fontSize: 13, color: Colors.ink }}>{detail.reviewer_notes}</Text>
                  </>
                ) : null}
                {detail.rejection_reason ? (
                  <>
                    <Text style={s.fLabel}>Rejection Reason</Text>
                    <Text style={{ fontSize: 13, color: Colors.danger }}>{detail.rejection_reason}</Text>
                  </>
                ) : null}
                <TouchableOpacity style={[s.btn, s.btnSec, { marginTop: Spacing.md }]} onPress={() => setDetail(null)}>
                  <Text style={s.btnSecText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title:         { fontSize: 22, fontWeight: '700', color: Colors.ink, marginBottom: 2 },
  sub:           { fontSize: 13, color: Colors.muted },
  addBtn:        { backgroundColor: Colors.leaf, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.md },
  addBtnText:    { color: Colors.white, fontWeight: '700', fontSize: 13 },
  msgBox:        { borderWidth: 1, borderRadius: Radius.sm, padding: 10, marginBottom: Spacing.sm },
  fLabel:        { fontSize: 11, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 4 },
  fInput:        { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  btn:           { backgroundColor: Colors.leaf, borderRadius: Radius.md, paddingVertical: 11, alignItems: 'center' },
  btnDisabled:   { opacity: 0.5 },
  btnText:       { color: Colors.white, fontWeight: '700', fontSize: 13 },
  btnSec:        { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  btnSecText:    { color: Colors.ink, fontWeight: '600', fontSize: 13 },
  typeBtn:       { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 7, marginRight: 6, backgroundColor: Colors.white },
  typeBtnActive: { backgroundColor: Colors.leaf, borderColor: Colors.leaf },
  reviewBtn:     { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: 10, alignItems: 'center', backgroundColor: Colors.white },
  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalPanel:    { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  detailRow:     { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 8 },
  detailKey:     { fontSize: 13, color: Colors.muted, width: 120 },
  detailVal:     { fontSize: 13, color: Colors.ink, flex: 1, fontWeight: '500' },
});
