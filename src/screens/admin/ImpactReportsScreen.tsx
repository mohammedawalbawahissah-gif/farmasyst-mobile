import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { creditApi, farmsApi } from '../../api/client';
import { Card, SectionTitle } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';
function getArr(d: any): any[] { return Array.isArray(d) ? d : (d?.results ?? []); }
export default function AdminImpactReportsScreen() {
  const [agreements, setAgreements] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    try {
      const [aR, fR] = await Promise.all([creditApi.listAgreements(), farmsApi.list()]);
      setAgreements(getArr(aR.data)); setFarms(getArr(fR.data));
    } catch {}
  }, []);
  useEffect(() => { (async () => { setLoading(true); await load(); setLoading(false); })(); }, []);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);
  const active = agreements.filter(a => a.status === 'active');
  const disbursed = agreements.filter(a => ['active','completed'].includes(a.status));
  const totalGHS = disbursed.reduce((sum, a) => sum + parseFloat(a.amount||'0'), 0);
  const uniqueFarmers = new Set(agreements.map(a => a.farmer)).size;
  const uniqueInvestors = new Set(agreements.map(a => a.investor)).size;
  const regions = [...new Set(farms.map(f => f.region).filter(Boolean))];
  const byRegion = regions.map(r => ({ region: r, count: farms.filter(f => f.region === r).length }));
  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;
  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={s.title}>Impact Reports</Text>
      <Text style={s.sub}>Platform-wide agricultural finance impact metrics.</Text>
      <SectionTitle>Financial Impact</SectionTitle>
      <View style={s.grid}>
        {[
          {label:'Total Disbursed',value:`GHS ${totalGHS.toLocaleString()}`,color:Colors.leaf},
          {label:'Active Agreements',value:String(active.length),color:Colors.success},
          {label:'Farmers Funded',value:String(uniqueFarmers),color:Colors.earth},
          {label:'Investors Active',value:String(uniqueInvestors),color:'#1A4A6B'},
          {label:'Farms Registered',value:String(farms.length),color:Colors.leaf},
          {label:'Regions Covered',value:String(regions.length),color:Colors.success},
        ].map(m => (
          <Card key={m.label} style={s.metricCard}>
            <Text style={[s.metricVal,{color:m.color}]}>{m.value}</Text>
            <Text style={s.metricLabel}>{m.label}</Text>
          </Card>
        ))}
      </View>
      <SectionTitle>Geographic Reach</SectionTitle>
      {byRegion.sort((a,b)=>b.count-a.count).map(r => (
        <Card key={r.region}>
          <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
            <Text style={{fontSize:14,fontWeight:'600',color:Colors.ink}}>📍 {r.region}</Text>
            <Text style={{fontSize:14,fontWeight:'700',color:Colors.leaf}}>{r.count} farm{r.count!==1?'s':''}</Text>
          </View>
          <View style={{height:6,backgroundColor:Colors.border,borderRadius:3,marginTop:6,overflow:'hidden'}}>
            <View style={{height:6,backgroundColor:Colors.leaf,borderRadius:3,width:`${Math.min((r.count/Math.max(...byRegion.map(x=>x.count)))*100,100)}%` as any}} />
          </View>
        </Card>
      ))}
      <SectionTitle>Credit Type Breakdown</SectionTitle>
      {['direct_financing','farm_inputs','structured_training','mixed'].map(ct => {
        const count = agreements.filter(a=>a.credit_type===ct).length;
        return (
          <Card key={ct}>
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
              <Text style={{fontSize:13,color:Colors.ink}}>{ct.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</Text>
              <Text style={{fontSize:14,fontWeight:'700',color:Colors.leaf}}>{count}</Text>
            </View>
          </Card>
        );
      })}
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
