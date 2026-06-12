import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { creditApi, notifApi } from '../../api/client';
import { CreditApplication, CreditAgreement } from '../../types';
import { Colors, Spacing } from '../../constants/theme';
import { HeroCard, StatCard, Card, SectionTitle, Button, Pill, statusVariant, EmptyState, ErrorBanner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';

export default function InvestorDashboard() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [opportunities, setOpportunities] = useState<CreditApplication[]>([]);
  const [agreements,    setAgreements]    = useState<CreditAgreement[]>([]);
  const [unread,        setUnread]        = useState(0);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [o, a, n] = await Promise.all([
        creditApi.listApplications({ status: 'matched' }),
        creditApi.listAgreements(),
        notifApi.unreadCount(),
      ]);
      setOpportunities(o.data.results ?? o.data);
      setAgreements(a.data.results ?? a.data);
      setUnread(n.data.unread ?? 0);
    } catch { setError('Could not load dashboard.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const active = agreements.filter(a => a.status === 'active');
  const totalDeployed = active.reduce((s, a) => s + parseFloat(a.amount), 0);

  async function acceptOpportunity(app: CreditApplication) {
    try {
      await creditApi.accept(app.id);
      Alert.alert('Accepted', 'Investment accepted. Agreement will be generated shortly.');
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Could not accept.');
    }
  }

  async function declineOpportunity(app: CreditApplication) {
    Alert.alert('Decline', 'Decline this investment opportunity?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
          try { await creditApi.declineMatch(app.id); load(); }
          catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Could not decline.'); }
        }},
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.first_name ?? 'Investor'}</Text>
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
          title="Investment Portfolio"
          subtitle={`${active.length} active agreement${active.length !== 1 ? 's' : ''}`}
          amount={`GHS ${totalDeployed.toLocaleString()}`}
          note="Total deployed capital"
          color={Colors.investor}
        />

        <View style={styles.statsRow}>
          <StatCard label="Active Agreements" value={active.length.toString()} />
          <StatCard label="Opportunities" value={opportunities.length.toString()} changeUp change={opportunities.length > 0 ? 'Action needed' : undefined} />
        </View>

        {/* Quick nav buttons */}
        <View style={styles.actionRow}>
          <Button label="Opportunities" onPress={() => navigation.navigate('Opportunities')} variant="primary"   style={{ flex: 1 }} />
          <Button label="Portfolio"     onPress={() => navigation.navigate('Portfolio')}     variant="secondary" style={{ flex: 1 }} />
        </View>
        <View style={styles.actionRow}>
          <Button label="Contracts"     onPress={() => navigation.navigate('Contracts')}    variant="secondary" style={{ flex: 1 }} />
          <Button label="Alerts"        onPress={() => navigation.navigate('Alerts')}       variant="ghost"     style={{ flex: 1 }} />
        </View>

        {opportunities.length > 0 && (
          <>
            <SectionTitle title="New Opportunities" action="See all" onAction={() => navigation.navigate('Opportunities')} />
            {opportunities.slice(0, 2).map(app => (
              <Card key={app.id} style={styles.card}>
                <View style={styles.oppHeader}>
                  <Text style={styles.oppRef}>{app.reference}</Text>
                  <Pill label={app.credit_type} variant="blue" />
                </View>
                <Text style={styles.oppFarmer}>{app.farmer_name}</Text>
                <Text style={styles.oppAmount}>GHS {parseFloat(app.amount_requested ?? '0').toLocaleString()}</Text>
                <Text style={styles.oppMeta}>{app.repayment_period_months} months · {app.purpose}</Text>
                <View style={styles.oppActions}>
                  <Button label="Decline"        onPress={() => declineOpportunity(app)} variant="secondary" style={{ flex: 1 }} />
                  <Button label="Accept & Invest" onPress={() => acceptOpportunity(app)} variant="primary"   style={{ flex: 1 }} />
                </View>
              </Card>
            ))}
          </>
        )}

        <SectionTitle title="Active Agreements" action="See all" onAction={() => navigation.navigate('Portfolio')} />
        {agreements.length === 0
          ? <EmptyState message="No agreements yet. Accept an opportunity to get started." icon="📄" />
          : agreements.slice(0, 3).map(ag => (
              <Card key={ag.id} style={styles.card}>
                <View style={styles.oppHeader}>
                  <Text style={styles.oppRef}>{ag.reference}</Text>
                  <Pill label={ag.status.replace(/_/g, ' ')} variant={statusVariant(ag.status)} />
                </View>
                <Text style={styles.oppFarmer}>{ag.farmer_name}</Text>
                <Text style={styles.oppAmount}>GHS {parseFloat(ag.amount).toLocaleString()}</Text>
                <Text style={styles.oppMeta}>{ag.repayment_period_months} months · {ag.interest_rate}% interest</Text>
              </Card>
            ))
        }
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:     { backgroundColor: Colors.investor, flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: Spacing.md, paddingBottom: 14 },
  greeting:   { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  name:       { fontSize: 22, fontWeight: '700', color: Colors.white },
  badge:      { backgroundColor: Colors.harvest, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:  { fontSize: 11, fontWeight: '700', color: Colors.white },
  statsRow:   { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  actionRow:  { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  card:       { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  oppHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  oppRef:     { fontSize: 14, fontWeight: '700', color: Colors.ink },
  oppFarmer:  { fontSize: 12, color: Colors.muted },
  oppAmount:  { fontSize: 20, fontWeight: '700', color: Colors.investor, marginTop: 6, marginBottom: 4 },
  oppMeta:    { fontSize: 12, color: Colors.muted },
  oppActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
});
