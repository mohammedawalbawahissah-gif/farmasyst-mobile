import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Alert, Switch } from 'react-native';
import { trainingApi } from '../../api/client';
import { TrainingModule } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, SectionTitle, Button, InputField, EmptyState, ErrorBanner, Pill } from '../../components/ui';

const MODULE_TYPES = ['video', 'pdf', 'webinar', 'workshop'];
const LEVELS       = ['beginner', 'intermediate', 'advanced'];

const LEVEL_VARIANT: Record<string, 'green' | 'amber' | 'red'> = {
  beginner: 'green', intermediate: 'amber', advanced: 'red',
};

export default function TrainingManagementScreen() {
  const [modules,    setModules]    = useState<TrainingModule[]>([]);
  const [showForm,   setShowForm]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [saving,     setSaving]     = useState(false);

  const [title,    setTitle]    = useState('');
  const [desc,     setDesc]     = useState('');
  const [type,     setType]     = useState('video');
  const [level,    setLevel]    = useState('beginner');
  const [videoUrl, setVideoUrl] = useState('');
  const [mins,     setMins]     = useState('');
  const [isFree,   setIsFree]   = useState(true);

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await trainingApi.modules();
      setModules(res.data.results ?? res.data);
    } catch { setError('Could not load training modules.'); }
    finally  { setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function resetForm() {
    setTitle(''); setDesc(''); setType('video'); setLevel('beginner');
    setVideoUrl(''); setMins(''); setIsFree(true);
    setShowForm(false);
  }

  async function handleCreate() {
    if (!title.trim()) { Alert.alert('Missing Field', 'Module title is required.'); return; }
    setSaving(true);
    try {
      await trainingApi.createModule({
        title,
        description:      desc,
        module_type:      type,
        level,
        duration_minutes: parseInt(mins) || 0,
        is_free:          isFree,
        is_published:     true,
        video_url:        videoUrl,
      });
      Alert.alert('Published', 'Training module created successfully.');
      resetForm();
      load();
    } catch (e: any) {
      const d = e?.response?.data;
      Alert.alert('Error', d?.detail ?? Object.values(d ?? {}).flat().join('\n') ?? 'Failed to create module.');
    } finally { setSaving(false); }
  }

  async function togglePublished(m: TrainingModule) {
    try {
      await trainingApi.updateModule(m.id, { is_published: !m.is_published });
      load();
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed.'); }
  }

  return (
    <Screen title="Training Management" subtitle="Upload and manage training content for farmers">
      {error ? <ErrorBanner message={error} /> : null}

      <View style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.sm }}>
        <Button
          label={showForm ? 'Cancel' : '+ New Module'}
          onPress={() => { if (showForm) resetForm(); else setShowForm(true); }}
          variant={showForm ? 'secondary' : 'primary'}
        />
      </View>

      {/* Create form */}
      {showForm && (
        <View style={styles.form}>
          <InputField label="Title *" value={title} onChangeText={setTitle} placeholder="e.g. Broiler Biosecurity Basics" />
          <InputField label="Description" value={desc} onChangeText={setDesc} placeholder="Brief description..." multiline numberOfLines={3} style={{ height: 70, textAlignVertical: 'top' }} />

          <Text style={styles.label}>Type</Text>
          <View style={styles.chipRow}>
            {MODULE_TYPES.map(t => (
              <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipActive]}>
                <Text style={[styles.chipText, type === t && { color: Colors.leaf }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Level</Text>
          <View style={styles.chipRow}>
            {LEVELS.map(l => (
              <TouchableOpacity key={l} onPress={() => setLevel(l)} style={[styles.chip, level === l && styles.chipActive]}>
                <Text style={[styles.chipText, level === l && { color: Colors.leaf }]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <InputField label="📹 Video URL (YouTube / Vimeo)" value={videoUrl} onChangeText={setVideoUrl} placeholder="https://youtu.be/..." keyboardType="url" autoCapitalize="none" />
          <InputField label="Duration (minutes)" value={mins} onChangeText={setMins} keyboardType="numeric" placeholder="e.g. 45" />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Free for all farmers</Text>
            <Switch value={isFree} onValueChange={setIsFree} trackColor={{ true: Colors.leaf }} />
          </View>

          <Button label={saving ? 'Publishing…' : 'Publish Module'} onPress={handleCreate} loading={saving} fullWidth style={{ marginTop: 8 }} />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <SectionTitle title={`All Modules (${modules.length})`} />
        {modules.length === 0
          ? <EmptyState message="No modules yet. Add your first one above." icon="📚" />
          : modules.map(m => (
              <Card key={m.id} style={styles.moduleCard}>
                <View style={styles.moduleHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.moduleTitle}>{m.title}</Text>
                    <View style={styles.moduleMeta}>
                      <Pill label={m.level} variant={LEVEL_VARIANT[m.level] ?? 'gray'} />
                      <Text style={styles.metaText}>{m.module_type}</Text>
                      {m.duration_minutes ? <Text style={styles.metaText}>{m.duration_minutes} min</Text> : null}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Pill label={m.is_free ? 'Free' : 'Paid'} variant={m.is_free ? 'green' : 'gray'} />
                    <Pill label={m.is_published ? 'Live' : 'Draft'} variant={m.is_published ? 'green' : 'amber'} />
                  </View>
                </View>
                {m.description ? <Text style={styles.moduleDesc}>{m.description}</Text> : null}
                <Button
                  label={m.is_published ? 'Unpublish' : 'Publish'}
                  onPress={() => togglePublished(m)}
                  variant={m.is_published ? 'secondary' : 'primary'}
                  size="sm"
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                />
              </Card>
            ))
        }
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form:        { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  label:       { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  chipRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: Spacing.md },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  chipActive:  { borderColor: Colors.leaf, backgroundColor: Colors.sky },
  chipText:    { fontSize: 12, fontWeight: '600', color: Colors.muted, textTransform: 'capitalize' },
  switchRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.white, padding: 14, borderRadius: Radius.sm, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  switchLabel: { fontSize: 14, color: Colors.ink },
  moduleCard:  { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  moduleHeader:{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  moduleTitle: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  moduleMeta:  { flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' },
  metaText:    { fontSize: 12, color: Colors.muted },
  moduleDesc:  { fontSize: 12, color: Colors.muted, lineHeight: 18 },
});

export { TrainingManagementScreen as AdminTrainingManagement };
