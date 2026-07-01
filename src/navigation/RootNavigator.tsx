import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../constants/theme';

// Auth
import LoginScreen from '../screens/auth/LoginScreen';

// Shared
import { ProfileScreen } from '../screens/shared/SharedScreens';
import AIAssistantScreen from '../screens/shared/AIAssistantScreen';
import MenuScreen        from '../screens/shared/MenuScreen';

// Farmer
import FarmerDashboard         from '../screens/farmer/DashboardScreen';
import FarmManagerScreen       from '../screens/farmer/FarmManagerScreen';
import CreditScreen            from '../screens/farmer/CreditScreen';
import ContractsScreen         from '../screens/farmer/ContractsScreen';
import RepaymentsScreen        from '../screens/farmer/RepaymentsScreen';
import FarmerVetServicesScreen from '../screens/farmer/VetServicesScreen';
import FarmerMarketplaceScreen from '../screens/farmer/MarketplaceScreen';
import TrainingScreen          from '../screens/farmer/TrainingScreen';
import FarmInputsScreen        from '../screens/farmer/FarmInputsScreen';

// Investor
import { InvestorDashboard, InvestorOpportunities, InvestorPortfolio, InvestorContracts, InvestorProjects } from '../screens/investor/InvestorScreens';
import InvestorDiligenceScreen from '../screens/investor/DiligenceScreen';
import InvestorImpactScreen    from '../screens/investor/ImpactScreen';

// Monitoring
import MonitoringDashboard, { MonitoringFarmsScreen, SubmitReportScreen } from '../screens/monitoring/DashboardScreen';

// Vet
import { VetDashboard }                        from '../screens/vet/DashboardScreen';
import { VetServicesScreen, VetBookingsScreen } from '../screens/vet/VetScreens';

// Input Dealer
import { DealerDashboard, DealerListings } from '../screens/input_dealer/DashboardScreen';

// Consumer
import { ConsumerMarketplace, ConsumerOrders } from '../screens/consumer/ConsumerScreens';

// Admin
import { AdminDashboard, AdminUsers, AdminCreditWorkflow } from '../screens/admin/AdminScreens';
import AdminFarmRegistryScreen        from '../screens/admin/FarmRegistryScreen';
import { AdminFarmerMatchingScreen }  from '../screens/admin/FarmerMatchingScreen';
import { AdminTrainingManagement }    from '../screens/admin/TrainingManagementScreen';
import { AdminAnalyticsScreen }       from '../screens/admin/AnalyticsScreen';
import AdminDisbursementsScreen       from '../screens/admin/DisbursementsScreen';
import AdminDisputesScreen            from '../screens/admin/DisputesScreen';
import AdminProjectApplicationsScreen from '../screens/admin/ProjectApplicationsScreen';
import AdminCreditAlertsScreen        from '../screens/admin/CreditAlertsScreen';
import AdminVetManagementScreen       from '../screens/admin/VetManagementScreen';
import AdminInputDealerManagementScreen from '../screens/admin/InputDealerManagementScreen';
import AdminMonitoringScreen          from '../screens/admin/MonitoringAdminScreen';
import AdminImpactReportsScreen       from '../screens/admin/ImpactReportsScreen';
import AdminAuditScreen               from '../screens/admin/AuditScreen';
import AdminSettingsScreen            from '../screens/admin/SettingsScreen';

// Components
import AIFloatingWidget from '../components/ai/AIFloatingWidget';
import NotificationBell from '../components/layout/NotificationBell';
import { FarmAsystLogo } from '../components/ui';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// Shared header
const sharedHeader = {
  headerShown:      true,
  headerStyle:      { backgroundColor: Colors.white },
  headerTintColor:  Colors.ink,
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 16 },
  headerLeft:  () => <View style={{ paddingLeft: 6 }}><FarmAsystLogo size={28} /></View>,
  headerRight: () => <View style={{ paddingRight: 8 }}><NotificationBell /></View>,
};

const menuHeader = { ...sharedHeader, headerLeft: () => null };

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 22 : 19, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}
function tabOpts(emoji: string, label: string) {
  return { tabBarLabel: label, tabBarIcon: ({ focused }: any) => <TabIcon emoji={emoji} focused={focused} /> };
}
const TAB_STYLE = {
  tabBarActiveTintColor: Colors.primary ?? Colors.leaf,
  tabBarInactiveTintColor: Colors.muted,
  tabBarStyle: { backgroundColor: '#fff', borderTopColor: Colors.border, height: 62, paddingBottom: 8 },
  tabBarLabelStyle: { fontSize: 10, fontWeight: '600' as const },
  headerShown: false,
};

// ── AI Floating Widget Shell ──────────────────────────────────────────────────
// Wraps a screen component so AIFloatingWidget renders INSIDE the navigator tree,
// giving it access to navigation context (required for useNavigation hooks).
function withAIWidget<P extends object>(Screen: React.ComponentType<P>) {
  return function AIWidgetShell(props: P) {
    // Hide the floating widget when the user switches to the dedicated AI tab.
    // We read the parent tab state via the navigation prop passed to tab screens.
    const nav   = (props as any).navigation;
    const state = nav?.getParent?.()?.getState?.();
    const activeTab = state?.routes?.[state?.index ?? 0]?.name ?? '';
    return (
      <View style={{ flex: 1 }}>
        <Screen {...props} />
        <AIFloatingWidget hidden={activeTab === 'AI'} />
      </View>
    );
  };
}

// ── FARMER ────────────────────────────────────────────────────────────────────
function FarmerMenuStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="MenuHome" component={MenuScreen} options={{ ...menuHeader, title: 'Menu' }} />
      <Stack.Screen name="FarmManager" component={FarmManagerScreen}        options={{ title: 'Farm Manager' }} />
      <Stack.Screen name="Credit"      component={CreditScreen}             options={{ title: 'Credit & Finance' }} />
      <Stack.Screen name="Contracts"   component={ContractsScreen}          options={{ title: 'My Contracts' }} />
      <Stack.Screen name="Repayments"  component={RepaymentsScreen}         options={{ title: 'Repayments' }} />
      <Stack.Screen name="Vet"         component={FarmerVetServicesScreen}  options={{ title: 'Vet Services' }} />
      <Stack.Screen name="Market"      component={FarmerMarketplaceScreen}  options={{ title: 'Marketplace' }} />
      <Stack.Screen name="Training"    component={TrainingScreen}           options={{ title: 'Training' }} />
      <Stack.Screen name="Inputs"      component={FarmInputsScreen}         options={{ title: 'Farm Inputs' }} />
      <Stack.Screen name="Profile"     component={ProfileScreen}            options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}
function FarmerDashStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="Dashboard" component={withAIWidget(FarmerDashboard)} options={{ title: 'Home' }} />
    </Stack.Navigator>
  );
}
function FarmerNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_STYLE}>
        <Tab.Screen name="Home"    component={FarmerDashStack}   options={tabOpts('🏠', 'Dashboard')} />
        <Tab.Screen name="Menu"    component={FarmerMenuStack}   options={tabOpts('☰',  'Menu')} />
        <Tab.Screen name="AI"      component={AIAssistantScreen} options={tabOpts('🤖', 'AI')} />
        <Tab.Screen name="Profile" component={ProfileScreen}     options={tabOpts('👤', 'Profile')} />
    </Tab.Navigator>
  );
}

// ── INVESTOR ──────────────────────────────────────────────────────────────────
function InvestorMenuStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="MenuHome" component={MenuScreen} options={{ ...menuHeader, title: 'Menu' }} />
      <Stack.Screen name="Opportunities" component={InvestorOpportunities}   options={{ title: 'Opportunities' }} />
      <Stack.Screen name="Projects"      component={InvestorProjects}        options={{ title: 'Project Applications' }} />
      <Stack.Screen name="Farmers"       component={InvestorPortfolio}       options={{ title: 'Browse Farmers' }} />
      <Stack.Screen name="Portfolio"     component={InvestorPortfolio}       options={{ title: 'My Portfolio' }} />
      <Stack.Screen name="Contracts"     component={InvestorContracts}       options={{ title: 'Contracts' }} />
      <Stack.Screen name="Diligence"     component={InvestorDiligenceScreen} options={{ title: 'Due Diligence' }} />
      <Stack.Screen name="Impact"        component={InvestorImpactScreen}    options={{ title: 'Impact Reports' }} />
      <Stack.Screen name="Profile"       component={ProfileScreen}           options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}
function InvestorDashStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="Dashboard" component={withAIWidget(InvestorDashboard)} options={{ title: 'Dashboard' }} />
    </Stack.Navigator>
  );
}
function InvestorNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_STYLE}>
        <Tab.Screen name="Home"    component={InvestorDashStack}  options={tabOpts('🏠', 'Dashboard')} />
        <Tab.Screen name="Menu"    component={InvestorMenuStack}  options={tabOpts('☰',  'Menu')} />
        <Tab.Screen name="AI"      component={AIAssistantScreen}  options={tabOpts('🤖', 'AI')} />
        <Tab.Screen name="Profile" component={ProfileScreen}      options={tabOpts('👤', 'Profile')} />
    </Tab.Navigator>
  );
}

// ── MONITORING ────────────────────────────────────────────────────────────────
function MonitoringMenuStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="MenuHome" component={MenuScreen} options={{ ...menuHeader, title: 'Menu' }} />
      <Stack.Screen name="Report"  component={SubmitReportScreen}    options={{ title: 'Submit Report' }} />
      <Stack.Screen name="Farms"   component={MonitoringFarmsScreen} options={{ title: 'All Farms' }} />
      <Stack.Screen name="Farmers" component={MonitoringFarmsScreen} options={{ title: 'Farmer Profiles' }} />
      <Stack.Screen name="Profile" component={ProfileScreen}         options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}
function MonitoringDashStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="Dashboard" component={withAIWidget(MonitoringDashboard)} options={{ title: 'Field Monitor' }} />
    </Stack.Navigator>
  );
}
function MonitoringNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_STYLE}>
        <Tab.Screen name="Home"    component={MonitoringDashStack}  options={tabOpts('🏠', 'Dashboard')} />
        <Tab.Screen name="Menu"    component={MonitoringMenuStack}  options={tabOpts('☰',  'Menu')} />
        <Tab.Screen name="AI"      component={AIAssistantScreen}    options={tabOpts('🤖', 'AI')} />
        <Tab.Screen name="Profile" component={ProfileScreen}        options={tabOpts('👤', 'Profile')} />
    </Tab.Navigator>
  );
}

// ── VET ───────────────────────────────────────────────────────────────────────
function VetMenuStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="MenuHome" component={MenuScreen} options={{ ...menuHeader, title: 'Menu' }} />
      <Stack.Screen name="Bookings" component={VetBookingsScreen} options={{ title: 'Bookings' }} />
      <Stack.Screen name="Services" component={VetServicesScreen} options={{ title: 'My Services' }} />
      <Stack.Screen name="Profile"  component={ProfileScreen}     options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}
function VetDashStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="Dashboard" component={withAIWidget(VetDashboard)} options={{ title: 'Vet Dashboard' }} />
    </Stack.Navigator>
  );
}
function VetNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_STYLE}>
        <Tab.Screen name="Home"    component={VetDashStack}      options={tabOpts('🏠', 'Dashboard')} />
        <Tab.Screen name="Menu"    component={VetMenuStack}      options={tabOpts('☰',  'Menu')} />
        <Tab.Screen name="AI"      component={AIAssistantScreen} options={tabOpts('🤖', 'AI')} />
        <Tab.Screen name="Profile" component={ProfileScreen}     options={tabOpts('👤', 'Profile')} />
    </Tab.Navigator>
  );
}

// ── INPUT DEALER ──────────────────────────────────────────────────────────────
function DealerMenuStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="MenuHome" component={MenuScreen} options={{ ...menuHeader, title: 'Menu' }} />
      <Stack.Screen name="Listings" component={DealerListings}  options={{ title: 'My Listings' }} />
      <Stack.Screen name="Profile"  component={ProfileScreen}   options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}
function DealerDashStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="Dashboard" component={withAIWidget(DealerDashboard)} options={{ title: 'Dashboard' }} />
    </Stack.Navigator>
  );
}
function InputDealerNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_STYLE}>
        <Tab.Screen name="Home"    component={DealerDashStack}   options={tabOpts('🏠', 'Dashboard')} />
        <Tab.Screen name="Menu"    component={DealerMenuStack}   options={tabOpts('☰',  'Menu')} />
        <Tab.Screen name="AI"      component={AIAssistantScreen} options={tabOpts('🤖', 'AI')} />
        <Tab.Screen name="Profile" component={ProfileScreen}     options={tabOpts('👤', 'Profile')} />
    </Tab.Navigator>
  );
}

// ── CONSUMER ──────────────────────────────────────────────────────────────────
function ConsumerMenuStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="MenuHome" component={MenuScreen} options={{ ...menuHeader, title: 'Menu' }} />
      <Stack.Screen name="Marketplace"   component={ConsumerMarketplace} options={{ title: 'Browse Produce' }} />
      <Stack.Screen name="Orders"        component={ConsumerOrders}      options={{ title: 'My Orders' }} />
      <Stack.Screen name="Subscriptions" component={ConsumerOrders}      options={{ title: 'Subscriptions' }} />
      <Stack.Screen name="Profile"       component={ProfileScreen}       options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}
function ConsumerDashStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="Dashboard" component={withAIWidget(ConsumerMarketplace)} options={{ title: 'Marketplace' }} />
    </Stack.Navigator>
  );
}
function ConsumerNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_STYLE}>
        <Tab.Screen name="Home"    component={ConsumerDashStack}  options={tabOpts('🏠', 'Dashboard')} />
        <Tab.Screen name="Menu"    component={ConsumerMenuStack}  options={tabOpts('☰',  'Menu')} />
        <Tab.Screen name="AI"      component={AIAssistantScreen}  options={tabOpts('🤖', 'AI')} />
        <Tab.Screen name="Profile" component={ProfileScreen}      options={tabOpts('👤', 'Profile')} />
    </Tab.Navigator>
  );
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
function AdminMenuStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="MenuHome" component={MenuScreen} options={{ ...menuHeader, title: 'Menu' }} />
      <Stack.Screen name="Users"               component={AdminUsers}                      options={{ title: 'Users' }} />
      <Stack.Screen name="FarmRegistry"        component={AdminFarmRegistryScreen}         options={{ title: 'Farm Registry' }} />
      <Stack.Screen name="CreditWorkflow"      component={AdminCreditWorkflow}             options={{ title: 'Credit Workflow' }} />
      <Stack.Screen name="ProjectApplications" component={AdminProjectApplicationsScreen}  options={{ title: 'Project Applications' }} />
      <Stack.Screen name="CreditAlerts"        component={AdminCreditAlertsScreen}         options={{ title: 'Credit Alerts' }} />
      <Stack.Screen name="FarmerMatching"      component={AdminFarmerMatchingScreen}       options={{ title: 'Farmer Matching' }} />
      <Stack.Screen name="TrainingManagement"  component={AdminTrainingManagement}         options={{ title: 'Training CMS' }} />
      <Stack.Screen name="Disputes"            component={AdminDisputesScreen}             options={{ title: 'Disputes' }} />
      <Stack.Screen name="Disbursements"       component={AdminDisbursementsScreen}        options={{ title: 'Disbursements' }} />
      <Stack.Screen name="Analytics"           component={AdminAnalyticsScreen}            options={{ title: 'Analytics' }} />
      <Stack.Screen name="MonitoringAdmin"     component={AdminMonitoringScreen}           options={{ title: 'Monitoring' }} />
      <Stack.Screen name="VetsAdmin"           component={AdminVetManagementScreen}        options={{ title: 'Vet Services' }} />
      <Stack.Screen name="InputDealersAdmin"   component={AdminInputDealerManagementScreen} options={{ title: 'Input Dealers' }} />
      <Stack.Screen name="ImpactReports"       component={AdminImpactReportsScreen}        options={{ title: 'Impact Reports' }} />
      <Stack.Screen name="Audit"                component={AdminAuditScreen}                options={{ title: 'Audit Logs' }} />
      <Stack.Screen name="Settings"             component={AdminSettingsScreen}             options={{ title: 'Settings' }} />
      <Stack.Screen name="Profile"              component={ProfileScreen}                   options={{ title: 'My Profile' }} />
    </Stack.Navigator>
  );
}
function AdminDashStack() {
  return (
    <Stack.Navigator screenOptions={sharedHeader}>
      <Stack.Screen name="Dashboard" component={withAIWidget(AdminDashboard)} options={{ title: 'Admin Panel' }} />
    </Stack.Navigator>
  );
}
function AdminNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_STYLE}>
        <Tab.Screen name="Home"    component={AdminDashStack}    options={tabOpts('🏠', 'Dashboard')} />
        <Tab.Screen name="Menu"    component={AdminMenuStack}    options={tabOpts('☰',  'Menu')} />
        <Tab.Screen name="AI"      component={AIAssistantScreen} options={tabOpts('🤖', 'AI')} />
        <Tab.Screen name="Profile" component={ProfileScreen}     options={tabOpts('👤', 'Profile')} />
    </Tab.Navigator>
  );
}

// ── ROLE MAP ──────────────────────────────────────────────────────────────────
const ROLE_NAV: Record<string, React.ComponentType<any>> = {
  farmer: FarmerNavigator, investor: InvestorNavigator,
  monitoring_officer: MonitoringNavigator, vet: VetNavigator,
  input_dealer: InputDealerNavigator, consumer: ConsumerNavigator, admin: AdminNavigator,
};

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <FarmAsystLogo size={52} />
        <ActivityIndicator size="large" color={Colors.leaf} style={{ marginTop: 20 }} />
        <Text style={{ marginTop: 12, color: Colors.muted, fontSize: 13 }}>Loading FarmAsyst North…</Text>
      </View>
    );
  }
  if (!user) {
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }
  const RoleNav = ROLE_NAV[user.role] ?? ConsumerNavigator;
  return (
    <NavigationContainer>
      <RoleNav />
    </NavigationContainer>
  );
}
