import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Linking } from 'react-native';
import { trainingApi } from '../../api/client';
import { TrainingModule, TrainingEnrolment } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, Button, EmptyState, ErrorBanner, Pill } from '../../components/ui';

const TYPE_ICON: Record<string, string> = {
  video: '▶️', pdf: '📄', webinar: '📅', quiz: '🏆', workshop: '🛠',
};

const LEVEL_VARIANT: Record<string, 'green'|'amber'|'red'> = {
  beginner: 'green', intermediate: 'amber', advanced: 'red',
};

export default function FarmerTrainingScreen() {
  const [modules,    setModules]    = useState<TrainingModule[]>([]);
  const [enrolments, setEnrolments] = useState<TrainingEnrolment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [m, e] = await Promise.all([trainingApi.modules(), trainingApi.enrolments()]);
      setModules(m.data.results ?? m.data);
      setEnrolments(e.data.results ?? e.data);
    } catch { setError('Could not load training modules.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const enrolMap = Object.fromEntries(enrolments.map(e => [e.module, e]));

  const completed  = enrolments.filter(e => e.status === 'completed').length;
  const inProgress = enrolments.filter(e => e.status === 'in_progress').length;

  async function enrol(moduleId: string) {
    try { await trainingApi.enrol(moduleId); load(); }
    catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Enrolment failed.'); }
  }

  async function updateProgress(enrolId: string, pct: number) {
    try { await trainingApi.updateProgress(enrolId, pct); load(); }
    catch {}
  }

  async function openContent(mod: TrainingModule) {
    // Auto-enrol
    if (!enrolMap[mod.id]) { try { await trainingApi.enrol(mod.id); } catch {} }
    if (mod.video_url) {
      Linking.openURL(mod.video_url).catch(() => Alert.alert('Error', 'Could not open link.'));
    } else if (mod.file) {
      Linking.openURL(mod.file).catch(() => Alert.alert('Error', 'Could not open file.'));
    } else {
      Alert.alert('No Content', 'No content linked to this module yet.');
    }
    load();
  }

  return (
    <Screen title="Training Resources" subtitle="Videos, PDFs & webinars for farmers">
      {error ? <ErrorBanner message={error} /> : null}

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: 'Available', val: modules.length, color: '#5C2D8B' },
          { label: 'Enrolled',  val: enrolments.length, color: Colors.investor },
          { label: 'In Progress', val: inProgress, color: Colors.warning },
          { label: 'Completed', val: completed, color: Colors.success },
        ].map(({ label, val, color }) => (
          <View key={label} style={[styles.statBox, { borderTopColor: color }]}>
            <Text style={[styles.statVal, { color }]}>{val}</Text>
            <Text style={styles.statKey}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {modules.length === 0
          ? <EmptyState message="No modules available yet." icon="📚" />
          : modules.map(mod => {
              const enrol = enrolMap[mod.id];
              const hasContent = mod.video_url || mod.file;
              return (
                <Card key={mod.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.typeIcon}>{TYPE_ICON[mod.module_type] ?? '📖'}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.modTitle}>{mod.title}</Text>
                      <View style={styles.metaRow}>
                        <Pill label={mod.level} variant={LEVEL_VARIANT[mod.level] ?? 'gray'} />
                        {mod.is_free && <Pill label="Free" variant="green" />}
                        {enrol?.status === 'completed' && <Pill label="✓ Done" variant="green" />}
                      </View>
                      {mod.description ? <Text style={styles.modDesc}>{mod.description}</Text> : null}
                      <Text style={styles.modMeta}>
                        {mod.duration_minutes ? `${mod.duration_minutes} min` : 'Duration TBD'} · {mod.module_type}
                      </Text>
                    </View>
                  </View>
                  {/* Progress bar */}
                  {enrol && (
                    <View style={{ marginTop: 8 }}>
                      <View style={styles.progBg}>
                        <View style={[styles.progFill, { width: `${enrol.progress_pct}%` as any, backgroundColor: enrol.progress_pct === 100 ? Colors.success : Colors.leaf }]} />
                      </View>
                      <Text style={styles.progText}>{enrol.status.replace('_', ' ')} · {enrol.progress_pct}%</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    {hasContent ? (
                      <Button
                        label={enrol ? (enrol.status === 'completed' ? 'Review Module' : 'Continue') : 'Start Module'}
                        onPress={() => openContent(mod)}
                        style={{ flex: 1 }}
                        size="sm"
                      />
                    ) : !enrol ? (
                      <Button label="Enrol Now" onPress={() => enrol ? null : enrolment(mod.id)} style={{ flex: 1 }} size="sm" />
                    ) : (
                      <Text style={styles.modMeta}>Content coming soon</Text>
                    )}
                    {enrol && enrol.status !== 'completed' && (
                      <Button label="+25%" onPress={() => updateProgress(enrol.id, Math.min(enrol.progress_pct + 25, 100))} variant="secondary" size="sm" />
                    )}
                    {enrol && enrol.status !== 'completed' && (
                      <Button label="✓ Complete" onPress={() => updateProgress(enrol.id, 100)} variant="secondary" size="sm" />
                    )}
                  </View>
                </Card>
              );
            })
        }
      </ScrollView>
    </Screen>
  );

  function enrolment(id: string) { enrol(id); }
}

const styles = StyleSheet.create({
  statsRow:  { flexDirection: 'row', marginHorizontal: Spacing.md, marginTop: Spacing.sm, marginBottom: 4, gap: 6 },
  statBox:   { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.md, padding: 8, alignItems: 'center', borderTopWidth: 3, borderWidth: 1, borderColor: Colors.border },
  statVal:   { fontSize: 18, fontWeight: '700' },
  statKey:   { fontSize: 9, color: Colors.muted, marginTop: 2, textAlign: 'center' },
  card:      { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  cardHeader:{ flexDirection: 'row', alignItems: 'flex-start' },
  typeIcon:  { fontSize: 22, marginTop: 2 },
  modTitle:  { fontSize: 14, fontWeight: '700', color: Colors.ink },
  metaRow:   { flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  modDesc:   { fontSize: 12, color: Colors.muted, marginTop: 4, lineHeight: 18 },
  modMeta:   { fontSize: 11, color: Colors.muted, marginTop: 4 },
  progBg:    { height: 6, backgroundColor: Colors.border, borderRadius: 99 },
  progFill:  { height: 6, borderRadius: 99 },
  progText:  { fontSize: 11, color: Colors.muted, marginTop: 3, textTransform: 'capitalize' },
});
