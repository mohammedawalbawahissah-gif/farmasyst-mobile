import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { farmsApi, usersApi } from '../../api/client';
import { Card, Pill, SectionTitle, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';
function arr(d:any){return Array.isArray(d)?d:(d?.results??[]);}
const OUTCOME_VARIANT: Record<string,'green'|'amber'|'red'> = { satisfactory:'green', concerns:'amber', unsatisfactory:'red' };

export default function AdminAuditScreen() {
  const [audits,setAudits]=useState<any[]>([]); const [farms,setFarms]=useState<any[]>([]);
  const [loading,setLoading]=useState(true); const [refreshing,setRefreshing]=useState(false);

  const load = useCallback(async ()=>{
    try {
      const [aR,fR] = await Promise.all([farmsApi.auditReports(), farmsApi.list()]);
      setAudits(arr(aR.data)); setFarms(arr(fR.data));
    } catch {}
  },[]);
  useEffect(()=>{(async()=>{setLoading(true);await load();setLoading(false);})();},[]);
  const onRefresh=useCallback(async()=>{setRefreshing(true);await load();setRefreshing(false);},[load]);

  const farmMap = Object.fromEntries(farms.map((f:any)=>[f.id,f]));
  const avg = (field:string) => audits.length>0 ? (audits.reduce((s:number,r:any)=>s+r[field],0)/audits.length).toFixed(1) : '—';
  const satisfactory = audits.filter((r:any)=>r.outcome==='satisfactory').length;
  const concerns = audits.filter((r:any)=>r.outcome==='concerns').length;
  const unsatisfactory = audits.filter((r:any)=>r.outcome==='unsatisfactory').length;

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf}/></View>;

  return (
    <ScrollView style={s.root} contentContainerStyle={{padding:Spacing.md,paddingBottom:60}}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}>
      <Text style={s.title}>Audit & Compliance</Text>
      <Text style={s.sub}>Field verification reports submitted by monitoring officers.</Text>

      <View style={s.statsGrid}>
        {[
          {label:'Total Audits',value:String(audits.length),color:'#1A4A6B'},
          {label:'Avg Infrastructure',value:avg('infrastructure_score')+'/10',color:Colors.leaf},
          {label:'Avg Management',value:avg('management_score')+'/10',color:Colors.earth},
          {label:'Avg Biosecurity',value:avg('biosecurity_score')+'/10',color:'#5C2D8B'},
        ].map(m=>(
          <View key={m.label} style={s.statCard}>
            <Text style={[s.statVal,{color:m.color}]}>{m.value}</Text>
            <Text style={s.statLabel}>{m.label}</Text>
          </View>
        ))}
      </View>

      {audits.length>0 && (
        <View style={s.outcomeGrid}>
          {[
            {label:'Satisfactory',value:satisfactory,color:Colors.leaf,bg:'#f0f7ec'},
            {label:'Concerns Noted',value:concerns,color:Colors.warning,bg:'#fdf6e3'},
            {label:'Unsatisfactory',value:unsatisfactory,color:Colors.danger,bg:'#fdf0ef'},
          ].map(o=>(
            <View key={o.label} style={[s.outcomeCard,{backgroundColor:o.bg}]}>
              <Text style={[s.outcomeVal,{color:o.color}]}>{o.value}</Text>
              <Text style={[s.outcomeLabel,{color:o.color}]}>{o.label}</Text>
              <Text style={s.outcomePct}>{audits.length>0?Math.round((o.value/audits.length)*100):0}% of audits</Text>
            </View>
          ))}
        </View>
      )}

      <SectionTitle>All Audit Reports ({audits.length})</SectionTitle>
      {audits.length===0
        ? <EmptyState icon="🛡" message="No audit reports submitted yet."/>
        : audits.map((r:any)=>(
          <Card key={r.id}>
            <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
              <Text style={{fontWeight:'700',fontSize:14}}>{r.farm_name??farmMap[r.farm]?.name??r.farm}</Text>
              <Pill label={r.outcome.replace('_',' ')} variant={OUTCOME_VARIANT[r.outcome]??'gray'}/>
            </View>
            <Text style={{fontSize:12,color:Colors.muted}}>
              {r.auditor_name??'—'} · {new Date(r.visit_date).toLocaleDateString('en-GH',{day:'numeric',month:'short',year:'numeric'})}
            </Text>
            <View style={{flexDirection:'row',gap:14,marginTop:6}}>
              <Text style={{fontSize:12}}>Infra: {r.infrastructure_score}/10</Text>
              <Text style={{fontSize:12}}>Mgmt: {r.management_score}/10</Text>
              <Text style={{fontSize:12}}>Bio: {r.biosecurity_score}/10</Text>
            </View>
            <Text style={{fontSize:12,color:Colors.muted,marginTop:4}}>Flock verified: {r.flock_verified?.toLocaleString()}</Text>
            <Text style={{fontSize:12,color:Colors.ink,marginTop:4}} numberOfLines={2}>{r.summary}</Text>
          </Card>
        ))
      }
    </ScrollView>
  );
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:Colors.bg},center:{flex:1,alignItems:'center',justifyContent:'center'},
  title:{fontSize:22,fontWeight:'700',color:Colors.ink,marginBottom:2},sub:{fontSize:13,color:Colors.muted,marginBottom:Spacing.md},
  statsGrid:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:Spacing.md},
  statCard:{width:'47%',backgroundColor:Colors.white,borderRadius:Radius.md,padding:10,borderWidth:1,borderColor:Colors.border},
  statVal:{fontSize:18,fontWeight:'800'},statLabel:{fontSize:10,color:Colors.muted,marginTop:2},
  outcomeGrid:{flexDirection:'row',gap:8,marginBottom:Spacing.md},
  outcomeCard:{flex:1,borderRadius:Radius.md,padding:Spacing.sm,alignItems:'center'},
  outcomeVal:{fontSize:22,fontWeight:'800'},outcomeLabel:{fontSize:10,fontWeight:'700',textTransform:'uppercase',marginTop:2,textAlign:'center'},
  outcomePct:{fontSize:10,color:Colors.muted,marginTop:2},
});
