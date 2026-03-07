import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import deviceApi from '../services/deviceApi';

export default function VideoSettings({ theme, toggleTheme }) {
    const [selectedDevice, setSelectedDevice] = useState('');
    const [devices, setDevices] = useState({ active: [], historical: [] });
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    // null = not loaded yet; only shown after a successful device fetch
    const [adasForm, setAdasForm] = useState(null);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    // Fetch & populate all form fields from the server's cached device settings
    const fetchCurrentValues = async (deviceId) => {
        if (!deviceId) return;
        setLoading(true);
        setAdasForm(null); // clear previous device values while loading
        try {
            const res = await deviceApi.getSettings(deviceId);
            if (res.success && res.settings) {
                // backend stores parsed 0xF364 under this key
                const raw = res.settings['0x0000f364'] || res.settings['0xf364'] || null;

                if (raw) {
                    setAdasForm({
                        enable: raw.pedestrian?.enable === 1,
                        gnssSpeed: raw.pedestrian?.speedThreshold ?? '',
                        classification: raw.classification ?? raw.pedestrian?.classification ?? '',
                        interval: raw.interval ?? raw.pedestrian?.interval ?? '',
                        audioFrequency: (raw.volume ?? 0) > 0,
                        sense: raw.pedestrian?.sensitivity ?? '',
                        record: raw.videoEnable === 1,
                        recordLockChn: [
                            !!(raw.flags & 0x01),
                            !!(raw.flags & 0x02),
                        ],
                        recordUploadChn: [
                            !!(raw.flags & 0x04),
                            !!(raw.flags & 0x08),
                        ],
                        alarmOutput: [!!(raw.flags & 0x10)],
                        snapChn: [
                            !!(raw.photoEnable & 0x01),
                            !!(raw.photoEnable & 0x02),
                        ],
                    });
                    showNotification(`Loaded settings for ${deviceId}`);
                } else {
                    // device exists in server but 0xF364 not yet queried – show empty form
                    setAdasForm({
                        enable: false, gnssSpeed: '', classification: '', interval: '',
                        audioFrequency: false, sense: '', record: false,
                        recordLockChn: [false, false], recordUploadChn: [false, false],
                        alarmOutput: [false], snapChn: [false, false],
                    });
                    showNotification('No cached ADAS data yet. Tap ↻ to query the device.', 'info');
                }
            }
        } catch (err) {
            console.error('Fetch failed', err);
            showNotification('Failed to load settings from server', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Send a live query to the device then re-fetch after 3 s
    const handleSync = async () => {
        if (!selectedDevice) return;
        setLoading(true);
        try {
            await deviceApi.queryParams(selectedDevice, [0xF364]);
            showNotification('Query sent – fetching updated values in 3 s…', 'info');
            setTimeout(() => fetchCurrentValues(selectedDevice), 3000);
        } catch (err) {
            showNotification(err.message, 'error');
            setLoading(false);
        }
    };

    // Load device list on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await deviceApi.checkStatus();
                if (res.success) {
                    const activeEntries = Object.entries(res.activeConnections || {});
                    const active = [];
                    const historical = [];

                    const now = new Date();
                    activeEntries.forEach(([id, conn]) => {
                        const lastSeen = new Date(conn.lastSeen);
                        const diffMins = (now - lastSeen) / 60000;
                        
                        if (diffMins < 5) {
                            active.push(id);
                        } else {
                            historical.push(id);
                        }
                    });

                    // Add other historical devices
                    Object.keys(res.lastSeenDevices || {}).forEach(id => {
                        if (!active.includes(id) && !historical.includes(id)) {
                            historical.push(id);
                        }
                    });

                    setDevices({ active, historical });
                }
            } catch (err) {
                console.error('Status check failed', err);
            }
        })();
    }, []);

    // Auto-fetch when device changes
    useEffect(() => {
        if (selectedDevice) {
            fetchCurrentValues(selectedDevice);
        } else {
            setAdasForm(null);
        }
    }, [selectedDevice]);

    const handleSave = async () => {
        if (!selectedDevice || !adasForm) return;
        setLoading(true);
        try {
            await deviceApi.setParams(selectedDevice, 'ai', {
                adas: {
                    pedestrian: {
                        enable: adasForm.enable ? 1 : 0,
                        sensitivity: Number(adasForm.sense),
                        speedThreshold: Number(adasForm.gnssSpeed),
                    },
                    videoEnable: adasForm.record ? 1 : 0,
                    classification: Number(adasForm.classification),
                    interval: Number(adasForm.interval),
                    audioFrequency: adasForm.audioFrequency ? 1 : 0,
                }
            });
            showNotification('Settings saved to device.');
        } catch (err) {
            showNotification(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleChn = (key, index) => {
        setAdasForm(prev => {
            const list = [...prev[key]];
            list[index] = !list[index];
            return { ...prev, [key]: list };
        });
    };

    /* ── tiny reusable sub-components ── */
    const Toggle = ({ value, onChange }) => (
        <div onClick={() => onChange(!value)} style={{
            width: 51, height: 31, borderRadius: 31, flexShrink: 0,
            background: value ? '#007AFF' : '#E9E9EB',
            position: 'relative', cursor: 'pointer', transition: 'background .2s',
        }}>
            <div style={{
                width: 27, height: 27, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 2, left: value ? 22 : 2, transition: 'left .2s',
            }} />
        </div>
    );

    const Checkbox = ({ checked, onChange, label }) => (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
            <input type="checkbox" checked={checked} onChange={onChange}
                style={{ width: 18, height: 18, accentColor: '#007AFF' }} />
            {label}
        </label>
    );

    const Row = ({ label, children }) => (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 16px', borderBottom: '0.5px solid rgba(0,0,0,0.06)',
            background: 'white',
        }}>
            <span style={{ fontSize: 16, fontWeight: 500, color: '#222' }}>{label}</span>
            {children}
        </div>
    );

    const NumInput = ({ value, onChange }) => (
        <input type="number" value={value} onChange={e => onChange(e.target.value)}
            style={{
                border: 'none', textAlign: 'right', fontSize: 16, width: 80,
                background: 'transparent', outline: 'none', color: '#007AFF',
            }} />
    );

    /* ── render ── */
    return (
        <div style={{
            minHeight: '100vh', background: '#F2F2F7',
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
        }}>
            {/* Blue header */}
            <div style={{
                background: '#007AFF', color: 'white', padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                position: 'sticky', top: 0, zIndex: 100,
            }}>
                <Link to="/dashcam" style={{ color: 'white', lineHeight: 0 }}>
                    <ArrowLeft size={24} />
                </Link>
                <h1 style={{ margin: 0, fontSize: 19, fontWeight: 600, flex: 1, textAlign: 'center' }}>
                    Pedestrian collision
                </h1>
                <button
                    onClick={handleSync}
                    disabled={loading || !selectedDevice}
                    title="Sync from device"
                    style={{
                        background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                        borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
                        fontSize: 20, lineHeight: 1,
                        opacity: (!selectedDevice || loading) ? 0.45 : 1,
                    }}
                >↻</button>
            </div>

            <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 48 }}>

                {/* Device picker */}
                <div style={{ padding: '20px 16px 12px' }}>
                    <select
                        value={selectedDevice}
                        onChange={e => setSelectedDevice(e.target.value)}
                        style={{
                            width: '100%', background: 'white', border: 'none',
                            padding: '13px 14px', borderRadius: 12, fontSize: 16,
                            outline: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                            color: selectedDevice ? '#000' : '#888',
                        }}
                    >
                        <option value="">Select a device…</option>
                        {devices.active.map(id =>
                            <option key={id} value={id}>📱 {id} (Online)</option>)}
                        {devices.historical.map(id =>
                            <option key={id} value={id}>📱 {id} (Offline)</option>)}
                    </select>
                </div>

                {/* Spinner while loading */}
                {loading && (
                    <div style={{ textAlign: 'center', padding: '48px 0', color: '#999', fontSize: 15 }}>
                        Loading settings…
                    </div>
                )}

                {/* Placeholder – no device chosen */}
                {!loading && !selectedDevice && (
                    <div style={{ textAlign: 'center', padding: '60px 24px', color: '#aaa' }}>
                        <div style={{ fontSize: 52, marginBottom: 16 }}>📡</div>
                        <p style={{ fontSize: 16, margin: 0 }}>
                            Select a device above to load its current settings.
                        </p>
                    </div>
                )}

                {/* Settings – only rendered after adasForm is populated */}
                {!loading && adasForm && (
                    <>
                        <div style={{
                            borderRadius: 13, overflow: 'hidden',
                            margin: '0 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        }}>
                            <Row label="Enable">
                                <Toggle value={adasForm.enable}
                                    onChange={v => setAdasForm({ ...adasForm, enable: v })} />
                            </Row>

                            <Row label="GNSS Speed (km/h)">
                                <NumInput value={adasForm.gnssSpeed}
                                    onChange={v => setAdasForm({ ...adasForm, gnssSpeed: v })} />
                            </Row>

                            <Row label="Classification">
                                <NumInput value={adasForm.classification}
                                    onChange={v => setAdasForm({ ...adasForm, classification: v })} />
                            </Row>

                            <Row label="interval (s)">
                                <NumInput value={adasForm.interval}
                                    onChange={v => setAdasForm({ ...adasForm, interval: v })} />
                            </Row>

                            <Row label="audio frequency">
                                <Toggle value={adasForm.audioFrequency}
                                    onChange={v => setAdasForm({ ...adasForm, audioFrequency: v })} />
                            </Row>

                            <Row label="Sense (0~30s)">
                                <NumInput value={adasForm.sense}
                                    onChange={v => setAdasForm({ ...adasForm, sense: v })} />
                            </Row>

                            <Row label="Record">
                                <Toggle value={adasForm.record}
                                    onChange={v => setAdasForm({ ...adasForm, record: v })} />
                            </Row>

                            {/* Record Lock Chn */}
                            <div style={{ padding: '13px 16px', background: 'white', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 16, fontWeight: 500 }}>Record Lock Chn</span>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <Checkbox checked={adasForm.recordLockChn[0]} onChange={() => toggleChn('recordLockChn', 0)} label="CH1" />
                                        <Checkbox checked={adasForm.recordLockChn[1]} onChange={() => toggleChn('recordLockChn', 1)} label="CH2" />
                                    </div>
                                </div>
                            </div>

                            {/* Record Upload Chn */}
                            <div style={{ padding: '13px 16px', background: 'white', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 16, fontWeight: 500 }}>Record Upload Chn</span>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <Checkbox checked={adasForm.recordUploadChn[0]} onChange={() => toggleChn('recordUploadChn', 0)} label="CH1" />
                                        <Checkbox checked={adasForm.recordUploadChn[1]} onChange={() => toggleChn('recordUploadChn', 1)} label="CH2" />
                                    </div>
                                </div>
                            </div>

                            {/* Alarm Output */}
                            <div style={{ padding: '13px 16px', background: 'white', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 16, fontWeight: 500 }}>Alarm Output</span>
                                    <Checkbox checked={adasForm.alarmOutput[0]} onChange={() => toggleChn('alarmOutput', 0)} label="IO1" />
                                </div>
                            </div>

                            {/* Snap Chn */}
                            <div style={{ padding: '13px 16px', background: 'white', borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: 16, fontWeight: 500 }}>Snap Chn</span>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <Checkbox checked={adasForm.snapChn[0]} onChange={() => toggleChn('snapChn', 0)} label="CH1" />
                                        <Checkbox checked={adasForm.snapChn[1]} onChange={() => toggleChn('snapChn', 1)} label="CH2" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Save button */}
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            style={{
                                margin: '28px 16px', width: 'calc(100% - 32px)',
                                background: '#007AFF', color: 'white', border: 'none',
                                padding: 16, borderRadius: 13, fontSize: 17,
                                fontWeight: 600, cursor: 'pointer',
                                opacity: loading ? 0.6 : 1, transition: 'opacity .2s',
                            }}
                        >
                            {loading ? 'Saving…' : 'Save Settings'}
                        </button>
                    </>
                )}
            </div>

            {/* Toast notification */}
            {notification && (
                <div style={{
                    position: 'fixed', bottom: 20, left: 20, right: 20,
                    background: notification.type === 'error' ? '#FF3B30'
                        : notification.type === 'info' ? '#5856D6' : '#34C759',
                    color: 'white', padding: '12px 16px', borderRadius: 12,
                    display: 'flex', alignItems: 'center', gap: 10,
                    zIndex: 1000, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                }}>
                    {notification.type === 'error'
                        ? <AlertCircle size={20} />
                        : <CheckCircle2 size={20} />}
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{notification.message}</span>
                </div>
            )}
        </div>
    );
}
