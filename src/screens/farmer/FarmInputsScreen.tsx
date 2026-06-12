import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, RefreshControl } from 'react-native';
import { inputsApi } from '../../api/client';
import { FarmInput } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, Button, EmptyState, ErrorBanner } from '../../components/ui';

const INPUT_TYPES = [
  { value: '',             label: 'All Types' },
  { value: 'feed',         label: '🌾 Feed' },
  { value: 'vaccine',      label: '💉 Vaccine' },
  { value: 'medication',   label: '💊 Medication' },
  { value: 'equipment',    label: '🔧 Equipment' },
  { value: 'supplement',   label: '🧪 Supplement' },
  { value: 'disinfectant', label: '🧴 Disinfectant' },
  { value: 'other',        label: '📦 Other' },
];

export default function FarmInputsScreen() {
  const [inputs,     setInputs]     = useState<FarmInput[]>([]);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await inputsApi.listings({ is_available: true });
      setInputs(res.data.results ?? res.data);
    } catch { setError('Could not load farm inputs.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const shown = inputs.filter(l =>
    l.is_available &&
    (typeFilter === '' || l.input_type === typeFilter) &&
    (!search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.brand ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const INPUT_LABEL: Record<string, string> = {
    feed: '🌾 Feed', vaccine: '💉 Vaccine', medication: '💊 Medication',
    equipment: '🔧 Equipment', supplement: '🧪 Supplement',
    disinfectant: '🧴 Disinfectant', other: '📦 Other',
  };

  return (
    <Screen title="Farm Inputs" subtitle="Source feed, vaccines & equipment from verified dealers">
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.toolbar}>
        <TextInput
          style={[styles.search, { flex: 1 }]}
          placeholder="Search products or brands…"
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {INPUT_TYPES.map(t => (
            <TouchableOpacity key={t.value} onPress={() => setTypeFilter(t.value)} style={[styles.chip, typeFilter === t.value && styles.chipActive]}>
              <Text style={[styles.chipText, typeFilter === t.value && { color: Colors.leaf }]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {shown.length === 0
          ? <EmptyState message="No inputs found matching your filters." icon="📦" />
          : shown.map(l => (
              <Card key={l.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{l.name}</Text>
                    <Text style={styles.badge}>{INPUT_LABEL[l.input_type] ?? l.input_type}</Text>
                    {l.brand ? <Text style={styles.meta}>Brand: {l.brand}</Text> : null}
                    <Text style={styles.price}>GHS {parseFloat(l.price).toLocaleString()} / {l.unit}</Text>
                    {l.description ? <Text style={styles.meta}>{l.description}</Text> : null}
                    <Text style={styles.meta}>📦 {l.quantity_available} available · Min: {l.min_order_quantity} {l.unit}</Text>
                    {l.region ? <Text style={styles.meta}>📍 {l.region}</Text> : null}
                  </View>
                </View>
                <View style={styles.dealerRow}>
                  <Text style={styles.dealerName}>🏪 {l.dealer_name}</Text>
                  <Button label="📞 Contact Dealer" onPress={() => {}} variant="secondary" size="sm" />
                </View>
              </Card>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar:   { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  search:    { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: Colors.ink },
  chip:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  chipActive:{ borderColor: Colors.leaf, backgroundColor: Colors.sky },
  chipText:  { fontSize: 12, fontWeight: '600', color: Colors.muted },
  card:      { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  cardRow:   { flexDirection: 'row' },
  name:      { fontSize: 14, fontWeight: '700', color: Colors.ink },
  badge:     { fontSize: 11, color: Colors.muted, marginTop: 2 },
  meta:      { fontSize: 12, color: Colors.muted, marginTop: 2 },
  price:     { fontSize: 15, fontWeight: '700', color: Colors.leaf, marginTop: 4, marginBottom: 4 },
  dealerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: Colors.border, marginTop: 8, paddingTop: 8 },
  dealerName:{ fontSize: 13, fontWeight: '600', color: Colors.ink },
});
