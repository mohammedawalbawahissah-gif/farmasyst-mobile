import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Modal } from 'react-native';
import { vetApi, farmsApi } from '../../api/client';
import { VetService, VetBooking, Farm } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, SectionTitle, Button, InputField, EmptyState, ErrorBanner, Pill, statusVariant } from '../../components/ui';

const VISIT_TYPES = [
  { value: 'on_farm',      label: '🚜 On-Farm Visit' },
  { value: 'clinic',       label: '🏥 Clinic Visit' },
  { value: 'telemedicine', label: '📱 Telemedicine' },
];

const STATUS_BADGE: Record<string, 'warning'|'blue'|'green'|'red'> = {
  pending: 'amber', confirmed: 'blue', completed: 'green', cancelled: 'red',
} as any;

export default function FarmerVetServicesScreen() {
  const [tab,        setTab]        = useState<'services' | 'bookings'>('services');
  const [services,   setServices]   = useState<VetService[]>([]);
  const [bookings,   setBookings]   = useState<VetBooking[]>([]);
  const [farms,      setFarms]      = useState<Farm[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  // Booking form
  const [showBook,   setShowBook]   = useState(false);
  const [selService, setSelService] = useState<VetService | null>(null);
  const [farmId,     setFarmId]     = useState('');
  const [date,       setDate]       = useState('');
  const [visitType,  setVisitType]  = useState('on_farm');
  const [issue,      setIssue]      = useState('');
  const [saving,     setSaving]     = useState(false);
  const [bookErr,    setBookErr]    = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [s, b, f] = await Promise.all([
        vetApi.services(),
        vetApi.bookings(),
        farmsApi.list(),
      ]);
      setServices(s.data.results ?? s.data);
      setBookings(b.data.results ?? b.data);
      setFarms(f.data.results ?? f.data);
    } catch { setError('Could not load vet services.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openBooking(s: VetService) {
    setSelService(s); setShowBook(true); setBookErr('');
    setFarmId(''); setDate(''); setVisitType('on_farm'); setIssue('');
  }

  async function handleBook() {
    if (!selService || !date || !issue.trim()) { setBookErr('Please fill all required fields.'); return; }
    setSaving(true); setBookErr('');
    try {
      await vetApi.createBooking({
        vet: selService.vet,
        service: selService.id,
        farm: farmId || undefined,
        booking_date: date,
        visit_type: visitType,
        issue_description: issue,
      });
      setSuccess('Booking request sent! The vet will confirm shortly.');
      setShowBook(false);
      load();
    } catch (e: any) {
      setBookErr(e?.response?.data?.detail ?? 'Booking failed. Please try again.');
    } finally { setSaving(false); }
  }

  async function cancelBooking(id: string) {
    Alert.alert('Cancel Booking', 'Cancel this booking?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', style: 'destructive', onPress: async () => {
          try { await vetApi.cancelBooking(id); load(); }
          catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
        }},
    ]);
  }

  const SERVICE_TYPE_ICONS: Record<string, string> = {
    vaccination: '💉', diagnosis: '🔬', treatment: '💊',
    consultation: '🩺', farm_visit: '🚜', other: '📋',
  };

  return (
    <Screen title="Veterinary Services" subtitle="Access qualified vets for your farm">
      {error ? <ErrorBanner message={error} /> : null}
      {success ? <View style={styles.successBanner}><Text style={styles.successText}>{success}</Text></View> : null}

      <View style={styles.tabBar}>
        {([
          { id: 'services', label: '🩺 Browse Services' },
          { id: 'bookings', label: `📅 My Bookings (${bookings.length})` },
        ]).map(t => (
          <TouchableOpacity key={t.id} onPress={() => setTab(t.id as any)} style={[styles.tab, tab === t.id && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Services tab */}
        {tab === 'services' && (
          services.length === 0
            ? <EmptyState message="No vet services available yet." icon="🩺" />
            : services.map(s => (
                <Card key={s.id} style={styles.card}>
                  <View style={styles.serviceHeader}>
                    <Text style={styles.serviceIcon}>{SERVICE_TYPE_ICONS[s.service_type] ?? '📋'}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.serviceName}>{s.service_name}</Text>
                      <Text style={styles.serviceClinic}>{s.vet_clinic}</Text>
                      {s.description ? <Text style={styles.serviceDesc}>{s.description}</Text> : null}
                      <View style={styles.serviceMetaRow}>
                        <Text style={styles.servicePrice}>GHS {parseFloat(s.price).toLocaleString()}</Text>
                        <Text style={styles.serviceDur}> · {s.duration_minutes} min</Text>
                        {s.region ? <Text style={styles.serviceDur}> · 📍 {s.region}</Text> : null}
                        {s.is_mobile ? <Text style={[styles.serviceDur, { color: Colors.info }]}> · 📍 Mobile</Text> : null}
                      </View>
                    </View>
                  </View>
                  <Button label="📅 Book Now" onPress={() => openBooking(s)} fullWidth style={{ marginTop: 8 }} />
                </Card>
              ))
        )}

        {/* Bookings tab */}
        {tab === 'bookings' && (
          bookings.length === 0
            ? <EmptyState message="No bookings yet." icon="📅" />
            : bookings.map(b => (
                <Card key={b.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.serviceName}>{b.service_name}</Text>
                      <Text style={styles.serviceClinic}>Dr. {b.vet_name} · {b.visit_type.replace(/_/g, ' ')}</Text>
                      <Text style={styles.serviceClinic}>📅 {new Date(b.booking_date).toLocaleString('en-GH')}</Text>
                      {b.issue_description ? <Text style={styles.serviceDesc}>{b.issue_description}</Text> : null}
                    </View>
                    <Pill label={b.status} variant={statusVariant(b.status)} />
                  </View>
                  {b.status === 'pending' && (
                    <Button label="Cancel" onPress={() => cancelBooking(b.id)} variant="danger" size="sm" style={{ marginTop: 8, alignSelf: 'flex-start' }} />
                  )}
                </Card>
              ))
        )}
      </ScrollView>

      {/* Booking modal */}
      <Modal visible={showBook} animationType="slide" onRequestClose={() => setShowBook(false)}>
        <Screen title={selService ? `Book: ${selService.service_name}` : 'Book Service'}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}>
            {bookErr ? <ErrorBanner message={bookErr} /> : null}
            <Text style={styles.label}>Service</Text>
            <View style={[styles.infoBox, { marginBottom: 12 }]}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.ink }}>{selService?.service_name}</Text>
              <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>{selService?.vet_clinic} · GHS {selService?.price} · {selService?.duration_minutes} min</Text>
            </View>
            <InputField label="Preferred Date & Time *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD HH:MM" />
            <Text style={styles.label}>Visit Type *</Text>
            {VISIT_TYPES.filter(v => v.value !== 'on_farm' || selService?.is_mobile).map(v => (
              <TouchableOpacity key={v.value} onPress={() => setVisitType(v.value)} style={[styles.pickerItem, visitType === v.value && styles.pickerItemActive]}>
                <Text style={[{ fontSize: 13, color: Colors.ink }, visitType === v.value && { color: Colors.leaf }]}>{v.label}</Text>
              </TouchableOpacity>
            ))}
            <Text style={[styles.label, { marginTop: 12 }]}>Which Farm?</Text>
            <TouchableOpacity onPress={() => setFarmId('')} style={[styles.pickerItem, !farmId && styles.pickerItemActive]}>
              <Text style={[{ fontSize: 13, color: Colors.ink }, !farmId && { color: Colors.leaf }]}>No specific farm</Text>
            </TouchableOpacity>
            {farms.map(f => (
              <TouchableOpacity key={f.id} onPress={() => setFarmId(f.id)} style={[styles.pickerItem, farmId === f.id && styles.pickerItemActive]}>
                <Text style={[{ fontSize: 13, color: Colors.ink }, farmId === f.id && { color: Colors.leaf }]}>{f.name}</Text>
              </TouchableOpacity>
            ))}
            <InputField label="Describe the Issue *" value={issue} onChangeText={setIssue} placeholder="Describe symptoms, affected birds, urgency…" multiline numberOfLines={4} style={{ height: 90, textAlignVertical: 'top', marginTop: 12 }} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button label="Cancel"          onPress={() => setShowBook(false)} variant="secondary" style={{ flex: 1 }} />
              <Button label={saving ? 'Booking…' : 'Request Booking'} onPress={handleBook} loading={saving} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar:          { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.border, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  tab:             { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive:       { borderBottomWidth: 2, borderBottomColor: Colors.leaf, marginBottom: -2 },
  tabText:         { fontSize: 12, fontWeight: '500', color: Colors.muted },
  tabTextActive:   { color: Colors.leaf, fontWeight: '700' },
  card:            { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  cardHeader:      { flexDirection: 'row', alignItems: 'flex-start' },
  serviceHeader:   { flexDirection: 'row', alignItems: 'flex-start' },
  serviceIcon:     { fontSize: 24, marginTop: 2 },
  serviceName:     { fontSize: 14, fontWeight: '700', color: Colors.ink },
  serviceClinic:   { fontSize: 12, color: Colors.muted, marginTop: 2 },
  serviceDesc:     { fontSize: 12, color: Colors.ink, marginTop: 4 },
  serviceMetaRow:  { flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' },
  servicePrice:    { fontSize: 14, fontWeight: '700', color: Colors.leaf },
  serviceDur:      { fontSize: 12, color: Colors.muted },
  successBanner:   { backgroundColor: '#F0FDF4', padding: 10, marginHorizontal: Spacing.md, marginTop: Spacing.sm, borderRadius: Radius.sm },
  successText:     { fontSize: 13, color: Colors.success },
  label:           { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  infoBox:         { backgroundColor: Colors.sky, padding: 12, borderRadius: Radius.sm },
  pickerItem:      { padding: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, marginBottom: 6, backgroundColor: Colors.white },
  pickerItemActive:{ borderColor: Colors.leaf, backgroundColor: Colors.sky },
});
