import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { FarmAsystLogo } from '../../components/ui';

const ROLES = [
  { value: 'farmer',             label: '🐔 Poultry Farmer',     desc: 'Apply for credit, manage farm, access training' },
  { value: 'investor',           label: '💼 Investor / Partner', desc: 'Fund farmers, track portfolio, view reports' },
  { value: 'consumer',           label: '🛒 Consumer / Buyer',   desc: 'Browse and order quality poultry produce' },
  { value: 'monitoring_officer', label: '🔍 Monitoring Officer', desc: 'Conduct farm audits and submit field reports (admin approval required)' },
  { value: 'vet',                label: '🩺 Veterinarian',       desc: 'Offer vet services to poultry farmers (admin approval required)' },
  { value: 'input_dealer',       label: '🏪 Farm Input Dealer',  desc: 'Sell feed, vaccines & equipment (admin approval required)' },
];
const GATED = new Set(['monitoring_officer', 'vet', 'input_dealer']);

import { authApi } from '../../api/client';

type Mode = 'login' | 'register' | 'otp' | 'pending';

export default function LoginScreen({ navigation }: any) {
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  // Login
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy,  setLoginBusy]  = useState(false);

  // Register
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [role,      setRole]      = useState('farmer');
  const [regEmail,  setRegEmail]  = useState('');
  const [regPass,   setRegPass]   = useState('');
  const [regPass2,  setRegPass2]  = useState('');
  const [regError,  setRegError]  = useState('');
  const [regBusy,   setRegBusy]   = useState(false);

  // OTP
  const [otpUserId,    setOtpUserId]    = useState('');
  const [otpCode,      setOtpCode]      = useState('');
  const [otpChannel,   setOtpChannel]   = useState<'sms'|'email'>('sms');
  const [otpChannels,  setOtpChannels]  = useState<('sms'|'email')[]>(['sms']);
  const [otpBusy,      setOtpBusy]      = useState(false);
  const [otpError,     setOtpError]     = useState('');
  const [resendBusy,    setResendBusy]    = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isGated,      setIsGated]      = useState(false);
  const [pendingName,  setPendingName]  = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  const switchMode = (m: Mode) => { setMode(m); setLoginError(''); setRegError(''); };

  // ── Login ────────────────────────────────────────────────────────────────
  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password) { Alert.alert('Missing fields', 'Please enter your email and password.'); return; }
    setLoginBusy(true); setLoginError('');
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? '';
      const isPending = detail.toLowerCase().includes('pending') || detail.toLowerCase().includes('suspended');
      if (isPending) {
        setLoginError('__PENDING__');
      } else {
        setLoginError(detail || 'Invalid email or password.');
      }
    } finally { setLoginBusy(false); }
  }, [email, password, login]);

  // ── Register ─────────────────────────────────────────────────────────────
  const handleRegister = useCallback(async () => {
    if (!firstName.trim() || !lastName.trim()) { setRegError('Please enter your full name.'); return; }
    if (!regEmail.trim()) { setRegError('Please enter your email address.'); return; }
    if (!phone.trim()) { setRegError('Please enter your phone number.'); return; }
    if (regPass.length < 8) { setRegError('Password must be at least 8 characters.'); return; }
    if (regPass !== regPass2) { setRegError('Passwords do not match.'); return; }

    setRegBusy(true); setRegError('');
    try {
      const result = await authApi.register({
        email: regEmail.trim(), first_name: firstName.trim(),
        last_name: lastName.trim(), phone: phone.trim(),
        role, password: regPass, password2: regPass2,
      });
      const data = result.data;
      setOtpUserId(data.user_id ?? data.user?.id ?? '');
      setOtpChannels((data.otp_channels ?? ['sms', 'email']).filter(Boolean) as ('sms'|'email')[]);
      setOtpChannel((data.otp_channels ?? ['sms'])[0] as 'sms'|'email');
      setIsGated(data.requires_verification ?? GATED.has(role));
      setPendingName(firstName.trim());
      setPendingEmail(regEmail.trim());
      setMode('otp');
    } catch (err: any) {
      const d = err?.response?.data;
      if (!d) { setRegError('Something went wrong. Please try again.'); return; }
      if (d.detail) { setRegError(String(d.detail)); return; }
      if (d.non_field_errors) { setRegError(Array.isArray(d.non_field_errors) ? d.non_field_errors[0] : String(d.non_field_errors)); return; }
      if (d.email) { setRegError(Array.isArray(d.email) ? d.email[0] : String(d.email)); return; }
      const first = Object.values(d)[0];
      setRegError(Array.isArray(first) ? (first as string[])[0] : String(first ?? 'Registration failed.'));
    } finally { setRegBusy(false); }
  }, [firstName, lastName, regEmail, phone, role, regPass, regPass2]);

  // ── OTP Verify ────────────────────────────────────────────────────────────
  const handleVerifyOtp = useCallback(async () => {
    if (otpCode.length < 6) { setOtpError('Please enter the 6-digit code.'); return; }
    setOtpBusy(true); setOtpError('');
    try {
      await authApi.verifyOtp({ user_id: otpUserId, code: otpCode, channel: otpChannel });
      if (isGated) {
        setMode('pending');
      } else {
        // Auto-login after verification
        try { await login(regEmail.trim().toLowerCase(), regPass); } catch { switchMode('login'); }
      }
    } catch (err: any) {
      setOtpError(err?.response?.data?.detail ?? 'Incorrect code. Please try again.');
    } finally { setOtpBusy(false); }
  }, [otpCode, otpUserId, otpChannel, isGated, regEmail, regPass]);

  const handleResendOtp = async () => {
    if (resendBusy || resendCooldown > 0) return;
    setResendBusy(true);
    try {
      await authApi.resendOtp({ user_id: otpUserId, channel: otpChannel });
      Alert.alert('Code sent', `A new code was sent via ${otpChannel.toUpperCase()}.`);
      // Backend allows 3 resends/min — this cooldown keeps the button in
      // sync with that limit instead of letting taps queue up 429s.
      setResendCooldown(25);
    } catch (err: any) {
      // Surface the backend's actual message (e.g. "Request was throttled.
      // Expected available in 42 seconds.") instead of a generic failure.
      Alert.alert('Could not resend', err?.response?.data?.detail || 'Could not resend code. Please try again.');
      setResendCooldown(20);
    } finally {
      setResendBusy(false);
    }
  };

  // Tick the resend cooldown down once a second while active.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── PENDING screen ────────────────────────────────────────────────────────
  if (mode === 'pending') {
    return (
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll}>
          <View style={s.header}><FarmAsystLogo size={52} /><Text style={s.appName}>FarmAsyst North</Text></View>
          <View style={s.card}>
            <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: Spacing.sm }}>⏳</Text>
            <Text style={[s.title, { textAlign: 'center' }]}>Account Pending Approval</Text>
            <Text style={{ fontSize: 13, color: Colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 20 }}>
              Hi <Text style={{ fontWeight: '700' }}>{pendingName}</Text>, your contact details are verified.{'\n'}
              Your account is awaiting review by a FarmAsyst North administrator.{'\n\n'}
              You'll be notified by email and SMS at{' '}
              <Text style={{ fontWeight: '700' }}>{pendingEmail}</Text> once approved.
            </Text>
            <TouchableOpacity style={[s.btn, { marginTop: Spacing.lg }]} onPress={() => switchMode('login')}>
              <Text style={s.btnText}>Back to Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── OTP screen ────────────────────────────────────────────────────────────
  if (mode === 'otp') {
    return (
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <FarmAsystLogo size={52} />
            <Text style={s.appName}>Verify Your Account</Text>
            <Text style={s.tagline}>Enter the 6-digit code sent via {otpChannel.toUpperCase()}</Text>
          </View>
          <View style={s.card}>
            {/* Channel tabs */}
            {otpChannels.length > 1 && (
              <View style={{ flexDirection: 'row', marginBottom: Spacing.md, gap: Spacing.sm }}>
                {otpChannels.map(ch => (
                  <TouchableOpacity key={ch} style={[s.toggleBtn, otpChannel === ch && s.toggleBtnActive]} onPress={() => { setOtpChannel(ch); setOtpCode(''); setOtpError(''); }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: otpChannel === ch ? '#fff' : Colors.muted }}>{ch === 'sms' ? '📱 SMS' : '📧 Email'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.label}>6-digit verification code</Text>
            <TextInput
              style={s.input}
              placeholder="000000"
              placeholderTextColor={Colors.muted}
              keyboardType="number-pad"
              maxLength={6}
              value={otpCode}
              onChangeText={setOtpCode}
            />
            {otpError ? <Text style={s.error}>{otpError}</Text> : null}

            <TouchableOpacity style={[s.btn, otpBusy && s.btnDisabled]} onPress={handleVerifyOtp} disabled={otpBusy}>
              {otpBusy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Verify →</Text>}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.md }}>
              <TouchableOpacity onPress={handleResendOtp} disabled={resendBusy || resendCooldown > 0}>
                <Text style={{ fontSize: 13, color: (resendBusy || resendCooldown > 0) ? Colors.muted : Colors.primary, fontWeight: '600' }}>
                  {resendBusy ? 'Sending…' : resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
                </Text>
              </TouchableOpacity>
              {!isGated && (
                <TouchableOpacity onPress={() => switchMode('login')}>
                  <Text style={{ fontSize: 12, color: Colors.muted }}>Skip for now</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={{ fontSize: 11, color: Colors.muted, textAlign: 'center', marginTop: Spacing.md }}>Code expires in 10 minutes.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── MAIN LOGIN/REGISTER ───────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <FarmAsystLogo size={52} />
          <Text style={s.appName}>FarmAsyst North</Text>
          <Text style={s.tagline}>Agri-fintech platform connecting poultry farmers,{'\n'}investors, and markets across northern Ghana.</Text>
        </View>

        {/* Tab toggle */}
        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, mode === 'login' && s.tabActive]} onPress={() => switchMode('login')}>
            <Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>Sign in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, mode === 'register' && s.tabActive]} onPress={() => switchMode('register')}>
            <Text style={[s.tabText, mode === 'register' && s.tabTextActive]}>Create account</Text>
          </TouchableOpacity>
        </View>

        {/* ── LOGIN FORM ── */}
        {mode === 'login' && (
          <View style={s.card}>
            <Text style={s.label}>Email address</Text>
            <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={Colors.muted} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} editable={!loginBusy} />

            <Text style={s.label}>Password</Text>
            <TextInput style={s.input} placeholder="Enter your password" placeholderTextColor={Colors.muted} secureTextEntry value={password} onChangeText={setPassword} editable={!loginBusy} onSubmitEditing={handleLogin} />

            {loginError === '__PENDING__' ? (
              <View style={{ backgroundColor: Colors.warningBg, borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#FCD34D' }}>
                <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '600' }}>Account Pending Approval</Text>
                <Text style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>Your account is awaiting admin approval. You will be notified when it is activated.</Text>
              </View>
            ) : loginError ? (
              <Text style={s.error}>{loginError}</Text>
            ) : null}

            <TouchableOpacity style={[s.btn, (loginBusy || !email || !password) && s.btnDisabled]} onPress={handleLogin} disabled={loginBusy || !email || !password}>
              {loginBusy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign in</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── REGISTER FORM ── */}
        {mode === 'register' && (
          <View style={s.card}>
            {/* Role picker */}
            <Text style={[s.label, { marginBottom: Spacing.sm }]}>Select your role</Text>
            {ROLES.map(r => (
              <TouchableOpacity key={r.value} style={[s.roleCard, role === r.value && s.roleCardActive]} onPress={() => setRole(r.value)} disabled={regBusy}>
                <Text style={[s.roleLabel, role === r.value && s.roleLabelActive]}>{r.label}</Text>
                <Text style={s.roleDesc}>{r.desc}</Text>
              </TouchableOpacity>
            ))}

            {GATED.has(role) && (
              <View style={{ backgroundColor: Colors.warningBg, borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#FCD34D' }}>
                <Text style={{ fontSize: 12, color: '#92400E' }}>⏳ This role requires admin approval. You'll be notified when activated.</Text>
              </View>
            )}

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>First name</Text>
                <TextInput style={s.input} placeholder="Kofi" placeholderTextColor={Colors.muted} value={firstName} onChangeText={setFirstName} editable={!regBusy} />
              </View>
              <View style={{ width: Spacing.sm }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Last name</Text>
                <TextInput style={s.input} placeholder="Mensah" placeholderTextColor={Colors.muted} value={lastName} onChangeText={setLastName} editable={!regBusy} />
              </View>
            </View>

            <Text style={s.label}>Email address</Text>
            <TextInput style={s.input} placeholder="you@example.com" placeholderTextColor={Colors.muted} autoCapitalize="none" keyboardType="email-address" value={regEmail} onChangeText={setRegEmail} editable={!regBusy} />

            <Text style={s.label}>Phone number (MoMo)</Text>
            <TextInput style={s.input} placeholder="024XXXXXXX" placeholderTextColor={Colors.muted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} editable={!regBusy} />

            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Password</Text>
                <TextInput style={s.input} placeholder="Min. 8 characters" placeholderTextColor={Colors.muted} secureTextEntry value={regPass} onChangeText={setRegPass} editable={!regBusy} />
              </View>
              <View style={{ width: Spacing.sm }} />
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Confirm password</Text>
                <TextInput style={s.input} placeholder="Repeat password" placeholderTextColor={Colors.muted} secureTextEntry value={regPass2} onChangeText={setRegPass2} editable={!regBusy} />
              </View>
            </View>

            {regPass.length > 0 && regPass.length < 8 && <Text style={{ fontSize: 12, color: Colors.warning, marginBottom: 4 }}>Password must be at least 8 characters</Text>}
            {regPass.length >= 8 && regPass2.length > 0 && regPass !== regPass2 && <Text style={{ fontSize: 12, color: Colors.danger, marginBottom: 4 }}>Passwords do not match</Text>}
            {regError ? <Text style={s.error}>{regError}</Text> : null}

            <TouchableOpacity
              style={[s.btn, (regBusy || !firstName || !lastName || !regEmail || !phone || regPass.length < 8 || regPass !== regPass2) && s.btnDisabled]}
              onPress={handleRegister}
              disabled={regBusy || !firstName || !lastName || !regEmail || !phone || regPass.length < 8 || regPass !== regPass2}
            >
              {regBusy ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>{GATED.has(role) ? 'Submit for approval' : 'Create account'}</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.bg },
  scroll:       { flexGrow: 1, padding: Spacing.md, paddingBottom: 40 },
  header:       { alignItems: 'center', marginBottom: Spacing.lg, marginTop: Spacing.lg },
  appName:      { fontSize: 26, fontWeight: '700', color: Colors.primary, letterSpacing: -0.5, marginTop: 10 },
  tagline:      { fontSize: 13, color: Colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 },
  tabs:         { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 4, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  tab:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.md },
  tabActive:    { backgroundColor: Colors.primary },
  tabText:      { fontSize: 14, color: Colors.muted, fontWeight: '600' },
  tabTextActive:{ color: '#fff' },
  card:         { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  title:        { fontSize: 20, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.md },
  label:        { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  input:        { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: Colors.ink, marginBottom: Spacing.md },
  btn:          { backgroundColor: Colors.leaf, borderRadius: Radius.md, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnDisabled:  { opacity: 0.5 },
  btnText:      { color: '#fff', fontWeight: '700', fontSize: 15 },
  error:        { fontSize: 13, color: Colors.danger, marginBottom: Spacing.sm },
  row:          { flexDirection: 'row', marginBottom: 0 },
  roleCard:     { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.sm + 2, marginBottom: Spacing.sm },
  roleCardActive:{ borderColor: Colors.primary, backgroundColor: '#F0F7EB' },
  roleLabel:    { fontSize: 14, fontWeight: '600', color: Colors.ink },
  roleLabelActive: { color: Colors.primary },
  roleDesc:     { fontSize: 12, color: Colors.muted, marginTop: 2 },
  toggleBtn:    { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  toggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
});
