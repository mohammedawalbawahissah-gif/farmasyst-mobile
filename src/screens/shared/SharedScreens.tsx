import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Image, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { notifApi, authApi, toArray } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Badge, Button, SectionTitle, EmptyState, AlertBanner, FormLabel } from '../../components/ui';
import type { Notification } from '../../types';

const NOTIF_ICON: Record<string, string> = {
  credit_approved:'✅', credit_rejected:'❌', credit_submitted:'📄', credit_matched:'🔗',
  payment_due:'💰', payment_received:'💵', agreement_signed:'✍️',
  booking_confirmed:'📅', booking_completed:'🩺', booking_cancelled:'❌',
  order_placed:'🛒', order_confirmed:'✅', new_match:'🔗', system:'📢', info:'ℹ️',
};
const PRIORITY_BADGE: Record<string, any> = { urgent:'danger', high:'warning', medium:'info', low:'neutral' };

// ── Notifications ─────────────────────────────────────────────────────────────
export function NotificationsScreen() {
  const [notifs,     setNotifs]     = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [unread,     setUnread]     = useState(0);

  const load = async () => {
    const [n, u] = await Promise.allSettled([notifApi.list(), notifApi.unreadCount()]);
    if (n.status === 'fulfilled') setNotifs(toArray(n.value.data));
    if (u.status === 'fulfilled') setUnread(u.value.data.count ?? 0);
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleMarkRead = async (id: string) => {
    try { await notifApi.markRead(id); await load(); }
    catch {}
  };
  const handleMarkAllRead = async () => {
    try { await notifApi.markAllRead(); await load(); }
    catch {}
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 80 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <PageHeader
        title={`Notifications ${unread > 0 ? `(${unread})` : ''}`}
        subtitle="Stay up-to-date with platform activity."
        action={unread > 0 ? <Button size="sm" variant="ghost" onPress={handleMarkAllRead}>Mark all read</Button> : undefined}
      />

      {notifs.length === 0
        ? <EmptyState icon="🔔" text="No notifications yet." />
        : notifs.map(n => {
          const notifType = n.notification_type || n.notif_type || 'info';
          const message   = n.message || n.body || '';
          return (
            <TouchableOpacity key={n.id} onPress={() => !n.is_read && handleMarkRead(n.id)} activeOpacity={n.is_read ? 1 : 0.8}>
              <Card style={[n.is_read ? {} : { borderLeftWidth: 3, borderLeftColor: Colors.leaf }, { opacity: n.is_read ? 0.8 : 1 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
                  <Text style={{ fontSize: 22, marginTop: 2 }}>{NOTIF_ICON[notifType] ?? '🔔'}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: n.is_read ? '500' : '700', color: Colors.ink, flex: 1 }}>{n.title}</Text>
                      {!n.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.leaf }} />}
                    </View>
                    <Text style={{ fontSize: 12, color: Colors.muted, lineHeight: 18, marginTop: 2 }}>{message}</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: Colors.muted }}>
                        {new Date(n.created_at).toLocaleDateString('en-GH', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                      </Text>
                      {n.priority && <Badge variant={PRIORITY_BADGE[n.priority] ?? 'neutral'}>{n.priority}</Badge>}
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          );
        })
      }
    </ScrollView>
  );
}

// ── Profile ───────────────────────────────────────────────────────────────────
export function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  // Profile fields
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName,  setLastName]  = useState(user?.last_name  ?? '');
  const [phone,     setPhone]     = useState(user?.phone      ?? '');
  const [language,  setLanguage]  = useState(user?.language   ?? 'en');
  const [photo,     setPhoto]     = useState<any>(null);
  const [photoPreview, setPhotoPreview] = useState<string|null>(user?.profile_photo ?? null);

  // Password change
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [oldPwd,      setOldPwd]      = useState('');
  const [newPwd,      setNewPwd]      = useState('');
  const [confPwd,     setConfPwd]     = useState('');
  const [pwdSaving,   setPwdSaving]   = useState(false);
  const [pwdError,    setPwdError]    = useState('');
  const [pwdSuccess,  setPwdSuccess]  = useState('');

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access in your device settings to upload a profile photo.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [ImagePicker.MediaType.Images], quality: 0.8, allowsEditing: true, aspect: [1,1] });
    if (!r.canceled && r.assets[0]) { const a = r.assets[0]; setPhotoPreview(a.uri); setPhoto({ uri: a.uri, name: 'avatar.jpg', type: 'image/jpeg' }); }
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const fd = new FormData();
      fd.append('first_name', firstName);
      fd.append('last_name',  lastName);
      fd.append('phone',      phone);
      fd.append('language',   language);
      if (photo) fd.append('profile_photo', photo as any);
      await authApi.updateMe(fd as any);
      await refreshUser();
      setSuccess('Profile updated successfully!');
      setEditing(false);
    } catch (e: any) { setError(e?.response?.data?.detail || 'Save failed.'); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async () => {
    if (!oldPwd || !newPwd || !confPwd) { setPwdError('All fields are required.'); return; }
    if (newPwd !== confPwd) { setPwdError('Passwords do not match.'); return; }
    if (newPwd.length < 8)  { setPwdError('Password must be at least 8 characters.'); return; }
    setPwdSaving(true); setPwdError('');
    try {
      await authApi.changePassword({ old_password: oldPwd, new_password: newPwd, new_password2: confPwd });
      setPwdSuccess('Password changed!');
      setOldPwd(''); setNewPwd(''); setConfPwd(''); setShowPwdForm(false);
    } catch (e: any) { setPwdError(e?.response?.data?.detail || 'Password change failed.'); }
    finally { setPwdSaving(false); }
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const ROLE_LABEL: Record<string, string> = {
    farmer:'🐔 Poultry Farmer', investor:'💼 Investor', consumer:'🛒 Consumer',
    monitoring_officer:'🔍 Monitoring Officer', vet:'🩺 Veterinarian', input_dealer:'🏪 Input Dealer', admin:'⚙️ Admin',
  };
  const LANGUAGES = [{ value:'en', label:'English' },{ value:'ha', label:'Hausa' },{ value:'tw', label:'Twi' },{ value:'da', label:'Dagbani' }];

  if (!user) return null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
      <PageHeader title="My Profile" subtitle="Manage your account settings." />

      {error   ? <AlertBanner variant="danger">{error}</AlertBanner>   : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}
      {pwdSuccess ? <AlertBanner variant="success">{pwdSuccess}</AlertBanner> : null}

      {/* Profile Card */}
      <Card style={{ alignItems: 'center', paddingVertical: Spacing.lg }}>
        {/* Avatar */}
        <TouchableOpacity onPress={editing ? pickPhoto : undefined} activeOpacity={editing ? 0.7 : 1}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.leaf, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3, borderColor: Colors.white, marginBottom: Spacing.sm }}>
            {photoPreview
              ? <Image source={{ uri: photoPreview }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              : <Text style={{ fontSize: 32, color: '#fff', fontWeight: '700' }}>{(user.first_name?.[0] ?? '?').toUpperCase()}</Text>
            }
          </View>
          {editing && <Text style={{ fontSize: 11, color: Colors.primary, textAlign: 'center', marginBottom: 4 }}>📷 Change photo</Text>}
        </TouchableOpacity>

        {editing ? (
          <>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, width: '100%' }}>
              <View style={{ flex: 1 }}>
                <FormLabel>First name</FormLabel>
                <TextInput style={s.input} value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={{ flex: 1 }}>
                <FormLabel>Last name</FormLabel>
                <TextInput style={s.input} value={lastName} onChangeText={setLastName} />
              </View>
            </View>
            <View style={{ width: '100%' }}>
              <FormLabel>Phone</FormLabel>
              <TextInput style={s.input} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            </View>
            <View style={{ width: '100%' }}>
              <FormLabel>Language</FormLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm }}>
                {LANGUAGES.map(l => (
                  <TouchableOpacity key={l.value} style={[s.langBtn, language === l.value && s.langBtnActive]} onPress={() => setLanguage(l.value)}>
                    <Text style={{ fontSize: 12, color: language === l.value ? '#fff' : Colors.muted, fontWeight: '600' }}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, width: '100%' }}>
              <Button onPress={handleSave} disabled={saving} loading={saving} style={{ flex: 1 }}>Save Changes</Button>
              <Button variant="secondary" onPress={() => { setEditing(false); setError(''); }}>Cancel</Button>
            </View>
          </>
        ) : (
          <>
            <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.ink }}>{user.full_name || `${user.first_name} ${user.last_name}`}</Text>
            <Text style={{ fontSize: 13, color: Colors.muted, marginTop: 2 }}>{user.email}</Text>
            <Text style={{ fontSize: 13, color: Colors.muted }}>{user.phone}</Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
              <Badge variant="neutral">{ROLE_LABEL[user.role] ?? user.role}</Badge>
              <Badge variant={user.is_verified ? 'success' : 'warning'}>{user.is_verified ? '✅ Verified' : '⏳ Pending'}</Badge>
            </View>
            <Button variant="secondary" onPress={() => setEditing(true)} style={{ marginTop: Spacing.md }}>✏️ Edit Profile</Button>
          </>
        )}
      </Card>

      {/* Account info */}
      <SectionTitle>Account Information</SectionTitle>
      <Card>
        <View style={s.row}><Text style={s.label}>Member since</Text><Text style={s.val}>{new Date(user.date_joined).toLocaleDateString('en-GH', { day:'numeric', month:'long', year:'numeric' })}</Text></View>
        <View style={s.row}><Text style={s.label}>Account status</Text><Badge variant={user.is_active ? 'success' : 'danger'}>{user.is_active ? 'Active' : 'Suspended'}</Badge></View>
        {!!user.credit_score && <View style={s.row}><Text style={s.label}>Credit score</Text><Text style={[s.val, { color: Colors.primary, fontWeight: '800' }]}>{user.credit_score}</Text></View>}
        <View style={s.row}><Text style={s.label}>Language</Text><Text style={s.val}>{LANGUAGES.find(l => l.value === user.language)?.label ?? user.language}</Text></View>
      </Card>

      {/* Change Password */}
      <SectionTitle>Security</SectionTitle>
      <Card>
        <TouchableOpacity style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.xs }} onPress={() => { setShowPwdForm(s => !s); setPwdError(''); setPwdSuccess(''); }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.ink }}>🔒 Change Password</Text>
          <Text style={{ color: Colors.muted }}>›</Text>
        </TouchableOpacity>
        {showPwdForm && (
          <View style={{ marginTop: Spacing.sm }}>
            {pwdError ? <Text style={s.error}>{pwdError}</Text> : null}
            <FormLabel>Current password</FormLabel>
            <TextInput style={s.input} secureTextEntry value={oldPwd} onChangeText={setOldPwd} placeholder="Current password" />
            <FormLabel>New password</FormLabel>
            <TextInput style={s.input} secureTextEntry value={newPwd} onChangeText={setNewPwd} placeholder="Min. 8 characters" />
            <FormLabel>Confirm new password</FormLabel>
            <TextInput style={s.input} secureTextEntry value={confPwd} onChangeText={setConfPwd} placeholder="Repeat new password" />
            <Button onPress={handleChangePassword} disabled={pwdSaving} loading={pwdSaving} fullWidth>Update Password</Button>
          </View>
        )}
      </Card>

      {/* Logout */}
      <Button variant="danger" fullWidth onPress={handleLogout} style={{ marginTop: Spacing.lg }}>Sign Out</Button>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  input:       { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm, width: '100%' },
  error:       { fontSize: 13, color: Colors.danger, marginBottom: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.dangerBg, borderRadius: Radius.sm },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  label:       { fontSize: 13, color: Colors.muted },
  val:         { fontSize: 13, fontWeight: '600', color: Colors.ink },
  langBtn:     { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border },
  langBtnActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
});
