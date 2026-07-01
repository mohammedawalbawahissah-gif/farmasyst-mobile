import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { marketApi } from '../../api/client';
import { Card, Pill, statusVariant, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { getResults, Produce, Order } from '../../types';

const PRODUCE_TYPE_LABEL: Record<string,string> = {
  broilers:'🐔 Broilers', layers:'🐓 Layers', eggs:'🥚 Eggs', day_old:'🐣 Day-Old Chicks',
  smoked:'🍗 Smoked Chicken', guinea_fowl:'🦃 Guinea Fowl', turkey:'🦚 Turkey',
  duck:'🦆 Duck', quail:'🐦 Quail', other:'📦 Other',
};

const PAYMENT_METHODS = [
  { value:'momo',          label:'📱 MTN MoMo (Direct)' },
  { value:'hubtel_momo',   label:'📲 Mobile Money (Other)' },
  { value:'card',          label:'💳 Card (Hubtel)' },
  { value:'bank_transfer', label:'🏦 Bank Transfer' },
  { value:'cod',           label:'💵 Cash on Delivery' },
];

export default function ConsumerMarketplaceScreen() {
  const [produce,    setProduce]    = useState<Produce[]>([]);
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [tab,        setTab]        = useState<'browse'|'orders'>('browse');

  // Order form
  const [ordering,    setOrdering]    = useState<Produce|null>(null);
  const [qty,         setQty]         = useState('');
  const [deliveryType,setDeliveryType]= useState<'pickup'|'delivery'>('pickup');
  const [address,     setAddress]     = useState('');
  const [payMethod,   setPayMethod]   = useState('');
  const [notes,       setNotes]       = useState('');
  const [saving,      setSaving]      = useState(false);

  const load = useCallback(async () => {
    try {
      const [pR, oR] = await Promise.all([marketApi.listProduce({ status:'active' }), marketApi.listOrders()]);
      setProduce(getResults<Produce>(pR.data as any));
      setOrders(getResults<Order>(oR.data as any));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const openOrder = (p: Produce) => {
    setOrdering(p);
    setQty(String(parseFloat(p.min_order) || 1));
    setDeliveryType('pickup');
    setAddress(''); setPayMethod(''); setNotes('');
  };
  const resetOrder = () => { setOrdering(null); };

  // Payment methods available on this listing
  const availablePayments = (p: Produce) =>
    PAYMENT_METHODS.filter(pm => (p as any)[`accepts_${pm.value}`] === true || (p as any)[`accepts_${pm.value}`] === 'true');

  const handleOrder = async () => {
    if (!ordering || !qty || !payMethod) {
      Alert.alert('Missing fields', 'Please fill quantity and payment method.'); return;
    }
    if (deliveryType === 'delivery' && !address.trim()) {
      Alert.alert('Missing field', 'Please enter your delivery address.'); return;
    }
    const unitPrice = parseFloat(ordering.price);
    const quantity  = parseFloat(qty);
    const total     = unitPrice * quantity;
    setSaving(true);
    try {
      await marketApi.createOrder({
        items: [{ produce: ordering.id, quantity: qty, unit_price: ordering.price }],
        delivery_type: deliveryType,
        delivery_address: address,
        payment_method: payMethod,
        total_amount: total.toFixed(2),
        notes,
      });
      Alert.alert('Order placed!', `Your order for GHS ${total.toFixed(2)} has been submitted. The seller will confirm shortly.`);
      resetOrder();
      load();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Could not place order. Please try again.');
    } finally { setSaving(false); }
  };

  const filtered = produce.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.produce_type.toLowerCase().includes(search.toLowerCase()) ||
    (p.farm_name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={s.pageTitle}>Marketplace</Text>
      <Text style={s.pageSub}>Fresh poultry produce from verified farms.</Text>

      <View style={s.tabs}>
        {(['browse','orders'] as const).map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'browse' ? '🛒 Browse Produce' : `📦 My Orders (${orders.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Order modal */}
      {ordering && (
        <Card style={{ borderColor: Colors.leaf, borderWidth: 1.5 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', marginBottom: 4 }}>Order: {ordering.name}</Text>
          <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: Spacing.sm }}>
            GHS {ordering.price} / {ordering.unit} · Available: {ordering.quantity_available} {ordering.unit}
          </Text>

          <Text style={s.fLabel}>Quantity ({ordering.unit}) *</Text>
          <TextInput style={s.fInput} keyboardType="decimal-pad" placeholderTextColor={Colors.muted}
            placeholder={`Min: ${ordering.min_order}`} value={qty} onChangeText={setQty} />

          {qty && (
            <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.earth, marginBottom: Spacing.sm }}>
              Total: GHS {(parseFloat(ordering.price) * (parseFloat(qty) || 0)).toFixed(2)}
            </Text>
          )}

          <Text style={s.fLabel}>Delivery type *</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: Spacing.sm }}>
            {(['pickup','delivery'] as const).map(dt => (
              <TouchableOpacity key={dt} style={[s.toggleBtn, deliveryType === dt && s.toggleBtnActive]}
                onPress={() => setDeliveryType(dt)}>
                <Text style={[s.toggleBtnText, deliveryType === dt && { color: Colors.white }]}>
                  {dt === 'pickup' ? '📍 Farm Pickup' : '🚚 Home Delivery'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {deliveryType === 'delivery' && (
            <>
              <Text style={s.fLabel}>Delivery address *</Text>
              <TextInput style={[s.fInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="Street, area, city…" placeholderTextColor={Colors.muted}
                multiline value={address} onChangeText={setAddress} />
            </>
          )}

          <Text style={s.fLabel}>Payment method *</Text>
          {availablePayments(ordering).length === 0 ? (
            <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm }}>Contact seller for payment options</Text>
          ) : (
            <View style={{ gap: 6, marginBottom: Spacing.sm }}>
              {availablePayments(ordering).map(pm => (
                <TouchableOpacity key={pm.value}
                  style={[s.payBtn, payMethod === pm.value && s.payBtnActive]}
                  onPress={() => setPayMethod(pm.value)}>
                  <Text style={[s.payBtnText, payMethod === pm.value && { color: Colors.white }]}>{pm.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={s.fLabel}>Notes (optional)</Text>
          <TextInput style={s.fInput} placeholder="Special requests, delivery time preference…"
            placeholderTextColor={Colors.muted} value={notes} onChangeText={setNotes} />

          {ordering.contact_phone ? (
            <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm }}>
              📞 Seller: {ordering.contact_phone}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[s.btn, { flex:1 }, (!qty || !payMethod || saving) && s.btnDisabled]}
              disabled={!qty || !payMethod || saving} onPress={handleOrder}>
              {saving ? <ActivityIndicator size="small" color={Colors.white} />
                : <Text style={s.btnText}>Place Order</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnSec, { flex:1 }]} onPress={resetOrder}>
              <Text style={s.btnSecText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Browse */}
      {tab === 'browse' && !ordering && (
        <>
          <TextInput style={s.search} placeholder="Search produce, farm name…" placeholderTextColor={Colors.muted}
            value={search} onChangeText={setSearch} />
          {filtered.length === 0
            ? <EmptyState icon="🛒" message={search ? 'No produce matches your search.' : 'No produce available right now.'} />
            : filtered.map(p => (
              <Card key={p.id}>
                <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight:'700', color: Colors.ink, flex:1 }}>{p.name}</Text>
                  <Pill label={PRODUCE_TYPE_LABEL[p.produce_type] ?? p.produce_type} variant="blue" />
                </View>
                <Text style={{ fontSize: 15, fontWeight:'800', color: Colors.earth }}>
                  GHS {parseFloat(p.price).toLocaleString()} / {p.unit}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.muted }}>
                  Available: {p.quantity_available} {p.unit} · Min order: {p.min_order}
                </Text>
                {p.egg_size ? <Text style={{ fontSize: 12, color: Colors.muted }}>Size: {p.egg_size}</Text> : null}
                {p.farm_name ? <Text style={{ fontSize: 12, color: Colors.muted }}>🏡 {p.farm_name}</Text> : null}
                {p.description ? <Text style={{ fontSize: 13, color: Colors.ink, marginTop: 4 }} numberOfLines={2}>{p.description}</Text> : null}
                <View style={{ flexDirection:'row', gap: 6, marginTop: 6, flexWrap:'wrap' }}>
                  {p.is_organic ? <Pill label="🌿 Organic" variant="green" /> : null}
                  {p.accepts_momo ? <Pill label="MoMo" variant="gray" /> : null}
                  {p.accepts_cod  ? <Pill label="COD"  variant="gray" /> : null}
                </View>
                {parseFloat(p.avg_rating) > 0 ? (
                  <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 4 }}>
                    ⭐ {parseFloat(p.avg_rating).toFixed(1)} · {p.total_orders} orders
                  </Text>
                ) : null}
                <TouchableOpacity style={[s.btn, { marginTop: 10 }]} onPress={() => openOrder(p)}>
                  <Text style={s.btnText}>🛒 Order Now</Text>
                </TouchableOpacity>
              </Card>
            ))
          }
        </>
      )}

      {/* Orders */}
      {tab === 'orders' && (
        orders.length === 0
          ? <EmptyState icon="📦" message="No orders yet." />
          : orders.map(o => (
            <Card key={o.id}>
              <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 4 }}>
                <Text style={{ fontWeight:'700', fontSize: 13 }}>{o.reference}</Text>
                <Pill label={o.status.replace(/_/g,' ')} variant={statusVariant(o.status)} />
              </View>
              <Text style={{ fontSize: 15, fontWeight:'700', color: Colors.earth }}>
                GHS {parseFloat(o.total_amount).toLocaleString()}
              </Text>
              <Text style={{ fontSize: 12, color: Colors.muted }}>
                {o.delivery_type === 'delivery' ? '🚚 Delivery' : '📍 Pickup'}
                {' · '}{o.payment_method?.replace(/_/g,' ')}
              </Text>
              {o.delivery_address ? <Text style={{ fontSize: 12, color: Colors.muted }}>📍 {o.delivery_address}</Text> : null}
              <Text style={{ fontSize: 11, color: Colors.muted }}>{new Date(o.created_at).toLocaleDateString('en-GH')}</Text>
            </Card>
          ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle:     { fontSize: 22, fontWeight: '700', color: Colors.ink, marginBottom: 2 },
  pageSub:       { fontSize: 13, color: Colors.muted, marginBottom: Spacing.sm },
  tabs:          { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  tab:           { flex: 1, paddingVertical: 9, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.white },
  tabActive:     { backgroundColor: Colors.leaf, borderColor: Colors.leaf },
  tabText:       { fontSize: 12, fontWeight: '600', color: Colors.muted },
  tabTextActive: { color: Colors.white },
  search:        { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.ink, marginBottom: Spacing.md },
  fLabel:        { fontSize: 11, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 4 },
  fInput:        { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  btn:           { backgroundColor: Colors.leaf, borderRadius: Radius.md, paddingVertical: 11, alignItems: 'center' },
  btnDisabled:   { opacity: 0.5 },
  btnText:       { color: Colors.white, fontWeight: '700', fontSize: 14 },
  btnSec:        { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  btnSecText:    { color: Colors.ink, fontWeight: '600', fontSize: 14 },
  toggleBtn:     { flex:1, paddingVertical: 9, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', backgroundColor: Colors.white },
  toggleBtnActive:{ backgroundColor: Colors.leaf, borderColor: Colors.leaf },
  toggleBtnText: { fontSize: 13, fontWeight: '600', color: Colors.ink },
  payBtn:        { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: 10, backgroundColor: Colors.white },
  payBtnActive:  { backgroundColor: Colors.leaf, borderColor: Colors.leaf },
  payBtnText:    { fontSize: 13, fontWeight: '600', color: Colors.ink },
});
