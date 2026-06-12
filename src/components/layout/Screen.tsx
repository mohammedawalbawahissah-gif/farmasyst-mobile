import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ViewStyle, StatusBar, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants/theme';

interface ScreenProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  scrollable?: boolean;
  headerRight?: React.ReactNode;
  headerBg?: string;
  contentStyle?: ViewStyle;
  badge?: number;
}

export default function Screen({
  title, subtitle, children, scrollable = true,
  headerRight, headerBg = Colors.earth, contentStyle, badge,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const Content = scrollable ? ScrollView : View;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={headerBg} />
      {/* Header */}
      {title && (
        <View style={[styles.header, { backgroundColor: headerBg, paddingTop: insets.top + 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {badge != null && badge > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text></View>
            )}
            {headerRight}
          </View>
        </View>
      )}
      {/* Body */}
      <Content
        style={{ flex: 1 }}
        contentContainerStyle={[
          { paddingBottom: insets.bottom + 16 },
          !scrollable && { flex: 1 },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Content>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: 14,
  },
  title:    { fontSize: 22, fontWeight: '700', color: Colors.white, letterSpacing: -0.3 },
  subtitle: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  badge:    { backgroundColor: Colors.harvest, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:{ fontSize: 11, fontWeight: '700', color: Colors.white },
});
