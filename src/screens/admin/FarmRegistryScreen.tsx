import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
  RefreshControl, TextInput, Alert, Switch,
} from 'react-native';
import { farmsApi, usersApi } from '../../api/client';
import { Farm, User } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, SectionTitle, Button, InputField, EmptyState, ErrorBanner, Pill, statusVariant } from '../../components/ui';

const FLOCK_TYPES = [
  { group: 'Poultry', items: [
    { value:'broilers', label:'Broilers' }, { value:'layers', label:'Layers' },
    { value:'guinea_fowl', label:'Guinea Fowl' }, { value:'turkey', label:'Turkey' },
    { value:'duck', label:'Duck' }, { value:'geese', label:'Geese' },
    { value:'ostrich', label:'Ostrich' }, { value:'mixed', label:'Mixed Poultry' },
  ]},
  { group: 'Hatchery', items: [
    { value:'day_old_chicks', label:'Day-Old Chicks' }, { value:'hatchery', label:'Hatchery Only' },
    { value:'poultry_and_hatchery', label:'Poultry + Hatchery' },
  ]},
  { group: 'Processing', items: [
    { value:'meat_processing', label:'Meat Processing Farm' },
  ]},
];

const REGIONS = [
  'Greater Accra','Ashanti','Western','Eastern','Central','Northern',
  'Upper East','Upper West','Volta','Brong-Ahafo','Oti','Savannah',
  'North East','Ahafo','Bono East','Western North',
];

const isPoultry    = (t: string) => ['broilers','layers','guinea_fowl','turkey','duck','geese','ostrich','mixed','poultry_and_hatchery'].includes(t);
const isHatchery   = (t: string) => ['day_old_chicks','hatchery','poultry_and_hatchery'].includes(t);
const isProcessing = (t: string) => t === 'meat_processing';

const EMPTY_FORM = {
  owner:'', name:'', flock_type:'broilers',
  flock_size:'', incubator_capacity:'', incubators_count:'', breeds_hatched:'',
  daily_capacity:'', cold_storage_capacity:'', processing_equipment:'',
  region:'', district:'', community:'', gps_address:'',
  farm_size_acres:'', has_water_source:false, has_electricity:false,
};

export default function FarmRegistryScreen() {
  const [farms,      setFarms]      = useState<Farm[]>([]);
  const [farmers,    setFarmers]    = useState<User[]>([]);
  const [search,     setSearch]     = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      const [f, u] = await Promise.all([
        farmsApi.list(),
        usersApi.list({ role: 'farmer', verification_status: 'verified' }),
      ]);
      setFarms(f.data.results ?? f.data);
      setFarmers(u.data.results ?? u.data);
    } catch { setError('Could not load data.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const filtered = farms.filter(f => {
    const s = search.toLowerCase();
    return !s || f.name.toLowerCase().includes(s) || f.region.toLowerCase().includes(s) || f.district.toLowerCase().includes(s);
  });

  const ft = form.flock_type;
  const showPoultry    = isPoultry(ft);
  const showHatchery   = isHatchery(ft);
  const showProcessing = isProcessing(ft);

  const isValid = form.owner && form.name && form.region && form.district &&
    (showPoultry ? form.flock_size : true) &&
    (showHatchery && ft !== 'poultry_and_hatchery' ? form.incubator_capacity : true);

  async function submit() {
    if (!isValid) { Alert.alert('Missing Fields', 'Please fill all required fields.'); return; }
    setSaving(true);
    try {
      await farmsApi.create({
        owner:            form.owner,
        name:             form.name,
        flock_type:       form.flock_type,
        flock_size:       parseInt(form.flock_size) || 0,
        region:           form.region,
        district:         form.district,
        community:        form.community,
        gps_address:      form.gps_address,
        farm_size_acres:  form.farm_size_acres || undefined,
        has_water_source: form.has_water_source,
        has_electricity:  form.has_electricity,
      } as any);
      Alert.alert('Registered', `Farm "${form.name}" registered successfully.`);
      setShowModal(false);
      setForm({ ...EMPTY_FORM });
      load();
    } catch (e: any) {
      const d = e?.response?.data;
      Alert.alert('Error', d?.owner?.[0] ?? d?.detail ?? Object.values(d ?? {}).flat().join('\n') ?? 'Failed.');
    } finally { setSaving(false); }
  }

  const allFlockItems = FLOCK_TYPES.flatMap(g => g.items);

  return (
    <Screen title="Farm Registry" subtitle="Register & manage farms">
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.toolbar}>
        <TextInput
          style={[styles.search, { flex: 1 }]}
          placeholder="Search farms..."
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        <Button label="+ Register Farm" onPress={() => setShowModal(true)} size="sm" />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          ['Total Farms',  farms.length.toString()],
          ['Active',       farms.filter(f => f.is_active).length.toString()],
          ['Total Flock',  farms.reduce((s, f) => s + f.flock_size, 0).toLocaleString()],
        ].map(([k, v]) => (
          <View key={k} style={styles.statBox}>
            <Text style={styles.statVal}>{v}</Text>
            <Text style={styles.statKey}>{k}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <SectionTitle title="All Registered Farms" />
        {filtered.length === 0
          ? <EmptyState message="No farms registered yet." icon="🌾" />
          : filtered.map(f => (
              <Card key={f.id} style={styles.farmCard}>
                <View style={styles.farmHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.farmName}>{f.name}</Text>
                    <Text style={styles.farmMeta}>{f.district}, {f.region}</Text>
                    <Text style={styles.farmMeta}>{f.flock_type.replace(/_/g, ' ')} · {f.flock_size.toLocaleString()} birds</Text>
                  </View>
                  <Pill label={f.is_active ? 'Active' : 'Inactive'} variant={f.is_active ? 'green' : 'gray'} />
                </View>
                <View style={styles.utilRow}>
                  {f.has_water_source && <View style={styles.utilTag}><Text style={styles.utilText}>💧 Water</Text></View>}
                  {f.has_electricity  && <View style={styles.utilTag}><Text style={styles.utilText}>⚡ Power</Text></View>}
                </View>
              </Card>
            ))
        }
      </ScrollView>

      {/* Registration Modal */}
      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Screen title="Register New Farm" subtitle="Fill in all required fields">
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}>
            {/* Farmer */}
            <Text style={styles.label}>Farmer *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {farmers.map(u => (
                <TouchableOpacity
                  key={u.id}
                  onPress={() => set('owner', u.id)}
                  style={[styles.farmerChip, form.owner === u.id && styles.farmerChipActive]}
                >
                  <Text style={[styles.farmerChipText, form.owner === u.id && { color: Colors.leaf }]}>
                    {u.first_name} {u.last_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <InputField label="Farm Name *" value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Musah Poultry Farm" />

            {/* Flock Type */}
            <Text style={styles.label}>Farm Type *</Text>
            {FLOCK_TYPES.map(grp => (
              <View key={grp.group} style={{ marginBottom: 8 }}>
                <Text style={styles.groupLabel}>{grp.group}</Text>
                <View style={styles.typeGrid}>
                  {grp.items.map(item => (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => set('flock_type', item.value)}
                      style={[styles.typeBtn, form.flock_type === item.value && styles.typeBtnActive]}
                    >
                      <Text style={[styles.typeBtnText, form.flock_type === item.value && { color: Colors.leaf, fontWeight: '700' }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            {/* Poultry fields */}
            {showPoultry && (
              <>
                <Text style={[styles.sectionDiv]}>Flock Details</Text>
                <InputField label="Current Flock Size *" value={form.flock_size} onChangeText={v => set('flock_size', v)} keyboardType="numeric" placeholder="e.g. 1000" />
              </>
            )}

            {/* Hatchery fields */}
            {showHatchery && (
              <>
                <Text style={styles.sectionDiv}>Hatchery Details</Text>
                {ft === 'poultry_and_hatchery' && (
                  <View style={styles.infoBanner}>
                    <Text style={styles.infoBannerText}>ℹ️ This farm has both live birds and a hatchery. Fill both sections.</Text>
                  </View>
                )}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <InputField label="Incubator Capacity *" value={form.incubator_capacity} onChangeText={v => set('incubator_capacity', v)} keyboardType="numeric" placeholder="e.g. 5000" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <InputField label="No. of Incubators" value={form.incubators_count} onChangeText={v => set('incubators_count', v)} keyboardType="numeric" placeholder="e.g. 2" />
                  </View>
                </View>
                <InputField label="Breeds/Species Hatched" value={form.breeds_hatched} onChangeText={v => set('breeds_hatched', v)} placeholder="e.g. Broilers, Layers, Guinea Fowl" />
              </>
            )}

            {/* Meat processing fields */}
            {showProcessing && (
              <>
                <Text style={styles.sectionDiv}>Processing Facility</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <InputField label="Daily Capacity (birds) *" value={form.daily_capacity} onChangeText={v => set('daily_capacity', v)} keyboardType="numeric" placeholder="e.g. 500" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <InputField label="Cold Storage (units)" value={form.cold_storage_capacity} onChangeText={v => set('cold_storage_capacity', v)} keyboardType="numeric" placeholder="e.g. 1000" />
                  </View>
                </View>
                <InputField label="Key Equipment" value={form.processing_equipment} onChangeText={v => set('processing_equipment', v)} placeholder="e.g. Scalder, plucker..." />
              </>
            )}

            {/* Location */}
            <Text style={styles.sectionDiv}>Location</Text>
            <Text style={styles.label}>Region *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              {REGIONS.map(r => (
                <TouchableOpacity key={r} onPress={() => set('region', r)} style={[styles.farmerChip, form.region === r && styles.farmerChipActive]}>
                  <Text style={[styles.farmerChipText, form.region === r && { color: Colors.leaf }]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <InputField label="District *" value={form.district} onChangeText={v => set('district', v)} placeholder="e.g. Tamale Metro" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <InputField label="Community" value={form.community} onChangeText={v => set('community', v)} placeholder="e.g. Lamashegu" />
              </View>
              <View style={{ flex: 1 }}>
                <InputField label="GPS Address" value={form.gps_address} onChangeText={v => set('gps_address', v)} placeholder="e.g. NR-0234-5671" />
              </View>
            </View>
            <InputField label="Farm Size (acres)" value={form.farm_size_acres} onChangeText={v => set('farm_size_acres', v)} keyboardType="decimal-pad" placeholder="e.g. 2.5" />

            {/* Utilities */}
            <Text style={styles.sectionDiv}>Utilities</Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Has Water Source</Text>
              <Switch value={form.has_water_source} onValueChange={v => set('has_water_source', v)} trackColor={{ true: Colors.leaf }} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Has Electricity</Text>
              <Switch value={form.has_electricity} onValueChange={v => set('has_electricity', v)} trackColor={{ true: Colors.leaf }} />
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Button label="Cancel" onPress={() => setShowModal(false)} variant="secondary" style={{ flex: 1 }} />
              <Button label="Register Farm" onPress={submit} loading={saving} variant="primary" style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar:         { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  search:          { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: Colors.ink },
  statsRow:        { flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.sm, gap: 8 },
  statBox:         { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statVal:         { fontSize: 22, fontWeight: '700', color: Colors.ink },
  statKey:         { fontSize: 10, color: Colors.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  farmCard:        { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  farmHeader:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  farmName:        { fontSize: 14, fontWeight: '700', color: Colors.ink },
  farmMeta:        { fontSize: 12, color: Colors.muted, marginTop: 2 },
  utilRow:         { flexDirection: 'row', gap: 6 },
  utilTag:         { backgroundColor: Colors.sky, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  utilText:        { fontSize: 11, color: Colors.muted, fontWeight: '500' },
  label:           { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  groupLabel:      { fontSize: 11, fontWeight: '600', color: Colors.muted, marginBottom: 6 },
  typeGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  typeBtn:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  typeBtnActive:   { borderColor: Colors.leaf, backgroundColor: Colors.sky },
  typeBtnText:     { fontSize: 12, color: Colors.muted },
  sectionDiv:      { fontSize: 12, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, marginTop: 8, marginBottom: 12 },
  farmerChip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white, marginRight: 8 },
  farmerChipActive:{ borderColor: Colors.leaf, backgroundColor: Colors.sky },
  farmerChipText:  { fontSize: 13, color: Colors.muted },
  infoBanner:      { backgroundColor: '#E3F2FD', padding: 10, borderRadius: 8, marginBottom: 12 },
  infoBannerText:  { fontSize: 12, color: Colors.info },
  switchRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, padding: 14, borderRadius: Radius.sm, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  switchLabel:     { fontSize: 14, color: Colors.ink },
});
