import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Linking } from 'react-native';
import { trainingApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Badge, Button, SectionTitle, EmptyState } from '../../components/ui';
import type { TrainingModule, TrainingEnrolment } from '../../types';

const MODULE_TYPE_ICON: Record<string, string> = {
  video: '🎥', pdf: '📄', webinar: '📡', workshop: '🏫',
};
const LEVEL_BADGE: Record<string, any> = {
  beginner: 'success', intermediate: 'warning', advanced: 'danger',
};

export default function TrainingScreen() {
  const [modules,    setModules]    = useState<TrainingModule[]>([]);
  const [enrolments, setEnrolments] = useState<TrainingEnrolment[]>([]);
  const [filter,     setFilter]     = useState<'all'|'enrolled'|'completed'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [enrolling,  setEnrolling]  = useState<string|null>(null);

  const load = async () => {
    const [m, e] = await Promise.allSettled([trainingApi.modules(), trainingApi.enrolments()]);
    if (m.status === 'fulfilled') setModules(toArray(m.value.data));
    if (e.status === 'fulfilled') setEnrolments(toArray(e.value.data));
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const enrolMap = Object.fromEntries(enrolments.map(e => [e.module, e]));

  const filtered = modules.filter(m => {
    if (filter === 'enrolled')  return enrolMap[m.id] && enrolMap[m.id].status !== 'completed';
    if (filter === 'completed') return enrolMap[m.id]?.status === 'completed';
    return true;
  });

  const completedCount = enrolments.filter(e => e.status === 'completed').length;
  const inProgressCount = enrolments.filter(e => e.status === 'in_progress').length;

  const handleEnrol = async (moduleId: string) => {
    setEnrolling(moduleId);
    try { await trainingApi.enrol(moduleId); await load(); }
    catch {}
    finally { setEnrolling(null); }
  };

  const handleOpenContent = (mod: TrainingModule) => {
    const url = mod.video_url || mod.document || (mod as any).file;
    if (url) Linking.openURL(url).catch(() => {});
  };

  const handleUpdateProgress = async (enrolId: string, pct: number) => {
    try { await trainingApi.updateProgress(enrolId, pct); await load(); }
    catch {}
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <PageHeader title="Training Hub" subtitle="Build your poultry farming skills." />

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
        <View style={[s.stat, { borderColor: Colors.leaf }]}>
          <Text style={s.statNum}>{enrolments.length}</Text>
          <Text style={s.statLabel}>Enrolled</Text>
        </View>
        <View style={[s.stat, { borderColor: Colors.harvest }]}>
          <Text style={s.statNum}>{inProgressCount}</Text>
          <Text style={s.statLabel}>In Progress</Text>
        </View>
        <View style={[s.stat, { borderColor: Colors.success }]}>
          <Text style={s.statNum}>{completedCount}</Text>
          <Text style={s.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md }}>
        {(['all','enrolled','completed'] as const).map(f => (
          <TouchableOpacity key={f} style={[s.filterBtn, filter === f && s.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[s.filterBtnText, filter === f && s.filterBtnTextActive]}>
              {f === 'all' ? 'All Modules' : f === 'enrolled' ? 'In Progress' : 'Completed'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {filtered.length === 0
        ? <EmptyState icon="📚" text="No modules here yet." />
        : filtered.map(mod => {
          const enrol = enrolMap[mod.id];
          const isEnrolled  = !!enrol;
          const isCompleted = enrol?.status === 'completed';
          return (
            <Card key={mod.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <Text style={{ fontSize: 20 }}>{MODULE_TYPE_ICON[mod.module_type] ?? '📋'}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.ink }}>{mod.title}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                    <Badge variant={LEVEL_BADGE[mod.level] ?? 'neutral'}>{mod.level}</Badge>
                    <Badge variant="neutral">{mod.module_type}</Badge>
                    {mod.is_free ? <Badge variant="success">Free</Badge> : <Badge variant="warning">Paid</Badge>}
                    <Badge variant="neutral">⏱ {mod.duration_minutes} min</Badge>
                  </View>
                </View>
                {isCompleted && <Text style={{ fontSize: 22 }}>✅</Text>}
              </View>

              <Text style={{ fontSize: 13, color: Colors.muted, marginBottom: Spacing.sm, lineHeight: 19 }}>{mod.description}</Text>

              {/* Progress bar for enrolled */}
              {isEnrolled && !isCompleted && (
                <View style={{ marginBottom: Spacing.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, color: Colors.muted }}>Progress</Text>
                    <Text style={{ fontSize: 11, color: Colors.muted }}>{enrol.progress_pct}%</Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: Colors.border, borderRadius: 3 }}>
                    <View style={{ width: `${enrol.progress_pct}%`, height: 6, backgroundColor: Colors.leaf, borderRadius: 3 }} />
                  </View>
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' }}>
                {!isEnrolled && (
                  <Button size="sm" disabled={enrolling === mod.id} loading={enrolling === mod.id} onPress={() => handleEnrol(mod.id)}>
                    Enrol Now
                  </Button>
                )}
                {isEnrolled && !isCompleted && (
                  <>
                    {(mod.video_url || mod.document || (mod as any).file) && (
                      <Button size="sm" onPress={() => handleOpenContent(mod)}>Open Content</Button>
                    )}
                    <Button size="sm" variant="secondary" onPress={() => handleUpdateProgress(enrol.id, Math.min(100, enrol.progress_pct + 25))}>
                      Mark +25%
                    </Button>
                    <Button size="sm" variant="ghost" onPress={() => handleUpdateProgress(enrol.id, 100)}>
                      Mark Complete ✓
                    </Button>
                  </>
                )}
                {isCompleted && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 12, color: Colors.success, fontWeight: '700' }}>✅ Completed</Text>
                    {enrol.completed_at && (
                      <Text style={{ fontSize: 11, color: Colors.muted }}>
                        {new Date(enrol.completed_at).toLocaleDateString('en-GH')}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </Card>
          );
        })
      }
    </ScrollView>
  );
}

const s = StyleSheet.create({
  stat:         { flex: 1, borderLeftWidth: 3, backgroundColor: Colors.white, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statNum:      { fontSize: 22, fontWeight: '800', color: Colors.ink },
  statLabel:    { fontSize: 11, color: Colors.muted, marginTop: 2 },
  filterBtn:    { paddingHorizontal: Spacing.md, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.white },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterBtnText:   { fontSize: 12, color: Colors.muted, fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },
});
