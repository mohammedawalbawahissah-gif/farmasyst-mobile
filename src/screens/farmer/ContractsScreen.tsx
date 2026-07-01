import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import { creditApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Badge, Button, SectionTitle, EmptyState, AlertBanner } from '../../components/ui';
import type { CreditAgreement } from '../../types';

const STATUS_BADGE: Record<string, any> = {
  pending_signature:'warning', active:'success', completed:'success', defaulted:'danger', cancelled:'neutral',
};

export default function ContractsScreen() {
  const [agreements, setAgreements] = useState<CreditAgreement[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [signing,    setSigning]    = useState<string|null>(null);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const load = async () => {
    const r = await creditApi.listAgreements();
    setAgreements(toArray(r.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSign = async (id: string) => {
    setSigning(id); setError(''); setSuccess('');
    try {
      await creditApi.signAgreement(id);
      setSuccess('Agreement signed successfully! The investor will be notified.');
      await load();
    } catch { setError('Failed to sign agreement. Please try again.'); }
    finally { setSigning(null); }
  };

  const toSign = agreements.filter(a => a.status === 'pending_signature' && !a.farmer_signed_at);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <PageHeader title="Contracts & Agreements" subtitle="Review and sign your investment agreements." />

      {error   ? <AlertBanner variant="danger">{error}</AlertBanner>   : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}

      {toSign.length > 0 && (
        <AlertBanner variant="warning">
          📄 You have {toSign.length} agreement{toSign.length > 1 ? 's' : ''} awaiting your signature.
        </AlertBanner>
      )}

      {agreements.length === 0
        ? <EmptyState icon="📋" text="No agreements yet. Approved credit applications will generate agreements." />
        : agreements.map(ag => {
          const needsSign = ag.status === 'pending_signature' && !ag.farmer_signed_at;
          return (
            <Card key={ag.id} style={needsSign ? { borderColor: Colors.warning, borderWidth: 2 } : {}}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.sm }}>
                <Text style={{ fontSize: 11, color: Colors.muted, fontFamily: 'monospace' }}>{ag.reference}</Text>
                <Badge variant={STATUS_BADGE[ag.status] ?? 'neutral'}>{ag.status.replace(/_/g,' ')}</Badge>
              </View>

              <View style={s.row}><Text style={s.label}>Credit Type</Text><Text style={s.val}>{ag.credit_type.replace(/_/g,' ')}</Text></View>
              <View style={s.row}><Text style={s.label}>Amount</Text><Text style={[s.val, { color: Colors.primary, fontWeight: '800' }]}>GHS {parseFloat(ag.amount).toLocaleString()}</Text></View>
              <View style={s.row}><Text style={s.label}>Interest Rate</Text><Text style={s.val}>{ag.interest_rate}% p.a.</Text></View>
              <View style={s.row}><Text style={s.label}>Repayment Period</Text><Text style={s.val}>{ag.repayment_period_months} months</Text></View>
              {ag.start_date && <View style={s.row}><Text style={s.label}>Start Date</Text><Text style={s.val}>{new Date(ag.start_date).toLocaleDateString('en-GH')}</Text></View>}
              {ag.end_date   && <View style={s.row}><Text style={s.label}>End Date</Text><Text style={s.val}>{new Date(ag.end_date).toLocaleDateString('en-GH')}</Text></View>}

              {/* Signature status */}
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                <View style={[s.sigBadge, { backgroundColor: ag.farmer_signed_at ? Colors.successBg : Colors.warningBg }]}>
                  <Text style={{ fontSize: 12, color: ag.farmer_signed_at ? Colors.success : Colors.warning }}>
                    {ag.farmer_signed_at ? '✅ You signed' : '⏳ Your signature pending'}
                  </Text>
                </View>
                <View style={[s.sigBadge, { backgroundColor: ag.investor_signed_at ? Colors.successBg : Colors.warningBg }]}>
                  <Text style={{ fontSize: 12, color: ag.investor_signed_at ? Colors.success : Colors.warning }}>
                    {ag.investor_signed_at ? '✅ Investor signed' : '⏳ Investor signature pending'}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
                {needsSign && (
                  <Button disabled={signing === ag.id} loading={signing === ag.id} onPress={() => handleSign(ag.id)}>
                    Sign Agreement ✍️
                  </Button>
                )}
                {ag.contract_document && (
                  <Button variant="secondary" onPress={() => Linking.openURL(ag.contract_document!)}>
                    📄 View Document
                  </Button>
                )}
              </View>
            </Card>
          );
        })
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  row:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  label:   { fontSize: 12, color: Colors.muted },
  val:     { fontSize: 13, fontWeight: '600', color: Colors.ink },
  sigBadge:{ flex: 1, padding: Spacing.xs + 2, borderRadius: Radius.sm, alignItems: 'center' },
});
