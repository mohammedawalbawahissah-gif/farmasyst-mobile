import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import api from '../../api/client';
import { Card, Pill, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';

function getArr(d: any): any[] { if (!d) return []; if (Array.isArray(d)) return d; return d.results ?? []; }

const STATUS_VARIANT: Record<string,'green'|'amber'|'red'|'gray'> = {
  approved: 'green', pending: 'amber', suspended: 'red',
};

export default function AdminInputDealerManagementScreen() {
  const [dealers,    setDealers]    = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState<'pending'|'all'>('pending');
  const [search,     setSearch]     = useState('');
  const [acting,     setActing]     = useState<string|null>(null);
  const [detail,     setDetail]     = useState<any|null>(null);
  const [msg,        setMsg]        = useState('');
  const [msgErr,     setMsgErr]     = useState(false);

  const flash = (text: string, err = false) => { setMsg(text); setMsgErr(err); setTimeout(() => setMsg(''), 4000); };

  const load = useCallback(async () => {
    try {
      const r = await api.get('/inputs/dealers/', { params: tab === 'pending' ? { approval_status: 'pending' } : {} });
      setDealers(getArr(r.data));
    } catch { /* ignore */ }
  }, [tab]);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const approve = async (id: string) => {
    setActing(id);
    try { await api.post(`/inputs/dealers/${id}/approve/`); flash('Dealer approved.'); load(); }
    catch { flash('Failed to approve.', true); }
    finally { setActing(null); }
  };
  const suspend = async (id: string) => {
    setActing(id);
    try { await api.post(`/inputs/dealers/${id}/suspend/`); flash('Dealer suspended.'); load(); }
    catch { flash('Failed to suspend.', true); }
    finally { setActing(null); }
  };
  const deleteDealer = async (id: string) => {
    Alert.alert('Delete dealer?', 'This cannot be undone.', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setActing(id);
        try { await api.delete(`/inputs/dealers/${id}/`); flash('Dealer deleted.'); load(); }
        catch { flash('Failed to delete.', true); }
        finally { setActing(null); }
      }},
    ]);
  };

  const filtered = dealers.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (d.user?.full_name || `${d.user?.first_name||''} ${d.user?.last_name||''}`).toLowerCase();
    return name.includes(q) || (d.business_name||'').toLowerCase().includes(q) || (d.region||'').toLowerCase().includes(q);
  });

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={s.title}>Farm Input Dealers</Text>
      <Text style={s.sub}>Review and manage input dealer registrations.</Text>

      {msg ? (
        <View style={[s.msg, { backgroundColor: msgErr ? '#FFEBEE' : '#E8F5E9', borderColor: msgErr ? Colors.danger : Colors.success }]}>
          <Text style={{ color: msgErr ? Colors.danger : Colors.success, fontSize: 13 }}>{msg}</Text>
        </View>
      ) : null}

      <View style={s.tabs}>
        {(['pending','all'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t === 'pending' ? 'Pending' : 'All Dealers'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput style={s.search} placeholder="Search by business, name, region…"
        placeholderTextColor={Colors.muted} value={search} onChangeText={setSearch} />

      {filtered.length === 0
        ? <EmptyState icon="🏪" message={tab === 'pending' ? 'No pending dealer applications.' : 'No dealers found.'} />
        : filtered.map(d => {
          const name = d.user?.full_name || `${d.user?.first_name||''} ${d.user?.last_name||''}`.trim() || '—';
          return (
            <TouchableOpacity key={d.id} onPress={() => setDetail(d)} activeOpacity={0.8}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 14, fontWeight: '700' }}>{d.business_name || '—'}</Text>
                      <Pill label={d.approval_status} variant={STATUS_VARIANT[d.approval_status] ?? 'gray'} />
                    </View>
                    <Text style={{ fontSize: 13, color: Colors.muted }}>Owner: {name}</Text>
                    <Text style={{ fontSize: 12, color: Colors.muted }}>📍 {[d.district, d.region].filter(Boolean).join(', ') || '—'}</Text>
                    {d.registration_number ? <Text style={{ fontSize: 12, color: Colors.muted }}>#️⃣ {d.registration_number}</Text> : null}
                    {d.product_categories?.length > 0
                      ? <Text style={{ fontSize: 12, color: Colors.muted }}>🏷 {d.product_categories.join(', ')}</Text>
                      : null}
                  </View>
                  <View style={{ gap: 6, marginLeft: 8 }}>
                    {d.approval_status === 'pending' && (
                      <TouchableOpacity style={[s.btn, acting === String(d.id) && s.btnDisabled]}
                        disabled={acting === String(d.id)} onPress={() => approve(String(d.id))}>
                        <Text style={s.btnText}>✓ Approve</Text>
                      </TouchableOpacity>
                    )}
                    {d.approval_status === 'approved' && (
                      <TouchableOpacity style={[s.btn, { backgroundColor: Colors.warning }, acting === String(d.id) && s.btnDisabled]}
                        disabled={acting === String(d.id)} onPress={() => suspend(String(d.id))}>
                        <Text style={s.btnText}>Suspend</Text>
                      </TouchableOpacity>
                    )}
                    {d.approval_status === 'suspended' && (
                      <TouchableOpacity style={[s.btn, acting === String(d.id) && s.btnDisabled]}
                        disabled={acting === String(d.id)} onPress={() => approve(String(d.id))}>
                        <Text style={s.btnText}>Re-activate</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[s.btn, { backgroundColor: Colors.danger }]}
                      onPress={() => deleteDealer(String(d.id))}>
                      <Text style={s.btnText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })
      }

      {/* Detail modal */}
      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={s.modalBackdrop} onPress={() => setDetail(null)} activeOpacity={1} />
          <View style={s.modalPanel}>
            {detail && (
              <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md }}>
                  <Text style={{ fontSize: 17, fontWeight: '700' }}>{detail.business_name}</Text>
                  <TouchableOpacity onPress={() => setDetail(null)}>
                    <Text style={{ fontSize: 18, color: Colors.muted, fontWeight: '700' }}>✕</Text>
                  </TouchableOpacity>
                </View>
                {[
                  ['Owner',       (detail.user?.full_name || `${detail.user?.first_name||''} ${detail.user?.last_name||''}`.trim()) || '—'],
                  ['Email',       detail.user?.email || '—'],
                  ['Phone',       detail.phone || '—'],
                  ['Reg. Number', detail.registration_number || '—'],
                  ['Region',      detail.region || '—'],
                  ['District',    detail.district || '—'],
                  ['Address',     detail.address || '—'],
                  ['Categories',  detail.product_categories?.join(', ') || '—'],
                  ['Registered',  detail.created_at ? new Date(detail.created_at).toLocaleDateString('en-GH') : '—'],
                ].map(([k, v]) => (
                  <View key={k} style={s.detailRow}>
                    <Text style={s.detailKey}>{k}</Text>
                    <Text style={s.detailVal}>{v}</Text>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: Spacing.md, flexWrap: 'wrap' }}>
                  {detail.approval_status === 'pending' && (
                    <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={() => { approve(String(detail.id)); setDetail(null); }}>
                      <Text style={s.btnText}>✓ Approve</Text>
                    </TouchableOpacity>
                  )}
                  {detail.approval_status === 'approved' && (
                    <TouchableOpacity style={[s.btn, { flex: 1, backgroundColor: Colors.warning }]}
                      onPress={() => { suspend(String(detail.id)); setDetail(null); }}>
                      <Text style={s.btnText}>Suspend</Text>
                    </TouchableOpacity>
                  )}
                  {detail.approval_status === 'suspended' && (
                    <TouchableOpacity style={[s.btn, { flex: 1 }]} onPress={() => { approve(String(detail.id)); setDetail(null); }}>
                      <Text style={s.btnText}>Re-activate</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[s.btn, { backgroundColor: Colors.danger }]}
                    onPress={() => { setDetail(null); deleteDealer(String(detail.id)); }}>
                    <Text style={s.btnText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.btn, s.btnSec]} onPress={() => setDetail(null)}>
                    <Text style={s.btnSecText}>Close</Text>
                  </TouchableOpacity>
                </View>
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
  sub:           { fontSize: 13, color: Colors.muted, marginBottom: Spacing.md },
  msg:           { borderWidth: 1, borderRadius: Radius.sm, padding: 10, marginBottom: Spacing.sm },
  tabs:          { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  tab:           { flex: 1, paddingVertical: 9, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.white },
  tabActive:     { backgroundColor: Colors.leaf, borderColor: Colors.leaf },
  tabText:       { fontSize: 13, fontWeight: '600', color: Colors.muted },
  tabTextActive: { color: Colors.white },
  search:        { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.ink, marginBottom: Spacing.md },
  btn:           { backgroundColor: Colors.leaf, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  btnDisabled:   { opacity: 0.5 },
  btnText:       { color: Colors.white, fontWeight: '700', fontSize: 12 },
  btnSec:        { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  btnSecText:    { color: Colors.ink, fontWeight: '600', fontSize: 13 },
  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalPanel:    { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  detailRow:     { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 8 },
  detailKey:     { fontSize: 13, color: Colors.muted, width: 130 },
  detailVal:     { fontSize: 13, color: Colors.ink, flex: 1, fontWeight: '500' },
});
