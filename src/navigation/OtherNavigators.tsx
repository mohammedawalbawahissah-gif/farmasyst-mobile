import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { tabIcon, TAB_OPTIONS } from './tabHelpers';
import NotificationsScreen from '../screens/shared/NotificationsScreen';

// ── Investor ─────────────────────────────────────────────────────────────────
import InvestorDashboard  from '../screens/investor/DashboardScreen';
import OpportunitiesScreen from '../screens/investor/OpportunitiesScreen';
import PortfolioScreen    from '../screens/investor/PortfolioScreen';
import ContractsScreen    from '../screens/investor/ContractsScreen';

// ── Admin ─────────────────────────────────────────────────────────────────────
import AdminDashboard   from '../screens/admin/DashboardScreen';
import AdminUsersScreen from '../screens/admin/UsersScreen';
import AdminCreditScreen from '../screens/admin/CreditWorkflowScreen';
import AdminAnalyticsScreen from '../screens/admin/AnalyticsScreen';

// ── Consumer ──────────────────────────────────────────────────────────────────
import ConsumerMarketplace from '../screens/consumer/MarketplaceScreen';
import ConsumerOrders      from '../screens/consumer/OrdersScreen';

// ── Monitoring ────────────────────────────────────────────────────────────────
import MonitoringDashboard from '../screens/monitoring/DashboardScreen';
import MonitoringFarmsScreen from '../screens/monitoring/FarmsScreen';
import SubmitReportScreen  from '../screens/monitoring/SubmitReportScreen';

// ── Vet ───────────────────────────────────────────────────────────────────────
import VetDashboard   from '../screens/vet/DashboardScreen';
import VetBookingsScreen from '../screens/vet/BookingsScreen';
import VetServicesScreen from '../screens/vet/ServicesScreen';

// ── Input Dealer ──────────────────────────────────────────────────────────────
import DealerDashboard from '../screens/input_dealer/DashboardScreen';
import DealerListings  from '../screens/input_dealer/ListingsScreen';

const Tab = createBottomTabNavigator();

export function InvestorNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTIONS}>
      <Tab.Screen name="Home"          component={InvestorDashboard}   options={{ tabBarIcon: tabIcon('home-outline'),            title: 'Home' }} />
      <Tab.Screen name="Opportunities" component={OpportunitiesScreen} options={{ tabBarIcon: tabIcon('trending-up-outline'),     title: 'Opportunities' }} />
      <Tab.Screen name="Portfolio"     component={PortfolioScreen}     options={{ tabBarIcon: tabIcon('pie-chart-outline'),       title: 'Portfolio' }} />
      <Tab.Screen name="Contracts"     component={ContractsScreen}     options={{ tabBarIcon: tabIcon('document-text-outline'),   title: 'Contracts' }} />
      <Tab.Screen name="Alerts"        component={NotificationsScreen} options={{ tabBarIcon: tabIcon('notifications-outline'),   title: 'Alerts' }} />
    </Tab.Navigator>
  );
}

export default InvestorNavigator;

export function AdminNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTIONS}>
      <Tab.Screen name="Home"      component={AdminDashboard}       options={{ tabBarIcon: tabIcon('grid-outline'),            title: 'Home' }} />
      <Tab.Screen name="Users"     component={AdminUsersScreen}     options={{ tabBarIcon: tabIcon('people-outline'),          title: 'Users' }} />
      <Tab.Screen name="Credit"    component={AdminCreditScreen}    options={{ tabBarIcon: tabIcon('card-outline'),            title: 'Credit' }} />
      <Tab.Screen name="Analytics" component={AdminAnalyticsScreen} options={{ tabBarIcon: tabIcon('bar-chart-outline'),       title: 'Analytics' }} />
      <Tab.Screen name="Alerts"    component={NotificationsScreen}  options={{ tabBarIcon: tabIcon('notifications-outline'),   title: 'Alerts' }} />
    </Tab.Navigator>
  );
}

export function ConsumerNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTIONS}>
      <Tab.Screen name="Market"  component={ConsumerMarketplace}  options={{ tabBarIcon: tabIcon('storefront-outline'),   title: 'Market' }} />
      <Tab.Screen name="Orders"  component={ConsumerOrders}       options={{ tabBarIcon: tabIcon('receipt-outline'),      title: 'Orders' }} />
      <Tab.Screen name="Alerts"  component={NotificationsScreen}  options={{ tabBarIcon: tabIcon('notifications-outline'), title: 'Alerts' }} />
    </Tab.Navigator>
  );
}

export function MonitoringNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTIONS}>
      <Tab.Screen name="Home"   component={MonitoringDashboard}    options={{ tabBarIcon: tabIcon('home-outline'),          title: 'Home' }} />
      <Tab.Screen name="Farms"  component={MonitoringFarmsScreen}  options={{ tabBarIcon: tabIcon('leaf-outline'),          title: 'Farms' }} />
      <Tab.Screen name="Report" component={SubmitReportScreen}     options={{ tabBarIcon: tabIcon('create-outline'),        title: 'Report' }} />
      <Tab.Screen name="Alerts" component={NotificationsScreen}    options={{ tabBarIcon: tabIcon('notifications-outline'), title: 'Alerts' }} />
    </Tab.Navigator>
  );
}

export function VetNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTIONS}>
      <Tab.Screen name="Home"     component={VetDashboard}      options={{ tabBarIcon: tabIcon('home-outline'),          title: 'Home' }} />
      <Tab.Screen name="Bookings" component={VetBookingsScreen} options={{ tabBarIcon: tabIcon('calendar-outline'),      title: 'Bookings' }} />
      <Tab.Screen name="Services" component={VetServicesScreen} options={{ tabBarIcon: tabIcon('list-outline'),          title: 'Services' }} />
      <Tab.Screen name="Alerts"   component={NotificationsScreen} options={{ tabBarIcon: tabIcon('notifications-outline'), title: 'Alerts' }} />
    </Tab.Navigator>
  );
}

export function InputDealerNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTIONS}>
      <Tab.Screen name="Home"     component={DealerDashboard}   options={{ tabBarIcon: tabIcon('home-outline'),          title: 'Home' }} />
      <Tab.Screen name="Listings" component={DealerListings}    options={{ tabBarIcon: tabIcon('list-outline'),          title: 'Listings' }} />
      <Tab.Screen name="Alerts"   component={NotificationsScreen} options={{ tabBarIcon: tabIcon('notifications-outline'), title: 'Alerts' }} />
    </Tab.Navigator>
  );
}
