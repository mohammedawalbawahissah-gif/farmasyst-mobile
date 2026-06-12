import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle, TextInputProps,
} from 'react-native';
import { Colors, Spacing, Radius, Shadow, Typography } from '../../constants/theme';

// ── Button ────────────────────────────────────────────────────────────────────
interface BtnProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}
export function Button({ label, onPress, variant = 'primary', size = 'md', loading, disabled, style, fullWidth }: BtnProps) {
  const bg = variant === 'primary' ? Colors.leaf
           : variant === 'danger'  ? Colors.danger
           : variant === 'ghost'   ? 'transparent'
           : Colors.white;
  const fg = variant === 'primary' || variant === 'danger' ? Colors.white
           : variant === 'ghost'   ? Colors.leaf
           : Colors.leaf;
  const border = variant === 'secondary' ? Colors.leaf
               : variant === 'ghost'     ? Colors.leaf
               : 'transparent';
  const pad = size === 'sm' ? { paddingVertical: 7, paddingHorizontal: 14 }
            : size === 'lg' ? { paddingVertical: 14, paddingHorizontal: 24 }
            : { paddingVertical: 11, paddingHorizontal: 20 };
  const fontSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.btn, { backgroundColor: bg, borderColor: border, borderWidth: 1.5, ...pad },
        fullWidth && { flex: 1 },
        (disabled || loading) && { opacity: 0.55 },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator size="small" color={fg} />
        : <Text style={[styles.btnText, { color: fg, fontSize }]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Badge / Pill ──────────────────────────────────────────────────────────────
type PillVariant = 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'gray';
interface PillProps { label: string; variant?: PillVariant; style?: ViewStyle }
const PILL_COLORS: Record<PillVariant, { bg: string; fg: string }> = {
  green:  { bg: '#E8F5E9', fg: Colors.success },
  amber:  { bg: '#FFF8E1', fg: '#B8820A' },
  red:    { bg: '#FFEBEE', fg: Colors.danger },
  blue:   { bg: '#E3F2FD', fg: Colors.info },
  purple: { bg: '#F3E5F5', fg: '#6A1B9A' },
  gray:   { bg: Colors.sky, fg: Colors.muted },
};
export function Pill({ label, variant = 'gray', style }: PillProps) {
  const c = PILL_COLORS[variant];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.pillText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

// Map backend status strings to pill variants
export function statusVariant(status: string): PillVariant {
  const map: Record<string, PillVariant> = {
    active: 'green', verified: 'green', approved: 'green', completed: 'green',
    paid: 'green', confirmed: 'green', satisfactory: 'green', delivered: 'green',
    pending: 'amber', pending_signature: 'amber', submitted: 'amber',
    under_review: 'amber', due: 'amber', matched: 'amber', processing: 'amber',
    rejected: 'red', failed: 'red', cancelled: 'red', defaulted: 'red',
    overdue: 'red', unsatisfactory: 'red',
    upcoming: 'blue', draft: 'blue', concerns: 'amber',
    disbursed: 'green',
  };
  return map[status] ?? 'gray';
}

// ── Input Field ───────────────────────────────────────────────────────────────
interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}
export function InputField({ label, error, containerStyle, ...props }: InputProps) {
  return (
    <View style={[{ marginBottom: Spacing.md }, containerStyle]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[styles.input, error ? { borderColor: Colors.danger } : null]}
        placeholderTextColor={Colors.muted}
        {...props}
      />
      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && <TouchableOpacity onPress={onAction}><Text style={styles.sectionAction}>{action}</Text></TouchableOpacity>}
    </View>
  );
}

// ── Hero Card (dashboard summary) ─────────────────────────────────────────────
interface HeroProps { title: string; subtitle?: string; amount?: string; note?: string; color?: string; }
export function HeroCard({ title, subtitle, amount, note, color = Colors.earth }: HeroProps) {
  return (
    <View style={[styles.hero, { backgroundColor: color }]}>
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle && <Text style={styles.heroSub}>{subtitle}</Text>}
      {amount  && <Text style={styles.heroAmount}>{amount}</Text>}
      {note    && <Text style={styles.heroNote}>{note}</Text>}
    </View>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
interface StatProps { label: string; value: string; change?: string; changeUp?: boolean; }
export function StatCard({ label, value, change, changeUp }: StatProps) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {change && <Text style={[styles.statChange, { color: changeUp ? Colors.success : Colors.danger }]}>{change}</Text>}
    </View>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ message, icon = '📭' }: { message: string; icon?: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

// ── List Row ──────────────────────────────────────────────────────────────────
interface RowProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}
export function ListRow({ title, subtitle, right, onPress, style }: RowProps) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap onPress={onPress} activeOpacity={0.7} style={[styles.row, style]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle && <Text style={styles.rowSub}>{subtitle}</Text>}
      </View>
      {right}
    </Wrap>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

// ── Loading Screen ────────────────────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={Colors.leaf} />
      <Text style={{ color: Colors.muted, marginTop: 12, fontSize: 14 }}>Loading…</Text>
    </View>
  );
}

// ── Error Banner ──────────────────────────────────────────────────────────────
export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>{message}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  btn:           { borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnText:       { fontWeight: '600' },
  card:          { backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  pill:          { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, alignSelf: 'flex-start' },
  pillText:      { fontSize: 11, fontWeight: '600' },
  inputLabel:    { fontSize: 12, fontWeight: '600', color: Colors.muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:         { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: Colors.ink },
  inputError:    { fontSize: 11, color: Colors.danger, marginTop: 3 },
  sectionRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, marginTop: Spacing.md, marginBottom: Spacing.sm },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: Colors.ink },
  sectionAction: { fontSize: 13, color: Colors.leaf, fontWeight: '600' },
  hero:          { borderRadius: Radius.md, padding: Spacing.md + 2, marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: Spacing.sm },
  heroTitle:     { fontSize: 18, fontWeight: '700', color: Colors.white },
  heroSub:       { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  heroAmount:    { fontSize: 30, fontWeight: '700', color: Colors.white, marginTop: 10, marginBottom: 4 },
  heroNote:      { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  statCard:      { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, ...Shadow.sm },
  statLabel:     { fontSize: 10, fontWeight: '600', color: Colors.muted, letterSpacing: 0.5 },
  statValue:     { fontSize: 24, fontWeight: '700', color: Colors.ink, marginTop: 4 },
  statChange:    { fontSize: 11, marginTop: 4 },
  empty:         { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon:     { fontSize: 36, marginBottom: 12, opacity: 0.5 },
  emptyText:     { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  row:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.md, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowTitle:      { fontSize: 14, fontWeight: '600', color: Colors.ink },
  rowSub:        { fontSize: 12, color: Colors.muted, marginTop: 2 },
  divider:       { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg },
  errorBanner:   { backgroundColor: '#FFEBEE', padding: Spacing.sm, marginHorizontal: Spacing.md, borderRadius: Radius.sm, marginBottom: Spacing.sm },
  errorBannerText:{ fontSize: 13, color: Colors.danger },
});
