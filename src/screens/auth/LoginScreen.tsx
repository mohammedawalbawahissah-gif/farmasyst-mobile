import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { Button, InputField } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      console.log('STATUS:',    err?.response?.status);
      console.log('DATA:',      JSON.stringify(err?.response?.data));
      console.log('URL hit:',   err?.config?.url);
      console.log('BODY sent:', err?.config?.data);
      const msg = err?.response?.data?.detail
               ?? err?.response?.data?.non_field_errors?.[0]
               ?? err?.message
               ?? 'Login failed. Please check your credentials.';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: Colors.bg }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 40 }]}>
          <Text style={styles.logo}>🌾 FarmAsyst North</Text>
          <Text style={styles.tagline}>Agricultural Fintech for Ghana's Farmers</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSub}>Sign in to your account</Text>

          <InputField
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <Button
            label="Sign In"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
            style={{ marginTop: 4 }}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={{ marginTop: 20, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 13, color: Colors.muted }}>
              Don't have an account?{' '}
              <Text style={{ color: Colors.leaf, fontWeight: '600' }}>Register</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.version}>FarmAsyst North v1.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header:    { backgroundColor: Colors.earth, padding: Spacing.lg, paddingBottom: Spacing.xl },
  logo:      { fontSize: 28, fontWeight: '700', color: Colors.white },
  tagline:   { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 6 },
  form:      { flex: 1, padding: Spacing.lg },
  formTitle: { fontSize: 22, fontWeight: '700', color: Colors.ink, marginBottom: 4 },
  formSub:   { fontSize: 13, color: Colors.muted, marginBottom: 24 },
  version:   { textAlign: 'center', fontSize: 11, color: Colors.muted, paddingBottom: 24 },
});
