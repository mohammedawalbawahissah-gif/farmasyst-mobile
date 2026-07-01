import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { authApi, clearTokens } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';

const LANGUAGES: Record<string,string> = {
  en:'English', dag:'Dagbani', tw:'Twi (Akan)', ee:'Ewe', fat:'Fante',
  gaa:'Ga', hau:'Hausa', kus:'Kusaal', nzi:'Nzema', gur:'Gurene', kas:'Kasem',
  bim:'Bimoba', kon:'Konkomba', mam:'Mampruli',
};

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [loading,   setLoading]   = useState(false);
  const [editMode,  setEditMode]  = useState(false);
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName,  setLastName]  = useState(user?.last_name ?? '');
  const [phone,     setPhone]     = useState(user?.phone ?? '');

  const [changingPw, setChangingPw] = useState(false);
  const [oldPw,  setOldPw]  = useState('');
  const [newPw,  setNewPw]  = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await authApi.updateMe({ first_name: firstName.trim(), last_name: lastName.trim(), phone: phone.trim() });
      Alert.alert('Saved', 'Your profile has been updated.');
      setEditMode(false);
    } catch {
      Alert.alert('Error', 'Could not update profile. Please try again.');
    } finally { setLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!oldPw || !newPw || !newPw2) { Alert.alert('Missing fields', 'Please fill all password fields.'); return; }
    if (newPw.length < 8) { Alert.alert('Weak password', 'New password must be at least 8 characters.'); return; }
    if (newPw !== newPw2) { Alert.alert('Mismatch', 'New passwords do not match.'); return; }
    setPwLoading(true);
    try {
      await authApi.changePassword({ old_password: oldPw, new_password: newPw, new_password2: newPw2 });
      Alert.alert('Password changed', 'Your password has been updated successfully.');
      setChangingPw(false); setOldPw(''); setNewPw(''); setNewPw2('');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Could not change password.');
    } finally { setPwLoading(false); }
  };

  const handleLogout = () => {
    Alert.alert('Sign out?', 'You will be signed out of FarmAsyst North.', [
      { text: 'Cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        try { await logout(); } catch { /* ignore */ }
      }},
    ]);
  };

  if (!user) return null;

  const roleLabel = user.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xl }}>
      {/* Avatar */}
      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')}</Text>
        </View>
        <Text style={s.displayName}>{user.full_name}</Text>
        <Text style={s.roleChip}>{roleLabel}</Text>
        <View style={{ flexDirection:'row', gap: 8, marginTop: 8 }}>
          {user.is_verified ? (
            <View style={s.verifiedBadge}><Text style={{ fontSize: 12, color: Colors.success, fontWeight:'600' }}>✓ Verified</Text></View>
          ) : (
            <View style={[s.verifiedBadge, { backgroundColor:'#FFF8E1', borderColor:'#FFC107' }]}>
              <Text style={{ fontSize: 12, color: Colors.warning, fontWeight:'600' }}>⏳ Pending</Text>
            </View>
          )}
          {!!user.credit_score && (
            <View style={s.verifiedBadge}>
              <Text style={{ fontSize: 12, color: Colors.earth, fontWeight:'600' }}>Score: {user.credit_score}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Profile details */}
      <Card>
        <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: Spacing.sm }}>
          <Text style={{ fontSize: 15, fontWeight:'700' }}>Personal Info</Text>
          <TouchableOpacity onPress={() => setEditMode(!editMode)}>
            <Text style={{ color: Colors.leaf, fontWeight:'600', fontSize: 13 }}>{editMode ? 'Cancel' : '✏️ Edit'}</Text>
          </TouchableOpacity>
        </View>

        {editMode ? (
          <>
            <View style={{ flexDirection:'row', gap: 10 }}>
              <View style={{ flex:1 }}>
                <Text style={s.fLabel}>First name</Text>
                <TextInput style={s.fInput} value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={{ flex:1 }}>
                <Text style={s.fLabel}>Last name</Text>
                <TextInput style={s.fInput} value={lastName} onChangeText={setLastName} />
              </View>
            </View>
            <Text style={s.fLabel}>Phone</Text>
            <TextInput style={s.fInput} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} disabled={loading} onPress={handleSave}>
              {loading ? <ActivityIndicator size="small" color={Colors.white} />
                : <Text style={s.btnText}>Save Changes</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {[
              ['Email',    user.email],
              ['Phone',    user.phone || '—'],
              ['Language', LANGUAGES[user.language] ?? user.language],
              ['Joined',   new Date(user.date_joined).toLocaleDateString('en-GH', { day:'numeric', month:'long', year:'numeric' })],
            ].map(([k,v]) => (
              <View key={k} style={s.infoRow}>
                <Text style={s.infoKey}>{k}</Text>
                <Text style={s.infoVal}>{v}</Text>
              </View>
            ))}
          </>
        )}
      </Card>

      {/* Change password */}
      <Card>
        <TouchableOpacity style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}
          onPress={() => setChangingPw(!changingPw)}>
          <Text style={{ fontSize: 15, fontWeight:'700' }}>🔒 Change Password</Text>
          <Text style={{ color: Colors.leaf, fontWeight:'600', fontSize: 13 }}>{changingPw ? '✕' : '→'}</Text>
        </TouchableOpacity>
        {changingPw && (
          <View style={{ marginTop: Spacing.sm }}>
            <Text style={s.fLabel}>Current password</Text>
            <TextInput style={s.fInput} secureTextEntry value={oldPw} onChangeText={setOldPw} placeholder="••••••••" placeholderTextColor={Colors.muted} />
            <Text style={s.fLabel}>New password</Text>
            <TextInput style={s.fInput} secureTextEntry value={newPw} onChangeText={setNewPw} placeholder="Min. 8 characters" placeholderTextColor={Colors.muted} />
            <Text style={s.fLabel}>Confirm new password</Text>
            <TextInput style={s.fInput} secureTextEntry value={newPw2} onChangeText={setNewPw2} placeholder="Repeat new password" placeholderTextColor={Colors.muted} />
            <TouchableOpacity style={[s.btn, pwLoading && s.btnDisabled]} disabled={pwLoading} onPress={handleChangePassword}>
              {pwLoading ? <ActivityIndicator size="small" color={Colors.white} />
                : <Text style={s.btnText}>Update Password</Text>}
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Text style={s.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: Colors.bg },
  avatarSection: { alignItems:'center', marginBottom: Spacing.md, paddingTop: Spacing.sm },
  avatar:        { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.leaf, alignItems:'center', justifyContent:'center', marginBottom: 10 },
  avatarText:    { fontSize: 28, fontWeight:'800', color: Colors.white },
  displayName:   { fontSize: 20, fontWeight:'700', color: Colors.ink },
  roleChip:      { fontSize: 13, color: Colors.muted, marginTop: 2, textTransform:'capitalize' },
  verifiedBadge: { backgroundColor:'#E8F5E9', borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor:'#A5D6A7' },
  infoRow:       { flexDirection:'row', justifyContent:'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoKey:       { fontSize: 13, color: Colors.muted },
  infoVal:       { fontSize: 13, fontWeight:'600', color: Colors.ink, maxWidth: '60%', textAlign:'right' },
  fLabel:        { fontSize: 11, fontWeight:'600', color: Colors.muted, textTransform:'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 4 },
  fInput:        { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  btn:           { backgroundColor: Colors.leaf, borderRadius: Radius.md, paddingVertical: 12, alignItems:'center', marginTop: 4 },
  btnDisabled:   { opacity: 0.5 },
  btnText:       { color: Colors.white, fontWeight:'700', fontSize: 14 },
  logoutBtn:     { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.danger, borderRadius: Radius.md, paddingVertical: 13, alignItems:'center', marginTop: Spacing.sm },
  logoutText:    { color: Colors.danger, fontWeight:'700', fontSize: 15 },
});
