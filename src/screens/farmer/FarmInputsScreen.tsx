import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, RefreshControl, Linking } from 'react-native';
import { inputsApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Badge, Button, SectionTitle, EmptyState, FormLabel } from '../../components/ui';
import type { FarmInput } from '../../types';

const INPUT_TYPE_ICON: Record<string, string> = {
  feed:'🌾', vaccine:'💉', medication:'💊', equipment:'🔧', supplement:'⚗️', disinfectant:'🧴', other:'📦',
};
const ALL_TYPES = ['feed','vaccine','medication','equipment','supplement','disinfectant','other'];

export default function FarmInputsScreen() {
  const [inputs,     setInputs]    = useState<FarmInput[]>([]);
  const [refreshing, setRefreshing]= useState(false);
  const [search,     setSearch]    = useState('');
  const [typeFilter, setTypeFilter]= useState('');
  const [regionFilter, setRegionFilter] = useState('');

  const load = async () => {
    const r = await inputsApi.listings({ is_available: true });
    setInputs(toArray(r.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const regions = [...new Set(inputs.map(i => i.region).filter(Boolean))];

  const filtered = inputs.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.name.toLowerCase().includes(q) || i.brand.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.dealer_name.toLowerCase().includes(q);
    const matchType   = !typeFilter   || i.input_type === typeFilter;
    const matchRegion = !regionFilter || i.region === regionFilter;
    return matchSearch && matchType && matchRegion;
  });

  const handleContact = (input: FarmInput) => {
    const phone = input.dealer_phone;
    if (phone) Linking.openURL(`tel:${phone}`).catch(() => {});
  };
  const handleWhatsApp = (input: FarmInput) => {
    const phone = input.dealer_phone?.replace(/\D/g,'');
    if (phone) Linking.openURL(`https://wa.me/233${phone.slice(-9)}`).catch(() => {});
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader title="Farm Inputs" subtitle="Browse and order feeds, vaccines, equipment, and more from certified dealers." />

      {/* Search */}
      <View style={s.searchWrap}>
        <Text style={{ position: 'absolute', left: 12, zIndex: 1, fontSize: 16 }}>🔍</Text>
        <TextInput
          style={[s.input, { paddingLeft: 36 }]}
          placeholder="Search by product, brand, or dealer…"
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Type filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.sm }}>
        <TouchableOpacity style={[s.chip, !typeFilter && s.chipActive]} onPress={() => setTypeFilter('')}>
          <Text style={[s.chipText, !typeFilter && s.chipTextActive]}>All Types</Text>
        </TouchableOpacity>
        {ALL_TYPES.map(t => (
          <TouchableOpacity key={t} style={[s.chip, typeFilter === t && s.chipActive]} onPress={() => setTypeFilter(typeFilter === t ? '' : t)}>
            <Text style={[s.chipText, typeFilter === t && s.chipTextActive]}>{INPUT_TYPE_ICON[t]} {t.charAt(0).toUpperCase()+t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Region filter */}
      {regions.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
          <TouchableOpacity style={[s.chip, !regionFilter && s.chipActive]} onPress={() => setRegionFilter('')}>
            <Text style={[s.chipText, !regionFilter && s.chipTextActive]}>All Regions</Text>
          </TouchableOpacity>
          {regions.map(r => (
            <TouchableOpacity key={r} style={[s.chip, regionFilter === r && s.chipActive]} onPress={() => setRegionFilter(regionFilter === r ? '' : r)}>
              <Text style={[s.chipText, regionFilter === r && s.chipTextActive]}>📍 {r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm }}>{filtered.length} products found</Text>

      {filtered.length === 0
        ? <EmptyState icon="🌾" text="No inputs match your search. Try adjusting the filters." />
        : filtered.map(inp => (
          <Card key={inp.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 16 }}>{INPUT_TYPE_ICON[inp.input_type] ?? '📦'}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{inp.name}</Text>
                  <Badge variant={inp.is_available ? 'success' : 'neutral'}>{inp.is_available ? 'In Stock' : 'Out of Stock'}</Badge>
                </View>
                {inp.brand && <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>Brand: {inp.brand}</Text>}
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.primary }}>GHS {parseFloat(inp.price).toLocaleString()}</Text>
            </View>

            <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: Spacing.sm, lineHeight: 19 }}>{inp.description}</Text>

            <View style={s.metaRow}>
              <Text style={s.meta}>📦 {inp.unit}</Text>
              <Text style={s.meta}>📊 Min order: {inp.min_order_quantity}</Text>
              <Text style={s.meta}>🗃 Stock: {inp.quantity_available}</Text>
              {inp.region && <Text style={s.meta}>📍 {inp.region}</Text>}
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.sm }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.ink }}>{inp.business_name || inp.dealer_name}</Text>
              {inp.dealer_phone && <Text style={{ fontSize: 12, color: Colors.muted }}>{inp.dealer_phone}</Text>}
            </View>

            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              {inp.dealer_phone && (
                <Button size="sm" onPress={() => handleContact(inp)}>📞 Call Dealer</Button>
              )}
              {inp.dealer_phone && (
                <Button size="sm" variant="secondary" onPress={() => handleWhatsApp(inp)}>💬 WhatsApp</Button>
              )}
            </View>
          </Card>
        ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  searchWrap: { position: 'relative', marginBottom: Spacing.sm },
  input:      { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink },
  chip:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.sm, backgroundColor: Colors.white },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:   { fontSize: 12, color: Colors.muted, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  metaRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.sm },
  meta:       { fontSize: 11, color: Colors.muted, backgroundColor: Colors.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm },
});
