import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { farmsApi } from '../../api/client';
import { Farm, FarmActivityLog } from '../../types';
import { Colors, Spacing, Radius } from '../../constants/theme';
import Screen from '../../components/layout/Screen';
import { Card, SectionTitle, Button, InputField, EmptyState, ErrorBanner, Pill } from '../../components/ui';

// Farm-type helpers (mirrors web frontend)
const isPoultryType    = (t: string) => ['broilers','layers','guinea_fowl','turkey','duck','geese','ostrich','mixed','poultry_and_hatchery'].includes(t);
const isHatcheryType   = (t: string) => ['day_old_chicks','hatchery','poultry_and_hatchery'].includes(t);
const isProcessingType = (t: string) => t === 'meat_processing';

const SHOWS_BROILERS      = new Set(['broilers','mixed','poultry_and_hatchery']);
const SHOWS_LAYERS        = new Set(['layers','mixed']);
const SHOWS_GUINEA_FOWL   = new Set(['guinea_fowl','mixed']);
const SHOWS_TURKEY        = new Set(['turkey','mixed']);
const SHOWS_DUCK          = new Set(['duck','mixed']);
const SHOWS_GEESE         = new Set(['geese','mixed']);
const SHOWS_OSTRICH       = new Set(['ostrich','mixed']);
const SHOWS_DAY_OLD_CHICKS= new Set(['day_old_chicks','mixed','hatchery','poultry_and_hatchery']);

export default function FarmManagerScreen() {
  const [farm,       setFarm]       = useState<Farm | null>(null);
  const [logs,       setLogs]       = useState<FarmActivityLog[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState('');
  const [tab,        setTab]        = useState<'overview' | 'log'>('overview');

  // Flock counts
  const [broilerCount,      setBroilerCount]      = useState('');
  const [layerCount,        setLayerCount]        = useState('');
  const [guineaFowlCount,   setGuineaFowlCount]   = useState('');
  const [turkeyCount,       setTurkeyCount]        = useState('');
  const [duckCount,         setDuckCount]          = useState('');
  const [geeseCount,        setGeeseCount]         = useState('');
  const [ostrichCount,      setOstrichCount]       = useState('');
  const [dayOldChickCount,  setDayOldChickCount]   = useState('');
  // Common
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [mortality,  setMortality]  = useState('0');
  const [feedKg,     setFeedKg]     = useState('');
  const [eggs,       setEggs]       = useState('0');
  const [meds,       setMeds]       = useState('');
  const [notes,      setNotes]      = useState('');
  // Hatchery
  const [eggsInIncubation, setEggsInIncubation] = useState('');
  const [eggsSetToday,     setEggsSetToday]     = useState('');
  const [chicksHatched,    setChicksHatched]    = useState('');
  const [hatchRejects,     setHatchRejects]     = useState('');
  const [chicksSold,       setChicksSold]       = useState('');
  // Processing
  const [birdsReceived,    setBirdsReceived]    = useState('');
  const [birdsProcessed,   setBirdsProcessed]   = useState('');
  const [carcassWeight,    setCarcassWeight]    = useState('');
  const [unitsPackaged,    setUnitsPackaged]    = useState('');
  const [coldStorageUnits, setColdStorageUnits] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await farmsApi.list();
      const farms: Farm[] = res.data.results ?? res.data;
      if (!farms.length) { setLoading(false); setRefreshing(false); return; }
      const f = farms[0];
      setFarm(f);
      const logRes = await farmsApi.activityLogs(f.id);
      setLogs(logRes.data.results ?? logRes.data);
    } catch { setError('Could not load farm data.'); }
    finally  { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ft = farm?.flock_type ?? 'mixed';
  const showPoultry    = isPoultryType(ft);
  const showHatchery   = isHatcheryType(ft);
  const showProcessing = isProcessingType(ft);
  const showBroilers      = SHOWS_BROILERS.has(ft);
  const showLayers        = SHOWS_LAYERS.has(ft);
  const showGuineaFowl    = SHOWS_GUINEA_FOWL.has(ft);
  const showTurkey        = SHOWS_TURKEY.has(ft);
  const showDuck          = SHOWS_DUCK.has(ft);
  const showGeese         = SHOWS_GEESE.has(ft);
  const showOstrich       = SHOWS_OSTRICH.has(ft);
  const showDayOldChicks  = SHOWS_DAY_OLD_CHICKS.has(ft);

  const runningTotal =
    (parseInt(broilerCount)||0) + (parseInt(layerCount)||0) + (parseInt(guineaFowlCount)||0) +
    (parseInt(turkeyCount)||0)  + (parseInt(duckCount)||0)  + (parseInt(geeseCount)||0) +
    (parseInt(ostrichCount)||0) + (parseInt(dayOldChickCount)||0);

  const hasPoultryEntry  = showPoultry    && runningTotal > 0;
  const hasHatcheryEntry = showHatchery   && (!!eggsInIncubation || !!eggsSetToday || !!chicksHatched);
  const hasProcessEntry  = showProcessing && (!!birdsReceived || !!birdsProcessed);
  const canSave = hasPoultryEntry || hasHatcheryEntry || hasProcessEntry;

  function resetLog() {
    setBroilerCount(''); setLayerCount(''); setGuineaFowlCount(''); setTurkeyCount('');
    setDuckCount(''); setGeeseCount(''); setOstrichCount(''); setDayOldChickCount('');
    setMortality('0'); setFeedKg(''); setEggs('0'); setMeds(''); setNotes('');
    setEggsInIncubation(''); setEggsSetToday(''); setChicksHatched(''); setHatchRejects(''); setChicksSold('');
    setBirdsReceived(''); setBirdsProcessed(''); setCarcassWeight(''); setUnitsPackaged(''); setColdStorageUnits('');
  }

  async function submitLog() {
    if (!farm || !canSave) return;
    setSaving(true);
    try {
      await farmsApi.logActivity(farm.id, {
        date,
        broiler_count:       showBroilers      ? (parseInt(broilerCount)     || 0) : 0,
        layer_count:         showLayers        ? (parseInt(layerCount)       || 0) : 0,
        guinea_fowl_count:   showGuineaFowl    ? (parseInt(guineaFowlCount)  || 0) : 0,
        turkey_count:        showTurkey        ? (parseInt(turkeyCount)      || 0) : 0,
        duck_count:          showDuck          ? (parseInt(duckCount)        || 0) : 0,
        geese_count:         showGeese         ? (parseInt(geeseCount)       || 0) : 0,
        ostrich_count:       showOstrich       ? (parseInt(ostrichCount)     || 0) : 0,
        day_old_chick_count: showDayOldChicks  ? (parseInt(dayOldChickCount) || 0) : 0,
        mortality:           parseInt(mortality),
        feed_kg:             feedKg,
        eggs_collected:      parseInt(eggs),
        medication_given:    meds,
        notes,
        eggs_in_incubation:  showHatchery ? (parseInt(eggsInIncubation) || 0) : 0,
        eggs_set_today:      showHatchery ? (parseInt(eggsSetToday)     || 0) : 0,
        chicks_hatched:      showHatchery ? (parseInt(chicksHatched)    || 0) : 0,
        hatch_rejects:       showHatchery ? (parseInt(hatchRejects)     || 0) : 0,
        chicks_sold:         showHatchery ? (parseInt(chicksSold)       || 0) : 0,
        birds_received:      showProcessing ? (parseInt(birdsReceived)      || 0) : 0,
        birds_processed:     showProcessing ? (parseInt(birdsProcessed)     || 0) : 0,
        carcass_weight_kg:   showProcessing ? (parseFloat(carcassWeight)    || 0) : 0,
        units_packaged:      showProcessing ? (parseInt(unitsPackaged)      || 0) : 0,
        cold_storage_units:  showProcessing ? (parseInt(coldStorageUnits)   || 0) : 0,
      });
      Alert.alert('Saved', 'Activity log recorded successfully.');
      resetLog();
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Could not save log.');
    } finally { setSaving(false); }
  }

  return (
    <Screen title="Farm Manager" subtitle="Log daily farm activity">
      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.tabBar}>
        {(['overview', 'log'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'overview' ? 'Farm Overview' : 'Log Activity'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.leaf} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Overview */}
        {tab === 'overview' && (
          farm ? (
            <>
              <Card style={styles.farmCard}>
                <View style={styles.farmHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.farmName}>{farm.name}</Text>
                    <Text style={styles.farmMeta}>{farm.region} · {farm.district} · {farm.community}</Text>
                    <Text style={styles.farmMeta}>{farm.flock_type.replace(/_/g, ' ')} · {farm.flock_size.toLocaleString()} birds</Text>
                  </View>
                  <Pill label={farm.is_active ? 'Active' : 'Inactive'} variant={farm.is_active ? 'green' : 'gray'} />
                </View>
                <View style={styles.farmGrid}>
                  {[
                    ['Farm Size', farm.farm_size_acres ? farm.farm_size_acres + ' acres' : '—'],
                    ['Water Source', farm.has_water_source ? 'Yes' : 'No'],
                    ['Electricity',  farm.has_electricity  ? 'Yes' : 'No'],
                    ['Officer', farm.monitoring_officer_name ?? 'Not assigned'],
                  ].map(([k, v]) => (
                    <View key={k} style={styles.farmStat}>
                      <Text style={styles.farmStatKey}>{k}</Text>
                      <Text style={styles.farmStatVal}>{v}</Text>
                    </View>
                  ))}
                </View>
              </Card>

              <SectionTitle title="Recent Activity Logs" />
              {logs.length === 0
                ? <EmptyState message="No activity logged yet. Switch to 'Log Activity' to record today's data." icon="📊" />
                : logs.slice(0, 14).map(log => (
                    <Card key={log.id} style={styles.logCard}>
                      <Text style={styles.logDate}>{log.date}</Text>
                      {showBroilers   && log.broiler_count     > 0 && <Text style={styles.logLine}>Broilers: {log.broiler_count.toLocaleString()}</Text>}
                      {showLayers     && log.layer_count       > 0 && <Text style={styles.logLine}>Layers: {log.layer_count.toLocaleString()}</Text>}
                      {showGuineaFowl && log.guinea_fowl_count > 0 && <Text style={styles.logLine}>Guinea Fowl: {log.guinea_fowl_count.toLocaleString()}</Text>}
                      <Text style={styles.logLine}>Total: {log.flock_count.toLocaleString()} · Mortality: {log.mortality} · Feed: {log.feed_kg} kg</Text>
                      {showLayers && log.eggs_collected > 0 && <Text style={styles.logLine}>Eggs: {log.eggs_collected}</Text>}
                      {showHatchery && (log as any).chicks_hatched > 0 && <Text style={styles.logLine}>Hatched: {(log as any).chicks_hatched}</Text>}
                      {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
                    </Card>
                  ))
              }
            </>
          ) : <EmptyState message="No farm registered. Contact your admin." icon="🌾" />
        )}

        {/* Log Activity */}
        {tab === 'log' && farm && (
          <View style={styles.formWrap}>
            <InputField label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

            {/* Poultry counts */}
            {showPoultry && (
              <>
                <Text style={styles.sectionDiv}>Flock Count</Text>
                <View style={styles.twoCol}>
                  {showBroilers     && <View style={{ flex: 1 }}><InputField label="Broilers *"     value={broilerCount}     onChangeText={setBroilerCount}     keyboardType="numeric" placeholder="0" /></View>}
                  {showLayers       && <View style={{ flex: 1 }}><InputField label="Layers *"       value={layerCount}       onChangeText={setLayerCount}       keyboardType="numeric" placeholder="0" /></View>}
                </View>
                <View style={styles.twoCol}>
                  {showGuineaFowl   && <View style={{ flex: 1 }}><InputField label="Guinea Fowl *"  value={guineaFowlCount}  onChangeText={setGuineaFowlCount}  keyboardType="numeric" placeholder="0" /></View>}
                  {showTurkey       && <View style={{ flex: 1 }}><InputField label="Turkey *"       value={turkeyCount}      onChangeText={setTurkeyCount}      keyboardType="numeric" placeholder="0" /></View>}
                </View>
                <View style={styles.twoCol}>
                  {showDuck         && <View style={{ flex: 1 }}><InputField label="Duck *"         value={duckCount}        onChangeText={setDuckCount}        keyboardType="numeric" placeholder="0" /></View>}
                  {showGeese        && <View style={{ flex: 1 }}><InputField label="Geese *"        value={geeseCount}       onChangeText={setGeeseCount}       keyboardType="numeric" placeholder="0" /></View>}
                </View>
                <View style={styles.twoCol}>
                  {showOstrich      && <View style={{ flex: 1 }}><InputField label="Ostrich *"      value={ostrichCount}     onChangeText={setOstrichCount}     keyboardType="numeric" placeholder="0" /></View>}
                  {showDayOldChicks && <View style={{ flex: 1 }}><InputField label="Day-Old Chicks" value={dayOldChickCount} onChangeText={setDayOldChickCount} keyboardType="numeric" placeholder="0" /></View>}
                </View>
                {runningTotal > 0 && <Text style={styles.totalHint}>Total: {runningTotal.toLocaleString()} birds</Text>}
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}><InputField label="Mortality" value={mortality} onChangeText={setMortality} keyboardType="numeric" placeholder="0" /></View>
                  <View style={{ flex: 1 }}><InputField label="Feed (kg)" value={feedKg}    onChangeText={setFeedKg}    keyboardType="decimal-pad" placeholder="0" /></View>
                </View>
                {showLayers && <InputField label="Eggs Collected" value={eggs} onChangeText={setEggs} keyboardType="numeric" placeholder="0" />}
              </>
            )}

            {/* Hatchery section */}
            {showHatchery && (
              <>
                <Text style={styles.sectionDiv}>Hatchery Activity</Text>
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}><InputField label="Eggs in Incubation" value={eggsInIncubation} onChangeText={setEggsInIncubation} keyboardType="numeric" placeholder="0" /></View>
                  <View style={{ flex: 1 }}><InputField label="Eggs Set Today"     value={eggsSetToday}     onChangeText={setEggsSetToday}     keyboardType="numeric" placeholder="0" /></View>
                </View>
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}><InputField label="Chicks Hatched"  value={chicksHatched} onChangeText={setChicksHatched} keyboardType="numeric" placeholder="0" /></View>
                  <View style={{ flex: 1 }}><InputField label="Hatch Rejects"   value={hatchRejects}  onChangeText={setHatchRejects}  keyboardType="numeric" placeholder="0" /></View>
                </View>
                <InputField label="Chicks Sold/Dispatched" value={chicksSold} onChangeText={setChicksSold} keyboardType="numeric" placeholder="0" />
                {parseInt(eggsInIncubation) > 0 && parseInt(chicksHatched) > 0 && (
                  <Text style={styles.totalHint}>
                    Hatch rate: {((parseInt(chicksHatched) / parseInt(eggsInIncubation)) * 100).toFixed(1)}%
                  </Text>
                )}
              </>
            )}

            {/* Meat processing section */}
            {showProcessing && (
              <>
                <Text style={styles.sectionDiv}>Processing Activity</Text>
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}><InputField label="Birds Received"  value={birdsReceived}  onChangeText={setBirdsReceived}  keyboardType="numeric" placeholder="0" /></View>
                  <View style={{ flex: 1 }}><InputField label="Birds Processed" value={birdsProcessed} onChangeText={setBirdsProcessed} keyboardType="numeric" placeholder="0" /></View>
                </View>
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}><InputField label="Carcass Weight (kg)" value={carcassWeight}    onChangeText={setCarcassWeight}    keyboardType="decimal-pad" placeholder="0" /></View>
                  <View style={{ flex: 1 }}><InputField label="Units Packaged"      value={unitsPackaged}    onChangeText={setUnitsPackaged}    keyboardType="numeric" placeholder="0" /></View>
                </View>
                <InputField label="Units to Cold Storage" value={coldStorageUnits} onChangeText={setColdStorageUnits} keyboardType="numeric" placeholder="0" />
                <InputField label="Mortality (handling losses)" value={mortality} onChangeText={setMortality} keyboardType="numeric" placeholder="0" />
              </>
            )}

            {/* Common fields */}
            <Text style={styles.sectionDiv}>Common</Text>
            <InputField label="Medication / Treatments Given" value={meds} onChangeText={setMeds} placeholder="e.g. Newcastle vaccine — 0.5ml per bird" />
            <InputField label="Additional Notes" value={notes} onChangeText={setNotes} placeholder="Anything else to note…" multiline numberOfLines={3} style={{ height: 70, textAlignVertical: 'top' }} />

            <Button label="Save Activity Log" onPress={submitLog} loading={saving} disabled={!canSave} fullWidth size="lg" />
          </View>
        )}

        {tab === 'log' && !farm && (
          <EmptyState message="No farm registered. Contact admin to register your farm." icon="🌾" />
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabBar:         { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.border, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  tab:            { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive:      { borderBottomWidth: 2, borderBottomColor: Colors.leaf, marginBottom: -2 },
  tabText:        { fontSize: 13, fontWeight: '500', color: Colors.muted },
  tabTextActive:  { color: Colors.leaf, fontWeight: '700' },
  farmCard:       { marginHorizontal: Spacing.md, marginTop: Spacing.md },
  farmHeader:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  farmName:       { fontSize: 16, fontWeight: '700', color: Colors.ink },
  farmMeta:       { fontSize: 12, color: Colors.muted, marginTop: 2 },
  farmGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  farmStat:       { width: '47%', backgroundColor: Colors.sky, borderRadius: Radius.sm, padding: 8 },
  farmStatKey:    { fontSize: 10, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase' },
  farmStatVal:    { fontSize: 13, fontWeight: '600', color: Colors.ink, marginTop: 2 },
  logCard:        { marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  logDate:        { fontSize: 12, fontWeight: '700', color: Colors.muted, marginBottom: 4 },
  logLine:        { fontSize: 13, color: Colors.ink, marginBottom: 2 },
  logNotes:       { fontSize: 12, color: Colors.muted, marginTop: 4, fontStyle: 'italic' },
  formWrap:       { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  twoCol:         { flexDirection: 'row', gap: Spacing.sm },
  sectionDiv:     { fontSize: 12, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, marginTop: 8, marginBottom: 4 },
  totalHint:      { fontSize: 12, color: Colors.leaf, fontWeight: '600', marginBottom: Spacing.sm },
});
