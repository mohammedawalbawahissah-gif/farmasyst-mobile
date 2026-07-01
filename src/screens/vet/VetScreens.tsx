import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { vetApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Badge, Button, SectionTitle, FormLabel, EmptyState, AlertBanner } from '../../components/ui';
import type { VetService, VetBooking } from '../../types';

const SERVICE_TYPES = ['vaccination','diagnosis','treatment','consultation','farm_visit','other'];
const STATUS_BADGE: Record<string, any> = { pending:'warning', confirmed:'info', completed:'success', cancelled:'danger' };

// ── Vet Services Screen ──────────────────────────────────────────────────────
export function VetServicesScreen() {
  const [services,   setServices]   = useState<VetService[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [editing,    setEditing]    = useState<VetService | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  // Form state
  const [name,     setName]     = useState('');
  const [svcType,  setSvcType]  = useState('consultation');
  const [desc,     setDesc]     = useState('');
  const [price,    setPrice]    = useState('');
  const [duration, setDuration] = useState('30');
  const [region,   setRegion]   = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const load = async () => {
    const r = await vetApi.myServices();
    setServices(toArray(r.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openCreate = () => {
    setEditing(null); setName(''); setSvcType('consultation'); setDesc('');
    setPrice(''); setDuration('30'); setRegion(''); setIsMobile(false); setIsActive(true);
    setShowForm(true); setError('');
  };
  const openEdit = (svc: VetService) => {
    setEditing(svc); setName(svc.service_name); setSvcType(svc.service_type);
    setDesc(svc.description); setPrice(svc.price); setDuration(String(svc.duration_minutes));
    setRegion(svc.region); setIsMobile(svc.is_mobile); setIsActive(svc.is_active);
    setShowForm(true); setError('');
  };
  const closeForm = () => { setShowForm(false); setEditing(null); setError(''); };

  const handleSave = async () => {
    if (!name || !price) { setError('Service name and price are required.'); return; }
    setSaving(true); setError('');
    const payload = { service_name: name, service_type: svcType, description: desc, price, duration_minutes: parseInt(duration)||30, region, is_mobile: isMobile, is_active: isActive };
    try {
      if (editing) await vetApi.updateService(editing.id, payload);
      else         await vetApi.createService(payload);
      setSuccess(editing ? 'Service updated!' : 'Service created!');
      closeForm(); await load();
    } catch (e: any) { setError(e?.response?.data?.detail || 'Save failed. Please try again.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await vetApi.deleteService(id); await load(); }
    catch { setError('Failed to delete service.'); }
  };

  const handleToggleActive = async (svc: VetService) => {
    try { await vetApi.updateService(svc.id, { is_active: !svc.is_active }); await load(); }
    catch {}
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader title="My Services" subtitle="Manage the veterinary services you offer to farmers."
        action={<Button size="sm" onPress={openCreate}>+ Add Service</Button>}
      />
      {error   ? <AlertBanner variant="danger">{error}</AlertBanner>   : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {/* Form */}
      {showForm && (
        <Card style={{ marginBottom: Spacing.lg, borderColor: Colors.primary, borderWidth: 1 }}>
          <SectionTitle>{editing ? 'Edit Service' : 'New Service'}</SectionTitle>

          <FormLabel required>Service Name</FormLabel>
          <TextInput style={s.input} placeholder="e.g. Newcastle Vaccination" value={name} onChangeText={setName} />

          <FormLabel>Service Type</FormLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: Spacing.sm }}>
            {SERVICE_TYPES.map(t => (
              <TouchableOpacity key={t} style={[s.chip, svcType === t && s.chipActive]} onPress={() => setSvcType(t)}>
                <Text style={{ fontSize: 12, color: svcType === t ? '#fff' : Colors.muted, fontWeight: '600' }}>{t.replace(/_/g,' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <FormLabel>Description</FormLabel>
          <TextInput style={[s.input, { height: 70, textAlignVertical: 'top' }]} multiline placeholder="Describe what this service includes…" value={desc} onChangeText={setDesc} />

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <FormLabel required>Price (GHS)</FormLabel>
              <TextInput style={s.input} keyboardType="decimal-pad" placeholder="e.g. 50.00" value={price} onChangeText={setPrice} />
            </View>
            <View style={{ flex: 1 }}>
              <FormLabel>Duration (mins)</FormLabel>
              <TextInput style={s.input} keyboardType="number-pad" placeholder="30" value={duration} onChangeText={setDuration} />
            </View>
          </View>

          <FormLabel>Region</FormLabel>
          <TextInput style={s.input} placeholder="e.g. Northern Region" value={region} onChangeText={setRegion} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
            <TouchableOpacity style={[s.toggleOpt, isMobile && s.toggleOptActive]} onPress={() => setIsMobile(m => !m)}>
              <Text style={{ fontSize: 13, color: isMobile ? Colors.primary : Colors.muted, fontWeight: '600' }}>📍 Mobile Service</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.toggleOpt, isActive && s.toggleOptActive]} onPress={() => setIsActive(a => !a)}>
              <Text style={{ fontSize: 13, color: isActive ? Colors.success : Colors.muted, fontWeight: '600' }}>✅ Active</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button onPress={handleSave} disabled={saving} loading={saving} style={{ flex: 1 }}>
              {editing ? 'Update Service' : 'Create Service'}
            </Button>
            <Button variant="secondary" onPress={closeForm}>Cancel</Button>
          </View>
        </Card>
      )}

      {services.length === 0
        ? <EmptyState icon="🩺" text='No services yet. Tap "+ Add Service" to get started.' />
        : services.map(svc => (
          <Card key={svc.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700' }}>{svc.service_name}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  <Badge variant="neutral">{svc.service_type.replace(/_/g,' ')}</Badge>
                  <Badge variant={svc.is_active ? 'success' : 'neutral'}>{svc.is_active ? 'Active' : 'Inactive'}</Badge>
                  {svc.is_mobile && <Badge variant="info">📍 Mobile</Badge>}
                </View>
                <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 4 }}>{svc.description}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: Colors.primary }}>GHS {svc.price}</Text>
                <Text style={{ fontSize: 12, color: Colors.muted }}>⏱ {svc.duration_minutes}min</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <Button size="sm" variant="secondary" onPress={() => openEdit(svc)}>✏️ Edit</Button>
              <Button size="sm" variant="ghost" onPress={() => handleToggleActive(svc)}>
                {svc.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button size="sm" variant="danger" onPress={() => handleDelete(svc.id)}>Delete</Button>
            </View>
          </Card>
        ))
      }
    </ScrollView>
  );
}

// ── Vet Bookings Screen ──────────────────────────────────────────────────────
export function VetBookingsScreen() {
  const [bookings,   setBookings]   = useState<VetBooking[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('all');
  const [acting,     setActing]     = useState<string|null>(null);
  const [vetNotes,   setVetNotes]   = useState('');
  const [showNoteModal, setShowNoteModal] = useState<string|null>(null);
  const [error,      setError]      = useState('');

  const load = async () => {
    const r = await vetApi.bookings();
    setBookings(toArray(r.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleConfirm = async (id: string) => {
    setActing(id); setError('');
    try { await vetApi.confirmBooking(id); await load(); }
    catch (e: any) { setError(e?.response?.data?.detail || 'Failed to confirm.'); }
    finally { setActing(null); }
  };
  const handleCancel = async (id: string) => {
    setActing(id); setError('');
    try { await vetApi.cancelBooking(id); await load(); }
    catch { setError('Failed to cancel.'); }
    finally { setActing(null); }
  };
  const handleComplete = async (id: string) => {
    setActing(id); setError('');
    try { await vetApi.completeBooking(id, { vet_notes: vetNotes }); setShowNoteModal(null); setVetNotes(''); await load(); }
    catch { setError('Failed to complete booking.'); }
    finally { setActing(null); }
  };

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader title="Bookings" subtitle="Manage your incoming vet booking requests." />
      {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}
      {pendingCount > 0 && <AlertBanner variant="warning">📬 {pendingCount} new booking request{pendingCount>1?'s':''} awaiting confirmation.</AlertBanner>}

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
        {(['all','pending','confirmed','completed','cancelled']).map(f => (
          <TouchableOpacity key={f} style={[s.filterBtn, filter === f && s.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[{ fontSize: 12, fontWeight: '600', color: Colors.muted }, filter === f && { color: '#fff' }]}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase()+f.slice(1)}
              {f === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0
        ? <EmptyState icon="📅" text="No bookings here." />
        : filtered.map(b => (
          <Card key={b.id} style={b.status === 'pending' ? { borderColor: Colors.warning, borderWidth: 1.5 } : {}}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{b.reference}</Text>
              <Badge variant={STATUS_BADGE[b.status] ?? 'neutral'}>{b.status}</Badge>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', marginBottom: 4 }}>{b.farmer_name}</Text>
            <View style={s.row}><Text style={s.label}>Service</Text><Text style={s.val}>{b.service_name}</Text></View>
            {b.farm_name && <View style={s.row}><Text style={s.label}>Farm</Text><Text style={s.val}>{b.farm_name}</Text></View>}
            <View style={s.row}><Text style={s.label}>Date</Text><Text style={s.val}>{new Date(b.booking_date).toLocaleString('en-GH')}</Text></View>
            <View style={s.row}><Text style={s.label}>Visit Type</Text><Text style={s.val}>{b.visit_type.replace(/_/g,' ')}</Text></View>
            <View style={s.row}><Text style={s.label}>Fee</Text><Text style={s.val}>GHS {b.fee}</Text></View>
            <View style={{ backgroundColor: Colors.surface, padding: Spacing.sm, borderRadius: Radius.sm, marginVertical: Spacing.sm }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.muted, marginBottom: 2 }}>ISSUE</Text>
              <Text style={{ fontSize: 13 }}>{b.issue_description}</Text>
            </View>
            {b.vet_notes && (
              <View style={{ backgroundColor: Colors.successBg, padding: Spacing.sm, borderRadius: Radius.sm, marginBottom: Spacing.sm }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.success, marginBottom: 2 }}>VET NOTES</Text>
                <Text style={{ fontSize: 13 }}>{b.vet_notes}</Text>
              </View>
            )}

            {/* Actions */}
            {b.status === 'pending' && (
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <Button onPress={() => handleConfirm(b.id)} disabled={acting===b.id} loading={acting===b.id}>✅ Confirm</Button>
                <Button variant="danger" onPress={() => handleCancel(b.id)} disabled={acting===b.id}>❌ Cancel</Button>
              </View>
            )}
            {b.status === 'confirmed' && (
              <Button onPress={() => setShowNoteModal(b.id)} fullWidth>✅ Mark Complete</Button>
            )}

            {/* Notes modal inline */}
            {showNoteModal === b.id && (
              <View style={{ marginTop: Spacing.sm, backgroundColor: Colors.surface, padding: Spacing.md, borderRadius: Radius.sm }}>
                <Text style={{ fontSize: 13, fontWeight: '700', marginBottom: Spacing.sm }}>Add Vet Notes (optional)</Text>
                <TextInput
                  style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="Diagnosis, treatment given, recommendations…"
                  value={vetNotes}
                  onChangeText={setVetNotes}
                />
                <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                  <Button onPress={() => handleComplete(b.id)} disabled={acting===b.id} loading={acting===b.id} style={{ flex: 1 }}>
                    Complete Visit
                  </Button>
                  <Button variant="secondary" onPress={() => setShowNoteModal(null)}>Cancel</Button>
                </View>
              </View>
            )}
          </Card>
        ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  input:        { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  chip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border },
  chipActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleOpt:    { flex: 1, padding: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  toggleOptActive: { borderColor: Colors.primary, backgroundColor: '#F0F7EB' },
  filterBtn:    { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.sm },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  row:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.border },
  label:        { fontSize: 12, color: Colors.muted },
  val:          { fontSize: 13, fontWeight: '600', color: Colors.ink },
});

export { VetDashboard } from '../vet/DashboardScreen';
