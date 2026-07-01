import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { vetApi, farmsApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Badge, Button, SectionTitle, AlertBanner, FormLabel, EmptyState } from '../../components/ui';
import type { VetService, VetBooking, Farm } from '../../types';

const SERVICE_TYPE_LABEL: Record<string, string> = {
  vaccination: '💉 Vaccination', diagnosis: '🔬 Diagnosis', treatment: '💊 Treatment',
  consultation: '🩺 Consultation', farm_visit: '🚜 Farm Visit', other: '📋 Other',
};
const STATUS_BADGE: Record<string, any> = {
  pending: 'warning', confirmed: 'info', completed: 'success', cancelled: 'danger',
};

export default function FarmerVetServicesScreen() {
  const [activeTab,   setActiveTab]   = useState<'services' | 'bookings'>('services');
  const [services,    setServices]    = useState<VetService[]>([]);
  const [bookings,    setBookings]    = useState<VetBooking[]>([]);
  const [farms,       setFarms]       = useState<Farm[]>([]);
  const [refreshing,  setRefreshing]  = useState(false);
  const [loading,     setLoading]     = useState(true);

  // Booking form
  const [showBook,  setShowBook]   = useState(false);
  const [selService,setSelService] = useState<VetService | null>(null);
  const [farmId,    setFarmId]     = useState('');
  const [date,      setDate]       = useState('');
  const [visitType, setVisitType]  = useState<'on_farm'|'clinic'|'telemedicine'>('on_farm');
  const [issue,     setIssue]      = useState('');
  const [saving,    setSaving]     = useState(false);
  const [error,     setError]      = useState('');
  const [success,   setSuccess]    = useState('');

  const load = async () => {
    const [sv, bk, fm] = await Promise.allSettled([
      vetApi.services(), vetApi.bookings(), farmsApi.list(),
    ]);
    if (sv.status === 'fulfilled') setServices(toArray(sv.value.data));
    if (bk.status === 'fulfilled') setBookings(toArray(bk.value.data));
    if (fm.status === 'fulfilled') setFarms(toArray(fm.value.data));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openBooking = (s: VetService) => { setSelService(s); setShowBook(true); setError(''); setSuccess(''); setDate(''); setIssue(''); setFarmId(''); setVisitType('on_farm'); };
  const resetBook   = () => { setShowBook(false); setSelService(null); };

  const handleBook = async () => {
    if (!selService || !date || !issue.trim()) { setError('Please fill all required fields.'); return; }
    setSaving(true); setError('');
    try {
      await vetApi.createBooking({ vet: selService.vet, service: selService.id, farm: farmId || undefined, booking_date: date, visit_type: visitType, issue_description: issue });
      setSuccess('Booking request sent! The vet will confirm shortly.');
      resetBook(); await load();
    } catch (e: any) { setError(e?.response?.data?.detail || 'Booking failed. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id: string) => {
    try { await vetApi.cancelBooking(id); await load(); }
    catch { setError('Failed to cancel booking.'); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader title="Veterinary Services" subtitle="Access qualified vets for your poultry farm." />

      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {/* Tabs */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
        <Button size="sm" variant={activeTab === 'services' ? 'primary' : 'secondary'} onPress={() => setActiveTab('services')}>🩺 Browse Services</Button>
        <Button size="sm" variant={activeTab === 'bookings' ? 'primary' : 'secondary'} onPress={() => setActiveTab('bookings')}>📅 My Bookings ({bookings.length})</Button>
      </View>

      {/* Booking form */}
      {showBook && selService && (
        <Card style={{ borderColor: Colors.primary, borderWidth: 1, marginBottom: Spacing.md }}>
          <SectionTitle>Book: {selService.service_name}</SectionTitle>
          <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm }}>
            {selService.vet_clinic} · GHS {selService.price} · {selService.duration_minutes} min
          </Text>
          {error ? <Text style={s.error}>{error}</Text> : null}

          <FormLabel required>Preferred Date & Time</FormLabel>
          <TextInput style={s.input} placeholder="YYYY-MM-DDTHH:MM" value={date} onChangeText={setDate} />

          <FormLabel required>Visit Type</FormLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm }}>
            {(['on_farm','clinic','telemedicine'] as const).map(vt => (
              <TouchableOpacity key={vt} style={[s.toggleChip, visitType === vt && s.toggleChipActive]} onPress={() => setVisitType(vt)}>
                <Text style={{ fontSize: 12, color: visitType === vt ? '#fff' : Colors.muted, fontWeight: '600' }}>
                  {vt === 'on_farm' ? '🚜 On-Farm' : vt === 'clinic' ? '🏥 Clinic' : '📱 Telemedicine'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <FormLabel>Which Farm?</FormLabel>
          <View style={s.pickerWrap}>
            <TouchableOpacity style={[s.pickerOpt, !farmId && s.pickerOptActive]} onPress={() => setFarmId('')}>
              <Text style={{ fontSize: 13, color: Colors.muted }}>Select farm (optional)</Text>
            </TouchableOpacity>
            {farms.map(f => (
              <TouchableOpacity key={f.id} style={[s.pickerOpt, farmId === f.id && s.pickerOptActive]} onPress={() => setFarmId(f.id)}>
                <Text style={{ fontSize: 13, color: farmId === f.id ? Colors.primary : Colors.ink, fontWeight: farmId === f.id ? '600' : '400' }}>{f.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <FormLabel required>Describe the Issue</FormLabel>
          <TextInput style={[s.input, s.textarea]} multiline numberOfLines={3} placeholder="Describe symptoms, affected birds, urgency…" value={issue} onChangeText={setIssue} />

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button onPress={handleBook} disabled={saving} loading={saving}>Request Booking</Button>
            <Button variant="secondary" onPress={resetBook}>Cancel</Button>
          </View>
        </Card>
      )}

      {/* Services tab */}
      {activeTab === 'services' && (
        loading ? <Text style={{ color: Colors.muted }}>Loading services…</Text>
        : services.length === 0 ? <EmptyState icon="🩺" text="No vet services available in your region yet." />
        : services.map(sv => (
          <Card key={sv.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', flex: 1 }}>{sv.service_name}</Text>
              <Badge variant="neutral">{SERVICE_TYPE_LABEL[sv.service_type] ?? sv.service_type}</Badge>
            </View>
            <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: 4 }}>{sv.vet_clinic}</Text>
            <Text style={{ fontSize: 13, marginBottom: 6 }}>{sv.description}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm }}>
              <Text style={{ fontSize: 12 }}>💵 GHS {sv.price}</Text>
              <Text style={{ fontSize: 12 }}>⏱ {sv.duration_minutes} min</Text>
              {sv.region ? <Text style={{ fontSize: 12 }}>📍 {sv.region}</Text> : null}
              {sv.is_mobile ? <Badge variant="info">📍 Mobile</Badge> : null}
            </View>
            <Button fullWidth onPress={() => openBooking(sv)}>📅 Book Now</Button>
          </Card>
        ))
      )}

      {/* Bookings tab */}
      {activeTab === 'bookings' && (
        bookings.length === 0 ? <EmptyState icon="📅" text="No bookings yet." />
        : bookings.map(b => (
          <Card key={b.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700' }}>{b.service_name}</Text>
                  <Badge variant={STATUS_BADGE[b.status] ?? 'neutral'}>{b.status}</Badge>
                </View>
                <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: 2 }}>Dr. {b.vet_name} · {b.visit_type.replace('_',' ')}</Text>
                <Text style={{ fontSize: 12, color: Colors.muted }}>📅 {new Date(b.booking_date).toLocaleString('en-GH')} · 💵 GHS {b.fee}</Text>
                {b.vet_notes ? <View style={{ backgroundColor: Colors.surface, padding: Spacing.sm, borderRadius: Radius.sm, marginTop: 6 }}><Text style={{ fontSize: 13 }}>🩺 {b.vet_notes}</Text></View> : null}
              </View>
              {b.status === 'pending' && (
                <Button size="sm" variant="danger" onPress={() => handleCancel(b.id)}>Cancel</Button>
              )}
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  input:       { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  textarea:    { height: 80, textAlignVertical: 'top' },
  error:       { fontSize: 13, color: Colors.danger, marginBottom: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.dangerBg, borderRadius: Radius.sm },
  toggleChip:  { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border },
  toggleChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  pickerWrap:  { marginBottom: Spacing.sm },
  pickerOpt:   { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerOptActive: { backgroundColor: '#F0F7EB' },
});
