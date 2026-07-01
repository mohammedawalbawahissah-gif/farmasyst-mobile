import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Modal, FlatList, ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { FarmAsystLogo } from '../ui';

const { width: SCREEN_W } = Dimensions.get('window');

const ROLE_COLORS: Record<string, string> = {
  farmer: '#4A7C2F', investor: '#1A4A6B', admin: '#3730A3',
  monitoring_officer: '#1A6B5A', vet: '#0D6E8E', consumer: '#8B3A2F', input_dealer: '#B45309',
};
const ROLE_TITLES: Record<string, string> = {
  farmer: 'Farmer Assistant', investor: 'Investor Assistant', admin: 'Admin Assistant',
  monitoring_officer: 'Monitoring Assistant', vet: 'Vet Assistant',
  consumer: 'Consumer Assistant', input_dealer: 'Dealer Assistant',
};
const ROLE_HINTS: Record<string, string> = {
  farmer: 'Ask about your flock health, credit, training, or farm activity.',
  investor: 'Ask about your portfolio, farmer performance, or investment opportunities.',
  admin: 'Ask about platform metrics, user management, or credit workflows.',
  monitoring_officer: 'Ask about farm audit protocols, disease signals, or report guidance.',
  vet: 'Ask about poultry diseases, treatment protocols, or booking management.',
  consumer: 'Ask about products, orders, or subscriptions.',
  input_dealer: 'Ask about listing products, managing stock, or reaching farmers.',
};
const SUGGESTIONS: Record<string, string[]> = {
  farmer: ['How do I apply for credit?', 'Signs of Newcastle disease?', 'How to improve my credit score?'],
  investor: ['Which farmers have the best returns?', 'How is my portfolio performing?', 'What risks should I watch?'],
  admin: ['How many pending credit applications?', "What are today's critical alerts?", 'Summarise platform activity'],
  monitoring_officer: ['What should I check during a farm audit?', 'How do I submit a report?', 'Signs of biosecurity failure?'],
  vet: ['Common poultry diseases in Ghana?', 'How do I manage my bookings?', 'Treatment for coccidiosis?'],
  consumer: ['How do I track my order?', 'What products are available?', 'How do subscriptions work?'],
  input_dealer: ['How do I add a new listing?', 'How do farmers order from me?', 'How to manage my stock?'],
};

interface Message { role: 'user' | 'assistant'; content: string }

export default function AIFloatingWidget({ hidden = false }: { hidden?: boolean }) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const role        = user?.role ?? 'farmer';
  const firstName   = user?.first_name?.trim() || (user?.full_name ?? '').split(' ')[0] || 'there';
  const accentColor = ROLE_COLORS[role] ?? Colors.leaf;

  const [open,      setOpen]      = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [busy,      setBusy]      = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [unread,    setUnread]    = useState(0);
  const listRef = useRef<FlatList>(null);

  useEffect(() => { if (open) setUnread(0); }, [open]);
  useEffect(() => {
    if (messages.length > 0 && open) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages, open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput(''); setBusy(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    try {
      const r = await api.post('/ai/chat/', { message: text, session_id: sessionId });
      setSessionId(r.data.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: r.data.reply }]);
      if (!open) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ I could not respond right now. Please try again.' }]);
    } finally { setBusy(false); }
  }, [input, busy, sessionId, open]);

  if (hidden) return null;

  return (
    <>
      {/* Floating bubble */}
      {!open && (
        <TouchableOpacity style={[st.bubble, { backgroundColor: accentColor }]} onPress={() => setOpen(true)} activeOpacity={0.85}>
          <FarmAsystLogo size={40} circle />
          {unread > 0 && (
            <View style={st.badge}><Text style={st.badgeTxt}>{unread > 9 ? '9+' : unread}</Text></View>
          )}
        </TouchableOpacity>
      )}

      {/* Chat panel */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={st.overlay}>
          {/* Full-screen: no backdrop tap-to-close */}
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={st.panel}>
            {/* Header */}
            <View style={[st.hdr, { backgroundColor: accentColor, paddingTop: insets.top + 12 }]}>
              <FarmAsystLogo size={32} circle />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={st.hdrTitle}>{ROLE_TITLES[role] ?? 'FarmAsyst AI'}</Text>
                <Text style={st.hdrSub}>{busy ? 'Thinking…' : 'Online'}</Text>
              </View>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top:10,bottom:10,left:10,right:10 }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(_, i) => String(i)}
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: Spacing.md, paddingBottom: 8, flexGrow: 1 }}
              ListEmptyComponent={
                <View style={st.empty}>
                  <Text style={[st.greeting, { color: accentColor }]}>Hello {firstName} 👋</Text>
                  <Text style={st.greetSub}>How can I help you today?</Text>
                  <Text style={st.hint}>{ROLE_HINTS[role]}</Text>
                  <View style={{ gap: 8, marginTop: 12, width: '100%' }}>
                    {(SUGGESTIONS[role] ?? []).map((s, i) => (
                      <TouchableOpacity key={i} style={[st.sug, { borderColor: accentColor + '40', backgroundColor: accentColor + '12' }]} onPress={() => setInput(s)}>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: accentColor }}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              }
              renderItem={({ item: m }) => (
                <View style={{ flexDirection: 'row', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                  {m.role === 'assistant' && (
                    <View style={[st.avt, { backgroundColor: accentColor }]}><FarmAsystLogo size={20} circle /></View>
                  )}
                  <View style={[st.msg, m.role === 'user'
                    ? { backgroundColor: accentColor, borderBottomRightRadius: 4 }
                    : { backgroundColor: '#F0F0EB', borderBottomLeftRadius: 4 }]}>
                    <Text style={{ fontSize: 13, color: m.role === 'user' ? '#fff' : Colors.ink, lineHeight: 20 }}>{m.content}</Text>
                  </View>
                </View>
              )}
              ListFooterComponent={busy ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={[st.avt, { backgroundColor: accentColor }]}><FarmAsystLogo size={20} circle /></View>
                  <View style={[st.msg, { backgroundColor: '#F0F0EB', paddingVertical: 14 }]}>
                    <ActivityIndicator size="small" color={Colors.muted} />
                  </View>
                </View>
              ) : null}
            />

            {/* Input */}
            <View style={st.inputRow}>
              <TextInput
                style={st.inp}
                placeholder="Ask anything…"
                placeholderTextColor={Colors.muted}
                value={input} onChangeText={setInput}
                multiline maxLength={1000} editable={!busy}
                onSubmitEditing={send} blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[st.sendBtn, { backgroundColor: (!input.trim() || busy) ? Colors.border : accentColor }]}
                onPress={send} disabled={!input.trim() || busy}>
                <Text style={{ color: '#fff', fontSize: 16 }}>➤</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  bubble:   { position: 'absolute', bottom: 24, right: 18, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', zIndex: 999, elevation: 8, shadowColor: '#000', shadowOffset:{width:0,height:4}, shadowOpacity:0.3, shadowRadius:8 },
  badge:    { position: 'absolute', top: -2, right: -2, backgroundColor: '#dc2626', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '800' },
  overlay:  { flex: 1, backgroundColor: Colors.white },
  panel:    { flex: 1, backgroundColor: Colors.white },
  hdr:      { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  hdrTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  hdrSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 },
  empty:    { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24, flexGrow: 1, justifyContent: 'center' },
  greeting: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  greetSub: { fontSize: 14, color: Colors.muted, marginBottom: 6 },
  hint:     { fontSize: 12, color: Colors.muted, textAlign: 'center', lineHeight: 18 },
  sug:      { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  avt:      { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginRight: 6 },
  msg:      { maxWidth: SCREEN_W * 0.72, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, padding: Spacing.sm, paddingBottom: Platform.OS === 'ios' ? 24 : Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  inp:      { flex: 1, backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, maxHeight: 100 },
  sendBtn:  { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
