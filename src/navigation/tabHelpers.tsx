import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export function tabIcon(name: IoniconsName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} size={size} color={color} />
  );
}

export const TAB_OPTIONS = {
  headerShown: false,
  tabBarActiveTintColor:   Colors.leaf,
  tabBarInactiveTintColor: Colors.muted,
  tabBarStyle: {
    backgroundColor: Colors.white,
    borderTopColor: Colors.border,
    height: 60,
    paddingBottom: 6,
  },
  tabBarLabelStyle: { fontSize: 10, fontWeight: '500' as const },
};
