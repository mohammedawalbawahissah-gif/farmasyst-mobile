import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  Alert, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { vetApi } from '../../api/client';
import { VetBooking, VetService } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, SectionTitle, Button, Pill, statusVariant, EmptyState, ErrorBanner, StatCard, InputField } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function VetDashboard() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [bookings,   setBookings]   = useState<VetBooking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      // FIX: use my_bookings action which filters to this vet's bookings
      const res = await vetApi.myBookings();
      setBookings(res.data.results ?? res.data);
    } catch { setError('Could not load bookings.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today     = new Date().toISOString().split('T')[0];
  const todayList = bookings.filter(b => b.booking_date.startsWith(today));
  const pending   = bookings.filter(b => b.status === 'pending');

  async function confirm(id: string) {
    try { await vetApi.confirmBooking(id); load(); }
    catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
  }

  async function cancel(id: string) {
    Alert.alert('Cancel Booking', 'Cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
          try { await vetApi.cancelBooking(id); load(); }
          catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
        }},
    ]);
  }

  return (
    <Screen title="Vet Portal" subtitle={`Dr. ${user?.first_name} ${user?.last_name}`}>
      {error ? <ErrorBanner message={error} /> : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.sm }}>
          <StatCard label="Today's Bookings" value={todayList.length.toString()} />
          <StatCard label="Pending Confirm"  value={pending.length.toString()} changeUp={false} change={pending.length > 0 ? 'Action needed' : undefined} />
        </View>

        {/* Quick nav */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: 4 }}>
          <Button label="All Bookings" onPress={() => navigation.navigate('Menu', { screen: 'Bookings' })} variant="secondary" style={{ flex: 1 }} />
          <Button label="My Services"  onPress={() => navigation.navigate('Menu', { screen: 'Services' })} variant="primary"   style={{ flex: 1 }} />
        </View>

        <SectionTitle title="Today's Schedule" />
        {todayList.length === 0
          ? <EmptyState message="No bookings today." icon="📅" />
          : todayList.map(b => (
              <Card key={b.id} style={styles.bookingCard}>
                <View style={styles.bookingRow}>
                  <View style={styles.timeBox}>
                    <Text style={styles.timeText}>{b.booking_date.split('T')[0]}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.bookingFarmer}>{b.farmer_name}</Text>
                    <Text style={styles.bookingService}>{b.service_name}</Text>
                    <Text style={styles.bookingVisit}>{b.visit_type.replace(/_/g, ' ')}</Text>
                  </View>
                  <Pill label={b.status} variant={statusVariant(b.status)} />
                </View>
                {b.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Button label="Confirm" onPress={() => confirm(b.id)} variant="primary" size="sm" style={{ flex: 1 }} />
                    <Button label="Cancel"  onPress={() => cancel(b.id)}  variant="danger"  size="sm" style={{ flex: 1 }} />
                  </View>
                )}
                {b.issue_description ? <Text style={styles.bookingIssue}>{b.issue_description}</Text> : null}
              </Card>
            ))
        }

        <SectionTitle title="All Upcoming" action="See all" onAction={() => navigation.navigate('Menu', { screen: 'Bookings' })} />
        {bookings.filter(b => !['completed','cancelled'].includes(b.status)).slice(0, 4).map(b => (
          <Card key={b.id} style={styles.bookingCard}>
            <View style={styles.bookingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.bookingFarmer}>{b.farmer_name}</Text>
                <Text style={styles.bookingService}>{b.service_name} · {b.booking_date.split('T')[0]}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Pill label={b.status} variant={statusVariant(b.status)} />
                {b.status === 'pending' && (
                  <Button label="Confirm" onPress={() => confirm(b.id)} size="sm" />
                )}
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

export default VetDashboard;

// ── Bookings ──────────────────────────────────────────────────────────────────
export function VetBookingsScreen() {
  const [bookings,   setBookings]   = useState<VetBooking[]>([]);
  const [tab,        setTab]        = useState<'pending' | 'confirmed' | 'completed'>('pending');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      // FIX: use my_bookings filtered by status
      const res = await vetApi.myBookings({ status: tab });
      setBookings(res.data.results ?? res.data);
    } catch {} finally { setRefreshing(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function confirm(id: string) {
    try { await vetApi.confirmBooking(id); load(); }
    catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
  }

  async function cancel(id: string) {
    Alert.alert('Cancel', 'Cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
          try { await vetApi.cancelBooking(id); load(); }
          catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
        }},
    ]);
  }

  return (
    <Screen title="Bookings">
      <View style={styles.tabBar}>
        {(['pending', 'confirmed', 'completed'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {bookings.length === 0
          ? <EmptyState message={`No ${tab} bookings.`} icon="📅" />
          : bookings.map(b => (
              <Card key={b.id} style={styles.bookingCard}>
                <View style={styles.bookingRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingFarmer}>{b.farmer_name}</Text>
                    <Text style={styles.bookingService}>{b.service_name}</Text>
                    <Text style={styles.bookingVisit}>{b.booking_date.split('T')[0]} · {b.visit_type.replace(/_/g, ' ')}</Text>
                  </View>
                  <Pill label={b.status} variant={statusVariant(b.status)} />
                </View>
                {b.issue_description ? <Text style={styles.bookingIssue}>{b.issue_description}</Text> : null}
                {b.status === 'pending' && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <Button label="Confirm" onPress={() => confirm(b.id)} variant="primary" size="sm" style={{ flex: 1 }} />
                    <Button label="Cancel"  onPress={() => cancel(b.id)}  variant="danger"  size="sm" style={{ flex: 1 }} />
                  </View>
                )}
              </Card>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

// ── Services ──────────────────────────────────────────────────────────────────
export function VetServicesScreen() {
  const [services,   setServices]   = useState<VetService[]>([]);
  const [showForm,   setShowForm]   = useState(false);
  const [name,       setName]       = useState('');
  const [type,       setType]       = useState('vaccination');
  const [price,      setPrice]      = useState('');
  const [duration,   setDuration]   = useState('');
  const [desc,       setDesc]       = useState('');
  const [saving,     setSaving]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await vetApi.myServices();
      setServices(res.data.results ?? res.data);
    } catch {} finally { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addService() {
    if (!name || !price) { Alert.alert('Missing Fields', 'Service name and price are required.'); return; }
    setSaving(true);
    try {
      await vetApi.addService({
        service_name:     name,
        service_type:     type,
        price,
        duration_minutes: parseInt(duration) || 60,
        description:      desc,
        is_mobile:        true,
      });
      Alert.alert('Added', 'Service added successfully.');
      setName(''); setType('vaccination'); setPrice(''); setDuration(''); setDesc('');
      setShowForm(false);
      load();
    } catch (e: any) {
      console.log('SERVICE ERROR:', JSON.stringify(e?.response?.data));
      const msg = e?.response?.data?.detail
               ?? Object.values(e?.response?.data ?? {}).flat().join('\n')
               ?? 'Could not add service.';
      Alert.alert('Error', msg);
    } finally { setSaving(false); }
  }

  async function toggleService(id: string, isActive: boolean) {
    try {
      await vetApi.updateService(id, { is_active: !isActive });
      load();
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
  }

  const SERVICE_TYPES = ['vaccination', 'diagnosis', 'treatment', 'consultation', 'farm_visit', 'other'];

  return (
    <Screen title="My Services">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md }}>
          <Button label={showForm ? 'Cancel' : '+ Add Service'} onPress={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'} />
        </View>

        {showForm && (
          <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.sm }}>
            <InputField label="Service Name *" value={name} onChangeText={setName} placeholder="e.g. Flock Vaccination" />
            <Text style={styles.fieldLabel}>Service Type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.md }}>
              {SERVICE_TYPES.map(t => (
                <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.typeBtn, type === t && styles.typeBtnActive]}>
                  <Text style={[styles.typeBtnText, type === t && { color: Colors.leaf }]}>{t.replace(/_/g, ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}><InputField label="Price (GHS) *" value={price}    onChangeText={setPrice}    keyboardType="decimal-pad" placeholder="0.00" /></View>
              <View style={{ flex: 1 }}><InputField label="Duration (min)" value={duration} onChangeText={setDuration} keyboardType="numeric"    placeholder="60" /></View>
            </View>
            <InputField label="Description" value={desc} onChangeText={setDesc} placeholder="Details about this service..." multiline numberOfLines={3} style={{ height: 70, textAlignVertical: 'top' }} />
            <Button label="Save Service" onPress={addService} loading={saving} fullWidth />
          </View>
        )}

        <SectionTitle title="My Services" />
        {services.length === 0
          ? <EmptyState message="No services listed yet." icon="💊" />
          : services.map(s => (
              <Card key={s.id} style={{ marginHorizontal: Spacing.md, marginTop: Spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookingFarmer}>{s.service_name}</Text>
                    <Text style={styles.bookingService}>{s.service_type.replace(/_/g, ' ')} · {s.duration_minutes} min</Text>
                    {s.description ? <Text style={styles.bookingService}>{s.description}</Text> : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.leaf }}>GHS {parseFloat(s.price).toLocaleString()}</Text>
                    <Pill label={s.is_active ? 'Active' : 'Inactive'} variant={s.is_active ? 'green' : 'gray'} style={{ marginTop: 4 }} />
                  </View>
                </View>
                <Button
                  label={s.is_active ? 'Deactivate' : 'Activate'}
                  onPress={() => toggleService(s.id, s.is_active)}
                  variant={s.is_active ? 'secondary' : 'primary'}
                  size="sm"
                  style={{ alignSelf: 'flex-start' }}
                />
              </Card>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bookingCard:   { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  bookingRow:    { flexDirection: 'row', alignItems: 'flex-start' },
  timeBox:       { backgroundColor: Colors.sky, borderRadius: Radius.sm, padding: 8, alignItems: 'center', minWidth: 56 },
  timeText:      { fontSize: 11, fontWeight: '700', color: Colors.leaf },
  bookingFarmer: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  bookingService:{ fontSize: 12, color: Colors.muted, marginTop: 2 },
  bookingVisit:  { fontSize: 11, color: Colors.muted, marginTop: 1, textTransform: 'capitalize' },
  bookingIssue:  { fontSize: 12, color: Colors.ink, marginTop: 8, fontStyle: 'italic' },
  tabBar:        { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.border, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  tab:           { flex: 1, paddingVertical: 9, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: Colors.leaf, marginBottom: -2 },
  tabText:       { fontSize: 12, fontWeight: '500', color: Colors.muted },
  tabTextActive: { color: Colors.leaf, fontWeight: '700' },
  fieldLabel:    { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  typeBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  typeBtnActive: { borderColor: Colors.leaf, backgroundColor: Colors.sky },
  typeBtnText:   { fontSize: 11, fontWeight: '600', color: Colors.muted, textTransform: 'capitalize' },
});
