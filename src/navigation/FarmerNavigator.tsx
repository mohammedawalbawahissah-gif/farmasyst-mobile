import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { tabIcon, TAB_OPTIONS } from './tabHelpers';
import FarmerDashboard      from '../screens/farmer/DashboardScreen';
import FarmManager          from '../screens/farmer/FarmManagerScreen';
import CreditScreen         from '../screens/farmer/CreditScreen';
import MarketplaceScreen    from '../screens/farmer/MarketplaceScreen';
import VetServicesScreen    from '../screens/farmer/VetServicesScreen';
import FarmInputsScreen     from '../screens/farmer/FarmInputsScreen';
import TrainingScreen       from '../screens/farmer/TrainingScreen';
import NotificationsScreen  from '../screens/shared/NotificationsScreen';

const Tab = createBottomTabNavigator();

export default function FarmerNavigator() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTIONS}>
      <Tab.Screen name="Home"        component={FarmerDashboard}     options={{ tabBarIcon: tabIcon('home-outline'),            title: 'Home' }} />
      <Tab.Screen name="Farm"        component={FarmManager}         options={{ tabBarIcon: tabIcon('leaf-outline'),            title: 'Farm' }} />
      <Tab.Screen name="Credit"      component={CreditScreen}        options={{ tabBarIcon: tabIcon('card-outline'),            title: 'Credit' }} />
      <Tab.Screen name="Marketplace" component={MarketplaceScreen}   options={{ tabBarIcon: tabIcon('storefront-outline'),      title: 'Market' }} />
      <Tab.Screen name="Vet"         component={VetServicesScreen}   options={{ tabBarIcon: tabIcon('medkit-outline'),          title: 'Vet' }} />
      <Tab.Screen name="Inputs"      component={FarmInputsScreen}    options={{ tabBarIcon: tabIcon('bag-handle-outline'),      title: 'Inputs' }} />
      <Tab.Screen name="Training"    component={TrainingScreen}      options={{ tabBarIcon: tabIcon('book-outline'),            title: 'Training' }} />
      <Tab.Screen name="Alerts"      component={NotificationsScreen} options={{ tabBarIcon: tabIcon('notifications-outline'),   title: 'Alerts' }} />
    </Tab.Navigator>
  );
}
