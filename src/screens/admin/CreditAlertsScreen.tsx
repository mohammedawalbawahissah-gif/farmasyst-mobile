import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { creditApi, paymentsApi } from '../../api/client';
import { Card, Pill, SectionTitle, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';
function getArr(d: any): any[] { return Array.isArray(d) ? d : (d?.results ?? []); }
export default function AdminCreditAlertsScreen() {
  const [apps, setApps] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      const [aR, sR] = await Promise.all([creditApi.listApplications(), paymentsApi.schedules()]);
      setApps(getArr(aR.data)); setSchedules(getArr(sR.data));
    } catch {}
  }, []);
  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  const overdue = schedules.filter(s => s.status === 'overdue');
  const rejected = apps.filter(a => a.status === 'rejected');
  const stalled = apps.filter(a => ['submitted','under_review','scored'].includes(a.status) && a.submitted_at &&
    ((Date.now() - new Date(a.submitted_at).getTime()) / 86400000) > 7);
  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;
  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={s.title}>Credit Alerts</Text>
      <Text style={s.sub}>Overdue repayments, rejected applications, and stalled reviews.</Text>
      <View style={s.statsRow}>
        {[{label:'Overdue',value:overdue.length,color:Colors.danger},{label:'Rejected',value:rejected.length,color:Colors.warning},{label:'Stalled',value:stalled.length,color:Colors.muted}].map(st=>(
          <View key={st.label} style={s.statCard}>
            <Text style={[s.statVal,{color:st.color}]}>{st.value}</Text>
            <Text style={s.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>
      <SectionTitle>Overdue Repayments ({overdue.length})</SectionTitle>
      {overdue.length === 0 ? <Card><Text style={{padding:Spacing.sm,color:Colors.muted}}>No overdue repayments.</Text></Card>
        : overdue.map(sc => (
          <Card key={sc.id} style={{borderLeftWidth:3,borderLeftColor:Colors.danger}}>
            <Text style={{fontWeight:'700'}}>Installment #{sc.installment_number}</Text>
            <Text style={{fontSize:13}}>Due: {new Date(sc.due_date).toLocaleDateString('en-GH')} · GHS {parseFloat(sc.amount_due||'0').toLocaleString()}</Text>
            <Pill label="overdue" variant="red" />
          </Card>
        ))}
      <SectionTitle>Stalled Applications (7+ days) ({stalled.length})</SectionTitle>
      {stalled.length === 0 ? <Card><Text style={{padding:Spacing.sm,color:Colors.muted}}>No stalled applications.</Text></Card>
        : stalled.map(a => (
          <Card key={a.id} style={{borderLeftWidth:3,borderLeftColor:Colors.warning}}>
            <Text style={{fontWeight:'700'}}>{a.reference}</Text>
            <Text style={{fontSize:13}}>{a.farmer_name} · {a.status.replace(/_/g,' ')}</Text>
            <Text style={{fontSize:12,color:Colors.muted}}>Submitted: {new Date(a.submitted_at).toLocaleDateString('en-GH')}</Text>
          </Card>
        ))}
      <SectionTitle>Rejected Applications ({rejected.length})</SectionTitle>
      {rejected.length === 0 ? <EmptyState icon="✅" message="No rejections." />
        : rejected.map(a => (
          <Card key={a.id}>
            <Text style={{fontWeight:'700'}}>{a.reference} · {a.farmer_name}</Text>
            <Text style={{fontSize:12,color:Colors.danger}}>{a.rejection_reason||'No reason given'}</Text>
          </Card>
        ))}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root:{flex:1,backgroundColor:Colors.bg},center:{flex:1,alignItems:'center',justifyContent:'center'},
  title:{fontSize:22,fontWeight:'700',color:Colors.ink,marginBottom:2},sub:{fontSize:13,color:Colors.muted,marginBottom:Spacing.md},
  statsRow:{flexDirection:'row',gap:8,marginBottom:Spacing.md},
  statCard:{flex:1,backgroundColor:Colors.white,borderRadius:Radius.md,padding:10,borderWidth:1,borderColor:Colors.border,alignItems:'center'},
  statVal:{fontSize:24,fontWeight:'800'},statLabel:{fontSize:11,color:Colors.muted,marginTop:2,textAlign:'center'},
});
