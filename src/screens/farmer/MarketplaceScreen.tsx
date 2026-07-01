import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { marketApi, farmsApi, toArray } from '../../api/client';
import { Colors as C, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Badge, Button, SectionTitle, FormLabel, EmptyState, AlertBanner } from '../../components/ui';
import type { Produce, Order, Farm } from '../../types';

const PRODUCE_TYPES = [
  { value:'broilers',    label:'🐔 Broilers' },
  { value:'layers',      label:'🐓 Layer Birds' },
  { value:'eggs',        label:'🥚 Eggs' },
  { value:'day_old',     label:'🐣 Day-Old Chicks' },
  { value:'smoked',      label:'🍗 Smoked Chicken' },
  { value:'guinea_fowl', label:'🦃 Guinea Fowl' },
  { value:'turkey',      label:'🦚 Turkey' },
  { value:'duck',        label:'🦆 Duck' },
  { value:'quail',       label:'🐦 Quail' },
  { value:'other',       label:'📦 Other' },
];
const EGG_SIZES = ['small','medium','large','jumbo'];
const PAYMENT_OPTIONS = [
  { key: 'accepts_momo',          label: '📱 MoMo',                hint: 'MTN Mobile Money (Direct)' },
  { key: 'accepts_hubtel_momo',   label: '📲 Mobile Money (Other)', hint: 'Telecel / AirtelTigo via Hubtel' },
  { key: 'accepts_card',          label: '💳 Card',                 hint: 'Hubtel' },
  { key: 'accepts_bank_transfer', label: '🏦 Bank Transfer',        hint: 'Direct bank' },
  { key: 'accepts_cod',           label: '💵 Cash on Delivery',     hint: 'Pay on pickup/delivery' },
];
const ORDER_STATUS_BADGE: Record<string, any> = {
  pending:'warning', confirmed:'info', dispatched:'info', delivered:'success', cancelled:'danger',
};

export default function FarmerMarketplaceScreen() {
  const [listings,  setListings]  = useState<Produce[]>([]);
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [farms,     setFarms]     = useState<Farm[]>([]);
  const [refreshing,setRefreshing]= useState(false);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [confirming,setConfirming]= useState<string|null>(null);

  // Form state
  const [farmId,    setFarmId]    = useState('');
  const [name,      setName]      = useState('');
  const [type,      setType]      = useState('broilers');
  const [qty,       setQty]       = useState('');
  const [unit,      setUnit]      = useState('bird');
  const [price,     setPrice]     = useState('');
  const [desc,      setDesc]      = useState('');
  const [eggSize,   setEggSize]   = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [photo,     setPhoto]     = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string|null>(null);
  const [paymentMethods, setPaymentMethods] = useState({
    accepts_momo: true, accepts_hubtel_momo: false, accepts_card: false,
    accepts_bank_transfer: false, accepts_cod: true,
  });

  const isEggs = type === 'eggs';

  const load = async () => {
    const [l, o, f] = await Promise.allSettled([
      marketApi.listProduce(), marketApi.listOrders(), farmsApi.list(),
    ]);
    if (l.status === 'fulfilled') setListings(toArray(l.value.data));
    if (o.status === 'fulfilled') setOrders(toArray(o.value.data));
    if (f.status === 'fulfilled') setFarms(toArray(f.value.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const togglePayment = (key: keyof typeof paymentMethods) => setPaymentMethods(p => ({ ...p, [key]: !p[key] }));

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access in your device settings to add a produce photo.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [ImagePicker.MediaType.Images], quality: 0.8 });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; setPhotoPreview(a.uri); setPhoto({ uri: a.uri, name: 'photo.jpg', type: 'image/jpeg' }); }
  };

  const resetForm = () => {
    setName(''); setType('broilers'); setQty(''); setUnit('bird'); setPrice('');
    setDesc(''); setEggSize(''); setPhoto(null); setPhotoPreview(null); setFarmId('');
    setContactPhone('');
    setPaymentMethods({ accepts_momo: true, accepts_hubtel_momo: false, accepts_card: false, accepts_bank_transfer: false, accepts_cod: true });
  };

  const handleCreate = async () => {
    if (!name || !qty || !price) return;
    if (isEggs && !eggSize) { setError('Please select an egg size.'); return; }
    if (!Object.values(paymentMethods).some(Boolean)) { setError('Please select at least one accepted payment method.'); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('name', name); fd.append('produce_type', type);
      fd.append('quantity_available', qty); fd.append('unit', unit);
      fd.append('price', price); fd.append('description', desc);
      if (farmId) fd.append('farm', farmId);
      if (isEggs && eggSize) fd.append('egg_size', eggSize);
      if (photo) fd.append('photo', photo as any);
      if (contactPhone) fd.append('contact_phone', contactPhone);
      fd.append('accepts_momo',          String(paymentMethods.accepts_momo));
      fd.append('accepts_hubtel_momo',   String(paymentMethods.accepts_hubtel_momo));
      fd.append('accepts_card',          String(paymentMethods.accepts_card));
      fd.append('accepts_bank_transfer', String(paymentMethods.accepts_bank_transfer));
      fd.append('accepts_cod',           String(paymentMethods.accepts_cod));
      await marketApi.createListing(fd as any);
      setShowForm(false); resetForm(); await load();
    } catch { setError('Could not create listing. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleConfirm = async (orderId: string) => {
    setConfirming(orderId);
    try { await marketApi.confirmOrder(orderId); await load(); }
    catch {}
    finally { setConfirming(null); }
  };

  const newOrders = orders.filter(o => o.status === 'pending').length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader
        title="Marketplace"
        subtitle="List your produce and manage orders from buyers."
        action={<Button size="sm" onPress={() => { setShowForm(s => !s); if (showForm) resetForm(); }}>{showForm ? 'Cancel' : '+ New Listing'}</Button>}
      />

      {/* New Listing Form */}
      {showForm && (
        <Card style={{ marginBottom: Spacing.lg }}>
          <SectionTitle>New Produce Listing</SectionTitle>
          {error ? <Text style={s.error}>{error}</Text> : null}

          <FormLabel>Product Photo</FormLabel>
          <Button variant="secondary" onPress={pickPhoto} style={{ marginBottom: Spacing.sm }}>
            {photo ? '📷 Change Photo' : '📷 Upload Photo'}
          </Button>
          {photoPreview && <Image source={{ uri: photoPreview }} style={{ width: '100%', height: 140, borderRadius: Radius.sm, marginBottom: Spacing.sm, resizeMode: 'cover' }} />}

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <FormLabel required>Name</FormLabel>
              <TextInput style={s.input} placeholder="e.g. Fresh Broilers" value={name} onChangeText={setName} />
            </View>
            <View style={{ flex: 1 }}>
              <FormLabel>Type</FormLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {PRODUCE_TYPES.map(t => (
                  <TouchableOpacity key={t.value} style={[s.chip, type === t.value && s.chipActive]} onPress={() => { setType(t.value); setEggSize(''); }}>
                    <Text style={{ fontSize: 11, color: type === t.value ? '#fff' : C.muted }}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {isEggs && (
            <>
              <FormLabel required>Egg Size</FormLabel>
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm, flexWrap: 'wrap' }}>
                {EGG_SIZES.map(sz => (
                  <TouchableOpacity key={sz} style={[s.chip, eggSize === sz && s.chipActive]} onPress={() => setEggSize(sz)}>
                    <Text style={{ fontSize: 12, color: eggSize === sz ? '#fff' : C.muted }}>🥚 {sz.charAt(0).toUpperCase()+sz.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <FormLabel required>Quantity</FormLabel>
              <TextInput style={s.input} keyboardType="number-pad" placeholder="e.g. 50" value={qty} onChangeText={setQty} />
            </View>
            <View style={{ flex: 1 }}>
              <FormLabel>Unit</FormLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['bird','kg','crate','tray','dozen','bag'].map(u => (
                  <TouchableOpacity key={u} style={[s.chip, unit === u && s.chipActive]} onPress={() => setUnit(u)}>
                    <Text style={{ fontSize: 12, color: unit === u ? '#fff' : C.muted }}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={{ flex: 1 }}>
              <FormLabel required>Price (GHS)</FormLabel>
              <TextInput style={s.input} keyboardType="decimal-pad" placeholder="e.g. 45.00" value={price} onChangeText={setPrice} />
            </View>
          </View>

          {farms.length > 0 && (
            <>
              <FormLabel>Farm</FormLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
                <TouchableOpacity style={[s.chip, !farmId && s.chipActive]} onPress={() => setFarmId('')}>
                  <Text style={{ fontSize: 12, color: !farmId ? '#fff' : C.muted }}>— Select farm —</Text>
                </TouchableOpacity>
                {farms.map(f => (
                  <TouchableOpacity key={f.id} style={[s.chip, farmId === f.id && s.chipActive]} onPress={() => setFarmId(f.id)}>
                    <Text style={{ fontSize: 12, color: farmId === f.id ? '#fff' : C.muted }}>{f.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <FormLabel>Description</FormLabel>
          <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} multiline placeholder="Describe the produce quality, weight range, availability…" value={desc} onChangeText={setDesc} />

          {/* Contact & Payment */}
          <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: Spacing.md, marginTop: Spacing.sm }}>
            <Text style={{ fontSize: 13, fontWeight: '600', marginBottom: Spacing.sm }}>Contact & Payment</Text>
            <FormLabel>📞 Contact Phone</FormLabel>
            <TextInput style={s.input} keyboardType="phone-pad" placeholder="e.g. 024 000 0000" value={contactPhone} onChangeText={setContactPhone} />
            <Text style={{ fontSize: 11, color: C.muted, marginTop: -Spacing.sm, marginBottom: Spacing.sm }}>Buyers will see this number to coordinate pickup/delivery.</Text>

            <FormLabel required>Accepted Payment Methods</FormLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm }}>
              {PAYMENT_OPTIONS.map(opt => {
                const active = paymentMethods[opt.key as keyof typeof paymentMethods];
                return (
                  <TouchableOpacity key={opt.key} style={[s.chip, active && s.chipActive]} onPress={() => togglePayment(opt.key as keyof typeof paymentMethods)}>
                    <Text style={{ fontSize: 12, color: active ? '#fff' : C.muted }}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={{ fontSize: 11, color: C.muted, marginBottom: Spacing.sm }}>Select all that apply. Buyers will see these options when placing an order.</Text>
          </View>

          <Button fullWidth disabled={!name||!qty||!price||saving||(isEggs&&!eggSize)} loading={saving} onPress={handleCreate}>
            Publish Listing
          </Button>
        </Card>
      )}

      {/* My Listings */}
      <SectionTitle>My Listings ({listings.length})</SectionTitle>
      {listings.length === 0
        ? <Card><EmptyState icon="📦" text="No listings yet. Add your first produce listing above." /></Card>
        : listings.map(p => (
          <Card key={p.id}>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ width: 56, height: 56, borderRadius: Radius.sm, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                <Text style={{ fontSize: 24 }}>🐔</Text>
                {p.photo && <Image source={{ uri: p.photo }} style={{ position: 'absolute', width: '100%', height: '100%' }} resizeMode="cover" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700' }}>{p.name}</Text>
                {p.egg_size && <Text style={{ fontSize: 11, color: C.muted }}>{p.egg_size} eggs</Text>}
                <Text style={{ fontSize: 13 }}>GHS {parseFloat(p.price).toLocaleString()} / {p.unit}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  <Badge variant={p.status === 'active' ? 'success' : 'neutral'}>{p.status.replace('_',' ')}</Badge>
                  {(p as any).accepts_momo      && <Badge variant="warning">📱 MoMo</Badge>}
                  {(p as any).accepts_hubtel_momo && <Badge variant="warning">📲 MoMo (Other)</Badge>}
                  {(p as any).accepts_card      && <Badge variant="info">💳 Card</Badge>}
                  {(p as any).accepts_bank_transfer && <Badge variant="info">🏦 Bank</Badge>}
                  {(p as any).accepts_cod       && <Badge variant="success">💵 CoD</Badge>}
                </View>
                {(p as any).contact_phone && <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>📞 {(p as any).contact_phone}</Text>}
              </View>
            </View>
          </Card>
        ))
      }

      {/* Incoming Orders */}
      <SectionTitle>
        Incoming Orders ({orders.length})
        {newOrders > 0 && <Text style={{ color: C.danger, fontWeight: '700' }}> · {newOrders} new</Text>}
      </SectionTitle>
      {orders.length === 0
        ? <Card><EmptyState icon="📦" text="No orders received yet." /></Card>
        : orders.map(o => (
          <Card key={o.id} style={o.status === 'pending' ? { backgroundColor: '#FFFDF0' } : {}}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>{o.reference || o.id.slice(0,8)}</Text>
                {o.items?.map(i => (
                  <Text key={i.id} style={{ fontSize: 13 }}>
                    <Text style={{ fontWeight: '700' }}>{i.produce_name}</Text>
                    <Text style={{ color: C.muted }}> × {i.quantity} @ GHS {parseFloat(i.unit_price).toLocaleString()}</Text>
                  </Text>
                ))}
                <Text style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                  {o.delivery_type === 'delivery' ? '🚚 Delivery' : '📍 Pickup'}{o.delivery_address ? ` · ${o.delivery_address}` : ''}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', marginTop: 2 }}>GHS {parseFloat(o.total_amount).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Badge variant={ORDER_STATUS_BADGE[o.status] ?? 'neutral'}>{o.status}</Badge>
                {o.status === 'pending' && (
                  <Button size="sm" disabled={confirming === o.id} loading={confirming === o.id} onPress={() => handleConfirm(o.id)}>Confirm</Button>
                )}
              </View>
            </View>
          </Card>
        ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  input: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.ink, marginBottom: Spacing.sm },
  error: { fontSize: 13, color: C.danger, marginBottom: Spacing.sm, padding: Spacing.sm, backgroundColor: C.dangerBg, borderRadius: Radius.sm },
  chip:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1, borderColor: C.border, marginRight: Spacing.xs, marginBottom: Spacing.xs },
  chipActive: { backgroundColor: C.primary, borderColor: C.primary },
});
