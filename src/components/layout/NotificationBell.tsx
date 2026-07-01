import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { notifApi } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';

const NOTIF_ICONS: Record<string,string> = {
  credit:'💳', farm:'🐔', payment:'💸', training:'📚', marketplace:'🛒',
  vet:'🩺', system:'📢', verification:'✅',
};

export default function NotificationBell() {
  const [open,    setOpen]    = useState(false);
  const [notifs,  setNotifs]  = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [unread,  setUnread]  = useState(0);

  const loadCount = useCallback(async () => {
    try {
      const r = await notifApi.unreadCount();
      setUnread(r.data?.count ?? 0);
    } catch { /* ignore */ }
  }, []);

  const loadNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await notifApi.list();
      const data = Array.isArray(r.data) ? r.data : (r.data?.results ?? []);
      setNotifs(data);
      setUnread(data.filter((n: any) => !n.is_read).length);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 60000);
    return () => clearInterval(interval);
  }, [loadCount]);

  const openBell = () => { setOpen(true); loadNotifs(); };

  const markRead = async (id: string) => {
    try { await notifApi.markRead(id); loadNotifs(); }
    catch { /* ignore */ }
  };

  const markAll = async () => {
    try { await notifApi.markAllRead(); loadNotifs(); }
    catch { /* ignore */ }
  };

  return (
    <>
      {/* Bell button */}
      <TouchableOpacity onPress={openBell} style={s.bell} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
        <Text style={s.bellIcon}>🔔</Text>
        {unread > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeTxt}>{unread > 9 ? '9+' : unread}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Notification drawer */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={s.overlay}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={s.drawer}>
            {/* Header */}
            <View style={s.drawerHeader}>
              <Text style={s.drawerTitle}>Notifications</Text>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                {unread > 0 && (
                  <TouchableOpacity onPress={markAll}>
                    <Text style={{ fontSize: 12, color: Colors.leaf, fontWeight: '600' }}>Mark all read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Text style={{ fontSize: 18, color: Colors.muted, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={Colors.leaf} />
              </View>
            ) : notifs.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 12 }}>🔔</Text>
                <Text style={{ color: Colors.muted, fontSize: 14 }}>No notifications yet</Text>
              </View>
            ) : (
              <ScrollView style={{ flex: 1 }}>
                {notifs.map(n => (
                  <TouchableOpacity
                    key={n.id}
                    style={[s.notifRow, !n.is_read && s.notifUnread]}
                    onPress={() => markRead(n.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={s.notifIcon}>
                      {NOTIF_ICONS[n.notification_type?.split('_')[0] ?? ''] ?? '🔔'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={[s.notifTitle, !n.is_read && { color: Colors.leaf }]} numberOfLines={1}>
                          {n.title}
                        </Text>
                        {!n.is_read && <View style={s.unreadDot} />}
                      </View>
                      <Text style={s.notifMsg} numberOfLines={2}>{n.message}</Text>
                      <Text style={s.notifTime}>
                        {new Date(n.created_at).toLocaleString('en-GH', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  bell:         { position: 'relative', width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bellIcon:     { fontSize: 20 },
  badge:        { position: 'absolute', top: 0, right: 0, backgroundColor: '#dc2626', borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff' },
  badgeTxt:     { color: '#fff', fontSize: 9, fontWeight: '800' },
  overlay:      { flex: 1, justifyContent: 'flex-end' },
  backdrop:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  drawer:       { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '82%', minHeight: 300 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  drawerTitle:  { fontSize: 17, fontWeight: '700', color: Colors.ink },
  notifRow:     { flexDirection: 'row', gap: 12, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, alignItems: 'flex-start' },
  notifUnread:  { backgroundColor: '#F0F7F0' },
  notifIcon:    { fontSize: 22, marginTop: 2 },
  notifTitle:   { fontSize: 14, fontWeight: '700', color: Colors.ink, flex: 1 },
  notifMsg:     { fontSize: 13, color: Colors.ink, marginTop: 3, lineHeight: 19 },
  notifTime:    { fontSize: 11, color: Colors.muted, marginTop: 4 },
  unreadDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.leaf },
});
