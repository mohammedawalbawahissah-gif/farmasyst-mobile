import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, ScrollView, ViewStyle, TextStyle,
  TextInput, TextInputProps,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../../constants/theme';

// ── FarmAsyst Logo SVG-like component ────────────────────────────────────────
export function FarmAsystLogo({ size = 36, circle = false }: { size?: number; circle?: boolean }) {
  const cornerRadius = circle ? size / 2 : size >= 48 ? 22 : size >= 36 ? 18 : 14;
  const C = { deep: '#2D4A1E', leaf: '#4A7C2F', harvest: '#E8A020', wattle: '#C0392B' };
  return (
    <View style={{
      width: size, height: size, borderRadius: cornerRadius,
      backgroundColor: C.deep,
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Comb — 3 rising bars (comb + bar-chart) */}
      <View style={{ position: 'absolute', top: size * 0.06, left: size * 0.19, flexDirection: 'row', alignItems: 'flex-end', gap: size * 0.02 }}>
        <View style={{ width: size*0.11, height: size*0.18, backgroundColor: C.harvest, borderRadius: 1 }} />
        <View style={{ width: size*0.11, height: size*0.27, backgroundColor: C.harvest, borderRadius: 1 }} />
        <View style={{ width: size*0.11, height: size*0.37, backgroundColor: C.harvest, borderRadius: 1 }} />
      </View>
      {/* Head */}
      <View style={{
        position: 'absolute', bottom: size * 0.06,
        width: size * 0.58, height: size * 0.58, borderRadius: size * 0.29,
        backgroundColor: C.leaf,
      }} />
      {/* Beak */}
      <View style={{
        position: 'absolute', right: size * 0.05, bottom: size * 0.26,
        width: size * 0.19, height: size * 0.09, backgroundColor: C.harvest,
        borderRadius: 2,
      }} />
      {/* Eye */}
      <View style={{
        position: 'absolute', right: size * 0.21, bottom: size * 0.31,
        width: size * 0.11, height: size * 0.11, borderRadius: size * 0.055,
        backgroundColor: C.deep, borderWidth: 1.5, borderColor: C.harvest,
      }} />
      {/* Wattle */}
      <View style={{
        position: 'absolute', right: size * 0.05, bottom: size * 0.14,
        width: size * 0.09, height: size * 0.13, borderRadius: size * 0.05,
        backgroundColor: C.wattle,
      }} />
    </View>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export function Badge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  const p = Colors.pill[variant];
  return (
    <View style={{ backgroundColor: p.bg, borderRadius: Radius.pill, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: p.border, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: p.text }}>{children}</Text>
    </View>
  );
}

// ── Pill ──────────────────────────────────────────────────────────────────────
// Compact status chip used in list rows and cards.
// variant: 'green' | 'amber' | 'red' | 'blue' | 'gray'
type PillVariant = 'green' | 'amber' | 'red' | 'blue' | 'gray';
const PILL_PALETTE: Record<PillVariant, { bg: string; text: string; border: string }> = {
  green: { bg: '#E8F5E9', text: '#2E7D32', border: '#A5D6A7' },
  amber: { bg: '#FFF8E1', text: '#F57C00', border: '#FFE082' },
  red:   { bg: '#FFEBEE', text: '#C62828', border: '#FFCDD2' },
  blue:  { bg: '#E3F2FD', text: '#1565C0', border: '#BBDEFB' },
  gray:  { bg: '#F5F5F5', text: '#6B7280', border: '#E0E0E0' },
};
export function Pill({
  label,
  variant = 'gray',
  style,
}: {
  label: string;
  variant?: PillVariant;
  style?: ViewStyle;
}) {
  const p = PILL_PALETTE[variant] ?? PILL_PALETTE.gray;
  return (
    <View style={[{
      backgroundColor: p.bg,
      borderRadius: Radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderWidth: 1,
      borderColor: p.border,
      alignSelf: 'flex-start',
    }, style]}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: p.text, textTransform: 'capitalize' }}>
        {label.replace(/_/g, ' ')}
      </Text>
    </View>
  );
}

// ── statusVariant helper ──────────────────────────────────────────────────────
// Maps common API status strings to a Pill variant.
export function statusVariant(status: string): PillVariant {
  const s = (status ?? '').toLowerCase();
  if (['active', 'approved', 'completed', 'paid', 'satisfactory', 'available'].includes(s)) return 'green';
  if (['pending', 'under_review', 'in_progress', 'partial', 'concerns'].includes(s))        return 'amber';
  if (['rejected', 'overdue', 'defaulted', 'unsatisfactory', 'failed'].includes(s))          return 'red';
  if (['info', 'disbursed', 'submitted'].includes(s))                                         return 'blue';
  return 'gray';
}

// ── Button ────────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize    = 'sm' | 'md' | 'lg';
interface ButtonProps {
  children?: React.ReactNode;
  label?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}
export function Button({ children, label, onPress, variant = 'primary', size = 'md', disabled, loading, style, textStyle, fullWidth }: ButtonProps) {
  const content = children ?? label;
  const bg    = variant === 'primary'   ? Colors.leaf
              : variant === 'danger'    ? Colors.danger
              : variant === 'ghost'     ? 'transparent'
              : '#F0F0EB';
  const color = variant === 'primary'   ? '#fff'
              : variant === 'danger'    ? '#fff'
              : variant === 'ghost'     ? Colors.primary
              : Colors.ink;
  const py    = size === 'sm' ? 7 : size === 'lg' ? 16 : 12;
  const px    = size === 'sm' ? 12 : size === 'lg' ? 24 : 16;
  const fs    = size === 'sm' ? 12 : 14;
  const border = variant === 'secondary' || variant === 'ghost'
    ? { borderWidth: 1, borderColor: variant === 'ghost' ? Colors.primary : Colors.border }
    : {};

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[{
        backgroundColor: bg,
        paddingVertical: py,
        paddingHorizontal: px,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        opacity: disabled ? 0.5 : 1,
        ...(fullWidth ? { width: '100%' } : {}),
        ...border,
      }, style]}
    >
      {loading
        ? <ActivityIndicator size="small" color={color} />
        : React.isValidElement(content)
          ? content
          : <Text style={[{ color, fontSize: fs, fontWeight: '600' }, textStyle]}>{content}</Text>
      }
    </TouchableOpacity>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{
      backgroundColor: Colors.white,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: Colors.border,
      marginBottom: Spacing.sm,
    }, style]}>
      {children}
    </View>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <Card style={{ borderLeftWidth: 3, borderLeftColor: accent ?? Colors.leaf, marginBottom: Spacing.sm }}>
      <Text style={{ fontSize: 11, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: Colors.ink, marginBottom: 2 }}>{value}</Text>
      {sub && <Text style={{ fontSize: 12, color: Colors.muted }}>{sub}</Text>}
    </Card>
  );
}

// ── SectionTitle ──────────────────────────────────────────────────────────────
export function SectionTitle({ children, title, action, onAction, style }: { children?: React.ReactNode; title?: string; action?: string; onAction?: () => void; style?: TextStyle }) {
  const label = children ?? title;
  if (action && onAction) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
        <Text style={[{ fontSize: 15, fontWeight: '700', color: Colors.ink }, style]}>{label}</Text>
        <TouchableOpacity onPress={onAction}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.leaf }}>{action}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <Text style={[{ fontSize: 15, fontWeight: '700', color: Colors.ink, marginTop: Spacing.lg, marginBottom: Spacing.sm }, style]}>
      {label}
    </Text>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <View style={{ marginBottom: Spacing.lg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: Colors.ink }}>{title}</Text>
          {subtitle && <Text style={{ fontSize: 13, color: Colors.muted, marginTop: 2 }}>{subtitle}</Text>}
        </View>
        {action && <View style={{ marginLeft: Spacing.sm }}>{action}</View>}
      </View>
    </View>
  );
}

// ── FormLabel ─────────────────────────────────────────────────────────────────
export function FormLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
      {children}{required && <Text style={{ color: Colors.danger }}> *</Text>}
    </Text>
  );
}

// ── InputField ────────────────────────────────────────────────────────────────
// Labelled text input for forms. Mirrors web <Input> styling.
interface InputFieldProps extends TextInputProps {
  label?: string;
  required?: boolean;
  error?: string;
  containerStyle?: ViewStyle;
}
export function InputField({ label, required, error, containerStyle, style, ...rest }: InputFieldProps) {
  return (
    <View style={[{ marginBottom: Spacing.sm }, containerStyle]}>
      {label ? <FormLabel required={required}>{label}</FormLabel> : null}
      <TextInput
        style={[{
          backgroundColor: Colors.white,
          borderWidth: 1,
          borderColor: error ? Colors.danger : Colors.border,
          borderRadius: Radius.md,
          paddingHorizontal: Spacing.sm + 4,
          paddingVertical: Spacing.sm + 2,
          fontSize: 14,
          color: Colors.ink,
        }, style]}
        placeholderTextColor={Colors.muted}
        {...rest}
      />
      {error ? <Text style={{ fontSize: 11, color: Colors.danger, marginTop: 3 }}>{error}</Text> : null}
    </View>
  );
}

// ── ErrorBanner ───────────────────────────────────────────────────────────────
// Inline error message, typically shown at the top of a screen.
export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View style={{
      backgroundColor: Colors.dangerBg,
      borderRadius: Radius.sm,
      padding: Spacing.sm + 2,
      marginBottom: Spacing.sm,
      borderWidth: 1,
      borderColor: '#FECACA',
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    }}>
      <Text style={{ fontSize: 13, color: '#991B1B', flex: 1 }}>⚠️  {message}</Text>
    </View>
  );
}

// ── InfoRow (label / value pair) ──────────────────────────────────────────────
export function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
      <Text style={{ fontSize: 13, color: Colors.muted }}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        {typeof value === 'string' || typeof value === 'number'
          ? <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.ink }}>{value}</Text>
          : value}
      </View>
    </View>
  );
}

// ── AlertBanner ───────────────────────────────────────────────────────────────
export function AlertBanner({ children, variant = 'warning' }: { children: React.ReactNode; variant?: 'warning' | 'danger' | 'success' | 'info' }) {
  const bg  = variant === 'warning' ? Colors.warningBg : variant === 'danger' ? Colors.dangerBg : variant === 'success' ? Colors.successBg : Colors.infoBg;
  const col = variant === 'warning' ? '#92400E' : variant === 'danger' ? '#991B1B' : variant === 'success' ? '#166534' : '#1E40AF';
  const br  = variant === 'warning' ? '#FCD34D' : variant === 'danger' ? '#FECACA' : variant === 'success' ? '#BBF7D0' : '#BFDBFE';
  return (
    <View style={{ backgroundColor: bg, borderRadius: Radius.sm, padding: Spacing.sm + 2, marginBottom: Spacing.sm, borderWidth: 1, borderColor: br }}>
      <Text style={{ fontSize: 13, color: col }}>{children}</Text>
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon, text, message }: { icon?: string; text?: string; message?: string }) {
  const content = text ?? message ?? '';
  return (
    <View style={{ alignItems: 'center', padding: Spacing.xl }}>
      {icon && <Text style={{ fontSize: 40, marginBottom: Spacing.md, opacity: 0.4 }}>{icon}</Text>}
      <Text style={{ fontSize: 14, color: Colors.muted, textAlign: 'center' }}>{content}</Text>
    </View>
  );
}

// ── ScreenScroll (base screen wrapper with safe area) ─────────────────────────
export function ScreenScroll({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      contentContainerStyle={[{ padding: Spacing.md, paddingBottom: 80 }, style]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: Spacing.lg }}>
      {steps.map((s, i) => (
        <View key={s} style={{ flex: 1, alignItems: 'center' }}>
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: i < current ? Colors.leaf : i === current ? Colors.leaf : Colors.border,
            alignItems: 'center', justifyContent: 'center', marginBottom: 4,
          }}>
            <Text style={{ color: i <= current ? '#fff' : Colors.muted, fontSize: 12, fontWeight: '700' }}>
              {i < current ? '✓' : i + 1}
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: i === current ? Colors.leaf : Colors.muted, textAlign: 'center' }}>{s}</Text>
        </View>
      ))}
    </View>
  );
}

// ── ModalWrapper ──────────────────────────────────────────────────────────────
export function ModalContainer({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <View style={StyleSheet.absoluteFillObject}>
      <TouchableOpacity style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose} activeOpacity={1} />
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.white, borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl,
        maxHeight: '90%', padding: Spacing.lg,
      }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </View>
  );
}
