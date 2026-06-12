import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity,
  RefreshControl, Alert, Modal,
} from 'react-native';
import { marketApi } from '../../api/client';
import { Produce, Order } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, SectionTitle, Button, Pill, statusVariant, EmptyState, ErrorBanner } from '../../components/ui';

// ── Consumer Marketplace ──────────────────────────────────────────────────────
export function ConsumerMarketplace() {
  const [produce,    setProduce]    = useState<Produce[]>([]);
  const [search,     setSearch]     = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [orderModal, setOrderModal] = useState<Produce | null>(null);
  const [qty,        setQty]        = useState('');
  const [method,     setMethod]     = useState('momo');
  const [placing,    setPlacing]    = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await marketApi.listProduce({ search, status: 'active' });
      setProduce(res.data.results ?? res.data);
    } catch (e: any) {
      setError('Could not load produce.');
    } finally {
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  function openOrder(p: Produce) {
    setOrderModal(p);
    setQty('');
    setMethod('momo');
  }

  // FIX: backend expects produce_id + quantity + payment_method + delivery_type as flat fields
  // NOT items array — the custom create() in OrderViewSet reads produce_id directly
  async function placeOrder() {
    if (!orderModal) return;
    if (!qty || parseFloat(qty) <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
      return;
    }
    setPlacing(true);
    try {
      await marketApi.createOrder({
        produce_id:      orderModal.id,
        quantity:        parseFloat(qty),
        payment_method:  method,
        delivery_type:   'delivery',
      });
      Alert.alert('Order Placed!', 'Your order has been submitted to the seller.');
      setOrderModal(null);
      setQty('');
    } catch (e: any) {
      console.log('ORDER ERROR:', JSON.stringify(e?.response?.data));
      const msg = e?.response?.data?.detail
               ?? e?.response?.data?.produce_id?.[0]
               ?? Object.values(e?.response?.data ?? {}).flat().join('\n')
               ?? 'Could not place order.';
      Alert.alert('Order Failed', msg);
    } finally {
      setPlacing(false);
    }
  }

  const PAYMENT_METHODS = ['momo', 'card', 'bank_transfer', 'cod'];

  return (
    <Screen title="Marketplace" subtitle="Fresh farm produce">
      {error ? <ErrorBanner message={error} /> : null}
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {produce.length === 0
          ? <EmptyState message="No produce available right now." icon="🛒" />
          : produce.map(p => (
              <Card key={p.id} style={styles.pCard}>
                <View style={styles.pRow}>
                  <View style={styles.pThumb}><Text style={{ fontSize: 28 }}>🐔</Text></View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.pName}>{p.name}</Text>
                    <Text style={styles.pFarm}>{p.farm_name}</Text>
                    <Text style={styles.pPrice}>GHS {parseFloat(p.price).toLocaleString()} / {p.unit}</Text>
                    <Text style={styles.pQty}>Available: {parseFloat(p.quantity_available).toLocaleString()} {p.unit}</Text>
                    <View style={{ flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      {p.accepts_momo && <View style={styles.pTag}><Text style={styles.pTagText}>MoMo</Text></View>}
                      {p.accepts_card && <View style={styles.pTag}><Text style={styles.pTagText}>Card</Text></View>}
                      {p.is_organic   && <View style={[styles.pTag, { backgroundColor: '#E8F5E9' }]}><Text style={[styles.pTagText, { color: Colors.success }]}>Organic</Text></View>}
                    </View>
                  </View>
                  <Button label="Order" onPress={() => openOrder(p)} size="sm" />
                </View>
              </Card>
            ))
        }
      </ScrollView>

      {/* Order modal */}
      <Modal visible={!!orderModal} transparent animationType="slide" onRequestClose={() => setOrderModal(null)}>
        <TouchableOpacity style={styles.modalBg} activeOpacity={1} onPress={() => setOrderModal(null)}>
          <TouchableOpacity activeOpacity={1} style={styles.modalBox}>
            <Text style={styles.modalTitle}>{orderModal?.name}</Text>
            <Text style={styles.modalFarm}>{orderModal?.farm_name}</Text>
            <Text style={styles.modalPrice}>
              GHS {parseFloat(orderModal?.price ?? '0').toLocaleString()} / {orderModal?.unit}
            </Text>
            <Text style={styles.inputLabel}>Quantity ({orderModal?.unit})</Text>
            <TextInput
              style={styles.modalInput}
              value={qty}
              onChangeText={setQty}
              keyboardType="decimal-pad"
              placeholder="Enter quantity..."
              placeholderTextColor={Colors.muted}
              autoFocus
            />
            {qty && parseFloat(qty) > 0
              ? <Text style={styles.total}>
                  Total: GHS {(parseFloat(qty) * parseFloat(orderModal?.price ?? '0')).toLocaleString()}
                </Text>
              : null
            }
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Payment Method</Text>
            <View style={styles.methodRow}>
              {PAYMENT_METHODS.map(m => (
                <TouchableOpacity key={m} onPress={() => setMethod(m)} style={[styles.methodBtn, method === m && styles.methodBtnActive]}>
                  <Text style={[styles.methodText, method === m && { color: Colors.leaf }]}>
                    {m.replace('_', ' ').toUpperCase()}
                  </Text>
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

export default ConsumerMarketplace;

// ── Consumer Orders ───────────────────────────────────────────────────────────
export function ConsumerOrders() {
  const [orders,     setOrders]     = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await marketApi.listOrders();
      setOrders(res.data.results ?? res.data);
    } catch { setError('Could not load orders.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function cancelOrder(id: string) {
    Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try { await marketApi.cancelOrder(id); load(); }
          catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Could not cancel order.'); }
        }},
    ]);
  }

  return (
    <Screen title="My Orders" subtitle="Track your purchases">
      {error ? <ErrorBanner message={error} /> : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {orders.length === 0
          ? <EmptyState message="No orders yet. Browse the marketplace to place your first order." icon="📦" />
          : orders.map(o => (
              <Card key={o.id} style={styles.oCard}>
                <View style={styles.oHeader}>
                  <Text style={styles.oRef}>{o.reference}</Text>
                  <Pill label={o.status} variant={statusVariant(o.status)} />
                </View>
                <Text style={styles.oAmount}>GHS {parseFloat(o.total_amount).toLocaleString()}</Text>
                <Text style={styles.oMeta}>{o.items.length} item(s) · {o.delivery_type} · {o.created_at.split('T')[0]}</Text>
                {o.items.map(i => (
                  <Text key={i.id} style={styles.oItem}>
                    • {i.produce_name} × {parseFloat(i.quantity).toLocaleString()} — GHS {parseFloat(i.subtotal).toLocaleString()}
                  </Text>
                ))}
                {o.status === 'pending' && (
                  <Button
                    label="Cancel Order"
                    onPress={() => cancelOrder(o.id)}
                    variant="danger"
                    size="sm"
                    style={{ marginTop: 8, alignSelf: 'flex-start' }}
                  />
                )}
              </Card>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap:     { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  search:         { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.ink },
  pCard:          { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  pRow:           { flexDirection: 'row', alignItems: 'flex-start' },
  pThumb:         { width: 56, height: 56, backgroundColor: Colors.sky, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  pName:          { fontSize: 14, fontWeight: '700', color: Colors.ink },
  pFarm:          { fontSize: 11, color: Colors.muted, marginTop: 1 },
  pPrice:         { fontSize: 15, fontWeight: '700', color: Colors.leaf, marginTop: 4 },
  pQty:           { fontSize: 11, color: Colors.muted },
  pTag:           { backgroundColor: Colors.sky, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  pTagText:       { fontSize: 10, fontWeight: '600', color: Colors.muted },
  oCard:          { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  oHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  oRef:           { fontSize: 14, fontWeight: '700', color: Colors.ink },
  oAmount:        { fontSize: 16, fontWeight: '700', color: Colors.leaf },
  oMeta:          { fontSize: 12, color: Colors.muted, marginTop: 2, marginBottom: 6 },
  oItem:          { fontSize: 12, color: Colors.ink, marginBottom: 2 },
  modalBg:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox:       { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg },
  modalTitle:     { fontSize: 18, fontWeight: '700', color: Colors.ink },
  modalFarm:      { fontSize: 12, color: Colors.muted, marginTop: 2 },
  modalPrice:     { fontSize: 20, fontWeight: '700', color: Colors.leaf, marginTop: 6, marginBottom: 12 },
  inputLabel:     { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  modalInput:     { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: 12, fontSize: 16, color: Colors.ink },
  total:          { fontSize: 14, fontWeight: '700', color: Colors.leaf, marginTop: 6 },
  methodRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  methodBtn:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  methodBtnActive:{ borderColor: Colors.leaf, backgroundColor: Colors.sky },
  methodText:     { fontSize: 11, fontWeight: '600', color: Colors.muted },
});
