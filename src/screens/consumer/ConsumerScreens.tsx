import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image } from 'react-native';
import { marketApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Badge, Button, SectionTitle, FormLabel, EmptyState, AlertBanner } from '../../components/ui';
import type { Produce, Order } from '../../types';

const PRODUCE_TYPE_LABEL: Record<string, string> = {
  broilers:'🐔 Broilers', layers:'🐓 Layers', eggs:'🥚 Eggs', day_old:'🐣 Day-Old Chicks',
  smoked:'🍗 Smoked', guinea_fowl:'🦃 Guinea Fowl', turkey:'🦚 Turkey', duck:'🦆 Duck', quail:'🐦 Quail', other:'📦 Other',
};
const PAYMENT_METHODS = [
  { value:'mtn_momo',       label:'📱 MTN Mobile Money' },
  { value:'telecel_momo',   label:'📲 Telecel MoMo' },
  { value:'hubtel',         label:'🔗 Hubtel' },
  { value:'card',           label:'💳 Card' },
  { value:'bank_transfer',  label:'🏦 Bank Transfer' },
  { value:'cash_on_delivery',label:'💵 Cash on Delivery' },
];
const ORDER_STATUS_BADGE: Record<string, any> = {
  pending:'warning', confirmed:'info', dispatched:'info', delivered:'success', cancelled:'danger',
};

// ── Consumer Marketplace ─────────────────────────────────────────────────────
export function ConsumerMarketplace() {
  const [produce,    setProduce]    = useState<Produce[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Order form
  const [ordering,   setOrdering]   = useState<Produce | null>(null);
  const [qty,        setQty]        = useState('1');
  const [delivery,   setDelivery]   = useState<'pickup'|'delivery'>('pickup');
  const [address,    setAddress]    = useState('');
  const [payMethod,  setPayMethod]  = useState('mtn_momo');
  const [notes,      setNotes]      = useState('');
  const [placing,    setPlacing]    = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const load = async () => {
    const r = await marketApi.listProduce({ status: 'active' });
    setProduce(toArray(r.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const allTypes = [...new Set(produce.map(p => p.produce_type))];

  const filtered = produce.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || p.farm_name.toLowerCase().includes(q) || p.farm_region.toLowerCase().includes(q);
    const matchType   = !typeFilter || p.produce_type === typeFilter;
    return matchSearch && matchType;
  });

  const openOrder = (p: Produce) => {
    setOrdering(p); setQty('1'); setDelivery('pickup'); setAddress('');
    setPayMethod('mtn_momo'); setNotes(''); setError(''); setSuccess('');
  };

  // Available payment methods for this listing
  const availableMethods = ordering ? PAYMENT_METHODS.filter(m => {
    const p = ordering as any;
    if (m.value === 'mtn_momo'        && p.accepts_momo)          return true;
    if (m.value === 'telecel_momo'    && p.accepts_hubtel_momo)   return true;
    if (m.value === 'hubtel'          && p.accepts_hubtel_momo)   return true;
    if (m.value === 'card'            && p.accepts_card)           return true;
    if (m.value === 'bank_transfer'   && p.accepts_bank_transfer) return true;
    if (m.value === 'cash_on_delivery' && (p.accepts_cod || p.accepts_cash_on_delivery)) return true;
    return false;
  }) : [];

  const handlePlaceOrder = async () => {
    if (!ordering) return;
    if (!qty || parseInt(qty) < 1) { setError('Please enter a valid quantity.'); return; }
    if (delivery === 'delivery' && !address.trim()) { setError('Please enter a delivery address.'); return; }
    if (!payMethod) { setError('Please select a payment method.'); return; }
    setPlacing(true); setError('');
    try {
      await marketApi.createOrder({
        items: [{ produce: ordering.id, quantity: parseInt(qty) }],
        delivery_type: delivery,
        delivery_address: address,
        payment_method: payMethod,
        notes,
      });
      setSuccess(`Order placed! Contact ${ordering.contact_phone || 'the farmer'} to coordinate ${delivery === 'delivery' ? 'delivery' : 'pickup'}.`);
      setOrdering(null); await load();
    } catch (e: any) { setError(e?.response?.data?.detail || 'Could not place order. Please try again.'); }
    finally { setPlacing(false); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader title="Marketplace" subtitle="Browse fresh poultry produce from farmers across northern Ghana." />

      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {/* Search */}
      <TextInput
        style={s.search}
        placeholder="🔍  Search by product, farm, or region…"
        placeholderTextColor={Colors.muted}
        value={search}
        onChangeText={setSearch}
      />

      {/* Type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
        <TouchableOpacity style={[s.chip, !typeFilter && s.chipActive]} onPress={() => setTypeFilter('')}>
          <Text style={[s.chipText, !typeFilter && s.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {allTypes.map(t => (
          <TouchableOpacity key={t} style={[s.chip, typeFilter === t && s.chipActive]} onPress={() => setTypeFilter(typeFilter === t ? '' : t)}>
            <Text style={[s.chipText, typeFilter === t && s.chipTextActive]}>{PRODUCE_TYPE_LABEL[t] ?? t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Order form modal */}
      {ordering && (
        <Card style={{ borderColor: Colors.primary, borderWidth: 1.5, marginBottom: Spacing.lg }}>
          <SectionTitle>Place Order — {ordering.name}</SectionTitle>
          <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm }}>
            {ordering.farm_name} · {ordering.farm_region} · GHS {parseFloat(ordering.price).toLocaleString()} / {ordering.unit}
          </Text>
          {error ? <Text style={s.error}>{error}</Text> : null}

          <FormLabel required>Quantity ({ordering.unit})</FormLabel>
          <TextInput style={s.input} keyboardType="number-pad" placeholder="1" value={qty} onChangeText={setQty} />
          <Text style={{ fontSize: 12, color: Colors.muted, marginTop: -Spacing.sm, marginBottom: Spacing.sm }}>
            Available: {ordering.quantity_available ?? ordering.quantity} {ordering.unit}
          </Text>

          <FormLabel required>Delivery Type</FormLabel>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }}>
            <TouchableOpacity style={[s.toggleBtn, delivery==='pickup' && s.toggleBtnActive]} onPress={() => setDelivery('pickup')}>
              <Text style={{ fontSize: 13, color: delivery==='pickup' ? '#fff' : Colors.muted, fontWeight: '600' }}>📍 Pickup</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.toggleBtn, delivery==='delivery' && s.toggleBtnActive]} onPress={() => setDelivery('delivery')}>
              <Text style={{ fontSize: 13, color: delivery==='delivery' ? '#fff' : Colors.muted, fontWeight: '600' }}>🚚 Delivery</Text>
            </TouchableOpacity>
          </View>

          {delivery === 'delivery' && (
            <>
              <FormLabel required>Delivery Address</FormLabel>
              <TextInput style={s.input} placeholder="Enter your delivery address" value={address} onChangeText={setAddress} />
            </>
          )}

          <FormLabel required>Payment Method</FormLabel>
          {availableMethods.length > 0 ? (
            availableMethods.map(m => (
              <TouchableOpacity key={m.value} style={[s.methodOpt, payMethod===m.value && s.methodOptActive]} onPress={() => setPayMethod(m.value)}>
                <Text style={{ fontSize: 13, color: payMethod===m.value ? Colors.primary : Colors.ink, fontWeight: payMethod===m.value ? '700' : '400' }}>{m.label}</Text>
              </TouchableOpacity>
            ))
          ) : (
            PAYMENT_METHODS.map(m => (
              <TouchableOpacity key={m.value} style={[s.methodOpt, payMethod===m.value && s.methodOptActive]} onPress={() => setPayMethod(m.value)}>
                <Text style={{ fontSize: 13, color: payMethod===m.value ? Colors.primary : Colors.ink, fontWeight: payMethod===m.value ? '700' : '400' }}>{m.label}</Text>
              </TouchableOpacity>
            ))
          )}

          {ordering.contact_phone && (
            <View style={{ backgroundColor: Colors.surface, padding: Spacing.sm, borderRadius: Radius.sm, marginVertical: Spacing.sm }}>
              <Text style={{ fontSize: 12, color: Colors.muted }}>📞 Farmer contact: <Text style={{ fontWeight: '700', color: Colors.ink }}>{ordering.contact_phone}</Text></Text>
            </View>
          )}

          <FormLabel>Additional Notes</FormLabel>
          <TextInput style={[s.input, { height: 60, textAlignVertical: 'top' }]} multiline placeholder="Any special instructions for the farmer…" value={notes} onChangeText={setNotes} />

          {/* Total */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: Spacing.sm, backgroundColor: Colors.surface, borderRadius: Radius.sm, marginBottom: Spacing.md }}>
            <Text style={{ fontSize: 14, color: Colors.muted }}>Estimated Total</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.primary }}>
              GHS {(parseFloat(ordering.price) * (parseInt(qty)||0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button onPress={handlePlaceOrder} disabled={placing} loading={placing} style={{ flex: 1 }}>
              Place Order
            </Button>
            <Button variant="secondary" onPress={() => setOrdering(null)}>Cancel</Button>
          </View>
        </Card>
      )}

      {/* Produce listings */}
      <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm }}>{filtered.length} products available</Text>
      {filtered.length === 0
        ? <EmptyState icon="🛒" text="No produce matches your search." />
        : filtered.map(p => (
          <Card key={p.id}>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ width: 60, height: 60, borderRadius: Radius.sm, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {p.photo
                  ? <Image source={{ uri: p.photo }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  : <Text style={{ fontSize: 28 }}>{p.produce_type === 'eggs' ? '🥚' : p.produce_type === 'smoked' ? '🍗' : '🐔'}</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700' }}>{p.name}</Text>
                {p.egg_size && <Badge variant="neutral">🥚 {p.egg_size}</Badge>}
                <Text style={{ fontSize: 12, color: Colors.muted }}>🏠 {p.farm_name} · 📍 {p.farm_region}</Text>
                {p.description && <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2, lineHeight: 17 }} numberOfLines={2}>{p.description}</Text>}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {(p as any).accepts_momo        && <Badge variant="warning">📱 MoMo</Badge>}
                  {(p as any).accepts_hubtel_momo  && <Badge variant="warning">📲 MoMo+</Badge>}
                  {(p as any).accepts_card         && <Badge variant="info">💳 Card</Badge>}
                  {(p as any).accepts_cod          && <Badge variant="success">💵 CoD</Badge>}
                </View>
                {p.contact_phone && <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 2 }}>📞 {p.contact_phone}</Text>}
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.primary }}>GHS {parseFloat(p.price).toLocaleString()}</Text>
                <Text style={{ fontSize: 11, color: Colors.muted }}>per {p.unit} · {p.quantity_available ?? p.quantity} available</Text>
              </View>
              <Button onPress={() => openOrder(p)}>Order Now</Button>
            </View>
          </Card>
        ))
      }
    </ScrollView>
  );
}

// ── Consumer Orders ──────────────────────────────────────────────────────────
export function ConsumerOrders() {
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState<string|null>(null);
  const [error,      setError]      = useState('');

  const load = async () => {
    const r = await marketApi.listOrders();
    setOrders(toArray(r.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleCancel = async (id: string) => {
    setCancelling(id); setError('');
    try { await marketApi.cancelOrder(id); await load(); }
    catch (e: any) { setError(e?.response?.data?.detail || 'Could not cancel order.'); }
    finally { setCancelling(null); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <PageHeader title="My Orders" subtitle="Track your poultry produce orders." />
      {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}

      {orders.length === 0
        ? <EmptyState icon="📦" text="No orders yet. Go to Marketplace to place your first order." />
        : orders.map(o => (
          <Card key={o.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{o.reference || o.id.slice(0,8)}</Text>
              <Badge variant={ORDER_STATUS_BADGE[o.status] ?? 'neutral'}>{o.status}</Badge>
            </View>
            {o.items?.map(i => (
              <Text key={i.id} style={{ fontSize: 13, fontWeight: '600' }}>
                {i.produce_name} × {i.quantity} @ GHS {parseFloat(i.unit_price).toLocaleString()}
              </Text>
            ))}
            {!o.items && o.produce_name && <Text style={{ fontSize: 13, fontWeight: '600' }}>{o.produce_name} × {o.quantity}</Text>}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ fontSize: 12, color: Colors.muted }}>
                {o.delivery_type === 'delivery' ? '🚚 Delivery' : '📍 Pickup'}
                {o.delivery_address ? ` · ${o.delivery_address}` : ''}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: Colors.primary }}>
                GHS {parseFloat(o.total_amount).toLocaleString()}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 2 }}>
              💳 {o.payment_method?.replace(/_/g,' ')} · {new Date(o.created_at).toLocaleDateString('en-GH')}
            </Text>
            {o.status === 'pending' && (
              <Button size="sm" variant="danger" onPress={() => handleCancel(o.id)} disabled={cancelling===o.id} loading={cancelling===o.id} style={{ marginTop: Spacing.sm, alignSelf: 'flex-start' }}>
                Cancel Order
              </Button>
            )}
          </Card>
        ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  search:       { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  input:        { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  error:        { fontSize: 13, color: Colors.danger, marginBottom: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.dangerBg, borderRadius: Radius.sm },
  chip:         { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.sm, backgroundColor: Colors.white },
  chipActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:     { fontSize: 12, color: Colors.muted, fontWeight: '600' },
  chipTextActive:{ color: '#fff' },
  toggleBtn:    { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  toggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  methodOpt:    { padding: Spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: Colors.border },
  methodOptActive: { backgroundColor: '#F0F7EB' },
});
