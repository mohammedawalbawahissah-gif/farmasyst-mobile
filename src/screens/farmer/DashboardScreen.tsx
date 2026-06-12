import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { farmsApi, creditApi, paymentsApi, notifApi } from '../../api/client';
import { Colors, Spacing } from '../../constants/theme';
import {
  HeroCard, StatCard, Pill, statusVariant,
  EmptyState, ErrorBanner, Card, SectionTitle, Button,
} from '../../components/ui';
import { CreditApplication, RepaymentSchedule, Farm } from '../../types';

export default function FarmerDashboard() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  // FIX: useNavigation to switch tabs programmatically
  const navigation = useNavigation<any>();

  const [farms,      setFarms]      = useState<Farm[]>([]);
  const [apps,       setApps]       = useState<CreditApplication[]>([]);
  const [schedules,  setSchedules]  = useState<RepaymentSchedule[]>([]);
  const [unread,     setUnread]     = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [f, a, s, n] = await Promise.all([
        farmsApi.list(),
        creditApi.listApplications(),
        paymentsApi.schedules(),
        notifApi.unreadCount(),
      ]);
      setFarms(f.data.results ?? f.data);
      setApps(a.data.results ?? a.data);
      setSchedules(s.data.results ?? s.data);
      setUnread(n.data.unread ?? 0);
    } catch {
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeApp = apps.find(a => !['draft', 'rejected', 'withdrawn'].includes(a.status));
  const nextDue   = schedules
    .filter(s => ['due', 'upcoming', 'overdue'].includes(s.status))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const farm = farms[0];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Good morning,</Text>
          <Text style={styles.name}>{user?.first_name ?? 'Farmer'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>}
          <TouchableOpacity onPress={logout}><Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Sign out</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {error ? <ErrorBanner message={error} /> : null}

        <HeroCard
          title={farm?.name ?? 'My Farm'}
          subtitle={farm ? `${farm.region} · ${farm.district}` : 'Register your farm to get started'}
          amount={activeApp ? `GHS ${parseFloat(activeApp.amount_requested ?? '0').toLocaleString()}` : undefined}
          note={activeApp ? `${activeApp.reference} · ${activeApp.status.replace(/_/g, ' ')}` : undefined}
          color={Colors.earth}
        />

        <View style={styles.statsRow}>
          <StatCard label="Flock Size"  value={farm ? farm.flock_size.toLocaleString() : '—'} />
          <StatCard label="Applications" value={apps.filter(a => ['submitted','under_review','matched'].includes(a.status)).length.toString()} />
        </View>
        <View style={styles.statsRow}>
          <StatCard
            label="Next Repayment"
            value={nextDue ? `GHS ${parseFloat(nextDue.amount_due).toLocaleString()}` : 'None due'}
            change={nextDue ? `Due ${nextDue.due_date}` : undefined}
            changeUp={false}
          />
          <StatCard label="Notifications" value={unread.toString()} change={unread > 0 ? 'Unread' : undefined} changeUp={false} />
        </View>

        {/* FIX: buttons now navigate to the correct tabs */}
        <SectionTitle title="Quick Actions" />
        <View style={styles.actionRow}>
          <Button label="Apply for Credit" onPress={() => navigation.navigate('Credit')}      variant="primary"   style={{ flex: 1 }} />
          <Button label="Log Activity"     onPress={() => navigation.navigate('Farm')}        variant="secondary" style={{ flex: 1 }} />
        </View>
        <View style={styles.actionRow}>
          <Button label="Marketplace"      onPress={() => navigation.navigate('Marketplace')} variant="secondary" style={{ flex: 1 }} />
          <Button label="Notifications"    onPress={() => navigation.navigate('Alerts')}      variant="ghost"     style={{ flex: 1 }} />
        </View>

        <SectionTitle title="My Applications" action="See all" onAction={() => navigation.navigate('Credit')} />
        {apps.length === 0
          ? <EmptyState message="No credit applications yet. Tap 'Apply for Credit' to get started." icon="📋" />
          : apps.slice(0, 3).map(app => (
              <Card key={app.id} style={styles.appCard}>
                <View style={styles.appRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appRef}>{app.reference}</Text>
                    <Text style={styles.appDetail}>{app.credit_type} · {app.repayment_period_months ? `${app.repayment_period_months} months` : '—'}</Text>
                    <Text style={styles.appAmount}>GHS {parseFloat(app.amount_requested ?? '0').toLocaleString()}</Text>
                  </View>
                  <Pill label={app.status.replace(/_/g, ' ')} variant={statusVariant(app.status)} />
                </View>
              </Card>
            ))
        }

        {schedules.length > 0 && (
          <>
            <SectionTitle title="Upcoming Repayments" action="See all" onAction={() => navigation.navigate('Credit')} />
            {schedules.filter(s => s.status !== 'paid' && s.status !== 'waived').slice(0, 3).map(s => (
              <Card key={s.id} style={styles.appCard}>
                <View style={styles.appRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appRef}>Instalment #{s.installment_number}</Text>
                    <Text style={styles.appDetail}>Due {s.due_date}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.ink }}>GHS {parseFloat(s.amount_due).toLocaleString()}</Text>
                    <Pill label={s.status} variant={statusVariant(s.status)} style={{ marginTop: 4 }} />
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:    { backgroundColor: Colors.earth, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingBottom: 14 },
  greeting:  { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  name:      { fontSize: 22, fontWeight: '700', color: Colors.white },
  badge:     { backgroundColor: Colors.harvest, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  statsRow:  { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  appCard:   { marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  appRow:    { flexDirection: 'row', alignItems: 'center' },
  appRef:    { fontSize: 14, fontWeight: '600', color: Colors.ink },
  appDetail: { fontSize: 12, color: Colors.muted, marginTop: 2 },
  appAmount: { fontSize: 15, fontWeight: '700', color: Colors.leaf, marginTop: 4 },
});
