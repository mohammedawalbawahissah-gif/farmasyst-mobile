import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { vetApi } from '../../api/client';
import { Card, Pill, statusVariant, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { getResults, VetBooking } from '../../types';

export default function VetBookingsScreen() {
  const [bookings,   setBookings]   = useState<VetBooking[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState<'all'|'pending'|'confirmed'|'completed'>('all');
  const [notes,      setNotes]      = useState<Record<string,string>>({});
  const [acting,     setActing]     = useState<string|null>(null);

  const load = useCallback(async () => {
    try {
      const r = await vetApi.bookings();
      setBookings(getResults<VetBooking>(r.data as any));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const confirm = async (id: string) => {
    setActing(id);
    try { await vetApi.confirmBooking(id); load(); }
    catch { Alert.alert('Error', 'Could not confirm booking.'); }
    finally { setActing(null); }
  };

  const cancel = async (id: string) => {
    Alert.alert('Cancel booking?', '', [
      { text: 'No' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
        setActing(id);
        try { await vetApi.cancelBooking(id); load(); }
        catch { Alert.alert('Error', 'Could not cancel booking.'); }
        finally { setActing(null); }
      }},
    ]);
  };

  const complete = async (id: string) => {
    const n = notes[id] ?? '';
    setActing(id);
    try {
      await vetApi.completeBooking(id, { vet_notes: n });
      load();
      Alert.alert('Completed', 'Booking marked as completed.');
    } catch { Alert.alert('Error', 'Could not complete booking.'); }
    finally { setActing(null); }
  };

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: 'all', label: 'All' }, { key: 'pending', label: 'Pending' },
    { key: 'confirmed', label: 'Confirmed' }, { key: 'completed', label: 'Completed' },
  ];

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={s.pageTitle}>My Bookings</Text>
      <Text style={s.pageSub}>Manage farmer booking requests.</Text>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f.key} style={[s.filterBtn, filter === f.key && s.filterBtnActive]}
            onPress={() => setFilter(f.key)}>
            <Text style={[s.filterText, filter === f.key && { color: Colors.white }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0
        ? <EmptyState icon="📅" message="No bookings in this category." />
        : filtered.map(b => (
          <Card key={b.id}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 4 }}>
              <Text style={{ fontSize: 13, fontFamily: 'monospace', color: Colors.muted }}>{b.reference}</Text>
              <Pill label={b.status} variant={statusVariant(b.status)} />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{b.farmer_name}</Text>
            <Text style={{ fontSize: 13, color: Colors.muted }}>{b.service_name || 'Booking'} · {b.visit_type.replace(/_/g,' ')}</Text>
            {b.farm_name ? <Text style={{ fontSize: 12, color: Colors.muted }}>🏡 {b.farm_name}</Text> : null}
            <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>
              📅 {new Date(b.booking_date).toLocaleString('en-GH')}
            </Text>
            <Text style={{ fontSize: 13, color: Colors.ink, marginTop: 6, fontStyle:'italic' }}>
              "{b.issue_description}"
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.earth, marginTop: 4 }}>GHS {b.fee}</Text>

            {b.vet_notes ? (
              <View style={{ backgroundColor: Colors.bg, padding: 8, borderRadius: Radius.sm, marginTop: 6 }}>
                <Text style={{ fontSize: 12, color: Colors.muted }}>Your notes: {b.vet_notes}</Text>
              </View>
            ) : null}

            {/* Vet notes input for completing */}
            {b.status === 'confirmed' && (
              <TextInput style={[s.notesInput]} placeholder="Add vet notes (optional)…"
                placeholderTextColor={Colors.muted} multiline
                value={notes[b.id] ?? ''} onChangeText={v => setNotes(prev => ({ ...prev, [b.id]: v }))} />
            )}

            {/* Actions */}
            <View style={{ flexDirection:'row', gap: 8, marginTop: 8 }}>
              {b.status === 'pending' && (
                <>
                  <TouchableOpacity style={[s.actionBtn, acting === b.id && s.actionBtnDisabled]}
                    disabled={acting === b.id} onPress={() => confirm(b.id)}>
                    <Text style={s.actionBtnText}>✅ Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.danger }, acting === b.id && s.actionBtnDisabled]}
                    disabled={acting === b.id} onPress={() => cancel(b.id)}>
                    <Text style={s.actionBtnText}>✗ Decline</Text>
                  </TouchableOpacity>
                </>
              )}
              {b.status === 'confirmed' && (
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: Colors.success }, acting === b.id && s.actionBtnDisabled]}
                  disabled={acting === b.id} onPress={() => complete(b.id)}>
                  {acting === b.id ? <ActivityIndicator size="small" color={Colors.white} />
                    : <Text style={s.actionBtnText}>✓ Mark Complete</Text>}
                </TouchableOpacity>
              )}
            </View>
          </Card>
        ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: Colors.bg },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle:      { fontSize: 22, fontWeight: '700', color: Colors.ink, marginBottom: 2 },
  pageSub:        { fontSize: 13, color: Colors.muted, marginBottom: Spacing.md },
  filterBtn:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, marginRight: 8, backgroundColor: Colors.white },
  filterBtnActive:{ backgroundColor: Colors.leaf, borderColor: Colors.leaf },
  filterText:     { fontSize: 13, fontWeight: '600', color: Colors.muted },
  notesInput:     { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, padding: 10, fontSize: 13, color: Colors.ink, marginTop: 8, minHeight: 60, textAlignVertical: 'top' },
  actionBtn:      { flex: 1, backgroundColor: Colors.leaf, borderRadius: Radius.sm, paddingVertical: 9, alignItems: 'center' },
  actionBtnDisabled:{ opacity: 0.5 },
  actionBtnText:  { color: Colors.white, fontWeight: '700', fontSize: 13 },
});
