import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import api from '../../api/client';
import { Card, Pill, SectionTitle, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';

function getArr(d: any): any[] { if (!d) return []; if (Array.isArray(d)) return d; return d.results ?? []; }

export default function AdminMonitoringScreen() {
  const [officers,   setOfficers]   = useState<any[]>([]);
  const [farms,      setFarms]      = useState<any[]>([]);
  const [audits,     setAudits]     = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigning,  setAssigning]  = useState<string|null>(null);
  const [selOfficer, setSelOfficer] = useState('');
  const [acting,     setActing]     = useState(false);
  const [msg,        setMsg]        = useState('');

  const load = useCallback(async () => {
    try {
      const [oR, fR, aR] = await Promise.all([
        api.get('/users/', { params: { role: 'monitoring_officer' } }),
        api.get('/farms/'),
        api.get('/farm-audit-reports/'),
      ]);
      setOfficers(getArr(oR.data));
      setFarms(getArr(fR.data));
      setAudits(getArr(aR.data));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  // Most recent audit per farm
  const lastAuditByFarm = audits.reduce<Record<string,any>>((acc, a) => {
    if (!acc[a.farm] || new Date(a.visit_date) > new Date(acc[a.farm].visit_date)) acc[a.farm] = a;
    return acc;
  }, {});

  const auditsByOfficer = audits.reduce<Record<string,number>>((acc, a) => {
    if (a.auditor) acc[a.auditor] = (acc[a.auditor] ?? 0) + 1; return acc;
  }, {});

  const assignOfficer = async (farmId: string) => {
    if (!selOfficer) { Alert.alert('Select an officer first.'); return; }
    setActing(true);
    try {
      await api.post(`/farms/${farmId}/assign_officer/`, { officer_id: selOfficer });
      setMsg('Officer assigned successfully.'); setAssigning(null); setSelOfficer(''); load();
    } catch { setMsg('Assignment failed. Please try again.'); }
    finally { setActing(false); }
  };

  const unassignOfficer = async (farmId: string) => {
    try {
      await api.post(`/farms/${farmId}/assign_officer/`, { officer_id: null });
      setMsg('Officer unassigned.'); load();
    } catch { setMsg('Failed to unassign officer.'); }
  };

  const requestReport = async (farmId: string, officerId: string) => {
    try {
      await api.post(`/farms/${farmId}/request_report/`, { officer_id: officerId });
      setMsg('Report request sent to the assigned officer.');
    } catch { setMsg('Could not send report request.'); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;

  const outcomeVariant = (o: string) => o === 'satisfactory' ? 'green' : o === 'concerns' ? 'amber' : 'red';

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={s.title}>Monitoring Officers</Text>
      <Text style={s.sub}>Manage field officers and farm assignments.</Text>

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: 'Officers',      value: officers.length },
          { label: 'Total Farms',   value: farms.length },
          { label: 'Audit Reports', value: audits.length },
          { label: 'Farms Audited', value: Object.keys(lastAuditByFarm).length },
        ].map(st => (
          <View key={st.label} style={s.statCard}>
            <Text style={s.statVal}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      {msg ? (
        <View style={s.msgBox}><Text style={{ color: Colors.success, fontSize: 13 }}>{msg}</Text></View>
      ) : null}

      {/* Officers */}
      <SectionTitle>Field Officers ({officers.length})</SectionTitle>
      {officers.length === 0
        ? <Card><Text style={{ padding: Spacing.sm, color: Colors.muted }}>No monitoring officers registered. Create a user with the monitoring_officer role.</Text></Card>
        : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.md }}>
          {officers.map(o => {
            const name = o.full_name || `${o.first_name||''} ${o.last_name||''}`.trim() || o.email;
            const initials = name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
            const count = auditsByOfficer[o.id] ?? 0;
            return (
              <View key={o.id} style={s.officerCard}>
                <View style={s.officerAvatar}><Text style={s.officerInitials}>{initials}</Text></View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.ink, marginTop: 6 }}>{name}</Text>
                <Text style={{ fontSize: 12, color: Colors.muted }}>{count} audit{count !== 1 ? 's' : ''}</Text>
                <Pill label={o.is_active ? 'Active' : 'Inactive'} variant={o.is_active ? 'green' : 'gray'} />
              </View>
            );
          })}
        </View>
      }

      {/* Farm assignments */}
      <SectionTitle>Farm Assignments ({farms.length})</SectionTitle>
      {farms.length === 0
        ? <EmptyState icon="🏡" message="No farms registered yet." />
        : farms.map(f => {
          const lastAudit = lastAuditByFarm[f.id];
          const isAssigning = assigning === f.id;
          return (
            <Card key={f.id}>
              <Text style={{ fontSize: 14, fontWeight: '700', marginBottom: 3 }}>{f.name}</Text>
              <Text style={{ fontSize: 12, color: Colors.muted }}>📍 {f.district}, {f.region} · {f.flock_type?.replace(/_/g,' ')}</Text>

              {/* Last audit */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <Text style={{ fontSize: 12, color: Colors.muted }}>Last audit: </Text>
                {lastAudit
                  ? <>
                      <Text style={{ fontSize: 12 }}>{new Date(lastAudit.visit_date).toLocaleDateString('en-GH', { day:'numeric', month:'short', year:'numeric' })}</Text>
                      <Pill label={lastAudit.outcome.replace('_',' ')} variant={outcomeVariant(lastAudit.outcome)} />
                    </>
                  : <Text style={{ fontSize: 12, color: Colors.muted }}>Never</Text>
                }
              </View>

              {/* Assigned officer */}
              <View style={{ marginTop: 8 }}>
                {isAssigning ? (
                  <View>
                    <View style={s.pickerBox}>
                      <TouchableOpacity onPress={() => setSelOfficer('')}>
                        <Text style={[s.pickerOpt, !selOfficer && { color: Colors.leaf, fontWeight: '700' }]}>— Select officer —</Text>
                      </TouchableOpacity>
                      {officers.map(o => {
                        const name = o.full_name || `${o.first_name||''} ${o.last_name||''}`.trim() || o.email;
                        return (
                          <TouchableOpacity key={o.id} onPress={() => setSelOfficer(o.id)}>
                            <Text style={[s.pickerOpt, selOfficer === o.id && { color: Colors.leaf, fontWeight: '700' }]}>{name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={[s.btn, { flex: 1 }, acting && s.btnDisabled]} disabled={acting} onPress={() => assignOfficer(f.id)}>
                        <Text style={s.btnText}>{acting ? 'Saving…' : 'Save'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.btn, s.btnSec, { flex: 1 }]} onPress={() => { setAssigning(null); setSelOfficer(''); }}>
                        <Text style={s.btnSecText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 13, color: Colors.muted }}>
                      👤 {f.monitoring_officer_name || 'No officer assigned'}
                    </Text>
                    {f.monitoring_officer ? (
                      <>
                        <TouchableOpacity style={s.smBtn} onPress={() => unassignOfficer(f.id)}>
                          <Text style={s.smBtnText}>Unassign</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.smBtn, { backgroundColor: Colors.leaf }]}
                          onPress={() => requestReport(f.id, f.monitoring_officer)}>
                          <Text style={[s.smBtnText, { color: Colors.white }]}>Request Report</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity style={s.smBtn} onPress={() => { setAssigning(f.id); setSelOfficer(''); }}>
                        <Text style={s.smBtnText}>Assign Officer</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </Card>
          );
        })
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title:         { fontSize: 22, fontWeight: '700', color: Colors.ink, marginBottom: 2 },
  sub:           { fontSize: 13, color: Colors.muted, marginBottom: Spacing.md },
  statsRow:      { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  statCard:      { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  statVal:       { fontSize: 20, fontWeight: '800', color: Colors.leaf },
  statLabel:     { fontSize: 10, color: Colors.muted, marginTop: 2, textAlign: 'center' },
  msgBox:        { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: Colors.success, borderRadius: Radius.sm, padding: 10, marginBottom: Spacing.sm },
  officerCard:   { width: '47%', backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  officerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A6B5A', alignItems: 'center', justifyContent: 'center' },
  officerInitials:{ color: Colors.white, fontWeight: '700', fontSize: 16 },
  pickerBox:     { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, marginBottom: 8, backgroundColor: Colors.white, maxHeight: 180 },
  pickerOpt:     { paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: Colors.ink, borderBottomWidth: 1, borderBottomColor: Colors.border },
  btn:           { backgroundColor: Colors.leaf, borderRadius: Radius.sm, paddingVertical: 9, alignItems: 'center' },
  btnDisabled:   { opacity: 0.5 },
  btnText:       { color: Colors.white, fontWeight: '700', fontSize: 13 },
  btnSec:        { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  btnSecText:    { color: Colors.ink, fontWeight: '600', fontSize: 13 },
  smBtn:         { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.white },
  smBtnText:     { fontSize: 12, fontWeight: '600', color: Colors.ink },
});
