import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/ui';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import FarmerNavigator from './FarmerNavigator';
import InvestorNavigator from './InvestorNavigator';
import AdminNavigator from './AdminNavigator';
import ConsumerNavigator from './ConsumerNavigator';
import MonitoringNavigator from './MonitoringNavigator';
import VetNavigator from './VetNavigator';
import InputDealerNavigator from './InputDealerNavigator';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user } = useAuth();
  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login"    component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }
  switch (user.role) {
    case 'farmer':              return <FarmerNavigator />;
    case 'investor':            return <InvestorNavigator />;
    case 'admin':               return <AdminNavigator />;
    case 'consumer':            return <ConsumerNavigator />;
    case 'monitoring_officer':  return <MonitoringNavigator />;
    case 'vet':                 return <VetNavigator />;
    case 'input_dealer':        return <InputDealerNavigator />;
    default:                    return <FarmerNavigator />;
  }
}

export default function RootNavigator() {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  );
}
