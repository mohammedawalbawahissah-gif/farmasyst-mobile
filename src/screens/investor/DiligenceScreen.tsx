import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { profilesApi, farmsApi, creditApi } from '../../api/client';
import { Card, SectionTitle, EmptyState } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';
function getArr(d: any): any[] { return Array.isArray(d) ? d : (d?.results ?? []); }
export default function InvestorDiligenceScreen() {
  const [farmers, setFarmers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any|null>(null);
  const [farms, setFarms] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const load = useCallback(async () => {
    try { const r = await profilesApi.listFarmers(); setFarmers(getArr(r.data)); }
    catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, []);
  const loadDetail = async (farmer: any) => {
    setSelected(farmer); setDetailLoading(true);
    try {
      const uid = farmer.user?.id || farmer.id;
      const [fR, aR, auR] = await Promise.all([
        farmsApi.list({ owner: uid }),
        creditApi.listApplications({ farmer: uid }),
        farmsApi.auditReports({ farm__owner: uid }),
      ]);
      setFarms(getArr(fR.data)); setApps(getArr(aR.data)); setAudits(getArr(auR.data));
    } catch {} finally { setDetailLoading(false); }
  };
  const filtered = farmers.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (f.user?.full_name || '').toLowerCase();
    return name.includes(q) || (f.district||'').toLowerCase().includes(q) || (f.region||'').toLowerCase().includes(q);
  });
  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={Colors.leaf} /></View>;
  if (selected) return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
      <TouchableOpacity onPress={() => setSelected(null)} style={{ marginBottom: Spacing.md }}>
        <Text style={{ color: Colors.leaf, fontWeight: '700' }}>← Back to farmers</Text>
      </TouchableOpacity>
      <Text style={s.title}>{selected.user?.full_name || '—'}</Text>
      <Text style={s.sub}>Due diligence profile</Text>
      <SectionTitle>Farmer Profile</SectionTitle>
      <Card>
        {[['Ghana Card',selected.ghana_card_number||'—'],['District',selected.district||'—'],['Region',selected.region||'—'],
          ['Community',selected.community||'—'],['GPS',selected.gps_address||'—'],
          ['Years Farming',selected.years_of_farming!=null?`${selected.years_of_farming} years`:'—'],
          ['Credit Score',selected.credit_score||'—'],['Verification',selected.verification_status||'—']
        ].map(([k,v])=>(
          <View key={k} style={s.row}><Text style={s.rowKey}>{k}</Text><Text style={s.rowVal}>{v}</Text></View>
        ))}
      </Card>
      {detailLoading ? <ActivityIndicator size="small" color={Colors.leaf} style={{margin:Spacing.md}} /> : <>
        <SectionTitle>Farms ({farms.length})</SectionTitle>
        {farms.map(f=>(
          <Card key={f.id}>
            <Text style={{fontWeight:'700'}}>{f.name}</Text>
            <Text style={{fontSize:13,color:Colors.muted}}>{f.flock_type?.replace(/_/g,' ')} · {f.flock_size?.toLocaleString()} birds</Text>
            <Text style={{fontSize:12,color:Colors.muted}}>📍 {f.district}, {f.region}</Text>
          </Card>
        ))}
        <SectionTitle>Credit History ({apps.length})</SectionTitle>
        {apps.length===0?<EmptyState icon="💳" message="No credit history." />:apps.map(a=>(
          <Card key={a.id}>
            <Text style={{fontWeight:'700'}}>{a.reference}</Text>
            <Text style={{fontSize:13}}>{a.credit_type?.replace(/_/g,' ')} · {a.status}</Text>
            {a.amount_requested?<Text style={{fontSize:13,fontWeight:'700',color:Colors.earth}}>GHS {parseFloat(a.amount_requested).toLocaleString()}</Text>:null}
          </Card>
        ))}
        <SectionTitle>Audit Reports ({audits.length})</SectionTitle>
        {audits.length===0?<EmptyState icon="📋" message="No audit reports yet." />:audits.map(a=>(
          <Card key={a.id}>
            <Text style={{fontWeight:'700'}}>{new Date(a.visit_date).toLocaleDateString('en-GH')}</Text>
            <Text style={{fontSize:13,textTransform:'capitalize',color:a.outcome==='satisfactory'?Colors.success:a.outcome==='concerns'?Colors.warning:Colors.danger}}>{a.outcome?.replace('_',' ')}</Text>
            <Text style={{fontSize:12,color:Colors.muted}}>Infra: {a.infrastructure_score}/10 · Mgmt: {a.management_score}/10 · Biosec: {a.biosecurity_score}/10</Text>
            <Text style={{fontSize:12,color:Colors.muted}} numberOfLines={2}>{a.summary}</Text>
          </Card>
        ))}
      </>}
    </ScrollView>
  );
  return (
    <ScrollView style={s.root} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 60 }}>
      <Text style={s.title}>Due Diligence</Text>
      <Text style={s.sub}>Explore farmer profiles, farms, credit history, and audit reports.</Text>
      <TextInput style={s.search} placeholder="Search farmers…" placeholderTextColor={Colors.muted} value={search} onChangeText={setSearch} />
      {filtered.length===0?<EmptyState icon="👨‍🌾" message="No farmers found." />:filtered.map(f=>{
        const name = f.user?.full_name || `${f.user?.first_name||''} ${f.user?.last_name||''}`.trim() || '—';
        return (
          <TouchableOpacity key={f.id} onPress={()=>loadDetail(f)} activeOpacity={0.8}>
            <Card>
              <Text style={{fontSize:14,fontWeight:'700',color:Colors.ink}}>{name}</Text>
              <Text style={{fontSize:12,color:Colors.muted}}>📍 {[f.district,f.region].filter(Boolean).join(', ')||'—'}</Text>
              {f.credit_score?<Text style={{fontSize:12,color:Colors.muted}}>Credit score: {f.credit_score}</Text>:null}
              <Text style={{fontSize:12,color:Colors.muted,textTransform:'capitalize'}}>{f.verification_status}</Text>
            </Card>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  root:{flex:1,backgroundColor:Colors.bg},center:{flex:1,alignItems:'center',justifyContent:'center'},
  title:{fontSize:22,fontWeight:'700',color:Colors.ink,marginBottom:2},sub:{fontSize:13,color:Colors.muted,marginBottom:Spacing.md},
  search:{backgroundColor:Colors.white,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.md,paddingHorizontal:14,paddingVertical:11,fontSize:14,color:Colors.ink,marginBottom:Spacing.md},
  row:{flexDirection:'row',borderBottomWidth:1,borderBottomColor:Colors.border,paddingVertical:8},
  rowKey:{fontSize:13,color:Colors.muted,width:120},rowVal:{fontSize:13,color:Colors.ink,flex:1,fontWeight:'500'},
});
