import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, Alert, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { inputsApi } from '../../api/client';
import { FarmInput } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, SectionTitle, Button, Pill, EmptyState, ErrorBanner, StatCard, InputField } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

const INPUT_TYPES = ['feed', 'vaccine', 'medication', 'equipment', 'supplement', 'disinfectant', 'other'];

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function DealerDashboard() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [listings,   setListings]   = useState<FarmInput[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await inputsApi.myListings();
      setListings(res.data.results ?? res.data);
    } catch { setError('Could not load listings.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active     = listings.filter(l => l.is_available);
  const totalValue = listings.reduce((s, l) => s + parseFloat(l.price) * l.quantity_available, 0);

  return (
    <Screen title="Input Dealer" subtitle={`${user?.first_name} ${user?.last_name}`}>
      {error ? <ErrorBanner message={error} /> : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.sm }}>
          <StatCard label="Active Listings"  value={active.length.toString()} />
          <StatCard label="Total Stock Value" value={`GHS ${totalValue.toLocaleString()}`} />
        </View>

        {/* Quick nav */}
        <View style={{ paddingHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: 4 }}>
          <Button label="+ Add New Input" onPress={() => navigation.navigate('Menu', { screen: 'Listings' })} variant="primary" fullWidth />
        </View>

        <SectionTitle title="My Listings" action="Manage all" onAction={() => navigation.navigate('Menu', { screen: 'Listings' })} />
        {listings.length === 0
          ? <EmptyState message="No listings yet. Tap 'Add New Input' above to get started." icon="🏪" />
          : listings.slice(0, 5).map(l => (
              <Card key={l.id} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{l.name}</Text>
                    <Text style={styles.meta}>{l.input_type} · {l.brand || 'No brand'}</Text>
                    <Text style={styles.meta}>Stock: {l.quantity_available} {l.unit}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.price}>GHS {parseFloat(l.price).toLocaleString()} / {l.unit}</Text>
                    <Pill label={l.is_available ? 'Available' : 'Out of Stock'} variant={l.is_available ? 'green' : 'red'} style={{ marginTop: 4 }} />
                  </View>
                </View>
              </Card>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

export default DealerDashboard;

// ── Listings ──────────────────────────────────────────────────────────────────
export function DealerListings() {
  const [listings,   setListings]   = useState<FarmInput[]>([]);
  const [showForm,   setShowForm]   = useState(false);
  const [name,       setName]       = useState('');
  const [inputType,  setInputType]  = useState('feed');
  const [brand,      setBrand]      = useState('');
  const [price,      setPrice]      = useState('');
  const [unit,       setUnit]       = useState('kg');
  const [qty,        setQty]        = useState('');
  const [minOrder,   setMinOrder]   = useState('1');
  const [desc,       setDesc]       = useState('');
  const [saving,     setSaving]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await inputsApi.myListings();
      setListings(res.data.results ?? res.data);
    } catch { setError('Could not load listings.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setName(''); setBrand(''); setPrice(''); setQty(''); setDesc('');
    setInputType('feed'); setUnit('kg'); setMinOrder('1');
  }

  async function save() {
    if (!name || !price || !qty) {
      Alert.alert('Missing Fields', 'Name, price, and quantity are required.');
      return;
    }
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }
    setSaving(true);
    try {
      await inputsApi.createInput({
        name,
        input_type:        inputType,
        brand,
        price,
        unit,
        quantity_available: parseInt(qty),
        min_order_quantity: parseInt(minOrder) || 1,
        description:        desc,
      });
      Alert.alert('Created', 'Input listing created successfully.');
      resetForm();
      setShowForm(false);
      load();
    } catch (e: any) {
      console.log('INPUT ERROR:', JSON.stringify(e?.response?.data));
      const msg = e?.response?.data?.detail
               ?? Object.values(e?.response?.data ?? {}).flat().join('\n')
               ?? 'Could not create listing.';
      Alert.alert('Error', msg);
    } finally { setSaving(false); }
  }

  async function toggleAvailability(id: string, current: boolean) {
    try {
      await inputsApi.updateInput(id, { is_available: !current });
      load();
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
  }

  async function deleteInput(id: string, itemName: string) {
    Alert.alert('Delete Listing', `Remove "${itemName}" from your listings?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try { await inputsApi.deleteInput(id); load(); }
          catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
        }},
    ]);
  }

  return (
    <Screen title="My Listings">
      {error ? <ErrorBanner message={error} /> : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md }}>
          <Button
            label={showForm ? 'Cancel' : '+ Add New Input'}
            onPress={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
            variant={showForm ? 'secondary' : 'primary'}
          />
        </View>

        {showForm && (
          <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.sm }}>
            <InputField label="Input Name *" value={name}  onChangeText={setName}  placeholder="e.g. Broiler Starter Feed" />
            <InputField label="Brand"        value={brand} onChangeText={setBrand} placeholder="e.g. Kumasi Mills" />

            <Text style={styles.fieldLabel}>Input Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md }}>
              {INPUT_TYPES.map(t => (
                <TouchableOpacity key={t} onPress={() => setInputType(t)} style={[styles.typeBtn, inputType === t && styles.typeBtnActive]}>
                  <Text style={[styles.typeBtnText, inputType === t && { color: Colors.leaf }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><InputField label="Price (GHS) *" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="0.00" /></View>
              <View style={{ flex: 1 }}><InputField label="Unit"          value={unit}  onChangeText={setUnit}  placeholder="kg, bag, vial..." /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><InputField label="Qty Available *" value={qty}      onChangeText={setQty}      keyboardType="numeric" placeholder="0" /></View>
              <View style={{ flex: 1 }}><InputField label="Min Order Qty"   value={minOrder} onChangeText={setMinOrder} keyboardType="numeric" placeholder="1" /></View>
            </View>
            <InputField label="Description" value={desc} onChangeText={setDesc} placeholder="Optional details..." multiline numberOfLines={3} style={{ height: 70, textAlignVertical: 'top' }} />
            <Button label="Save Listing" onPress={save} loading={saving} fullWidth />
          </View>
        )}

        <SectionTitle title="All Listings" />
        {listings.length === 0
          ? <EmptyState message="No listings yet. Add your first farm input above." icon="📦" />
          : listings.map(l => (
              <Card key={l.id} style={styles.card}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{l.name}</Text>
                    <Text style={styles.meta}>{l.brand || '—'} · {l.input_type} · {l.unit}</Text>
                    <Text style={styles.meta}>Stock: {l.quantity_available} · Min order: {l.min_order_quantity}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.price}>GHS {parseFloat(l.price).toLocaleString()}</Text>
                    <Pill label={l.is_available ? 'Available' : 'Out of Stock'} variant={l.is_available ? 'green' : 'red'} style={{ marginTop: 4 }} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button
                    label={l.is_available ? 'Mark Out of Stock' : 'Mark Available'}
                    onPress={() => toggleAvailability(l.id, l.is_available)}
                    variant="secondary"
                    size="sm"
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="Delete"
                    onPress={() => deleteInput(l.id, l.name)}
                    variant="danger"
                    size="sm"
                    style={{ flex: 1 }}
                  />
                </View>
              </Card>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card:         { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  name:         { fontSize: 14, fontWeight: '700', color: Colors.ink },
  meta:         { fontSize: 12, color: Colors.muted, marginTop: 2 },
  price:        { fontSize: 15, fontWeight: '700', color: Colors.leaf },
  fieldLabel:   { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  typeBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  typeBtnActive:{ borderColor: Colors.leaf, backgroundColor: Colors.sky },
  typeBtnText:  { fontSize: 11, fontWeight: '600', color: Colors.muted, textTransform: 'capitalize' },
});
