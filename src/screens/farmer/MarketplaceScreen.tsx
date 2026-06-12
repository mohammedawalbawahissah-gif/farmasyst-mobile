import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, RefreshControl, Modal,
} from 'react-native';
import { marketApi, farmsApi } from '../../api/client';
import { Produce, Order, Farm } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, SectionTitle, Button, InputField, EmptyState, ErrorBanner, Pill, statusVariant } from '../../components/ui';

export default function MarketplaceScreen() {
  const [tab,        setTab]        = useState<'browse' | 'listings' | 'orders'>('browse');
  const [produce,    setProduce]    = useState<Produce[]>([]);
  const [myListings, setMyListings] = useState<Produce[]>([]);
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [myFarm,     setMyFarm]     = useState<Farm | null>(null);
  const [search,     setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);

  // Order modal (browse tab)
  const [orderModal, setOrderModal] = useState<Produce | null>(null);
  const [orderQty,   setOrderQty]   = useState('');
  const [orderMethod,setOrderMethod]= useState('momo');
  const [placing,    setPlacing]    = useState(false);

  // New listing form
  const [showForm, setShowForm] = useState(false);
  const [lName,    setLName]    = useState('');
  const [lType,    setLType]    = useState('');
  const [lPrice,   setLPrice]   = useState('');
  const [lUnit,    setLUnit]    = useState('kg');
  const [lQty,     setLQty]     = useState('');
  const [lDesc,    setLDesc]    = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [p, l, o, f] = await Promise.all([
        marketApi.listProduce({ search }),
        marketApi.listProduce({ seller: 'me' }),
        marketApi.listOrders(),
        farmsApi.list(),
      ]);
      setProduce(p.data.results ?? p.data);
      setMyListings(l.data.results ?? l.data);
      setOrders(o.data.results ?? o.data);
      const farms: Farm[] = f.data.results ?? f.data;
      setMyFarm(farms[0] ?? null);
    } catch {
      setError('Could not load marketplace data.');
    } finally {
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  // FIX: use produce_id flat field, not items array
  async function placeOrder() {
    if (!orderModal || !orderQty || parseFloat(orderQty) <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
      return;
    }
    setPlacing(true);
    try {
      await marketApi.createOrder({
        produce_id:     orderModal.id,
        quantity:       parseFloat(orderQty),
        payment_method: orderMethod,
        delivery_type:  'delivery',
      });
      Alert.alert('Order Placed!', 'Your order has been submitted to the seller.');
      setOrderModal(null); setOrderQty('');
      load();
    } catch (e: any) {
      console.log('ORDER ERROR:', JSON.stringify(e?.response?.data));
      const msg = e?.response?.data?.detail
               ?? e?.response?.data?.produce_id?.[0]
               ?? Object.values(e?.response?.data ?? {}).flat().join('\n')
               ?? 'Could not place order.';
      Alert.alert('Order Failed', msg);
    } finally { setPlacing(false); }
  }

  // FIX: include farm field — backend perform_create requires it
  async function createListing() {
    if (!lName || !lPrice || !lQty) {
      Alert.alert('Missing Fields', 'Name, price, and quantity are required.');
      return;
    }
    if (!myFarm) {
      Alert.alert('No Farm', 'You need a registered farm to list produce. Contact your admin.');
      return;
    }
    setSaving(true);
    try {
      await marketApi.createListing({
        name:               lName,
        produce_type:       lType || lName,
        price:              lPrice,
        unit:               lUnit,
        quantity_available: lQty,
        description:        lDesc,
        farm:               myFarm.id,
      });
      Alert.alert('Listed!', 'Your produce has been listed on the marketplace.');
      setLName(''); setLType(''); setLPrice(''); setLQty(''); setLDesc('');
      setShowForm(false);
      load();
    } catch (e: any) {
      console.log('LISTING ERROR:', JSON.stringify(e?.response?.data));
      const msg = e?.response?.data?.detail
               ?? Object.values(e?.response?.data ?? {}).flat().join('\n')
               ?? 'Could not create listing.';
      Alert.alert('Error', msg);
    } finally { setSaving(false); }
  }

  async function cancelOrder(id: string) {
    Alert.alert('Cancel Order', 'Are you sure?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
          try { await marketApi.cancelOrder(id); load(); }
          catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
        }},
    ]);
  }

  const PAYMENT_METHODS = ['momo', 'card', 'bank_transfer', 'cod'];

  return (
    <Screen title="Marketplace" subtitle="Buy & sell farm produce">
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.tabBar}>
        {[
          { id: 'browse',   label: 'Browse' },
          { id: 'listings', label: 'My Listings' },
          { id: 'orders',   label: 'My Orders' },
        ].map(t => (
          <TouchableOpacity key={t.id} onPress={() => setTab(t.id as any)} style={[styles.tab, tab === t.id && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Browse */}
        {tab === 'browse' && (
          <>
            <View style={styles.searchWrap}>
              <TextInput
                style={styles.search}
                placeholder="Search broilers, eggs, chicks..."
                placeholderTextColor={Colors.muted}
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                onSubmitEditing={load}
              />
            </View>
            {produce.length === 0
              ? <EmptyState message="No listings found." icon="🛒" />
              : produce.map(p => (
                  <Card key={p.id} style={styles.produceCard}>
                    <View style={styles.produceRow}>
                      <View style={styles.produceThumb}><Text style={{ fontSize: 24 }}>🐔</Text></View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.produceName}>{p.name}</Text>
                        <Text style={styles.produceFarm}>{p.farm_name}</Text>
                        <Text style={styles.producePrice}>GHS {parseFloat(p.price).toLocaleString()} / {p.unit}</Text>
                        <Text style={styles.produceQty}>Available: {parseFloat(p.quantity_available).toLocaleString()} {p.unit}</Text>
                      </View>
                      <Button label="Order" onPress={() => { setOrderModal(p); setOrderQty(''); setOrderMethod('momo'); }} size="sm" />
                    </View>
                  </Card>
                ))
            }
          </>
        )}

        {/* My Listings */}
        {tab === 'listings' && (
          <>
            <View style={styles.listingsHeader}>
              <Button label={showForm ? 'Cancel' : '+ Add Listing'} onPress={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'} />
            </View>
            {showForm && (
              <View style={styles.form}>
                <InputField label="Produce Name"  value={lName}  onChangeText={setLName}  placeholder="e.g. Broilers" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><InputField label="Price (GHS)" value={lPrice} onChangeText={setLPrice} keyboardType="decimal-pad" placeholder="0.00" /></View>
                  <View style={{ flex: 1 }}><InputField label="Quantity"    value={lQty}   onChangeText={setLQty}   keyboardType="decimal-pad" placeholder="0" /></View>
                </View>
                <View style={styles.unitRow}>
                  {['kg', 'tray', 'bird', 'crate', 'bag'].map(u => (
                    <TouchableOpacity key={u} onPress={() => setLUnit(u)} style={[styles.unitBtn, lUnit === u && styles.unitBtnActive]}>
                      <Text style={[styles.unitBtnText, lUnit === u && { color: Colors.leaf }]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <InputField label="Description" value={lDesc} onChangeText={setLDesc} placeholder="Optional" multiline numberOfLines={2} style={{ height: 60, textAlignVertical: 'top' }} />
                <Button label="Create Listing" onPress={createListing} loading={saving} fullWidth />
              </View>
            )}
            {myListings.length === 0
              ? <EmptyState message="You have no active listings." icon="🏪" />
              : myListings.map(p => (
                  <Card key={p.id} style={styles.produceCard}>
                    <View style={styles.produceRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.produceName}>{p.name}</Text>
                        <Text style={styles.producePrice}>GHS {parseFloat(p.price).toLocaleString()} / {p.unit}</Text>
                        <Text style={styles.produceQty}>Qty: {parseFloat(p.quantity_available).toLocaleString()}</Text>
                      </View>
                      <Pill label={p.status} variant={statusVariant(p.status)} />
                    </View>
                  </Card>
                ))
            }
          </>
        )}

        {/* My Orders */}
        {tab === 'orders' && (
          orders.length === 0
            ? <EmptyState message="No orders yet." icon="📦" />
            : orders.map(o => (
                <Card key={o.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderRef}>{o.reference}</Text>
                    <Pill label={o.status} variant={statusVariant(o.status)} />
                  </View>
                  <Text style={styles.orderAmount}>GHS {parseFloat(o.total_amount).toLocaleString()}</Text>
                  <Text style={styles.orderMeta}>{o.items.length} item(s) · {o.delivery_type} · {o.created_at.split('T')[0]}</Text>
                  {o.status === 'pending' && (
                    <Button label="Cancel Order" onPress={() => cancelOrder(o.id)} variant="danger" size="sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} />
                  )}
                </Card>
              ))
        )}
      </ScrollView>

      {/* Order modal */}
      <Modal visible={!!orderModal} transparent animationType="slide" onRequestClose={() => setOrderModal(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setOrderModal(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>{orderModal?.name}</Text>
            <Text style={styles.modalFarm}>{orderModal?.farm_name}</Text>
            <Text style={styles.modalPrice}>GHS {parseFloat(orderModal?.price ?? '0').toLocaleString()} / {orderModal?.unit}</Text>
            <Text style={styles.inputLabel}>Quantity ({orderModal?.unit})</Text>
            <TextInput
              style={styles.modalInput}
              value={orderQty}
              onChangeText={setOrderQty}
              keyboardType="decimal-pad"
              placeholder="Enter quantity..."
              placeholderTextColor={Colors.muted}
              autoFocus
            />
            {orderQty && parseFloat(orderQty) > 0
              ? <Text style={styles.total}>Total: GHS {(parseFloat(orderQty) * parseFloat(orderModal?.price ?? '0')).toLocaleString()}</Text>
              : null
            }
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Payment Method</Text>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity key={m} onPress={() => setOrderMethod(m)} style={[styles.methodBtn, orderMethod === m && styles.methodBtnActive]}>
                  <Text style={[styles.methodText, orderMethod === m && { color: Colors.leaf }]}>{m.replace('_', ' ').toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <Button label="Cancel"      onPress={() => setOrderModal(null)} variant="secondary" style={{ flex: 1 }} />
              <Button label="Place Order" onPress={placeOrder}               variant="primary"   style={{ flex: 1 }} loading={placing} />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar:        { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.border, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  tab:           { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: Colors.leaf, marginBottom: -2 },
  tabText:       { fontSize: 12, fontWeight: '500', color: Colors.muted },
  tabTextActive: { color: Colors.leaf, fontWeight: '700' },
  searchWrap:    { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  search:        { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.ink },
  produceCard:   { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  produceRow:    { flexDirection: 'row', alignItems: 'center' },
  produceThumb:  { width: 52, height: 52, backgroundColor: Colors.sky, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  produceName:   { fontSize: 14, fontWeight: '700', color: Colors.ink },
  produceFarm:   { fontSize: 11, color: Colors.muted, marginTop: 1 },
  producePrice:  { fontSize: 15, fontWeight: '700', color: Colors.leaf, marginTop: 4 },
  produceQty:    { fontSize: 11, color: Colors.muted },
  listingsHeader:{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md, alignItems: 'flex-start' },
  form:          { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  unitRow:       { flexDirection: 'row', gap: 6, marginBottom: Spacing.md, flexWrap: 'wrap' },
  unitBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  unitBtnActive: { borderColor: Colors.leaf, backgroundColor: Colors.sky },
  unitBtnText:   { fontSize: 12, fontWeight: '600', color: Colors.muted },
  orderCard:     { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  orderHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  orderRef:      { fontSize: 14, fontWeight: '700', color: Colors.ink },
  orderAmount:   { fontSize: 16, fontWeight: '700', color: Colors.leaf },
  orderMeta:     { fontSize: 12, color: Colors.muted, marginTop: 2 },
  modalBg:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:      { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg },
  modalTitle:    { fontSize: 18, fontWeight: '700', color: Colors.ink },
  modalFarm:     { fontSize: 12, color: Colors.muted, marginTop: 2 },
  modalPrice:    { fontSize: 20, fontWeight: '700', color: Colors.leaf, marginTop: 6, marginBottom: 12 },
  inputLabel:    { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  modalInput:    { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: 12, fontSize: 16, color: Colors.ink },
  total:         { fontSize: 14, fontWeight: '700', color: Colors.leaf, marginTop: 6 },
  methodRow:     { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  methodBtn:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  methodBtnActive:{ borderColor: Colors.leaf, backgroundColor: Colors.sky },
  methodText:    { fontSize: 11, fontWeight: '600', color: Colors.muted },
});
