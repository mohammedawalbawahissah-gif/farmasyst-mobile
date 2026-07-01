import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { inputsApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Badge, Button, SectionTitle, FormLabel, EmptyState, AlertBanner } from '../../components/ui';
import type { FarmInput } from '../../types';

const INPUT_TYPES = ['feed','vaccine','medication','equipment','supplement','disinfectant','other'];
const INPUT_TYPE_ICON: Record<string, string> = {
  feed:'🌾', vaccine:'💉', medication:'💊', equipment:'🔧', supplement:'⚗️', disinfectant:'🧴', other:'📦',
};
const REGIONS = ['Northern Region','Savannah Region','North East Region','Upper East Region','Upper West Region','Ashanti Region','Greater Accra Region','Eastern Region','Western Region','Central Region','Volta Region','Brong-Ahafo Region','Bono Region','Bono East Region','Ahafo Region','Western North Region','Oti Region'];

export default function InputDealerListingsScreen() {
  const [listings,   setListings]   = useState<FarmInput[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<FarmInput | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  // Form state - all fields
  const [name,         setName]         = useState('');
  const [inputType,    setInputType]    = useState('feed');
  const [brand,        setBrand]        = useState('');
  const [description,  setDescription]  = useState('');
  const [unit,         setUnit]         = useState('bag');
  const [price,        setPrice]        = useState('');
  const [qty,          setQty]          = useState('');
  const [minOrder,     setMinOrder]     = useState('1');
  const [region,       setRegion]       = useState('Northern Region');
  const [isAvailable,  setIsAvailable]  = useState(true);
  const [photo,        setPhoto]        = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string|null>(null);

  const load = async () => {
    const r = await inputsApi.myListings();
    setListings(toArray(r.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openCreate = () => {
    setEditing(null); setName(''); setInputType('feed'); setBrand(''); setDescription('');
    setUnit('bag'); setPrice(''); setQty(''); setMinOrder('1'); setRegion('Northern Region');
    setIsAvailable(true); setPhoto(null); setPhotoPreview(null);
    setShowForm(true); setError('');
  };
  const openEdit = (inp: FarmInput) => {
    setEditing(inp); setName(inp.name); setInputType(inp.input_type); setBrand(inp.brand);
    setDescription(inp.description); setUnit(inp.unit); setPrice(inp.price);
    setQty(String(inp.quantity_available)); setMinOrder(String(inp.min_order_quantity));
    setRegion(inp.region); setIsAvailable(inp.is_available); setPhoto(null); setPhotoPreview(null);
    setShowForm(true); setError('');
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setError(''); };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access in your device settings to add a product photo.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [ImagePicker.MediaType.Images], quality: 0.8 });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; setPhotoPreview(a.uri); setPhoto({ uri: a.uri, name: 'photo.jpg', type: 'image/jpeg' }); }
  };

  const handleSave = async () => {
    if (!name || !price || !qty) { setError('Name, price, and quantity are required.'); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('name',               name);
      fd.append('input_type',         inputType);
      fd.append('brand',              brand);
      fd.append('description',        description);
      fd.append('unit',               unit);
      fd.append('price',              price);
      fd.append('quantity_available', qty);
      fd.append('min_order_quantity', minOrder);
      fd.append('region',             region);
      fd.append('is_available',       String(isAvailable));
      if (photo) fd.append('photo', photo as any);

      if (editing) await inputsApi.updateInput(editing.id, fd as any);
      else         await inputsApi.createInput(fd as any);

      setSuccess(editing ? 'Listing updated!' : 'Listing created!');
      closeForm(); await load();
    } catch (e: any) { setError(e?.response?.data?.detail || 'Save failed. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await inputsApi.deleteInput(id); await load(); }
    catch { setError('Failed to delete listing.'); }
  };

  const handleToggle = async (inp: FarmInput) => {
    try {
      const fd = new FormData();
      fd.append('is_available', String(!inp.is_available));
      await inputsApi.updateInput(inp.id, fd as any);
      await load();
    } catch {}
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader title="My Listings" subtitle="Manage your farm input products available to farmers."
        action={<Button size="sm" onPress={openCreate}>+ New Listing</Button>}
      />
      {error   ? <AlertBanner variant="danger">{error}</AlertBanner>   : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {/* Form */}
      {showForm && (
        <Card style={{ marginBottom: Spacing.lg, borderColor: Colors.primary, borderWidth: 1 }}>
          <SectionTitle>{editing ? 'Edit Listing' : 'New Product Listing'}</SectionTitle>

          <FormLabel>Product Photo</FormLabel>
          <Button variant="secondary" onPress={pickPhoto} style={{ marginBottom: Spacing.sm }}>
            {photo ? '📷 Change Photo' : '📷 Upload Photo (Optional)'}
          </Button>
          {photoPreview && (
            <Image source={{ uri: photoPreview }} style={{ width: '100%', height: 130, borderRadius: Radius.sm, marginBottom: Spacing.sm, resizeMode: 'cover' }} />
          )}

          <FormLabel required>Product Name</FormLabel>
          <TextInput style={s.input} placeholder="e.g. Broiler Starter Feed 25kg" value={name} onChangeText={setName} />

          <FormLabel>Product Type</FormLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm }}>
            {INPUT_TYPES.map(t => (
              <TouchableOpacity key={t} style={[s.chip, inputType === t && s.chipActive]} onPress={() => setInputType(t)}>
                <Text style={{ fontSize: 12, color: inputType === t ? '#fff' : Colors.muted, fontWeight: '600' }}>
                  {INPUT_TYPE_ICON[t]} {t.charAt(0).toUpperCase()+t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FormLabel>Brand / Manufacturer</FormLabel>
          <TextInput style={s.input} placeholder="e.g. Tata, Gafco, Excel" value={brand} onChangeText={setBrand} />

          <FormLabel>Description</FormLabel>
          <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} multiline placeholder="Describe the product — type, benefits, usage instructions…" value={description} onChangeText={setDescription} />

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <FormLabel required>Price (GHS)</FormLabel>
              <TextInput style={s.input} keyboardType="decimal-pad" placeholder="e.g. 120.00" value={price} onChangeText={setPrice} />
            </View>
            <View style={{ flex: 1 }}>
              <FormLabel>Unit</FormLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['bag','kg','litre','pack','vial','tray','piece'].map(u => (
                  <TouchableOpacity key={u} style={[s.chip, unit === u && s.chipActive]} onPress={() => setUnit(u)}>
                    <Text style={{ fontSize: 11, color: unit === u ? '#fff' : Colors.muted }}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <FormLabel required>Quantity in Stock</FormLabel>
              <TextInput style={s.input} keyboardType="number-pad" placeholder="e.g. 100" value={qty} onChangeText={setQty} />
            </View>
            <View style={{ flex: 1 }}>
              <FormLabel>Min. Order Quantity</FormLabel>
              <TextInput style={s.input} keyboardType="number-pad" placeholder="1" value={minOrder} onChangeText={setMinOrder} />
            </View>
          </View>

          <FormLabel>Region</FormLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
            {REGIONS.map(r => (
              <TouchableOpacity key={r} style={[s.chip, region === r && s.chipActive]} onPress={() => setRegion(r)}>
                <Text style={{ fontSize: 11, color: region === r ? '#fff' : Colors.muted }}>📍 {r.replace(' Region','')}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={[s.toggleOpt, isAvailable && s.toggleOptActive]} onPress={() => setIsAvailable(a => !a)}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: isAvailable ? Colors.success : Colors.muted }}>
              {isAvailable ? '✅ Available for Order' : '⛔ Not Available'}
            </Text>
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
            <Button onPress={handleSave} disabled={!name||!price||!qty||saving} loading={saving} style={{ flex: 1 }}>
              {editing ? 'Update Listing' : 'Publish Listing'}
            </Button>
            <Button variant="secondary" onPress={closeForm}>Cancel</Button>
          </View>
        </Card>
      )}

      {/* Listings */}
      {listings.length === 0
        ? <EmptyState icon="🏪" text='No listings yet. Tap "+ New Listing" to add your first product.' />
        : listings.map(inp => (
          <Card key={inp.id}>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ width: 52, height: 52, borderRadius: Radius.sm, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {inp.photo
                  ? <Image source={{ uri: inp.photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  : <Text style={{ fontSize: 22 }}>{INPUT_TYPE_ICON[inp.input_type] ?? '📦'}</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700' }}>{inp.name}</Text>
                {inp.brand && <Text style={{ fontSize: 11, color: Colors.muted }}>{inp.brand}</Text>}
                <Text style={{ fontSize: 13, marginTop: 2 }}>GHS {parseFloat(inp.price).toLocaleString()} / {inp.unit}</Text>
                <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                  <Badge variant={inp.is_available ? 'success' : 'neutral'}>{inp.is_available ? 'In Stock' : 'Out of Stock'}</Badge>
                  <Badge variant="neutral">{inp.quantity_available} {inp.unit}</Badge>
                  {inp.region && <Badge variant="neutral">📍 {inp.region.replace(' Region','')}</Badge>}
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <Button size="sm" variant="secondary" onPress={() => openEdit(inp)}>✏️ Edit</Button>
              <Button size="sm" variant="ghost" onPress={() => handleToggle(inp)}>
                {inp.is_available ? 'Mark Out of Stock' : 'Mark In Stock'}
              </Button>
              <Button size="sm" variant="danger" onPress={() => handleDelete(inp.id)}>Delete</Button>
            </View>
          </Card>
        ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  input:       { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  chip:        { paddingHorizontal: 11, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, marginRight: 6, marginBottom: 4 },
  chipActive:  { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleOpt:   { padding: Spacing.sm + 2, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', marginBottom: Spacing.sm },
  toggleOptActive: { borderColor: Colors.success, backgroundColor: Colors.successBg },
});
