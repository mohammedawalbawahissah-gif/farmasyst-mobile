import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator,
  Alert, FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../../context/AuthContext';
import { farmsApi, profilesApi, toArray } from '../../api/client';
import api from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import {
  PageHeader, Card, Button, SectionTitle, Badge, FarmAsystLogo,
  EmptyState, AlertBanner, FormLabel,
} from '../../components/ui';
import type { Farm } from '../../types';

// ── AI API ────────────────────────────────────────────────────────────────────
const aiApi = {
  chat:    (message: string, session_id?: string) =>
    api.post('/ai/chat/', { message, session_id }),
  disease: (farm_id: string, media?: { media_data: string; media_type: string; capture_mode: string }) =>
    api.post('/ai/disease-detection/', { farm_id, ...(media ?? {}) }),
  credit:  (farmer_id: string) =>
    api.post('/ai/creditworthiness/', { farmer_id }),
  history: (session_id?: string) =>
    api.get('/ai/chat/', session_id ? { params: { session_id } } : undefined),
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage { role: 'user' | 'assistant'; content: string }
interface DiseaseSignal { signal: string; severity: 'low' | 'moderate' | 'high' }
interface SuspectedCondition { condition: string; confidence: string; reason: string }
interface DiseaseResult {
  risk_level: 'low' | 'moderate' | 'high' | 'critical';
  risk_score: number;
  detected_signals: DiseaseSignal[];
  suspected_conditions: SuspectedCondition[];
  immediate_actions: string[];
  preventive_recommendations: string[];
  vet_consultation_required: boolean;
  summary: string;
  farm_id: string;
  farm_name: string;
  generated_at: string;
}
interface CreditResult {
  overall_score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  dimensions: Record<string, number>;
  strengths: string[];
  risks: string[];
  recommendation: 'approve' | 'review' | 'reject';
  narrative: string;
  farmer_name: string;
  generated_at: string;
}

const RISK_COLORS: Record<string, string> = {
  low: Colors.success, moderate: Colors.warning,
  high: '#ea580c', critical: Colors.danger,
};
const GRADE_COLORS: Record<string, string> = {
  A: '#16a34a', B: '#4A7C2F', C: '#ca8a04', D: '#ea580c', F: '#dc2626',
};

type Tab = 'chat' | 'disease' | 'credit';

export default function AIAssistantScreen() {
  const { user } = useAuth();
  const role = user?.role ?? 'farmer';

  const showCreditTab  = ['admin', 'farmer'].includes(role);
  const showDiseaseTab = ['admin', 'farmer', 'monitoring_officer', 'vet'].includes(role);
  const showFlockTab   = ['monitoring_officer'].includes(role);

  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [farms, setFarms] = useState<Farm[]>([]);

  useEffect(() => {
    farmsApi.list().then(r => setFarms(toArray(r.data))).catch(() => {});
  }, []);

  const ROLE_LABEL: Record<string, string> = {
    farmer:             'Poultry Farmer Assistant',
    investor:           'Investment AI Assistant',
    admin:              'Admin AI Assistant',
    monitoring_officer: 'Field Officer Assistant',
    vet:                'Veterinary AI Assistant',
    consumer:           'Buyer Assistant',
    input_dealer:       'Input Dealer Assistant',
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      {/* Header */}
      <View style={{ padding: Spacing.md, paddingBottom: 0 }}>
        <PageHeader title="AI Assistant" subtitle={ROLE_LABEL[role] ?? 'FarmAsyst North AI'} />

        {/* Tab bar */}
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' }}>
          <TouchableOpacity style={[s.tab, activeTab === 'chat' && s.tabActive]} onPress={() => setActiveTab('chat')}>
            <Text style={[s.tabText, activeTab === 'chat' && s.tabTextActive]}>💬 AI Chat</Text>
          </TouchableOpacity>
          {showDiseaseTab && (
            <TouchableOpacity style={[s.tab, activeTab === 'disease' && s.tabActive]} onPress={() => setActiveTab('disease')}>
              <Text style={[s.tabText, activeTab === 'disease' && s.tabTextActive]}>🦠 Disease Detection</Text>
            </TouchableOpacity>
          )}
          {showFlockTab && (
            <TouchableOpacity style={[s.tab, (activeTab as string) === 'flock' && s.tabActive]} onPress={() => setActiveTab('flock' as any)}>
              <Text style={[s.tabText, (activeTab as string) === 'flock' && s.tabTextActive]}>🐔 Flock Count</Text>
            </TouchableOpacity>
          )}
          {showCreditTab && (
            <TouchableOpacity style={[s.tab, activeTab === 'credit' && s.tabActive]} onPress={() => setActiveTab('credit')}>
              <Text style={[s.tabText, activeTab === 'credit' && s.tabTextActive]}>📊 Credit Scoring</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab content */}
      {activeTab === 'chat'    && <ChatTab role={role} />}
      {activeTab === 'disease' && showDiseaseTab && <DiseaseTab farms={farms} role={role} />}
      {(activeTab as string) === 'flock' && showFlockTab && <FlockCountTab farms={farms} />}
      {activeTab === 'credit'  && showCreditTab  && <CreditTab role={role} userId={user?.id ?? ''} />}
    </View>
  );
}

// ── CHAT TAB ──────────────────────────────────────────────────────────────────
function ChatTab({ role }: { role: string }) {
  const [messages,   setMessages]   = useState<ChatMessage[]>([]);
  const [input,      setInput]      = useState('');
  const [sessionId,  setSessionId]  = useState<string | undefined>();
  const [busy,       setBusy]       = useState(false);
  const [error,      setError]      = useState('');
  const listRef = useRef<FlatList>(null);

  const PROMPT_HINT: Record<string, string> = {
    farmer:             'Ask about your farm, flock health, credit, or training',
    investor:           'Ask about your portfolio, farmer profiles, or impact data',
    vet:                'Ask about bookings, poultry diseases, or treatment protocols',
    monitoring_officer: 'Ask about farm audits, disease signals, or report protocols',
    consumer:           'Ask about products, orders, or how to buy',
    input_dealer:       'Ask about input management, farmers, or platform features',
    admin:              'Ask about platform data, users, or credit workflow',
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true); setError('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    try {
      const r = await aiApi.chat(text, sessionId);
      setSessionId(r.data.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: r.data.reply }]);
    } catch {
      setError('Assistant unavailable. Please try again.');
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ I could not respond. Please try again.' }]);
    } finally {
      setBusy(false); }
  };

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        style={{ flex: 1, paddingHorizontal: Spacing.md }}
        contentContainerStyle={{ paddingTop: Spacing.sm, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <FarmAsystLogo size={52} />
            <Text style={{ fontSize: 14, color: Colors.muted, textAlign: 'center', marginTop: Spacing.md, lineHeight: 21, paddingHorizontal: Spacing.lg }}>
              {PROMPT_HINT[role] ?? 'Ask me anything about the platform.'}
            </Text>
            <Text style={{ fontSize: 12, color: Colors.muted, marginTop: Spacing.sm }}>Press Enter or tap Send to chat.</Text>
          </View>
        }
        renderItem={({ item: m }) => (
          <View style={{ flexDirection: 'row', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: Spacing.sm }}>
            {m.role === 'assistant' && (
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginTop: 2, flexShrink: 0 }}>
                <Text style={{ fontSize: 14 }}>🌾</Text>
              </View>
            )}
            <View style={[s.bubble, m.role === 'user' ? s.bubbleUser : s.bubbleBot]}>
              <Text style={{ fontSize: 14, color: m.role === 'user' ? '#fff' : Colors.ink, lineHeight: 21 }}>
                {m.content}
              </Text>
            </View>
          </View>
        )}
        ListFooterComponent={
          busy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14 }}>🌾</Text>
              </View>
              <View style={[s.bubble, s.bubbleBot, { paddingVertical: 10 }]}>
                <ActivityIndicator size="small" color={Colors.muted} />
              </View>
            </View>
          ) : null
        }
      />
      {error ? <Text style={{ fontSize: 12, color: Colors.danger, paddingHorizontal: Spacing.md, marginBottom: 4 }}>{error}</Text> : null}
      <View style={s.inputBar}>
        <TextInput
          style={s.chatInput}
          placeholder="Type your question…"
          placeholderTextColor={Colors.muted}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
          onSubmitEditing={send}
          blurOnSubmit={false}
          editable={!busy}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || busy) && { opacity: 0.4 }]}
          onPress={send}
          disabled={!input.trim() || busy}
        >
          <Text style={{ fontSize: 18 }}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── DISEASE DETECTION TAB ────────────────────────────────────────────────────
function DiseaseTab({ farms, role }: { farms: Farm[]; role: string }) {
  const [farmId,      setFarmId]      = useState(farms[0]?.id ?? '');
  const [mediaMode,   setMediaMode]   = useState<'none' | 'upload'>('none');
  const [photoUri,    setPhotoUri]    = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoMime,   setPhotoMime]   = useState('image/jpeg');
  const [busy,        setBusy]        = useState(false);
  const [error,       setError]       = useState('');
  const [result,      setResult]      = useState<DiseaseResult | null>(null);

  useEffect(() => { if (farms.length > 0 && !farmId) setFarmId(farms[0].id); }, [farms]);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Photo Library Permission Required',
        'Please allow photo library access in Settings to upload farm photos.',
        [{ text: 'OK' }]
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.Images],
      quality: 0.8, base64: true,
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setPhotoUri(a.uri);
      setPhotoBase64(a.base64 ?? null);
      setPhotoMime(a.mimeType ?? 'image/jpeg');
    }
  };

  const takePicture = async () => {
    // Request camera permission explicitly
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please allow camera access in Settings to take a photo of your flock.',
        [{ text: 'OK' }]
      );
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: [ImagePicker.MediaType.Images],
      quality: 0.8, base64: true,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setPhotoUri(a.uri);
      setPhotoBase64(a.base64 ?? null);
      setPhotoMime(a.mimeType ?? 'image/jpeg');
    }
  };

  const clearMedia = () => { setPhotoUri(null); setPhotoBase64(null); };

  const runAnalysis = async () => {
    const fId = farmId || farms[0]?.id;
    if (!fId) { setError('Please select a farm.'); return; }
    setBusy(true); setError(''); setResult(null);
    try {
      const payload: any = { farm_id: fId };
      if (photoBase64) {
        payload.media_data    = photoBase64;
        payload.media_type    = photoMime;
        payload.capture_mode  = mediaMode === 'upload' ? 'upload' : 'camera';
      }
      const r = await aiApi.disease(fId, photoBase64 ? payload : undefined);
      setResult(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Disease analysis failed. Please try again.');
    } finally { setBusy(false); }
  };

  const riskColor = result ? (RISK_COLORS[result.risk_level] ?? Colors.muted) : Colors.muted;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
      <Card>
        <SectionTitle>Farm Disease Risk Analysis</SectionTitle>
        <Text style={{ fontSize: 13, color: Colors.muted, lineHeight: 20, marginBottom: Spacing.md }}>
          Analyse recent activity logs to detect early disease signals. Add a farm photo for a more accurate visual assessment.
        </Text>

        {/* Farm selector */}
        {farms.length > 1 && (
          <>
            <FormLabel>Select Farm</FormLabel>
            <View style={s.pickerWrap}>
              {farms.map(f => (
                <TouchableOpacity key={f.id} style={[s.pickerOpt, farmId === f.id && s.pickerOptActive]} onPress={() => setFarmId(f.id)}>
                  <Text style={{ fontSize: 13, fontWeight: farmId === f.id ? '700' : '400', color: farmId === f.id ? Colors.primary : Colors.ink }}>
                    {f.name} · {f.district}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
        {role === 'admin' && farms.length === 0 && (
          <>
            <FormLabel>Farm ID</FormLabel>
            <TextInput style={s.input} placeholder="Enter farm UUID" value={farmId} onChangeText={setFarmId} />
          </>
        )}

        {/* Media mode */}
        <FormLabel>Add Farm Media <Text style={{ fontWeight: '400', color: Colors.muted }}>(optional — improves accuracy)</Text></FormLabel>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' }}>
          <TouchableOpacity style={[s.modeBtn, mediaMode === 'none' && s.modeBtnActive]} onPress={() => { setMediaMode('none'); clearMedia(); }}>
            <Text style={[s.modeBtnText, mediaMode === 'none' && s.modeBtnTextActive]}>Logs only</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.modeBtn, mediaMode === 'upload' && s.modeBtnActive]} onPress={() => setMediaMode('upload')}>
            <Text style={[s.modeBtnText, mediaMode === 'upload' && s.modeBtnTextActive]}>📷 Photo / Camera</Text>
          </TouchableOpacity>
        </View>

        {/* Upload / camera UI */}
        {mediaMode === 'upload' && (
          <View style={{ marginBottom: Spacing.md }}>
            {photoUri ? (
              <View>
                <Image source={{ uri: photoUri }} style={{ width: '100%', height: 200, borderRadius: Radius.sm, resizeMode: 'cover' }} />
                <TouchableOpacity onPress={clearMedia} style={{ marginTop: 6 }}>
                  <Text style={{ fontSize: 12, color: Colors.danger }}>✕ Remove photo</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 12, color: Colors.success, marginTop: 4 }}>✓ Photo ready for analysis</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <Button variant="secondary" onPress={takePicture} style={{ flex: 1 }}>📷 Camera</Button>
                <Button variant="secondary" onPress={pickMedia}   style={{ flex: 1 }}>🖼 Upload</Button>
              </View>
            )}
          </View>
        )}

        {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}

        <Button fullWidth disabled={busy || (!farmId && farms.length === 0)} loading={busy} onPress={runAnalysis}>
          {photoBase64 ? '🦠 Run Analysis with Photo' : '🦠 Run Analysis'}
        </Button>
      </Card>

      {/* Results */}
      {result && (
        <Card style={{ marginTop: Spacing.md }}>
          {/* Risk header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md, flexWrap: 'wrap' }}>
            <View style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: riskColor + '20', borderWidth: 1, borderColor: riskColor + '40' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: riskColor, textTransform: 'uppercase' }}>
                {result.risk_level} risk
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: Colors.muted }}>Risk score: <Text style={{ fontWeight: '700' }}>{result.risk_score}/100</Text></Text>
            {result.vet_consultation_required && (
              <View style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm }}>
                <Text style={{ fontSize: 12, color: '#ea580c', fontWeight: '700' }}>⚠️ Vet consultation required</Text>
              </View>
            )}
          </View>

          <Text style={{ fontSize: 14, lineHeight: 21, marginBottom: Spacing.md }}>{result.summary}</Text>

          {result.detected_signals?.length > 0 && (
            <>
              <SectionTitle>Detected Signals</SectionTitle>
              {result.detected_signals.map((sig, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                  <Badge variant={sig.severity === 'high' ? 'danger' : sig.severity === 'moderate' ? 'warning' : 'neutral'}>
                    {sig.severity}
                  </Badge>
                  <Text style={{ fontSize: 13, flex: 1 }}>{sig.signal}</Text>
                </View>
              ))}
            </>
          )}

          {result.suspected_conditions?.length > 0 && (
            <>
              <SectionTitle>Suspected Conditions</SectionTitle>
              {result.suspected_conditions.map((c, i) => (
                <Card key={i} style={{ marginBottom: Spacing.sm }}>
                  <Text style={{ fontSize: 13, fontWeight: '700' }}>{c.condition} <Text style={{ fontSize: 12, color: Colors.muted, fontWeight: '400' }}>({c.confidence} confidence)</Text></Text>
                  <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>{c.reason}</Text>
                </Card>
              ))}
            </>
          )}

          {result.immediate_actions?.length > 0 && (
            <>
              <SectionTitle>Immediate Actions</SectionTitle>
              {result.immediate_actions.map((a, i) => (
                <Text key={i} style={{ fontSize: 13, marginBottom: 4 }}>• {a}</Text>
              ))}
            </>
          )}

          {result.preventive_recommendations?.length > 0 && (
            <>
              <SectionTitle>Preventive Recommendations</SectionTitle>
              {result.preventive_recommendations.map((r, i) => (
                <Text key={i} style={{ fontSize: 13, color: Colors.muted, marginBottom: 4 }}>• {r}</Text>
              ))}
            </>
          )}

          <Text style={{ fontSize: 11, color: Colors.muted, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }}>
            Farm: {result.farm_name} · Generated: {new Date(result.generated_at).toLocaleString('en-GH')}
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

// ── CREDIT SCORING TAB ────────────────────────────────────────────────────────
function CreditTab({ role, userId }: { role: string; userId: string }) {
  const [farmerId,      setFarmerId]      = useState(userId);
  const [busy,          setBusy]          = useState(false);
  const [error,         setError]         = useState('');
  const [result,        setResult]        = useState<CreditResult | null>(null);
  // Admin farmer search
  const [farmerList,    setFarmerList]    = useState<{ id: string; name: string; district?: string; region?: string }[]>([]);
  const [farmerSearch,  setFarmerSearch]  = useState('');
  const [dropdownOpen,  setDropdownOpen]  = useState(false);
  const [farmersLoading,setFarmersLoading]= useState(false);

  useEffect(() => {
    if (role !== 'admin') return;
    setFarmersLoading(true);
    profilesApi.listFarmers()
      .then(r => {
        const raw = Array.isArray(r.data) ? r.data : (r.data?.results ?? []);
        const opts = raw.map((item: any) => {
          const u = item.user ?? item;
          const name = u.full_name?.trim() || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email || 'Unknown';
          return { id: u.id as string, name, district: item.district ?? u.district, region: item.region ?? u.region };
        }).filter((f: any) => f.id && f.name).sort((a: any, b: any) => a.name.localeCompare(b.name));
        setFarmerList(opts);
      })
      .catch(() => {})
      .finally(() => setFarmersLoading(false));
  }, [role]);

  const filteredFarmers = farmerList.filter(f => {
    const q = farmerSearch.toLowerCase();
    return !q || f.name.toLowerCase().includes(q) || (f.district ?? '').toLowerCase().includes(q) || (f.region ?? '').toLowerCase().includes(q);
  });

  const selectedFarmer = farmerList.find(f => f.id === farmerId);

  const run = async () => {
    if (!farmerId) return;
    setBusy(true); setError(''); setResult(null);
    try {
      const r = await aiApi.credit(farmerId);
      setResult(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Credit scoring failed. Please try again.');
    } finally { setBusy(false); }
  };

  const gradeColor = result ? (GRADE_COLORS[result.grade] ?? '#666') : '#666';

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
      <Card>
        <SectionTitle>AI Credit Scoring Engine</SectionTitle>
        <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: Spacing.md, lineHeight: 20 }}>
          Analyse farmer KPIs, farm data, audit scores, and activity logs to generate a creditworthiness score.
        </Text>

        {role === 'admin' && (
          <View style={{ marginBottom: Spacing.md }}>
            <FormLabel>Select Farmer</FormLabel>
            {/* Trigger button */}
            <TouchableOpacity
              style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => { setDropdownOpen(o => !o); setFarmerSearch(''); }}
              disabled={farmersLoading}
            >
              <Text style={{ fontSize: 14, color: selectedFarmer ? Colors.ink : Colors.muted, flex: 1 }}>
                {farmersLoading ? 'Loading farmers…' : selectedFarmer ? selectedFarmer.name : 'Choose a farmer…'}
              </Text>
              <Text style={{ color: Colors.muted, fontSize: 12 }}>▾</Text>
            </TouchableOpacity>
            {/* Dropdown panel */}
            {dropdownOpen && (
              <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, backgroundColor: Colors.white, marginTop: 4, zIndex: 100 }}>
                {/* Search */}
                <View style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ marginRight: 6, color: Colors.muted }}>🔍</Text>
                  <TextInput
                    style={{ flex: 1, fontSize: 13, color: Colors.ink, paddingVertical: 4 }}
                    placeholder="Search by name or district…"
                    placeholderTextColor={Colors.muted}
                    value={farmerSearch}
                    onChangeText={setFarmerSearch}
                    autoFocus
                  />
                </View>
                {/* Options */}
                <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {filteredFarmers.length === 0 ? (
                    <Text style={{ padding: 14, fontSize: 13, color: Colors.muted, textAlign: 'center' }}>
                      {farmerSearch ? `No farmers match "${farmerSearch}"` : 'No farmers found'}
                    </Text>
                  ) : filteredFarmers.map(f => (
                    <TouchableOpacity
                      key={f.id}
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: f.id === farmerId ? Colors.primary + '12' : 'transparent' }}
                      onPress={() => { setFarmerId(f.id); setDropdownOpen(false); setFarmerSearch(''); }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: f.id === farmerId ? '700' : '400', color: f.id === farmerId ? Colors.primary : Colors.ink }}>
                        {f.name}
                      </Text>
                      {(f.district || f.region) && (
                        <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 2 }}>
                          {[f.district, f.region].filter(Boolean).join(', ')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
        {role === 'farmer' && (
          <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: Spacing.md }}>
            This will analyse your own farm data and generate your credit score.
          </Text>
        )}

        {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}

        <Button fullWidth disabled={busy || !farmerId} loading={busy} onPress={run}>
          📊 Run Credit Score
        </Button>
      </Card>

      {result && (
        <Card style={{ marginTop: Spacing.md }}>
          {/* Grade + score header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md, flexWrap: 'wrap' }}>
            {/* Grade circle */}
            <View style={{
              width: 72, height: 72, borderRadius: 36,
              backgroundColor: gradeColor + '18',
              borderWidth: 3, borderColor: gradeColor,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: gradeColor }}>{result.grade}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: Colors.ink }}>
                {result.overall_score}<Text style={{ fontSize: 14, color: Colors.muted, fontWeight: '400' }}>/100</Text>
              </Text>
              <Text style={{ fontSize: 13, color: Colors.muted }}>{result.farmer_name}</Text>
              {/* Recommendation badge */}
              <View style={{ marginTop: 6 }}>
                <Badge variant={result.recommendation === 'approve' ? 'success' : result.recommendation === 'review' ? 'warning' : 'danger'}>
                  {result.recommendation === 'approve' ? '✅ Recommend Approval'
                    : result.recommendation === 'review'  ? '⚠️ Recommend Review'
                    : '❌ Recommend Reject'}
                </Badge>
              </View>
            </View>
          </View>

          {/* Score dimensions */}
          <SectionTitle>Score Breakdown</SectionTitle>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md }}>
            {Object.entries(result.dimensions).map(([key, val]) => (
              <View key={key} style={{ minWidth: '45%', flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.sm, padding: Spacing.sm }}>
                <Text style={{ fontSize: 10, color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                  {key.replace(/_/g, ' ')}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700' }}>
                  {val}<Text style={{ fontSize: 11, color: Colors.muted }}>/20</Text>
                </Text>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: Colors.border, marginTop: 6 }}>
                  <View style={{ width: `${(val / 20) * 100}%`, height: 4, borderRadius: 2, backgroundColor: Colors.primary }} />
                </View>
              </View>
            ))}
          </View>

          {/* Narrative */}
          <Text style={{ fontSize: 14, lineHeight: 22, marginBottom: Spacing.md, color: Colors.ink }}>{result.narrative}</Text>

          {/* Strengths & Risks */}
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <View style={{ flex: 1 }}>
              <SectionTitle>Strengths</SectionTitle>
              {result.strengths?.map((str, i) => (
                <Text key={i} style={{ fontSize: 13, color: Colors.success, marginBottom: 4 }}>✅ {str}</Text>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <SectionTitle>Risks</SectionTitle>
              {result.risks?.map((r, i) => (
                <Text key={i} style={{ fontSize: 13, color: '#ea580c', marginBottom: 4 }}>⚠️ {r}</Text>
              ))}
            </View>
          </View>

          <Text style={{ fontSize: 11, color: Colors.muted, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }}>
            Generated: {new Date(result.generated_at).toLocaleString('en-GH')}
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

// ── AI FLOCK COUNT TAB (Monitoring Officers) ──────────────────────────────────
function FlockCountTab({ farms }: { farms: Farm[] }) {
  const [farmId,    setFarmId]    = useState(farms[0]?.id ?? '');
  const [imageUri,  setImageUri]  = useState<string | null>(null);
  const [imageB64,  setImageB64]  = useState<string | null>(null);
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState('');
  const [result,    setResult]    = useState<any>(null);

  useEffect(() => { if (farms.length > 0 && !farmId) setFarmId(farms[0].id); }, [farms]);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Camera Permission Required', 'Allow camera access in Settings to photograph flocks.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: [ImagePicker.MediaType.Images], quality: 0.85, base64: true });
    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
      setImageB64(res.assets[0].base64 ?? null);
    }
  };

  const uploadPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Photo Library Required', 'Allow photo library access in Settings.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [ImagePicker.MediaType.Images], quality: 0.85, base64: true });
    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
      setImageB64(res.assets[0].base64 ?? null);
    }
  };

  const runCount = async () => {
    const fId = farmId || farms[0]?.id;
    if (!fId) { setError('Please select a farm.'); return; }
    if (!imageB64) { setError('Please add a photo of the flock.'); return; }
    setBusy(true); setError(''); setResult(null);
    try {
      // Use disease detection endpoint with photo — the AI model returns flock count in its analysis
      const r = await api.post('/ai/disease-detection/', {
        farm_id:      fId,
        media_data:   imageB64,
        media_type:   'image/jpeg',
        capture_mode: 'camera',
      });
      setResult(r.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Analysis failed. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}>
      <Card>
        <SectionTitle>AI Flock Count & Analysis</SectionTitle>
        <Text style={{ fontSize: 13, color: Colors.muted, lineHeight: 20, marginBottom: Spacing.md }}>
          Take or upload a photo of the flock. The AI will analyse it against registered farm data and provide a flock count estimate along with health signals.
        </Text>

        {/* Farm selector */}
        {farms.length > 1 && (
          <>
            <FormLabel>Select Farm</FormLabel>
            <View style={s.pickerWrap}>
              {farms.map(f => (
                <TouchableOpacity key={f.id} style={[s.pickerOpt, farmId === f.id && s.pickerOptActive]} onPress={() => setFarmId(f.id)}>
                  <Text style={{ fontSize: 13, fontWeight: farmId === f.id ? '700' : '400', color: farmId === f.id ? Colors.primary : Colors.ink }}>
                    {f.name} · {f.district} — Registered: {f.flock_size?.toLocaleString()} birds
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Photo area */}
        {imageUri ? (
          <View style={{ marginBottom: Spacing.md }}>
            <Image source={{ uri: imageUri }} style={{ width: '100%', height: 220, borderRadius: Radius.sm, resizeMode: 'cover' }} />
            <TouchableOpacity onPress={() => { setImageUri(null); setImageB64(null); }} style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 12, color: Colors.danger }}>✕ Remove photo</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: Colors.success, marginTop: 4 }}>✓ Photo ready for AI count</Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
            <Button variant="secondary" onPress={takePhoto} style={{ flex: 1 }}>
              📷 Take Photo
            </Button>
            <Button variant="secondary" onPress={uploadPhoto} style={{ flex: 1 }}>
              🖼 Upload Photo
            </Button>
          </View>
        )}

        {error ? <AlertBanner variant="danger">{error}</AlertBanner> : null}

        <Button fullWidth disabled={busy || !imageB64 || (!farmId && farms.length === 0)} loading={busy} onPress={runCount}>
          🐔 Run AI Flock Count
        </Button>
      </Card>

      {result && (
        <Card style={{ marginTop: Spacing.md }}>
          <SectionTitle>Analysis Result</SectionTitle>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: Spacing.md, flexWrap: 'wrap' }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
              backgroundColor: (RISK_COLORS[result.risk_level] ?? Colors.muted) + '20',
              borderWidth: 1, borderColor: (RISK_COLORS[result.risk_level] ?? Colors.muted) + '40' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: RISK_COLORS[result.risk_level] ?? Colors.muted, textTransform: 'uppercase' }}>
                {result.risk_level} risk · Score: {result.risk_score}/100
              </Text>
            </View>
          </View>
          <Text style={{ fontSize: 14, lineHeight: 21, marginBottom: Spacing.md }}>{result.summary}</Text>
          {result.detected_signals?.length > 0 && (
            <>
              <SectionTitle>Detected Signals</SectionTitle>
              {result.detected_signals.map((sig: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
                  <Badge variant={sig.severity === 'high' ? 'danger' : sig.severity === 'moderate' ? 'warning' : 'neutral'}>{sig.severity}</Badge>
                  <Text style={{ fontSize: 13, flex: 1 }}>{sig.signal}</Text>
                </View>
              ))}
            </>
          )}
          {result.immediate_actions?.length > 0 && (
            <>
              <SectionTitle>Immediate Actions</SectionTitle>
              {result.immediate_actions.map((a: string, i: number) => (
                <Text key={i} style={{ fontSize: 13, marginBottom: 4 }}>• {a}</Text>
              ))}
            </>
          )}
          {result.vet_consultation_required && (
            <View style={{ backgroundColor: '#FFF3E0', padding: 10, borderRadius: Radius.sm, marginTop: 8 }}>
              <Text style={{ fontSize: 13, color: '#ea580c', fontWeight: '700' }}>⚠️ Vet consultation required</Text>
            </View>
          )}
          <Text style={{ fontSize: 11, color: Colors.muted, marginTop: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border }}>
            Farm: {result.farm_name} · {new Date(result.generated_at).toLocaleString('en-GH')}
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tab:            { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.sm, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  tabActive:      { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText:        { fontSize: 13, fontWeight: '600', color: Colors.muted },
  tabTextActive:  { color: '#fff' },
  bubble:         { maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, marginBottom: 2 },
  bubbleUser:     { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  bubbleBot:      { backgroundColor: '#F0F0EB', borderBottomLeftRadius: 4 },
  inputBar:       { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.sm, paddingBottom: Platform.OS === 'ios' ? 24 : Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.white },
  chatInput:      { flex: 1, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, maxHeight: 100 },
  sendBtn:        { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  input:          { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  modeBtn:        { paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  modeBtnActive:  { backgroundColor: Colors.primary, borderColor: Colors.primary },
  modeBtnText:    { fontSize: 13, fontWeight: '600', color: Colors.muted },
  modeBtnTextActive: { color: '#fff' },
  pickerWrap:     { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, marginBottom: Spacing.sm, overflow: 'hidden' },
  pickerOpt:      { padding: Spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerOptActive:{ backgroundColor: '#F0F7EB' },
});
