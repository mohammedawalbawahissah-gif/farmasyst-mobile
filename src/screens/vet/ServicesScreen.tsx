import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl, Switch,
} from 'react-native';
import { vetApi } from '../../api/client';
import { Card, Pill, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { getResults, VetService } from '../../types';

const SERVICE_TYPES = [
  { value:'vaccination',  label:'💉 Vaccination' },
  { value:'diagnosis',    label:'🔬 Diagnosis' },
  { value:'treatment',    label:'💊 Treatment' },
  { value:'consultation', label:'🩺 Consultation' },
  { value:'farm_visit',   label:'🚜 Farm Visit' },
  { value:'other',        label:'📋 Other' },
];

const BLANK = { service_name:'', service_type:'consultation', description:'', price:'', duration_minutes:'30', is_mobile:false, region:'', is_active:true };

export default function VetServicesScreen() {
  const [services,   setServices]   = useState<VetService[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<string|null>(null);
  const [form,       setForm]       = useState({ ...BLANK });
  const [saving,     setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await vetApi.myServices();
      setServices(getResults<VetService>(r.data as any));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const resetForm = () => { setForm({ ...BLANK }); setEditing(null); setShowForm(false); };

  const handleSave = async () => {
    if (!form.service_name.trim() || !form.price) { Alert.alert('Missing fields', 'Service name and price are required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, duration_minutes: Number(form.duration_minutes) };
      if (editing) { await vetApi.updateService(editing, payload); }
      else         { await vetApi.createService(payload); }
      resetForm();
      load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Failed to save service.');
    } finally { setSaving(false); }
  };

  const handleEdit = (svc: VetService) => {
    setForm({
      service_name: svc.service_name,
      service_type: svc.service_type,
      description: svc.description,
      price: svc.price,
      duration_minutes: String(svc.duration_minutes),
      is_mobile: svc.is_mobile,
      region: svc.region,
      is_active: svc.is_active,
    });
    setEditing(svc.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete service?', 'This cannot be undone.', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await vetApi.deleteService(id); load(); }
        catch { Alert.alert('Error', 'Could not delete service.'); }
      }},
    ]);
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: Spacing.sm }}>
        <View>
          <Text style={s.pageTitle}>My Services</Text>
          <Text style={s.pageSub}>Services you offer to poultry farmers.</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => { resetForm(); setShowForm(true); }}>
          <Text style={s.addBtnText}>＋ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Form */}
      {showForm && (
        <Card style={{ borderColor: Colors.leaf, borderWidth: 1.5 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', marginBottom: Spacing.sm }}>
            {editing ? 'Edit Service' : 'New Service'}
          </Text>

          <Text style={s.fLabel}>Service Name *</Text>
          <TextInput style={s.fInput} placeholder="e.g. Newcastle Vaccination" placeholderTextColor={Colors.muted}
            value={form.service_name} onChangeText={v => set('service_name', v)} />

          <Text style={s.fLabel}>Type *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
            {SERVICE_TYPES.map(t => (
              <TouchableOpacity key={t.value} style={[s.typeBtn, form.service_type === t.value && s.typeBtnActive]}
                onPress={() => set('service_type', t.value)}>
                <Text style={[s.typeBtnText, form.service_type === t.value && { color: Colors.white }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.fLabel}>Price (GHS) *</Text>
              <TextInput style={s.fInput} keyboardType="decimal-pad" placeholder="150.00" placeholderTextColor={Colors.muted}
                value={form.price} onChangeText={v => set('price', v)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fLabel}>Duration (mins)</Text>
              <TextInput style={s.fInput} keyboardType="number-pad" placeholderTextColor={Colors.muted}
                value={form.duration_minutes} onChangeText={v => set('duration_minutes', v)} />
            </View>
          </View>

          <Text style={s.fLabel}>Region</Text>
          <TextInput style={s.fInput} placeholder="e.g. Northern Region" placeholderTextColor={Colors.muted}
            value={form.region} onChangeText={v => set('region', v)} />

          <Text style={s.fLabel}>Description</Text>
          <TextInput style={[s.fInput, { height: 72, textAlignVertical: 'top' }]}
            placeholder="Describe the service…" placeholderTextColor={Colors.muted} multiline
            value={form.description} onChangeText={v => set('description', v)} />

          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, color: Colors.ink }}>Mobile (comes to farm)</Text>
            <Switch value={form.is_mobile} onValueChange={v => set('is_mobile', v)}
              trackColor={{ false: Colors.border, true: Colors.leaf }} thumbColor={Colors.white} />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TouchableOpacity style={[s.btn, { flex: 1 }, saving && s.btnDisabled]} disabled={saving} onPress={handleSave}>
              {saving ? <ActivityIndicator size="small" color={Colors.white} />
                : <Text style={s.btnText}>Save Service</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnSec, { flex: 1 }]} onPress={resetForm}>
              <Text style={s.btnSecText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {services.length === 0 && !showForm
        ? <EmptyState icon="🩺" message="No services yet. Add your first service above." />
        : services.map(svc => (
          <Card key={svc.id}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{svc.service_name}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <Pill label={SERVICE_TYPES.find(t => t.value === svc.service_type)?.label ?? svc.service_type} variant="blue" />
                  {svc.is_mobile ? <Pill label="📍 Mobile" variant="blue" /> : null}
                  {!svc.is_active ? <Pill label="Inactive" variant="red" /> : null}
                </View>
                {svc.description ? <Text style={{ fontSize: 13, color: Colors.muted, marginTop: 4 }}>{svc.description}</Text> : null}
                <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.earth, marginTop: 6 }}>
                  GHS {parseFloat(svc.price).toLocaleString()} · {svc.duration_minutes} min
                </Text>
                {svc.region ? <Text style={{ fontSize: 12, color: Colors.muted }}>📍 {svc.region}</Text> : null}
              </View>
              <View style={{ gap: 6, marginLeft: 10 }}>
                <TouchableOpacity style={s.iconBtn} onPress={() => handleEdit(svc)}>
                  <Text style={s.iconBtnText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.iconBtn, { borderColor: Colors.danger }]} onPress={() => handleDelete(svc.id)}>
                  <Text style={s.iconBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.bg },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle:  { fontSize: 22, fontWeight: '700', color: Colors.ink },
  pageSub:    { fontSize: 13, color: Colors.muted },
  addBtn:     { backgroundColor: Colors.leaf, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.md },
  addBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  fLabel:     { fontSize: 11, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 4 },
  fInput:     { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  btn:        { backgroundColor: Colors.leaf, borderRadius: Radius.md, paddingVertical: 11, alignItems: 'center' },
  btnDisabled:{ opacity: 0.5 },
  btnText:    { color: Colors.white, fontWeight: '700', fontSize: 14 },
  btnSec:     { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  btnSecText: { color: Colors.ink, fontWeight: '600', fontSize: 14 },
  typeBtn:    { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, marginRight: 6, backgroundColor: Colors.white },
  typeBtnActive:{ backgroundColor: Colors.leaf, borderColor: Colors.leaf },
  typeBtnText:{ fontSize: 12, fontWeight: '600', color: Colors.ink },
  iconBtn:    { width: 34, height: 34, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  iconBtnText:{ fontSize: 14 },
});
