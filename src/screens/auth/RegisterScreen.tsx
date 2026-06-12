import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authApi } from '../../api/client';
import { Button, InputField } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { UserRole } from '../../types';

const ROLES: { id: UserRole; icon: string; label: string; desc: string }[] = [
  { id: 'farmer',             icon: '🌾', label: 'Farmer',       desc: 'Manage farm & credit' },
  { id: 'investor',           icon: '💼', label: 'Investor',     desc: 'Portfolio & funding' },
  { id: 'consumer',           icon: '🛒', label: 'Consumer',     desc: 'Buy farm produce' },
  { id: 'monitoring_officer', icon: '📋', label: 'Monitor',      desc: 'Field audits' },
  { id: 'vet',                icon: '💊', label: 'Veterinarian', desc: 'Animal health services' },
  { id: 'input_dealer',       icon: '🏪', label: 'Input Dealer', desc: 'Sell farm inputs' },
];

export default function RegisterScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [password2, setPassword2] = useState('');
  const [role,      setRole]      = useState<UserRole>('farmer');
  const [loading,   setLoading]   = useState(false);

  async function handleRegister() {
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }
    if (password !== password2) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authApi.register({ first_name: firstName, last_name: lastName, email: email.trim().toLowerCase(), phone, role, password, password2 });
      Alert.alert(
        'Account Created',
        'Your account is pending admin verification. You will be notified once approved.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (err: any) {
      const d = err?.response?.data;
      const msg = typeof d === 'object' ? Object.values(d).flat().join('\n') : 'Registration failed.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ flexGrow: 1 }}>
        <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.logo}>🌾 FarmAsyst North</Text>
          <Text style={styles.subtitle}>Create your account</Text>
        </View>

        <View style={styles.form}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <InputField label="First Name" value={firstName} onChangeText={setFirstName} placeholder="Kwame" />
            </View>
            <View style={{ flex: 1 }}>
              <InputField label="Last Name" value={lastName} onChangeText={setLastName} placeholder="Asante" />
            </View>
          </View>
          <InputField label="Email Address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <InputField label="Phone Number" value={phone} onChangeText={setPhone} placeholder="+233 XX XXX XXXX" keyboardType="phone-pad" />
          <InputField label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          <InputField label="Confirm Password" value={password2} onChangeText={setPassword2} placeholder="••••••••" secureTextEntry />

          <Text style={styles.roleLabel}>I AM A…</Text>
          <View style={styles.roleGrid}>
            {ROLES.map(r => (
              <TouchableOpacity
                key={r.id}
                onPress={() => setRole(r.id)}
                style={[styles.roleCard, role === r.id && styles.roleCardActive]}
              >
                <Text style={styles.roleIcon}>{r.icon}</Text>
                <Text style={[styles.roleTitle, role === r.id && { color: Colors.leaf }]}>{r.label}</Text>
                <Text style={styles.roleDesc}>{r.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button label="Create Account" onPress={handleRegister} loading={loading} fullWidth size="lg" style={{ marginTop: 8 }} />

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: Colors.muted }}>
              Already have an account? <Text style={{ color: Colors.leaf, fontWeight: '600' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header:   { backgroundColor: Colors.earth, padding: Spacing.lg, paddingBottom: 28 },
  logo:     { fontSize: 24, fontWeight: '700', color: Colors.white },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  form:     { padding: Spacing.md },
  roleLabel:{ fontSize: 11, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  roleCard: { width: '47%', backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, alignItems: 'center' },
  roleCardActive: { borderColor: Colors.leaf, backgroundColor: Colors.sky },
  roleIcon: { fontSize: 22, marginBottom: 4 },
  roleTitle:{ fontSize: 12, fontWeight: '600', color: Colors.ink },
  roleDesc: { fontSize: 10, color: Colors.muted, marginTop: 2, textAlign: 'center' },
});
