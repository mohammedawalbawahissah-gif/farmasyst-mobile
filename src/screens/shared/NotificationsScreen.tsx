import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { notifApi } from '../../api/client';
import { Card, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { getResults, Notification } from '../../types';

const NOTIF_ICONS: Record<string,string> = {
  credit:'💳', farm:'🐔', payment:'💸', training:'📚', marketplace:'🛒',
  vet:'🩺', system:'📢', verification:'✅',
};

export default function NotificationsScreen() {
  const [notifs,     setNotifs]     = useState<Notification[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking,    setMarking]    = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await notifApi.list();
      const data = r.data;
      setNotifs(Array.isArray(data) ? data : getResults<Notification>(data as any));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const markRead = async (id: string) => {
    try { await notifApi.markRead(id); load(); }
    catch { /* ignore */ }
  };

  const markAllRead = async () => {
    setMarking(true);
    try { await notifApi.markAllRead(); load(); }
    catch { /* ignore */ }
    finally { setMarking(false); }
  };

  const unreadCount = notifs.filter(n => !n.is_read).length;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;

  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: Spacing.sm }}>
        <View>
          <Text style={s.pageTitle}>Notifications</Text>
          {unreadCount > 0 ? <Text style={s.pageSub}>{unreadCount} unread</Text> : <Text style={s.pageSub}>All caught up</Text>}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={s.markAllBtn} onPress={markAllRead} disabled={marking}>
            {marking ? <ActivityIndicator size="small" color={Colors.leaf} />
              : <Text style={s.markAllText}>Mark all read</Text>}
          </TouchableOpacity>
        )}
      </View>

      {notifs.length === 0
        ? <EmptyState icon="🔔" message="No notifications yet." />
        : notifs.map(n => (
          <TouchableOpacity key={n.id} onPress={() => !n.is_read && markRead(n.id)} activeOpacity={0.7}>
            <Card style={[!n.is_read && s.unread]}>
              <View style={{ flexDirection:'row', gap: 10, alignItems:'flex-start' }}>
                <Text style={{ fontSize: 22 }}>
                  {NOTIF_ICONS[n.notification_type?.split('_')[0] ?? ''] ?? '🔔'}
                </Text>
                <View style={{ flex:1 }}>
                  <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                    <Text style={[s.notifTitle, !n.is_read && { color: Colors.leaf }]}>{n.title}</Text>
                    {!n.is_read && <View style={s.unreadDot} />}
                  </View>
                  <Text style={s.notifMsg}>{n.message}</Text>
                  <Text style={s.notifTime}>
                    {new Date(n.created_at).toLocaleString('en-GH', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        ))
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.bg },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pageTitle:   { fontSize: 22, fontWeight: '700', color: Colors.ink },
  pageSub:     { fontSize: 13, color: Colors.muted },
  markAllBtn:  { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.leaf },
  markAllText: { fontSize: 13, color: Colors.leaf, fontWeight: '600' },
  unread:      { borderLeftWidth: 3, borderLeftColor: Colors.leaf },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.leaf, marginTop: 4 },
  notifTitle:  { fontSize: 14, fontWeight: '700', color: Colors.ink, flex: 1 },
  notifMsg:    { fontSize: 13, color: Colors.ink, marginTop: 3 },
  notifTime:   { fontSize: 11, color: Colors.muted, marginTop: 4 },
});
