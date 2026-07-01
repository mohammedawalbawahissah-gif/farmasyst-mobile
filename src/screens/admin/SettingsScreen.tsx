import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { authApi } from '../../api/client';
import { Card, SectionTitle } from '../../components/ui';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

export default function AdminSettingsScreen() {
  const { user } = useAuth();
  const [oldPw,setOldPw]=useState(''); const [newPw,setNewPw]=useState('');
  const [saving,setSaving]=useState(false);

  const handlePw = async () => {
    if (!oldPw || !newPw) return;
    setSaving(true);
    try {
      await authApi.changePassword({ old_password: oldPw, new_password: newPw, new_password2: newPw });
      Alert.alert('Success','Password updated successfully.');
      setOldPw(''); setNewPw('');
    } catch { Alert.alert('Error','Password change failed. Check your current password.'); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={{padding:Spacing.md,paddingBottom:60}}>
      <Text style={s.title}>Settings</Text>
      <Text style={s.sub}>Account and platform configuration.</Text>

      <SectionTitle>Account Details</SectionTitle>
      <Card>
        {[
          ['Full name', user?.full_name ?? `${user?.first_name} ${user?.last_name}`],
          ['Email', user?.email],
          ['Role', user?.role?.replace(/_/g,' ')],
          ['Account verified', user?.is_verified ? 'Yes ✓' : 'No'],
          ['Member since', user?.date_joined ? new Date(user.date_joined).toLocaleDateString('en-GH',{day:'numeric',month:'long',year:'numeric'}) : '—'],
        ].map(([k,v])=>(
          <View key={k as string} style={s.row}>
            <Text style={s.rowKey}>{k}</Text>
            <Text style={s.rowVal}>{v}</Text>
          </View>
        ))}
      </Card>

      <SectionTitle>Change Password</SectionTitle>
      <Card>
        <Text style={s.fLabel}>Current password</Text>
        <TextInput style={s.input} secureTextEntry value={oldPw} onChangeText={setOldPw}/>
        <Text style={s.fLabel}>New password</Text>
        <TextInput style={s.input} secureTextEntry value={newPw} onChangeText={setNewPw}/>
        <TouchableOpacity style={[s.btn, (!oldPw||!newPw||saving)&&s.btnDisabled]} disabled={!oldPw||!newPw||saving} onPress={handlePw}>
          {saving ? <ActivityIndicator size="small" color={Colors.white}/> : <Text style={s.btnText}>Update Password</Text>}
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:Colors.bg},
  title:{fontSize:22,fontWeight:'700',color:Colors.ink,marginBottom:2},sub:{fontSize:13,color:Colors.muted,marginBottom:Spacing.md},
  row:{flexDirection:'row',justifyContent:'space-between',paddingVertical:8,borderBottomWidth:1,borderBottomColor:Colors.border},
  rowKey:{fontSize:13,color:Colors.muted},rowVal:{fontSize:13,fontWeight:'600',color:Colors.ink},
  fLabel:{fontSize:11,fontWeight:'600',color:Colors.muted,textTransform:'uppercase',marginBottom:4,marginTop:4},
  input:{backgroundColor:Colors.bg,borderWidth:1,borderColor:Colors.border,borderRadius:Radius.sm,paddingHorizontal:12,paddingVertical:10,fontSize:14,color:Colors.ink,marginBottom:Spacing.sm},
  btn:{backgroundColor:Colors.leaf,borderRadius:Radius.md,paddingVertical:12,alignItems:'center',marginTop:4},
  btnDisabled:{opacity:0.5},btnText:{color:Colors.white,fontWeight:'700',fontSize:14},
});
