import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, Radius } from '../constants/theme';

interface Props {
  children: React.ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

// ── Global ErrorBoundary ────────────────────────────────────────────────────
// Wraps the whole app. If any screen throws during render (a null property
// access, an unexpected API response shape, etc.), this catches it and shows
// a recoverable fallback instead of a blank/crashed app with no way back.
//
// NOTE: React error boundaries only catch errors thrown during render,
// lifecycle methods, and constructors of the component tree below them.
// They do NOT catch errors inside event handlers, async code, or promise
// rejections — those are handled by try/catch at the call site (as most of
// this app's API calls already do).
export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Hook point for a crash-reporting service (e.g. Sentry) once one is wired up:
    // Sentry.captureException(error, { extra: info });
    if (__DEV__) {
      console.error('ErrorBoundary caught:', error, info.componentStack);
    }
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.root}>
          <ScrollView contentContainerStyle={s.scroll}>
            <Text style={s.emoji}>⚠️</Text>
            <Text style={s.title}>Something went wrong</Text>
            <Text style={s.subtitle}>
              The app hit an unexpected error. You can try again — if this keeps happening,
              please let us know what you were doing when it occurred.
            </Text>
            {__DEV__ && this.state.error && (
              <View style={s.debugBox}>
                <Text style={s.debugText}>{this.state.error.message}</Text>
              </View>
            )}
            <TouchableOpacity style={s.button} onPress={this.reset}>
              <Text style={s.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emoji: { fontSize: 48, marginBottom: Spacing.md },
  title: { fontSize: 18, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.sm, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.muted, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 20 },
  debugBox: { backgroundColor: '#FEF2F2', borderRadius: Radius.sm, padding: Spacing.sm, marginBottom: Spacing.lg, width: '100%' },
  debugText: { fontSize: 12, color: '#991B1B', fontFamily: 'monospace' },
  button: { backgroundColor: Colors.leaf, paddingVertical: 12, paddingHorizontal: 28, borderRadius: Radius.md },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
