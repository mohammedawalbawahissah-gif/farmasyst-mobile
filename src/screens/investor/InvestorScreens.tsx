import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { creditApi, paymentsApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Badge, Button, SectionTitle, EmptyState, AlertBanner, StatCard } from '../../components/ui';
import type { CreditApplication, CreditAgreement, Disbursement, ProjectApplication } from '../../types';

const APP_STATUS_BADGE: Record<string, any> = {
  draft:'neutral', submitted:'info', under_review:'warning', scored:'warning',
  matched:'info', approved:'success', disbursed:'success', rejected:'danger', withdrawn:'neutral',
};
const AGREEMENT_STATUS_BADGE: Record<string, any> = {
  pending_signature:'warning', active:'success', completed:'success', defaulted:'danger', cancelled:'neutral',
};

// ── Investor Dashboard ──────────────────────────────────────────────────────
export function InvestorDashboard() {
  const [apps,       setApps]       = useState<CreditApplication[]>([]);
  const [agreements, setAgreements] = useState<CreditAgreement[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [a, ag, d] = await Promise.allSettled([
      creditApi.listApps(), creditApi.listAgreements(), paymentsApi.disbursements(),
    ]);
    if (a.status  === 'fulfilled') setApps(toArray(a.value.data));
    if (ag.status === 'fulfilled') setAgreements(toArray(ag.value.data));
    if (d.status  === 'fulfilled') setDisbursements(toArray(d.value.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const matched     = apps.filter(a => a.status === 'matched');
  const toSign      = agreements.filter(a => a.status === 'pending_signature' && !a.investor_signed_at);
  const active      = agreements.filter(a => a.status === 'active');
  const totalInvested = agreements.filter(a => ['active','completed'].includes(a.status)).reduce((s, a) => s + parseFloat(a.amount||'0'), 0);
  const totalDisbursed = disbursements.reduce((s, d) => s + parseFloat(d.amount||'0'), 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <PageHeader title="Investor Dashboard" subtitle="Manage your portfolio and funding decisions." />

      {matched.length > 0 && (
        <AlertBanner variant="info">📬 {matched.length} farmer application{matched.length > 1 ? 's' : ''} matched and awaiting your decision.</AlertBanner>
      )}
      {toSign.length > 0 && (
        <AlertBanner variant="warning">📄 {toSign.length} agreement{toSign.length > 1 ? 's' : ''} awaiting your signature.</AlertBanner>
      )}

      <StatCard label="Total Invested" value={`GHS ${totalInvested.toLocaleString()}`} sub={`${active.length} active agreements`} accent={Colors.leaf} />
      <StatCard label="Total Disbursed" value={`GHS ${totalDisbursed.toLocaleString()}`} sub={`${disbursements.length} disbursements`} accent={Colors.harvest} />
      <StatCard label="Matched Applications" value={matched.length} sub="Awaiting your decision" accent={Colors.info} />
      <StatCard label="Agreements to Sign" value={toSign.length} sub="Need your signature" accent={Colors.warning} />

      <SectionTitle>Recent Applications</SectionTitle>
      <Card>
        {apps.slice(0,6).length === 0
          ? <Text style={{ color: Colors.muted }}>No applications yet.</Text>
          : apps.slice(0,6).map(a => (
            <View key={a.id} style={s.tableRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{a.reference}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600' }}>{typeof a.farmer === 'object' ? a.farmer.full_name : a.farmer}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ fontSize: 12 }}>{a.amount_requested ? `GHS ${parseFloat(a.amount_requested).toLocaleString()}` : '—'}</Text>
                <Badge variant={APP_STATUS_BADGE[a.status] ?? 'neutral'}>{a.status.replace(/_/g,' ')}</Badge>
              </View>
            </View>
          ))
        }
      </Card>
    </ScrollView>
  );
}

// ── Investor Opportunities ─────────────────────────────────────────────────
export function InvestorOpportunities() {
  const [apps,      setApps]      = useState<CreditApplication[]>([]);
  const [refreshing,setRefreshing]= useState(false);
  const [acting,    setActing]    = useState<string|null>(null);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const load = async () => { await loadMatched(); };
  const loadMatched = async () => {
    try {
      const r = await creditApi.listApps();
      setApps(toArray(r.data).filter((a: CreditApplication) => a.status === 'matched'));
    } catch {}
  };
  useEffect(() => { loadMatched(); }, []);
  const onRefresh = async () => { setRefreshing(true); await loadMatched(); setRefreshing(false); };

  const handleAccept = async (id: string) => {
    setActing(id); setError(''); setSuccess('');
    try { await creditApi.acceptMatch(id); setSuccess('Application accepted! An agreement will be generated.'); await loadMatched(); }
    catch (e: any) { setError(e?.response?.data?.detail || 'Action failed.'); }
    finally { setActing(null); }
  };
  const handleDecline = async (id: string) => {
    setActing(id); setError('');
    try { await creditApi.declineMatch(id); await loadMatched(); }
    catch { setError('Could not decline application.'); }
    finally { setActing(null); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <PageHeader title="Matched Opportunities" subtitle="Review farmer applications matched to your criteria." />
      {error   ? <AlertBanner variant="danger">{error}</AlertBanner>   : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}
      {apps.length === 0
        ? <EmptyState icon="🔍" text="No matched applications yet. Check back soon." />
        : apps.map(a => (
          <Card key={a.id} style={{ borderColor: Colors.leaf, borderWidth: 1.5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{a.reference}</Text>
              <Badge variant="info">Matched</Badge>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', marginBottom: 4 }}>{typeof a.farmer === 'object' ? a.farmer.full_name : 'Farmer'}</Text>
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Credit Type</Text><Text style={{ fontWeight: '600' }}>{a.credit_type.replace(/_/g,' ')}</Text></View>
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Amount</Text><Text style={{ fontWeight: '700', color: Colors.primary }}>GHS {a.amount_requested ? parseFloat(a.amount_requested).toLocaleString() : '—'}</Text></View>
            {a.repayment_period_months && <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Repayment</Text><Text style={{ fontWeight: '600' }}>{a.repayment_period_months} months</Text></View>}
            <View style={{ backgroundColor: Colors.surface, padding: Spacing.sm, borderRadius: Radius.sm, marginVertical: Spacing.sm }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.muted, marginBottom: 2 }}>PURPOSE</Text>
              <Text style={{ fontSize: 13, lineHeight: 19 }}>{a.purpose}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Button onPress={() => handleAccept(a.id)} disabled={acting === a.id} loading={acting === a.id} style={{ flex: 1 }}>✅ Accept</Button>
              <Button variant="danger" onPress={() => handleDecline(a.id)} disabled={acting === a.id}>❌ Decline</Button>
            </View>
          </Card>
        ))
      }
    </ScrollView>
  );
}

// ── Investor Portfolio ─────────────────────────────────────────────────────
export function InvestorPortfolio() {
  const [agreements,    setAgreements]    = useState<CreditAgreement[]>([]);
  const [disbRequests,  setDisbRequests]  = useState<any[]>([]);
  const [refreshing,    setRefreshing]    = useState(false);
  const [approvingDisb, setApprovingDisb] = useState<string|null>(null);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState('');

  const load = async () => {
    const [ag, dr] = await Promise.allSettled([creditApi.listAgreements(), paymentsApi.disbursementRequests()]);
    if (ag.status === 'fulfilled') setAgreements(toArray(ag.value.data));
    if (dr.status === 'fulfilled') setDisbRequests(toArray(dr.value.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleApproveDisb = async (id: string) => {
    setApprovingDisb(id); setError(''); setSuccess('');
    try {
      await paymentsApi.approveDisbRequest(id, { method: 'mtn_momo' });
      setSuccess('Disbursement approved!');
      await load();
    } catch (e: any) { setError(e?.response?.data?.detail || 'Failed to approve.'); }
    finally { setApprovingDisb(null); }
  };

  const pendingDisb = disbRequests.filter(d => d.status === 'pending');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <PageHeader title="My Portfolio" subtitle="Track your active investments and disbursements." />
      {error   ? <AlertBanner variant="danger">{error}</AlertBanner>   : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {pendingDisb.length > 0 && (
        <AlertBanner variant="warning">💰 {pendingDisb.length} disbursement request{pendingDisb.length>1?'s':''} awaiting approval.</AlertBanner>
      )}

      {pendingDisb.length > 0 && (
        <>
          <SectionTitle>Pending Disbursement Requests</SectionTitle>
          {pendingDisb.map(dr => (
            <Card key={dr.id} style={{ borderColor: Colors.warning, borderWidth: 1.5 }}>
              <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace', marginBottom: 4 }}>{dr.reference}</Text>
              <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Farmer</Text><Text style={{ fontWeight: '600' }}>{dr.farmer_name}</Text></View>
              <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Amount</Text><Text style={{ fontWeight: '700', color: Colors.primary }}>GHS {parseFloat(dr.amount).toLocaleString()}</Text></View>
              <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Method</Text><Text style={{ fontWeight: '600' }}>{dr.method}</Text></View>
              {dr.note && <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 4 }}>{dr.note}</Text>}
              <Button onPress={() => handleApproveDisb(dr.id)} disabled={approvingDisb===dr.id} loading={approvingDisb===dr.id} style={{ marginTop: Spacing.sm }} fullWidth>
                Approve Disbursement
              </Button>
            </Card>
          ))}
        </>
      )}

      <SectionTitle>All Agreements ({agreements.length})</SectionTitle>
      {agreements.length === 0
        ? <EmptyState icon="📊" text="No portfolio yet. Accept matched applications to build your portfolio." />
        : agreements.map(ag => (
          <Card key={ag.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{ag.reference}</Text>
              <Badge variant={AGREEMENT_STATUS_BADGE[ag.status] ?? 'neutral'}>{ag.status.replace(/_/g,' ')}</Badge>
            </View>
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Farmer</Text><Text style={{ fontWeight: '600' }}>{typeof ag.farmer === 'object' ? ag.farmer.full_name : ag.farmer}</Text></View>
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Credit Type</Text><Text style={{ fontWeight: '600' }}>{ag.credit_type.replace(/_/g,' ')}</Text></View>
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Amount</Text><Text style={{ fontWeight: '700', color: Colors.primary }}>GHS {parseFloat(ag.amount).toLocaleString()}</Text></View>
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Interest</Text><Text style={{ fontWeight: '600' }}>{ag.interest_rate}% p.a.</Text></View>
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Period</Text><Text style={{ fontWeight: '600' }}>{ag.repayment_period_months} months</Text></View>
            {ag.contract_document && (
              <Button size="sm" variant="secondary" onPress={() => Linking.openURL(ag.contract_document!)} style={{ marginTop: Spacing.sm }}>
                📄 View Contract
              </Button>
            )}
          </Card>
        ))
      }
    </ScrollView>
  );
}

// ── Investor Contracts ─────────────────────────────────────────────────────
export function InvestorContracts() {
  const [agreements, setAgreements] = useState<CreditAgreement[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [signing,    setSigning]    = useState<string|null>(null);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const load = async () => {
    const r = await creditApi.listAgreements();
    setAgreements(toArray(r.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSign = async (id: string) => {
    setSigning(id); setError(''); setSuccess('');
    try { await creditApi.signAgreement(id); setSuccess('Agreement signed!'); await load(); }
    catch { setError('Failed to sign. Please try again.'); }
    finally { setSigning(null); }
  };

  const toSign = agreements.filter(a => a.status === 'pending_signature' && !a.investor_signed_at);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <PageHeader title="Contracts" subtitle="Review and sign investment agreements." />
      {error   ? <AlertBanner variant="danger">{error}</AlertBanner>   : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}
      {toSign.length > 0 && <AlertBanner variant="warning">📄 {toSign.length} agreement{toSign.length>1?'s':''} need your signature.</AlertBanner>}

      {agreements.length === 0
        ? <EmptyState icon="📋" text="No agreements yet." />
        : agreements.map(ag => {
          const needsSign = ag.status === 'pending_signature' && !ag.investor_signed_at;
          return (
            <Card key={ag.id} style={needsSign ? { borderColor: Colors.warning, borderWidth: 2 } : {}}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{ag.reference}</Text>
                <Badge variant={AGREEMENT_STATUS_BADGE[ag.status] ?? 'neutral'}>{ag.status.replace(/_/g,' ')}</Badge>
              </View>
              <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Farmer</Text><Text style={{ fontWeight: '600' }}>{typeof ag.farmer === 'object' ? ag.farmer.full_name : ag.farmer}</Text></View>
              <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Amount</Text><Text style={{ fontWeight: '700', color: Colors.primary }}>GHS {parseFloat(ag.amount).toLocaleString()}</Text></View>
              <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Interest</Text><Text style={{ fontWeight: '600' }}>{ag.interest_rate}% p.a.</Text></View>
              <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Period</Text><Text style={{ fontWeight: '600' }}>{ag.repayment_period_months} months</Text></View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm }}>
                <Text style={{ fontSize: 11, color: ag.farmer_signed_at   ? Colors.success : Colors.warning }}>
                  {ag.farmer_signed_at   ? '✅ Farmer signed'   : '⏳ Farmer signature pending'}
                </Text>
                <Text style={{ fontSize: 11, color: ag.investor_signed_at ? Colors.success : Colors.warning }}>
                  {ag.investor_signed_at ? '✅ You signed' : '⏳ Your signature pending'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                {needsSign && (
                  <Button onPress={() => handleSign(ag.id)} disabled={signing===ag.id} loading={signing===ag.id}>Sign ✍️</Button>
                )}
                {ag.contract_document && (
                  <Button variant="secondary" onPress={() => Linking.openURL(ag.contract_document!)}>📄 View</Button>
                )}
              </View>
            </Card>
          );
        })
      }
    </ScrollView>
  );
}

// ── Investor Project Applications ─────────────────────────────────────────
export function InvestorProjects() {
  const [projects,   setProjects]   = useState<ProjectApplication[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  // Form
  const [projName, setProjName]    = useState('');
  const [creditType,setCreditType] = useState('direct_financing');
  const [totalAmt, setTotalAmt]    = useState('');
  const [months,   setMonths]      = useState('');
  const [purpose,  setPurpose]     = useState('');

  const load = async () => {
    const r = await creditApi.listProjects();
    setProjects(toArray(r.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleCreate = async () => {
    if (!projName || !purpose) { setError('Project name and purpose are required.'); return; }
    setSaving(true); setError('');
    try {
      const r = await creditApi.createProject({ project_name: projName, credit_type: creditType, total_amount_requested: totalAmt || undefined, repayment_period_months: months ? parseInt(months) : undefined, purpose });
      setSuccess('Project created! You can now add farmers to it.');
      setShowForm(false); setProjName(''); setPurpose(''); setTotalAmt(''); setMonths('');
      await load();
    } catch (e: any) { setError(e?.response?.data?.detail || 'Failed to create project.'); }
    finally { setSaving(false); }
  };

  const STATUS_BADGE: Record<string, any> = { draft:'neutral', submitted:'info', under_review:'warning', approved:'success', rejected:'danger', disbursed:'success', withdrawn:'neutral' };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader title="Project Applications" subtitle="Submit group funding projects on behalf of multiple farmers."
        action={<Button size="sm" onPress={() => setShowForm(s => !s)}>{showForm ? 'Cancel' : '+ New Project'}</Button>}
      />
      {error   ? <AlertBanner variant="danger">{error}</AlertBanner>   : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {showForm && (
        <Card style={{ marginBottom: Spacing.lg }}>
          <SectionTitle>New Project Application</SectionTitle>
          <TextInputField label="Project Name *"  value={projName}   onChange={setProjName}   placeholder="e.g. Tamale Broiler Cooperative Q3" />
          <TextInputField label="Credit Type"     value={creditType} onChange={setCreditType} placeholder="direct_financing" />
          <TextInputField label="Total Amount (GHS)" value={totalAmt} onChange={setTotalAmt} placeholder="e.g. 100000" keyboard="decimal-pad" />
          <TextInputField label="Repayment Period (months)" value={months} onChange={setMonths} placeholder="e.g. 12" keyboard="number-pad" />
          <TextInputField label="Purpose *" value={purpose} onChange={setPurpose} placeholder="Describe the project…" multiline />
          <Button fullWidth disabled={!projName||!purpose||saving} loading={saving} onPress={handleCreate}>Create Project</Button>
        </Card>
      )}

      {projects.length === 0
        ? <EmptyState icon="📁" text="No projects yet. Create a project to fund multiple farmers at once." />
        : projects.map(p => (
          <Card key={p.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{p.reference}</Text>
              <Badge variant={STATUS_BADGE[p.status] ?? 'neutral'}>{p.status.replace(/_/g,' ')}</Badge>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', marginBottom: 4 }}>{p.project_name}</Text>
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Credit Type</Text><Text style={{ fontWeight: '600' }}>{p.credit_type.replace(/_/g,' ')}</Text></View>
            {p.total_amount_requested && <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Total Amount</Text><Text style={{ fontWeight: '700', color: Colors.primary }}>GHS {parseFloat(p.total_amount_requested).toLocaleString()}</Text></View>}
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Farmers</Text><Text style={{ fontWeight: '600' }}>{p.farmer_count}</Text></View>
            {p.status === 'draft' && (
              <Button size="sm" onPress={async () => { try { await creditApi.submitProject(p.id); await load(); } catch {} }} style={{ marginTop: Spacing.sm }}>
                Submit Project
              </Button>
            )}
          </Card>
        ))
      }
    </ScrollView>
  );
}

// ── Small helper ─────────────────────────────────────────────────────────────
import { TextInput } from 'react-native';
function TextInputField({ label, value, onChange, placeholder, keyboard, multiline }: any) {
  return (
    <>
      <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm, ...(multiline ? { height: 80, textAlignVertical: 'top' as any } : {}) }}
        value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={Colors.muted} keyboardType={keyboard ?? 'default'} multiline={!!multiline}
      />
    </>
  );
}

const s = StyleSheet.create({
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  input: { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, marginBottom: Spacing.sm },
});
