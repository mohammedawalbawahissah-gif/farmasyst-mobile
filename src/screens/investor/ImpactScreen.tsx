import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { creditApi } from '../../api/client';
import { Card, SectionTitle } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';
function getArr(d: any): any[] { return Array.isArray(d) ? d : (d?.results ?? []); }
export default function InvestorImpactScreen() {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try { const r = await creditApi.listAgreements(); setAgreements(getArr(r.data)); }
    catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  const active = agreements.filter(a=>a.status==='active');
  const completed = agreements.filter(a=>a.status==='completed');
  const totalInvested = agreements.filter(a=>['active','completed'].includes(a.status)).reduce((s,a)=>s+parseFloat(a.amount||'0'),0);
  const totalFarmers = new Set(agreements.map(a=>a.farmer)).size;
  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;
  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={s.title}>Impact Reports</Text>
      <Text style={s.sub}>Your investment performance and social impact metrics.</Text>
      <View style={s.grid}>
        {[
          {label:'Total Invested',value:`GHS ${totalInvested.toLocaleString()}`,color:Colors.leaf},
          {label:'Active Deals',value:String(active.length),color:Colors.success},
          {label:'Deals Completed',value:String(completed.length),color:Colors.earth},
          {label:'Farmers Supported',value:String(totalFarmers),color:'#1A4A6B'},
        ].map(m=>(
          <Card key={m.label} style={s.metricCard}>
            <Text style={[s.metricVal,{color:m.color}]}>{m.value}</Text>
            <Text style={s.metricLabel}>{m.label}</Text>
          </Card>
        ))}
      </View>
      <SectionTitle>Agreement Breakdown</SectionTitle>
      {agreements.map(a=>(
        <Card key={a.id}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
            <View style={{flex:1}}>
              <Text style={{fontWeight:'700',fontSize:13}}>{a.reference}</Text>
              <Text style={{fontSize:12,color:Colors.muted}}>{a.farmer_name} · {a.credit_type?.replace(/_/g,' ')}</Text>
            </View>
            <View style={{alignItems:'flex-end'}}>
              <Text style={{fontWeight:'700',color:Colors.earth}}>GHS {parseFloat(a.amount||'0').toLocaleString()}</Text>
              <Text style={{fontSize:11,color:a.status==='active'?Colors.success:a.status==='completed'?Colors.leaf:Colors.muted,textTransform:'capitalize'}}>{a.status?.replace(/_/g,' ')}</Text>
            </View>
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root:{flex:1,backgroundColor:Colors.bg},center:{flex:1,alignItems:'center',justifyContent:'center'},
  title:{fontSize:22,fontWeight:'700',color:Colors.ink,marginBottom:2},sub:{fontSize:13,color:Colors.muted,marginBottom:Spacing.md},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:Spacing.sm},
  metricCard:{width:'47%',alignItems:'center'},metricVal:{fontSize:22,fontWeight:'800',textAlign:'center'},
  metricLabel:{fontSize:11,color:Colors.muted,marginTop:4,textAlign:'center'},
});
