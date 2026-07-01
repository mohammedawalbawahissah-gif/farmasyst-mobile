import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, Radius } from '../../constants/theme';

interface MenuItem {
  emoji: string;
  label: string;
  desc:  string;
  screen: string;
}

const MENU_CONFIG: Record<string, MenuItem[]> = {
  farmer: [
    { emoji:'🐔', label:'Farm Manager',   desc:'Log daily flock activity, feed and mortality',  screen:'FarmManager' },
    { emoji:'💰', label:'Credit Apply',   desc:'Apply for financing, inputs or training',       screen:'Credit' },
    { emoji:'📋', label:'My Contracts',   desc:'View and sign credit agreements',               screen:'Contracts' },
    { emoji:'💳', label:'Repayments',     desc:'Track your repayment schedule and history',     screen:'Repayments' },
    { emoji:'🩺', label:'Vet Services',   desc:'Book a vet, view services near your farm',      screen:'Vet' },
    { emoji:'🛒', label:'Marketplace',    desc:'List produce and manage incoming orders',       screen:'Market' },
    { emoji:'📚', label:'Training',       desc:'Browse and enrol in training modules',          screen:'Training' },
    { emoji:'🌾', label:'Farm Inputs',    desc:'Browse feeds, vaccines and equipment',          screen:'Inputs' },
    { emoji:'👤', label:'My Profile',     desc:'Update personal details and password',          screen:'Profile' },
  ],
  investor: [
    { emoji:'🔍', label:'Opportunities',        desc:'Browse matched farmer credit applications',    screen:'Opportunities' },
    { emoji:'📁', label:'Project Applications', desc:'Review and manage project-level applications', screen:'Projects' },
    { emoji:'👨‍🌾', label:'Browse Farmers',       desc:'View farmer profiles and farm records',        screen:'Farmers' },
    { emoji:'💼', label:'My Portfolio',         desc:'Track active investments and agreements',      screen:'Portfolio' },
    { emoji:'📑', label:'Contracts',            desc:'View and sign funding agreements',             screen:'Contracts' },
    { emoji:'📄', label:'Due Diligence',        desc:'Review farmer documents and reports',          screen:'Diligence' },
    { emoji:'📊', label:'Impact Reports',       desc:'View aggregated impact metrics',               screen:'Impact' },
    { emoji:'👤', label:'My Profile',           desc:'Update your investor details',                screen:'Profile' },
  ],
  admin: [
    { emoji:'👥', label:'Users',               desc:'Manage and verify user accounts',               screen:'Users' },
    { emoji:'🏡', label:'Farm Registry',       desc:'View and manage all registered farms',          screen:'FarmRegistry' },
    { emoji:'💰', label:'Credit Workflow',     desc:'Review, approve and match credit applications', screen:'CreditWorkflow' },
    { emoji:'📁', label:'Project Applications',desc:'Manage investor project applications',          screen:'ProjectApplications' },
    { emoji:'⚠️', label:'Credit Alerts',       desc:'Monitor overdue and at-risk accounts',          screen:'CreditAlerts' },
    { emoji:'🤝', label:'Farmer Matching',     desc:'Match farmers with suitable investors',         screen:'FarmerMatching' },
    { emoji:'📚', label:'Training CMS',        desc:'Create and manage training modules',            screen:'TrainingManagement' },
    { emoji:'⚖️', label:'Disputes',            desc:'Handle platform disputes and complaints',       screen:'Disputes' },
    { emoji:'💸', label:'Disbursements',       desc:'Process and track loan disbursements',          screen:'Disbursements' },
    { emoji:'📈', label:'Analytics',           desc:'Platform-wide performance analytics',          screen:'Analytics' },
    { emoji:'🛡', label:'Monitoring',          desc:'Monitor field officers and audit reports',      screen:'MonitoringAdmin' },
    { emoji:'🩺', label:'Vet Services',        desc:'Manage vet profiles and services',              screen:'VetsAdmin' },
    { emoji:'🏪', label:'Input Dealers',       desc:'Manage input dealer accounts',                  screen:'InputDealersAdmin' },
    { emoji:'📈', label:'Impact Reports',       desc:'Aggregated platform-wide impact metrics',      screen:'ImpactReports' },
    { emoji:'🗄', label:'Audit Logs',           desc:'Field verification reports and compliance',    screen:'Audit' },
    { emoji:'⚙️', label:'Settings',              desc:'Account and platform configuration',           screen:'Settings' },
    { emoji:'👤', label:'My Profile',          desc:'Update admin account details',                  screen:'Profile' },
  ],
  monitoring_officer: [
    { emoji:'📝', label:'Submit Field Report', desc:'Log a new farm visit and audit report',          screen:'Report' },
    { emoji:'🏡', label:'All Farms',           desc:'Browse and view assigned farm details',          screen:'Farms' },
    { emoji:'👨‍🌾', label:'Farmer Profiles',    desc:'Check farmer verification status',               screen:'Farmers' },
    { emoji:'👤', label:'My Profile',          desc:'Update your profile details',                   screen:'Profile' },
  ],
  consumer: [
    { emoji:'🛒', label:'Browse Produce',  desc:'Find fresh poultry produce from farms',  screen:'Marketplace' },
    { emoji:'📦', label:'My Orders',       desc:'Track and manage your orders',            screen:'Orders' },
    { emoji:'⭐', label:'Subscriptions',   desc:'Manage recurring produce subscriptions', screen:'Subscriptions' },
    { emoji:'👤', label:'My Profile',      desc:'Update your buyer details',               screen:'Profile' },
  ],
  vet: [
    { emoji:'📅', label:'Bookings',    desc:'Manage farmer booking requests',         screen:'Bookings' },
    { emoji:'🩺', label:'My Services', desc:'Add and manage the services you offer',  screen:'Services' },
    { emoji:'👤', label:'My Profile',  desc:'Update your vet profile and credentials',screen:'Profile' },
  ],
  input_dealer: [
    { emoji:'📦', label:'My Listings', desc:'Add and manage your farm input products', screen:'Listings' },
    { emoji:'👤', label:'My Profile',  desc:'Update your dealer profile',             screen:'Profile' },
  ],
};

export default function MenuScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const role = user?.role ?? 'farmer';
  const items = MENU_CONFIG[role] ?? [];

  const ROLE_COLOR: Record<string,string> = {
    farmer:'#4A7C2F', investor:'#1A4A6B', admin:'#3730A3',
    monitoring_officer:'#1A6B5A', vet:'#0D6E8E', consumer:'#8B3A2F', input_dealer:'#B45309',
  };
  const accent = ROLE_COLOR[role] ?? Colors.leaf;

  return (
    <View style={s.root}>
      {/* Role header */}
      <View style={[s.roleHeader, { backgroundColor: accent }]}>
        <Text style={s.roleName}>{user?.first_name} {user?.last_name}</Text>
        <Text style={s.roleLabel}>{role.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</Text>
      </View>

      <ScrollView contentContainerStyle={s.grid} showsVerticalScrollIndicator={false}>
        {items.map(item => (
          <TouchableOpacity
            key={item.screen}
            style={s.card}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.75}
          >
            <Text style={s.emoji}>{item.emoji}</Text>
            <Text style={s.cardLabel}>{item.label}</Text>
            <Text style={s.cardDesc}>{item.desc}</Text>
            <View style={[s.arrow, { backgroundColor: accent + '18' }]}>
              <Text style={[s.arrowText, { color: accent }]}>→</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.bg },
  roleHeader: { padding: Spacing.lg, paddingTop: Spacing.xl },
  roleName:   { fontSize: 20, fontWeight: '800', color: '#fff' },
  roleLabel:  { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  grid:       { padding: Spacing.md, paddingBottom: 40, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  card:       { width: '47%', backgroundColor: Colors.white, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, minHeight: 120, justifyContent: 'space-between' },
  emoji:      { fontSize: 28, marginBottom: 6 },
  cardLabel:  { fontSize: 13, fontWeight: '700', color: Colors.ink, marginBottom: 3 },
  cardDesc:   { fontSize: 11, color: Colors.muted, lineHeight: 16, flex: 1 },
  arrow:      { alignSelf: 'flex-end', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  arrowText:  { fontSize: 14, fontWeight: '700' },
});
