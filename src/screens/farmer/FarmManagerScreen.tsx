import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  Alert, RefreshControl, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { farmsApi, toArray } from '../../api/client';
import { Colors, Spacing, Radius } from '../../constants/theme';
import { PageHeader, Card, Button, SectionTitle, Badge, FormLabel, ScreenScroll } from '../../components/ui';
import type { Farm, FarmActivityLog } from '../../types';

// Flock type sets matching frontend exactly
const SHOWS_BROILERS       = new Set(['broilers','mixed','poultry_and_hatchery']);
const SHOWS_LAYERS         = new Set(['layers','mixed']);
const SHOWS_GUINEA_FOWL    = new Set(['guinea_fowl','mixed']);
const SHOWS_TURKEY         = new Set(['turkey','mixed']);
const SHOWS_DUCK           = new Set(['duck','mixed']);
const SHOWS_GEESE          = new Set(['geese','mixed']);
const SHOWS_OSTRICH        = new Set(['ostrich','mixed']);
const SHOWS_LOCAL_BIRDS    = new Set(['local_birds','mixed']);
const SHOWS_DAY_OLD_CHICKS = new Set(['day_old_chicks','mixed','hatchery','poultry_and_hatchery']);

const isPoultryType    = (t: string) => ['broilers','layers','guinea_fowl','turkey','duck','geese','ostrich','local_birds','mixed','poultry_and_hatchery'].includes(t);
const isHatcheryType   = (t: string) => ['day_old_chicks','hatchery','poultry_and_hatchery'].includes(t);
const isProcessingType = (t: string) => t === 'meat_processing';

export default function FarmManagerScreen() {
  const [farms,       setFarms]       = useState<Farm[]>([]);
  const [selectedFarm,setSelectedFarm]= useState('');
  const [logs,        setLogs]        = useState<FarmActivityLog[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [refreshing,  setRefreshing]  = useState(false);
  const [mediaUri,    setMediaUri]    = useState<string | null>(null);
  const [mediaFile,   setMediaFile]   = useState<{uri:string;name:string;type:string} | null>(null);

  // Form state
  const [date,             setDate]             = useState(new Date().toISOString().split('T')[0]);
  const [broilerCount,     setBroilerCount]     = useState('');
  const [layerCount,       setLayerCount]       = useState('');
  const [guineaFowlCount,  setGuineaFowlCount]  = useState('');
  const [turkeyCount,      setTurkeyCount]      = useState('');
  const [duckCount,        setDuckCount]        = useState('');
  const [geeseCount,       setGeeseCount]       = useState('');
  const [ostrichCount,     setOstrichCount]     = useState('');
  const [localCockCount,   setLocalCockCount]   = useState('');
  const [localHenCount,    setLocalHenCount]    = useState('');
  const [dayOldChickCount, setDayOldChickCount] = useState('');
  const [mortality,        setMortality]        = useState('0');
  const [feedKg,           setFeedKg]           = useState('');
  const [eggs,             setEggs]             = useState('0');
  const [meds,             setMeds]             = useState('');
  const [notes,            setNotes]            = useState('');
  const [eggsInIncubation, setEggsInIncubation] = useState('');
  const [eggsSetToday,     setEggsSetToday]     = useState('');
  const [chicksHatched,    setChicksHatched]    = useState('');
  const [hatchRejects,     setHatchRejects]     = useState('');
  const [chicksSold,       setChicksSold]       = useState('');
  const [birdsReceived,    setBirdsReceived]    = useState('');
  const [birdsProcessed,   setBirdsProcessed]   = useState('');
  const [carcassWeightKg,  setCarcassWeightKg]  = useState('');
  const [unitsPackaged,    setUnitsPackaged]    = useState('');
  const [coldStorageUnits, setColdStorageUnits] = useState('');

  const load = async () => {
    const r = await farmsApi.list();
    const list = toArray<Farm>(r.data);
    setFarms(list);
    if (!selectedFarm && list.length > 0) setSelectedFarm(list[0].id);
    setLoading(false);
  };

  const loadLogs = async (farmId: string) => {
    if (!farmId) return;
    const r = await farmsApi.activityLogs(farmId);
    setLogs(toArray<FarmActivityLog>(r.data));
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selectedFarm) loadLogs(selectedFarm); }, [selectedFarm]);

  const onRefresh = async () => { setRefreshing(true); await load(); await loadLogs(selectedFarm); setRefreshing(false); };

  const activeFarm = farms.find(f => f.id === selectedFarm);
  const ft = activeFarm?.flock_type ?? 'mixed';
  const showPoultry    = isPoultryType(ft);
  const showHatchery   = isHatcheryType(ft);
  const showProcessing = isProcessingType(ft);
  const showBroilers   = SHOWS_BROILERS.has(ft);
  const showLayers     = SHOWS_LAYERS.has(ft);
  const showGuineaFowl = SHOWS_GUINEA_FOWL.has(ft);
  const showTurkey     = SHOWS_TURKEY.has(ft);
  const showDuck       = SHOWS_DUCK.has(ft);
  const showGeese      = SHOWS_GEESE.has(ft);
  const showOstrich    = SHOWS_OSTRICH.has(ft);
  const showLocalBirds = SHOWS_LOCAL_BIRDS.has(ft);
  const showDayOld     = SHOWS_DAY_OLD_CHICKS.has(ft);

  const hasPoultryCount = (showBroilers && !!broilerCount) || (showLayers && !!layerCount) || (showGuineaFowl && !!guineaFowlCount) || (showTurkey && !!turkeyCount) || (showDuck && !!duckCount) || (showGeese && !!geeseCount) || (showOstrich && !!ostrichCount) || (showLocalBirds && (!!localCockCount || !!localHenCount)) || (showDayOld && !!dayOldChickCount);
  const hasHatchery    = !!eggsInIncubation || !!eggsSetToday || !!chicksHatched;
  const hasProcessing  = !!birdsReceived || !!birdsProcessed;
  const canSave        = (showPoultry && hasPoultryCount) || (showHatchery && hasHatchery) || (showProcessing && hasProcessing);

  const totalBirds = (parseInt(broilerCount)||0)+(parseInt(layerCount)||0)+(parseInt(guineaFowlCount)||0)+(parseInt(turkeyCount)||0)+(parseInt(duckCount)||0)+(parseInt(geeseCount)||0)+(parseInt(ostrichCount)||0)+(parseInt(localCockCount)||0)+(parseInt(localHenCount)||0)+(parseInt(dayOldChickCount)||0);

  const pickMedia = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [ImagePicker.MediaType.Images, ImagePicker.MediaType.Videos], quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      setMediaUri(asset.uri);
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      setMediaFile({ uri: asset.uri, name: `media.${ext}`, type: asset.type === 'video' ? `video/${ext}` : `image/${ext}` });
    }
  };

  const resetForm = () => {
    setBroilerCount(''); setLayerCount(''); setGuineaFowlCount(''); setTurkeyCount(''); setDuckCount('');
    setGeeseCount(''); setOstrichCount(''); setLocalCockCount(''); setLocalHenCount(''); setDayOldChickCount('');
    setMortality('0'); setFeedKg(''); setEggs('0'); setMeds(''); setNotes('');
    setEggsInIncubation(''); setEggsSetToday(''); setChicksHatched(''); setHatchRejects(''); setChicksSold('');
    setBirdsReceived(''); setBirdsProcessed(''); setCarcassWeightKg(''); setUnitsPackaged(''); setColdStorageUnits('');
    setMediaUri(null); setMediaFile(null);
  };

  const handleLog = async () => {
    if (!selectedFarm || !canSave) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const payload: Record<string, unknown> = {
        farm: selectedFarm, date,
        broiler_count:       showBroilers     ? (parseInt(broilerCount)||0)     : 0,
        layer_count:         showLayers       ? (parseInt(layerCount)||0)       : 0,
        guinea_fowl_count:   showGuineaFowl   ? (parseInt(guineaFowlCount)||0)  : 0,
        turkey_count:        showTurkey       ? (parseInt(turkeyCount)||0)      : 0,
        duck_count:          showDuck         ? (parseInt(duckCount)||0)        : 0,
        geese_count:         showGeese        ? (parseInt(geeseCount)||0)       : 0,
        ostrich_count:       showOstrich      ? (parseInt(ostrichCount)||0)     : 0,
        local_cock_count:    showLocalBirds   ? (parseInt(localCockCount)||0)   : 0,
        local_hen_count:     showLocalBirds   ? (parseInt(localHenCount)||0)    : 0,
        day_old_chick_count: showDayOld       ? (parseInt(dayOldChickCount)||0) : 0,
        mortality: parseInt(mortality)||0, feed_kg: feedKg,
        eggs_collected: parseInt(eggs)||0,
        medication_given: meds, notes,
        eggs_in_incubation: showHatchery  ? (parseInt(eggsInIncubation)||0) : 0,
        eggs_set_today:     showHatchery  ? (parseInt(eggsSetToday)||0)     : 0,
        chicks_hatched:     showHatchery  ? (parseInt(chicksHatched)||0)    : 0,
        hatch_rejects:      showHatchery  ? (parseInt(hatchRejects)||0)     : 0,
        chicks_sold:        showHatchery  ? (parseInt(chicksSold)||0)       : 0,
        birds_received:     showProcessing ? (parseInt(birdsReceived)||0)   : 0,
        birds_processed:    showProcessing ? (parseInt(birdsProcessed)||0)  : 0,
        carcass_weight_kg:  showProcessing ? (parseFloat(carcassWeightKg)||0):0,
        units_packaged:     showProcessing ? (parseInt(unitsPackaged)||0)   : 0,
        cold_storage_units: showProcessing ? (parseInt(coldStorageUnits)||0): 0,
      };

      if (mediaFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => fd.append(k, String(v)));
        fd.append('media_file', mediaFile as any);
        fd.append('media_type', mediaFile.type.startsWith('video') ? 'video' : 'image');
        fd.append('media_captured_at', new Date().toISOString());
        await farmsApi.createLogForm(selectedFarm, fd as any);
      } else {
        await farmsApi.createLog(selectedFarm, payload);
      }
      setSuccess('Activity logged successfully!');
      resetForm();
      await loadLogs(selectedFarm);
    } catch {
      setError('Failed to save log. Please try again.');
    } finally { setSaving(false); }
  };

  if (loading) return <ScreenScroll><Text style={{ color: Colors.muted }}>Loading farms…</Text></ScreenScroll>;
  if (farms.length === 0) return <ScreenScroll><PageHeader title="Farm Manager" subtitle="Log daily farm activity." /><Card><Text style={{ color: Colors.muted }}>You have no registered farms yet. Please contact FarmAsyst North to register your farm.</Text></Card></ScreenScroll>;

  const DividerLabel = ({ label }: { label: string }) => (
    <View style={{ borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.xs }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.bg }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} keyboardShouldPersistTaps="handled">
      <PageHeader title="Farm Manager" subtitle="Log daily farm activity — flock count, feed, mortality, and more." />

      {/* Farm selector */}
      {farms.length > 1 && (
        <Card>
          <FormLabel>Select farm</FormLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {farms.map(f => (
              <TouchableOpacity key={f.id} onPress={() => setSelectedFarm(f.id)}
                style={[s.farmTab, selectedFarm === f.id && s.farmTabActive]}>
                <Text style={[s.farmTabText, selectedFarm === f.id && s.farmTabTextActive]}>{f.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>
      )}

      {/* Log Form */}
      <SectionTitle>Log Today's Activity — {activeFarm?.name}</SectionTitle>
      <Card>
        {error   ? <Text style={s.error}>{error}</Text>   : null}
        {success ? <Text style={s.success}>{success}</Text> : null}

        <FormLabel>Date</FormLabel>
        <TextInput style={s.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

        {/* Poultry flock counts */}
        {showPoultry && (
          <>
            <DividerLabel label="Flock Count" />
            {showBroilers   && <><FormLabel required>Broilers</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={broilerCount}    onChangeText={setBroilerCount} /></>}
            {showLayers     && <><FormLabel required>Layers</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={layerCount}      onChangeText={setLayerCount} /></>}
            {showGuineaFowl && <><FormLabel required>Guinea Fowl</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={guineaFowlCount} onChangeText={setGuineaFowlCount} /></>}
            {showTurkey     && <><FormLabel required>Turkey</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={turkeyCount}     onChangeText={setTurkeyCount} /></>}
            {showDuck       && <><FormLabel required>Duck</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={duckCount}       onChangeText={setDuckCount} /></>}
            {showGeese      && <><FormLabel required>Geese</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={geeseCount}      onChangeText={setGeeseCount} /></>}
            {showOstrich    && <><FormLabel required>Ostrich</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={ostrichCount}    onChangeText={setOstrichCount} /></>}
            {showLocalBirds && <>
              <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
                <View style={{ flex: 1 }}><FormLabel required>Local Cocks</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={localCockCount} onChangeText={setLocalCockCount} /></View>
                <View style={{ flex: 1 }}><FormLabel required>Local Hens</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={localHenCount}  onChangeText={setLocalHenCount} /></View>
              </View>
            </>}
            {showDayOld && <><FormLabel>Day-Old Chicks</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={dayOldChickCount} onChangeText={setDayOldChickCount} /></>}
            <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm }}>Total: <Text style={{ fontWeight: '700' }}>{totalBirds.toLocaleString()}</Text> birds</Text>

            <FormLabel>Mortality</FormLabel>
            <TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={mortality} onChangeText={setMortality} />

            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <FormLabel>Feed consumed (kg)</FormLabel>
                <TextInput style={s.input} keyboardType="decimal-pad" placeholder="e.g. 25.5" value={feedKg} onChangeText={setFeedKg} />
              </View>
              {showLayers && (
                <View style={{ flex: 1 }}>
                  <FormLabel>Eggs collected</FormLabel>
                  <TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={eggs} onChangeText={setEggs} />
                </View>
              )}
            </View>
          </>
        )}

        {/* Hatchery section */}
        {showHatchery && (
          <>
            <DividerLabel label="Hatchery Activity" />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}><FormLabel>Eggs in incubation</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={eggsInIncubation} onChangeText={setEggsInIncubation} /></View>
              <View style={{ flex: 1 }}><FormLabel>Eggs set today</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={eggsSetToday} onChangeText={setEggsSetToday} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}><FormLabel>Chicks hatched</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={chicksHatched} onChangeText={setChicksHatched} /></View>
              <View style={{ flex: 1 }}><FormLabel>Hatch rejects</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={hatchRejects} onChangeText={setHatchRejects} /></View>
              <View style={{ flex: 1 }}><FormLabel>Chicks sold</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={chicksSold} onChangeText={setChicksSold} /></View>
            </View>
            {parseInt(eggsInIncubation) > 0 && parseInt(chicksHatched) > 0 && (
              <Text style={{ fontSize: 12, color: Colors.muted, marginBottom: Spacing.sm }}>
                Hatch rate: <Text style={{ fontWeight: '700' }}>{((parseInt(chicksHatched)/parseInt(eggsInIncubation))*100).toFixed(1)}%</Text>
              </Text>
            )}
          </>
        )}

        {/* Meat processing section */}
        {showProcessing && (
          <>
            <DividerLabel label="Processing Activity" />
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}><FormLabel>Birds received</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={birdsReceived} onChangeText={setBirdsReceived} /></View>
              <View style={{ flex: 1 }}><FormLabel>Birds processed</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={birdsProcessed} onChangeText={setBirdsProcessed} /></View>
            </View>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <View style={{ flex: 1 }}><FormLabel>Carcass weight (kg)</FormLabel><TextInput style={s.input} keyboardType="decimal-pad" placeholder="0.0" value={carcassWeightKg} onChangeText={setCarcassWeightKg} /></View>
              <View style={{ flex: 1 }}><FormLabel>Units packaged</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={unitsPackaged} onChangeText={setUnitsPackaged} /></View>
              <View style={{ flex: 1 }}><FormLabel>Cold storage</FormLabel><TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={coldStorageUnits} onChangeText={setColdStorageUnits} /></View>
            </View>
            <FormLabel>Mortality (handling losses)</FormLabel>
            <TextInput style={s.input} keyboardType="number-pad" placeholder="0" value={mortality} onChangeText={setMortality} />
          </>
        )}

        {/* Common fields */}
        <FormLabel>Medication / treatments given</FormLabel>
        <TextInput style={s.input} placeholder="e.g. Newcastle vaccine — 0.5ml per bird" value={meds} onChangeText={setMeds} />

        <FormLabel>Additional notes</FormLabel>
        <TextInput style={[s.input, s.textarea]} multiline numberOfLines={3} placeholder="Anything else to note about today's activity…" value={notes} onChangeText={setNotes} />

        {/* Media upload */}
        <FormLabel>Farm Activity Photo / Video</FormLabel>
        <Button variant="secondary" onPress={pickMedia} style={{ marginBottom: Spacing.sm }}>
          {mediaUri ? '📷 Change Photo/Video' : '📷 Upload Photo/Video (Optional)'}
        </Button>
        {mediaUri && (
          <View style={{ marginBottom: Spacing.sm }}>
            <Image source={{ uri: mediaUri }} style={{ width: '100%', height: 160, borderRadius: Radius.sm, resizeMode: 'cover' }} />
            <TouchableOpacity onPress={() => { setMediaUri(null); setMediaFile(null); }}>
              <Text style={{ fontSize: 12, color: Colors.danger, marginTop: 4 }}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        <Button fullWidth disabled={!canSave || saving} loading={saving} onPress={handleLog}>
          Save Activity Log
        </Button>
      </Card>

      {/* Recent Logs */}
      <SectionTitle>Recent Activity Logs</SectionTitle>
      <Card>
        {logs.length === 0
          ? <Text style={{ color: Colors.muted }}>No logs yet. Start logging daily activity above.</Text>
          : logs.slice(0, 14).map(log => (
            <View key={log.id} style={s.logRow}>
              <Text style={{ fontSize: 12, color: Colors.muted, width: 60 }}>
                {new Date(log.date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}
              </Text>
              <Text style={{ flex: 1, fontSize: 13 }}>
                <Text style={{ fontWeight: '700' }}>{log.flock_count?.toLocaleString() ?? 0}</Text> birds
                {log.mortality > 0 && <Text style={{ color: Colors.danger }}> · {log.mortality} dead</Text>}
                {log.feed_kg ? <Text style={{ color: Colors.muted }}> · {log.feed_kg}kg feed</Text> : null}
              </Text>
            </View>
          ))
        }
      </Card>

      {/* Farm Overview */}
      {activeFarm && (
        <>
          <SectionTitle>Farm Overview</SectionTitle>
          <Card>
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Farm name</Text><Text style={{ fontWeight: '700' }}>{activeFarm.name}</Text></View>
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Location</Text><Text style={{ fontWeight: '700' }}>{activeFarm.district}, {activeFarm.region}</Text></View>
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Farm type</Text><Text style={{ fontWeight: '700', textTransform: 'capitalize' }}>{activeFarm.flock_type.replace(/_/g,' ')}</Text></View>
            {showPoultry && <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Current flock</Text><Text style={{ fontWeight: '700' }}>{activeFarm.flock_size.toLocaleString()}</Text></View>}
            <View style={s.tableRow}><Text style={{ color: Colors.muted }}>Status</Text><Badge variant={activeFarm.is_active ? 'success' : 'neutral'}>{activeFarm.is_active ? 'Active' : 'Inactive'}</Badge></View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  input:    { backgroundColor: Colors.bg, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.ink, marginBottom: Spacing.sm },
  textarea: { height: 80, textAlignVertical: 'top' },
  error:    { fontSize: 13, color: Colors.danger, marginBottom: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.dangerBg, borderRadius: Radius.sm },
  success:  { fontSize: 13, color: Colors.success, marginBottom: Spacing.sm, padding: Spacing.sm, backgroundColor: Colors.successBg, borderRadius: Radius.sm },
  farmTab:      { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, marginRight: Spacing.sm },
  farmTabActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  farmTabText:      { fontSize: 13, color: Colors.muted },
  farmTabTextActive:{ color: '#fff', fontWeight: '600' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  logRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.xs, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
});
