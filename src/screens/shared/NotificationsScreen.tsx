import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { notifApi } from '../../api/client';
import { Notification } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { EmptyState, ErrorBanner } from '../../components/ui';

const PRIORITY_COLOR: Record<string, string> = {
  urgent: Colors.danger, high: Colors.warning,
  medium: Colors.leaf,   low: Colors.muted,
};

export default function NotificationsScreen() {
  const [notifs,     setNotifs]     = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await notifApi.list();
      setNotifs(res.data.results ?? res.data);
    } catch { setError('Could not load notifications.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function markAllRead() {
    try { await notifApi.markAllRead(); load(); }
    catch { Alert.alert('Error', 'Could not mark as read.'); }
  }

  async function markOne(id: string) {
    try { await notifApi.markRead(id); load(); } catch {}
  }

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <Screen title="Notifications" subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}>
      {error ? <ErrorBanner message={error} /> : null}

      {unread > 0 && (
        <TouchableOpacity onPress={markAllRead} style={styles.markAll}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {notifs.length === 0
          ? <EmptyState message="No notifications yet." icon="🔔" />
          : notifs.map(n => (
              <TouchableOpacity
                key={n.id}
                onPress={() => markOne(n.id)}
                activeOpacity={0.7}
                style={[styles.item, !n.is_read && styles.itemUnread]}
              >
                <View style={[styles.dot, { backgroundColor: n.is_read ? Colors.border : PRIORITY_COLOR[n.priority] ?? Colors.leaf }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, !n.is_read && { color: Colors.ink }]}>{n.title}</Text>
                  <Text style={styles.body}>{n.body}</Text>
                  <Text style={styles.time}>{new Date(n.created_at).toLocaleString()}</Text>
                </View>
              </TouchableOpacity>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  markAll:     { alignSelf: 'flex-end', marginRight: Spacing.md, marginTop: Spacing.sm, marginBottom: 4 },
  markAllText: { fontSize: 13, color: Colors.leaf, fontWeight: '600' },
  item:        { flexDirection: 'row', gap: 12, paddingHorizontal: Spacing.md, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  itemUnread:  { backgroundColor: '#F0F7EC' },
  dot:         { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  title:       { fontSize: 13, fontWeight: '700', color: Colors.ink },
  body:        { fontSize: 12, color: Colors.muted, marginTop: 3, lineHeight: 18 },
  time:        { fontSize: 11, color: Colors.muted, marginTop: 4 },
});
