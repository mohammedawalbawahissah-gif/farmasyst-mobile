import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { tabIcon, TAB_OPTIONS } from './tabHelpers';
import AdminDashboard          from '../screens/admin/DashboardScreen';
import AdminUsersScreen        from '../screens/admin/UsersScreen';
import AdminCreditScreen       from '../screens/admin/CreditWorkflowScreen';
import AdminAnalyticsScreen    from '../screens/admin/AnalyticsScreen';
import FarmRegistryScreen      from '../screens/admin/FarmRegistryScreen';
import FarmerMatchingScreen    from '../screens/admin/FarmerMatchingScreen';
import TrainingManagementScreen from '../screens/admin/TrainingManagementScreen';
import NotificationsScreen     from '../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator();

export default function AdminNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTIONS}>
      <Tab.Screen name="Home"     component={AdminDashboard}           options={{ tabBarIcon: tabIcon('grid-outline'),           title: 'Home' }} />
      <Tab.Screen name="Users"    component={AdminUsersScreen}         options={{ tabBarIcon: tabIcon('people-outline'),         title: 'Users' }} />
      <Tab.Screen name="Credit"   component={AdminCreditScreen}        options={{ tabBarIcon: tabIcon('card-outline'),           title: 'Credit' }} />
      <Tab.Screen name="Farms"    component={FarmRegistryScreen}       options={{ tabBarIcon: tabIcon('leaf-outline'),           title: 'Farms' }} />
      <Tab.Screen name="Matching" component={FarmerMatchingScreen}     options={{ tabBarIcon: tabIcon('swap-horizontal-outline'), title: 'Matching' }} />
      <Tab.Screen name="Training" component={TrainingManagementScreen} options={{ tabBarIcon: tabIcon('book-outline'),           title: 'Training' }} />
      <Tab.Screen name="Analytics" component={AdminAnalyticsScreen}   options={{ tabBarIcon: tabIcon('bar-chart-outline'),      title: 'Analytics' }} />
      <Tab.Screen name="Alerts"   component={NotificationsScreen}      options={{ tabBarIcon: tabIcon('notifications-outline'),  title: 'Alerts' }} />
    </Tab.Navigator>
  );
}
