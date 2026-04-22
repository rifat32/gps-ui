import { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    CheckCircle2, 
    AlertCircle, 
    Settings, 
    Video, 
    Network, 
    Bell, 
    Cpu, 
    Save, 
    RefreshCw,
    Clock,
    Zap,
    Wifi,
    HardDrive,
    Monitor,
    Globe,
    Compass,
    Database,
    Shield,
    Activity,
    Thermometer,
    ZapOff,
    Layout,
    LayoutGrid,
    Smartphone,
    Gauge,
    MapPin,
    Wrench,
    RotateCw,
    RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import deviceApi from '../services/deviceApi';

export default function VideoSettings({ theme }) {
    const [selectedDevice, setSelectedDevice] = useState('');
    const [devices, setDevices] = useState({ active: [], historical: [] });
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [showAiModal, setShowAiModal] = useState(false);
    const [lastSynced, setLastSynced] = useState(null);
    const [configEvent, setConfigEvent] = useState(null); // { type: 'adas'|'dms', key: 'fcw'|'fatigue'..., label: '...' }
    
    // Extraction (Read-only) Data State
    const [telemetry, setTelemetry] = useState({
        system: null,
        network: null,
        disk: null,
        satellite: null
    });

    // Master Config (Read-write) Form State
    const [form, setForm] = useState({
        system: {
            powerMode: 'ACC',
            autoReboot: false,
            lowPowerOff: false,
            powerOffVoltage: 11.5,
            delayOff: 1,
            recordChannelMask: 3,
            ntpAddr: 'pool.ntp.org',
            ntpPort: 123,
            timezone: 0,
            dateType: 0,
            dstMode: false
        },
        video: {
            encodeType: 'H264',
            recordMode: 0,
            mainStream: {
                CH1: { enable: true, audio: true, resolution: 6, framerate: 25, quality: 5 },
                CH2: { enable: true, audio: true, resolution: 6, framerate: 25, quality: 5 }
            },
            subStream: {
                CH1: { resolution: 1, framerate: 15, quality: 5 },
                CH2: { resolution: 1, framerate: 15, quality: 5 }
            },
            timedRecord: {
                Day0: { startH: 0, startM: 0, endH: 23, endM: 59 },
                Day1: { startH: 0, startM: 0, endH: 23, endM: 59 },
                Day2: { startH: 0, startM: 0, endH: 23, endM: 59 },
                Day3: { startH: 0, startM: 0, endH: 23, endM: 59 },
                Day4: { startH: 0, startM: 0, endH: 23, endM: 59 },
                Day5: { startH: 0, startM: 0, endH: 23, endM: 59 },
                Day6: { startH: 0, startM: 0, endH: 23, endM: 59 },
            },
            osd: {
                alpha: 60,
                regions: {
                    1: { enable: true, date: true, plate: true, x: 10, y: 10 }
                }
            }
        },
        network: {
            protocol: 'JT808-2011',
            serverIp: '',
            serverPort: '',
            ftpAddr: '',
            apn: 'internet',
            wifiAuth: 1,
            wifiWorkMode: 1,
            peripheral: {
                baudRate: 9600,
                dataBits: 8,
                parity: 0
            }
        },
        alarms: {
            speed: {
                maxSpeed: 80,
                duration: 5,
                pulse: 4500,
                unit: 0, // 0:km/h, 1:mph
                otPark: { enable: false, limit: 0, delay: 0, wait: 0, record: false, recordChannels: [], uploadChannels: [], alarmOutput: [], snapChannels: [] },
                lowSpeedWarn: { enable: false, limit: 0, delay: 0, wait: 0, record: false, recordChannels: [], uploadChannels: [], alarmOutput: [], snapChannels: [] },
                lowSpeedAlarm: { enable: false, limit: 0, delay: 0, wait: 0, record: false, recordChannels: [], uploadChannels: [], alarmOutput: [], snapChannels: [] },
            },
            position: {
                route: { enable: false, limit: 0, delay: 0, wait: 0, record: false, recordChannels: [], uploadChannels: [], alarmOutput: [], snapChannels: [] },
                geofence: { enable: false, limit: 0, delay: 0, wait: 0, record: false, recordChannels: [], uploadChannels: [], alarmOutput: [], snapChannels: [] },
                offline: { enable: false, limit: 0, delay: 0, wait: 0, record: false, recordChannels: [], uploadChannels: [], alarmOutput: [], snapChannels: [] },
                fatigue: { enable: false, limit: 0, delay: 0, wait: 0, record: false, recordChannels: [], uploadChannels: [], alarmOutput: [], snapChannels: [] },
                overtime: { enable: false, limit: 0, delay: 0, wait: 0, record: false, recordChannels: [], uploadChannels: [], alarmOutput: [], snapChannels: [] },
            },
            sensors: {
                gSensor: { rapidAccel: 50, emergencyBrake: 50, sharpTurn: 50, crash: 100, rollover: 45 },
                voltage: { enable: false, limit: 11.5 }
            },
            io: {
                in1: { enable: false, type: 'Panic', level: 'Low', delay: 0, wait: 0, record: false, recordChannels: [], uploadChannels: [], alarmOutput: [], snapChannels: [] }
            }
        },
        ai: {
            adas: {
                fcw: null,
                ldw: null,
                pedestrian: null,
                volume: 5
            },
            dms: {
                fatigue: null,
                phone: null,
                smoking: null,
                distraction: null
            }
        }
    });

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    const fetchDevices = async () => {
        try {
            const res = await deviceApi.checkStatus();
            if (res.success) {
                const active = Object.keys(res.activeConnections || []);
                const lastSeen = Object.keys(res.lastSeenDevices || []);
                const historical = lastSeen.filter(id => !active.includes(id));
                setDevices({ active, historical });
            }
        } catch (err) {
            console.error('Status check failed', err);
        }
    };

    const fetchTelemetryData = async (deviceId) => {
        if (!deviceId) return;
        const categories = [
            { key: 'system', api: 'system-status' },
            { key: 'network', api: 'network-status' },
            { key: 'disk', api: 'disk-status' },
            { key: 'satellite', api: 'satellite-status' }
        ];

        categories.forEach(async (cat) => {
            try {
                const res = await deviceApi.getTelemetry(deviceId, cat.api);
                if (res.success) {
                    setTelemetry(prev => ({ ...prev, [cat.key]: res.data }));
                }
            } catch (err) {
                console.error(`Failed to fetch ${cat.key} telemetry`, err);
            }
        });
    };

    const _decodeLinkage = (bits) => {
        if (!bits && bits !== 0) return {};
        const res = {
            enable: !!(bits & 0x01),
            record: !!(bits & 0x02),
            snap: !!(bits & 0x04),
            audio: !!(bits & 0x08),
            recordChannels: [],
            snapChannels: [],
            uploadChannels: []
        };
        // Standard JT/T 1078 Linkage Masks
        if (bits & 0x0100) res.recordChannels.push(1);
        if (bits & 0x0200) res.recordChannels.push(2);
        if (bits & 0x0400) res.recordChannels.push(3);
        if (bits & 0x0800) res.recordChannels.push(4);
        
        if (bits & 0x1000) res.snapChannels.push(1);
        if (bits & 0x2000) res.snapChannels.push(2);
        if (bits & 0x4000) res.snapChannels.push(3);
        if (bits & 0x8000) res.snapChannels.push(4);
        
        return res;
    };

    const fetchSettings = async (deviceId) => {
        if (!deviceId) return;
        setLoading(true);
        try {
            const res = await deviceApi.getSettings(deviceId);
            if (res.success && res.data) {
                const s = res.data;
                const newForm = { ...form };

                // System (0x0000007C = Power Manage)
                if (s['0x0000007c']) {
                    const pm = s['0x0000007c'];
                    newForm.system.powerMode = pm.powerMode === 1 ? 'ACC' : 'CONSTANT';
                    newForm.system.autoReboot = !!pm.autoReboot;
                    newForm.system.lowPowerOff = !!pm.lowPowerOff;
                    newForm.system.powerOffVoltage = pm.powerOffVoltage || 11.5;
                    newForm.system.delayOff = pm.delayOff || 1;
                }

                // Clock (0x000000A0, 0x000000A2, etc)
                if (s['0x000000a0']) newForm.system.ntpAddr = s['0x000000a0'];
                if (s['0x000000a2']) newForm.system.timezone = s['0x000000a2'];

                // Video (0x00000074 = Encode Type, 0x00000075 = Main Stream)
                if (s['0x00000074']) newForm.video.encodeType = s['0x00000074'] === 1 ? 'H265' : 'H264';
                if (s['0x00000075']) {
                    const av = s['0x00000075'];
                    newForm.video.recordMode = av.storageEncodingMode || 0;
                    if (av.channels) newForm.video.mainStream = { ...newForm.video.mainStream, ...av.channels };
                }

                // Network (0x00000019 = Protocol, 0x0000001A = APN)
                if (s['0x00000019']) newForm.network.protocol = s['0x00000019'] === 1 ? 'JT808-2019' : 'JT808-2011';
                if (s['0x0000001a']) newForm.network.apn = s['0x0000001a'];
                if (s['0x0000001b']) newForm.network.ftpAddr = s['0x0000001b'];

                // AI (0x0000F364 = ADAS, 0x0000F365 = DMS)
                if (s['0x0000f364']) {
                    const adas = s['0x0000f364'];
                    newForm.ai.adas.volume = adas.volume;
                    newForm.ai.adas.fcw = { 
                        ..._decodeLinkage(adas.fcwLinkage), 
                        sensitivity: adas.fcwSensitivity, 
                        timeThreshold: adas.fcwTtc, 
                        speedThreshold: adas.speedThreshold, 
                        interval: adas.alarmInterval 
                    };
                    newForm.ai.adas.ldw = { 
                        ..._decodeLinkage(adas.ldwLinkage), 
                        sensitivity: adas.ldwSensitivity, 
                        speedThreshold: adas.ldwSpeed, 
                        interval: adas.alarmInterval 
                    };
                }

                if (s['0x0000f365']) {
                    const dms = s['0x0000f365'];
                    newForm.ai.dms.fatigue = { 
                        ..._decodeLinkage(dms.fatigueLinkage), 
                        threshold: dms.fatigueThreshold, 
                        sensitivity: dms.fatigueSensitivity, 
                        interval: 20 
                    };
                    newForm.ai.dms.phone = { 
                        ..._decodeLinkage(dms.phoneLinkage), 
                        sensitivity: dms.phoneSensitivity, 
                        interval: 20 
                    };
                    newForm.ai.dms.smoking = { 
                        ..._decodeLinkage(dms.smokingLinkage), 
                        sensitivity: dms.smokingSensitivity, 
                        interval: 20 
                    };
                    newForm.ai.dms.distraction = { 
                        ..._decodeLinkage(dms.distractionLinkage), 
                        timeThreshold: dms.distractionTime, 
                        sensitivity: dms.distractionSensitivity, 
                        interval: 20 
                    };
                }

                // Speed (Hex IDs from param-registry.js)
                if (s['0x00000055']) newForm.alarms.speed.maxSpeed = s['0x00000055'];
                if (s['0x00000056']) newForm.alarms.speed.duration = s['0x00000056'];
                if (s['0x00000051']) newForm.alarms.speed.pulse = s['0x00000051'];
                if (s['0x00000054']) newForm.alarms.speed.unit = s['0x00000054'];
                
                ['otPark', 'lowSpeedWarn', 'lowSpeedAlarm'].forEach(key => {
                    const id = key === 'otPark' ? '0x0000005a' : (key === 'lowSpeedWarn' ? '0x0000005d' : '0x0000005e');
                    if (s[id]) {
                        const val = s[id];
                        newForm.alarms.speed[key] = {
                            ...newForm.alarms.speed[key],
                            limit: val.limit,
                            delay: val.delay,
                            wait: val.wait,
                            ..._decodeLinkage(val.linkage)
                        };
                    }
                });

                // Position (Hex IDs from param-registry.js)
                ['fatigue', 'route', 'geofence', 'overtime', 'offline'].forEach(key => {
                    const id = `0x0000005${key === 'fatigue' ? '7' : (key === 'route' ? '8' : (key === 'geofence' ? '9' : (key === 'overtime' ? 'b' : 'c')))}`;
                    if (s[id]) {
                        const val = s[id];
                        newForm.alarms.position[key] = {
                            ...newForm.alarms.position[key],
                            limit: val.limit,
                            delay: val.delay,
                            wait: val.wait,
                            ..._decodeLinkage(val.linkage)
                        };
                    }
                });

                setForm(newForm);
                setLastSynced(new Date().toLocaleTimeString());
                showNotification(`Configuration synchronized for terminal ${deviceId}`);
            } else if (!res.success && res.error === 'Cache empty') {
                showNotification(res.message, 'info');
            }
        } catch (err) {
            showNotification(err.message || 'Failed to load settings from server', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleToolAction = async (action) => {
        if (!selectedDevice) return;
        if (!window.confirm(`Are you sure you want to execute ${action}? This may disrupt service.`)) return;
        
        setLoading(true);
        try {
            let commandType = '';
            let parameters = {};

            switch (action) {
                case 'REBOOT':
                    commandType = 'TERMINAL_CONTROL';
                    parameters = { command: 3 }; // 3 = Reboot
                    break;
                case 'FORMAT_SD':
                    commandType = 'TERMINAL_CONTROL';
                    parameters = { command: 5 }; // 5 = Format
                    break;
                case 'FACTORY_RESET':
                    commandType = 'TERMINAL_CONTROL';
                    parameters = { command: 4 }; // 4 = Reset
                    break;
            }

            await deviceApi.sendCommand({ deviceId: selectedDevice, commandType, parameters });
            showNotification(`System command ${action} successfully dispatched.`);
        } catch (err) {
            showNotification(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!selectedDevice) return;
        setLoading(true);
        try {
            // 1. Clear current AI state to force "Waiting for data" if sync fails
            setForm(prev => ({
                ...prev,
                ai: {
                    adas: { fcw: null, ldw: null, pedestrian: null, volume: null },
                    dms: { fatigue: null, phone: null, smoking: null, distraction: null }
                }
            }));

            // 2. Dispatch deep query command (0x8104)
            await deviceApi.queryParams(selectedDevice, []); 
            showNotification('Query command dispatched. Reconciling hardware stack...', 'info');
            
            // 3. Wait for device to respond and refresh cache
            setTimeout(async () => {
                await fetchSettings(selectedDevice);
                await fetchTelemetryData(selectedDevice);
                showNotification('Hardware reconciliation complete. Latest values synced.', 'success');
                setLoading(false);
            }, 6000);
        } catch (err) {
            showNotification(`Sync failed: ${err.message}`, 'error');
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedDevice) return;
        setLoading(true);
        try {
            let category = '';
            let payload = {};

            switch (activeTab) {
                case 'System':
                    category = 'batch';
                    payload['System Manage'] = {
                        'Power Manage': {
                            PowerMode: form.system.powerMode,
                            AutoReboot: form.system.autoReboot,
                            LowPowerOff: form.system.lowPowerOff,
                            PowerOffVoltage: form.system.powerOffVoltage,
                            DelayOff: form.system.delayOff
                        },
                        'System Clock': {
                            NTPAddr: form.system.ntpAddr,
                            TimezoneOffset: form.system.timezone
                        }
                    };
                    break;
                case 'Recording':
                    category = 'batch';
                    payload['Record Settings'] = {
                        'Encode Type': { EncodeType: form.video.encodeType },
                        'Main Stream': { recordMode: form.video.recordMode, channels: form.video.mainStream }
                    };
                    break;
                case 'Network':
                    category = 'batch';
                    payload['Network Settings'] = {
                        'Center Server': { Protocol: form.network.protocol, APN: form.network.apn }
                    };
                    break;
                case 'Alarms':
                    category = 'batch';
                    payload['Alarm Settings'] = {
                        'Speed': form.alarms.speed,
                        'Position': form.alarms.position
                    };
                    break;
                case 'AI Safety':
                    category = 'batch'; 
                    payload['Alarm Settings'] = {
                        AI: {
                            adas: form.ai.adas,
                            dsm: form.ai.dms
                        }
                    };
                    break;
            }

            if (category === 'batch') {
                await deviceApi.updateSettingsBatch(selectedDevice, payload);
            } else {
                await deviceApi.setParams(selectedDevice, category, payload);
            }
            showNotification('Settings queued for terminal reconciliation.');
        } catch (err) {
            showNotification(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDevices(); }, []);
    useEffect(() => {
        if (selectedDevice) {
            fetchSettings(selectedDevice);
            fetchTelemetryData(selectedDevice);
        }
    }, [selectedDevice]);

    const categories = [
        { id: 'Dashboard', icon: LayoutGrid },
        { id: 'Network', icon: Globe },
        { id: 'Recording', icon: Video },
        { id: 'Alarms', icon: Shield },
        { id: 'AI Safety', icon: Cpu },
        { id: 'System', icon: Settings }
    ];

    const currentTab = categories.find(t => t.id === activeTab);

    // --- Styled Components ---
    const GlassCard = ({ title, children, icon: Icon, badge }) => (
        <div className="glass-card animate-fade-in">
            <div className="glass-card-header">
                <div className="title-area">
                    {Icon && <Icon size={20} className="icon-vibrant" />}
                    <h3>{title}</h3>
                </div>
                {badge && <span className={`badge ${badge.type}`}>{badge.text}</span>}
            </div>
            <div className="glass-card-body">
                {children}
            </div>
        </div>
    );

    const InfoRow = ({ label, value, subValue, icon: Icon, trend }) => (
        <div className="info-row">
            <div className="info-label">
                {Icon && <Icon size={16} className="row-icon" />}
                <span>{label}</span>
            </div>
            <div className="info-value-area">
                <span className="value-main">{value || '--'}</span>
                {subValue && <span className="value-sub">{subValue}</span>}
                {trend && <span className={`trend ${trend}`}>{trend === 'up' ? '↑' : '↓'}</span>}
            </div>
        </div>
    );

    const ControlRow = ({ label, children, description, icon: Icon }) => (
        <div className="control-row">
            <div className="control-info">
                <div className="label-with-icon">
                    {Icon && <Icon size={16} className="row-icon" />}
                    <span>{label}</span>
                </div>
                {description && <p className="description">{description}</p>}
            </div>
            <div className="control-action">{children}</div>
        </div>
    );

    const Toggle = ({ value, onChange }) => (
        <button onClick={() => onChange(!value)} className={`ios-toggle ${value ? 'active' : ''}`}>
            <div className="toggle-knob" />
        </button>
    );

    const AiEventModal = () => {
        if (!configEvent) return null;
        const category = configEvent.type; // 'adas', 'dms', 'speed', 'position', or 'io'
        const eventKey = configEvent.key;
        const data = category === 'speed' || category === 'position' || category === 'io' 
            ? form.alarms[category][eventKey] 
            : form.ai[category][eventKey];

        const updateData = (updates) => {
            if (category === 'speed' || category === 'position' || category === 'io') {
                setForm({
                    ...form,
                    alarms: {
                        ...form.alarms,
                        [category]: {
                            ...form.alarms[category],
                            [eventKey]: { ...data, ...updates }
                        }
                    }
                });
            } else {
                setForm({
                    ...form,
                    ai: {
                        ...form.ai,
                        [category]: {
                            ...form.ai[category],
                            [eventKey]: { ...data, ...updates }
                        }
                    }
                });
            }
        };

        const toggleChannel = (type, ch) => {
            const current = data[type] || [];
            const next = current.includes(ch) ? current.filter(c => c !== ch) : [...current, ch];
            updateData({ [type]: next });
        };

        return (
            <div className="modal-overlay animate-fade-in" onClick={() => setShowAiModal(false)}>
                <div className="premium-modal animate-slide-up" onClick={e => e.stopPropagation()}>
                    <header className="modal-header">
                        <div className="header-info">
                            <Shield className="icon-vibrant" size={24} />
                            <h2>{configEvent.label} Configuration</h2>
                        </div>
                        <button className="close-btn" onClick={() => setShowAiModal(false)}>×</button>
                    </header>
                    
                    <div className="modal-body">
                        {!data ? (
                            <div className="p-12 text-center">
                                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                <p className="text-gray-400">Waiting for data from camera...</p>
                                <p className="text-xs text-gray-500 mt-2">Sync settings to fetch real-time values.</p>
                            </div>
                        ) : (
                            <>
                                <section className="modal-section">
                                    <h4>Basic Configuration</h4>
                                    <ControlRow label="Enable" description="Master switch for this alert">
                                        <Toggle value={data.enable} onChange={v => updateData({ enable: v })} />
                                    </ControlRow>
                                    <ControlRow label="GNSS Speed(km/h)" description="Min speed for alert">
                                        <input type="number" value={data.speedThreshold || ''} placeholder="30" onChange={e => updateData({ speedThreshold: parseInt(e.target.value) || 0 })} className="form-input" />
                                    </ControlRow>
                                    <ControlRow label="Classification" description="Sensitivity level">
                                        <input type="number" value={data.sensitivity || ''} placeholder="0" onChange={e => updateData({ sensitivity: parseInt(e.target.value) || 0 })} className="form-input" />
                                    </ControlRow>
                                    <ControlRow label="interval(s)" description="Cooldown between alerts">
                                        <input type="number" value={data.interval || ''} placeholder="20" onChange={e => updateData({ interval: parseInt(e.target.value) || 0 })} className="form-input" />
                                    </ControlRow>
                                    <ControlRow label="audio frequency" description="Voice prompt toggle">
                                        <Toggle value={data.audio} onChange={v => updateData({ audio: v })} />
                                    </ControlRow>
                                    <ControlRow label="Sense(0~30s)" description="Detection sensitivity (TTC)">
                                        <input type="number" step="0.1" value={data.timeThreshold || ''} placeholder="5" onChange={e => updateData({ timeThreshold: parseFloat(e.target.value) || 0 })} className="form-input" />
                                    </ControlRow>
                                </section>

                                <section className="modal-section">
                                    <h4>Event Linkage</h4>
                                    <ControlRow label="Record" description="Lock video on event">
                                        <Toggle value={data.record} onChange={v => updateData({ record: v })} />
                                    </ControlRow>
                                    
                                    <div className="sub-linkage-grid">
                                        <div className="linkage-item">
                                            <label>Record Lock Chn</label>
                                            <div className="flex gap-2 mt-1">
                                                {[1, 2, 3, 4].map(ch => (
                                                    <button key={ch} onClick={() => toggleChannel('recordChannels', ch)} className={`ch-pill ${data.recordChannels?.includes(ch) ? 'active' : ''}`}>CH{ch}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="linkage-item">
                                            <label>Record Upload Chn</label>
                                            <div className="flex gap-2 mt-1">
                                                {[1, 2, 3, 4].map(ch => (
                                                    <button key={ch} onClick={() => toggleChannel('uploadChannels', ch)} className={`ch-pill ${data.uploadChannels?.includes(ch) ? 'active' : ''}`}>CH{ch}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="linkage-item mt-4">
                                            <label>Alarm Output</label>
                                            <div className="flex gap-2 mt-1">
                                                {[1, 2].map(io => (
                                                    <button key={io} onClick={() => toggleChannel('alarmOutput', io)} className={`ch-pill ${data.alarmOutput?.includes(io) ? 'active' : ''}`}>IO{io}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="linkage-item mt-4">
                                            <label>Snap Chn</label>
                                            <div className="flex gap-2 mt-1">
                                                {[1, 2, 3, 4].map(ch => (
                                                    <button key={ch} onClick={() => toggleChannel('snapChannels', ch)} className={`ch-pill ${data.snapChannels?.includes(ch) ? 'active' : ''}`}>CH{ch}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </>
                        )}
                    </div>

                    <footer className="modal-footer">
                        <button className="done-btn" onClick={() => setShowAiModal(false)}>Done</button>
                    </footer>
                </div>
            </div>
        );
    };

    return (
        <div className="terminal-config-container animate-fade-in">
            {/* Premium Header */}
            <header className="terminal-header glass-header">
                <div className="header-top">
                    <Link to="/dashcam" className="back-link">
                        <ArrowLeft size={20} />
                        <span>Back</span>
                    </Link>
                    <div className="header-title">
                        <h1>Terminal Config</h1>
                        <p className="subtitle">
                            {lastSynced ? `Hardware Reconciliation Active • Last Sync: ${lastSynced}` : 'Hardware Reconciliation & Diagnostics'}
                        </p>
                    </div>
                    <button onClick={handleSync} disabled={loading || !selectedDevice} className="sync-btn">
                        <RefreshCw size={22} className={loading ? 'spin' : ''} />
                    </button>
                </div>

                <nav className="tab-navigator">
                    {categories.map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id)} 
                            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                        >
                            <tab.icon size={18} />
                            <span>{tab.id}</span>
                        </button>
                    ))}
                </nav>
            </header>

            <main className="terminal-main-layout">
                <aside className="config-sidebar">
                    {categories.map(cat => (
                        <button 
                            key={cat.id} 
                            onClick={() => setActiveTab(cat.id)} 
                            className={`sidebar-tab ${activeTab === cat.id ? 'active' : ''}`}
                        >
                            <cat.icon size={20} />
                            <span>{cat.id}</span>
                        </button>
                    ))}
                </aside>

                <div className="config-content">
                    <div className="config-layout">
                        {/* Target Device Selection */}
                        <GlassCard title="Target Hardware" icon={Cpu}>
                            <div className="selector-wrapper">
                                <select
                                    value={selectedDevice}
                                    onChange={e => setSelectedDevice(e.target.value)}
                                    className="premium-select"
                                >
                                    <option value="">Identify hardware asset...</option>
                                    <optgroup label="Live Connections">
                                        {devices.active.map(id => <option key={id} value={id}>🟢 {id} (Active Terminal)</option>)}
                                    </optgroup>
                                    <optgroup label="Historical Index">
                                        {devices.historical.map(id => <option key={id} value={id}>⚪ {id} (Stored Offline)</option>)}
                                    </optgroup>
                                </select>
                            </div>
                        </GlassCard>

                        {selectedDevice ? (
                            <div className="tab-content-area">
                                {/* 1. DASHBOARD */}
                                {activeTab === 'Dashboard' && (
                                    <div className="dashboard-grid">
                                        {categories.filter(c => c.id !== 'Dashboard').map(cat => (
                                            <div key={cat.id} className="dashboard-tile" onClick={() => setActiveTab(cat.id)}>
                                                <div className="tile-icon-bg">
                                                    <cat.icon size={32} className="icon-vibrant" />
                                                </div>
                                                <div className="tile-info">
                                                    <h4>{cat.id}</h4>
                                                    <p>Manage {cat.id.toLowerCase()} parameters</p>
                                                </div>
                                                <div className="tile-status">
                                                    <div className="pulse-dot" />
                                                    <span>Ready</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 2. NETWORK */}
                                {activeTab === 'Network' && (
                                    <>
                                        <GlassCard title="Cellular Connectivity" icon={Globe}>
                                            <InfoRow label="Route Type" value={telemetry.network?.routeType} />
                                            <InfoRow label="Signal Strength" value={`${telemetry.network?.signal}/31`} />
                                            <InfoRow label="SIM Status" value={telemetry.network?.simStatus} />
                                            <InfoRow label="Dial Status" value={telemetry.network?.dialStatus} />
                                            <InfoRow label="Assigned IP" value={telemetry.network?.dialIp} />
                                        </GlassCard>
                                        <GlassCard title="WiFi Interface" icon={Wifi}>
                                            <InfoRow label="WiFi Module" value={telemetry.network?.wifi?.module} />
                                            <InfoRow label="SSID" value={telemetry.network?.wifi?.ssid} />
                                            <InfoRow label="Local IP" value={telemetry.network?.wifi?.ip} />
                                        </GlassCard>
                                        <GlassCard title="Transmission Config" icon={Wifi}>
                                            <ControlRow label="Protocol">
                                                <select 
                                                    value={form.network.protocol} 
                                                    onChange={e => setForm({...form, network: {...form.network, protocol: e.target.value}})}
                                                    className="form-select"
                                                >
                                                    <option value="JT808-2011">JT/T 808-2011</option>
                                                    <option value="JT808-2019">JT/T 808-2019</option>
                                                </select>
                                            </ControlRow>
                                            <ControlRow label="APN (Carrier)">
                                                <input 
                                                    value={form.network.apn} 
                                                    onChange={e => setForm({...form, network: {...form.network, apn: e.target.value}})}
                                                    className="form-input wide"
                                                />
                                            </ControlRow>
                                        </GlassCard>
                                        <GlassCard title="Peripheral Port (COM1)" icon={Cpu}>
                                            <ControlRow label="Baud Rate">
                                                <select value={form.network.peripheral.baudRate} onChange={e => setForm({...form, network: {...form.network, peripheral: {...form.network.peripheral, baudRate: parseInt(e.target.value)}}})} className="form-select">
                                                    <option value={9600}>9600</option>
                                                    <option value={115200}>115200</option>
                                                </select>
                                            </ControlRow>
                                            <ControlRow label="Data Bits">
                                                <select value={form.network.peripheral.dataBits} onChange={e => setForm({...form, network: {...form.network, peripheral: {...form.network.peripheral, dataBits: parseInt(e.target.value)}}})} className="form-select">
                                                    <option value={8}>8 Bits</option>
                                                    <option value={7}>7 Bits</option>
                                                </select>
                                            </ControlRow>
                                        </GlassCard>
                                    </>
                                )}

                                {/* 3. RECORDING */}
                                {activeTab === 'Recording' && (
                                    <>
                                        <GlassCard title="Encoding Logic" icon={Monitor}>
                                            <ControlRow label="Codec Protocol">
                                                <select 
                                                    value={form.video.encodeType} 
                                                    onChange={e => setForm({...form, video: {...form.video, encodeType: e.target.value}})}
                                                    className="form-select"
                                                >
                                                    <option value="H264">H.264 (Standard)</option>
                                                    <option value="H265">H.265 (HEVC)</option>
                                                </select>
                                            </ControlRow>
                                            <ControlRow label="Record Mode">
                                                <select 
                                                    value={form.video.recordMode} 
                                                    onChange={e => setForm({...form, video: {...form.video, recordMode: parseInt(e.target.value)}})}
                                                    className="form-select"
                                                >
                                                    <option value={0}>Automatic (ACC)</option>
                                                    <option value={1}>Timed Schedule</option>
                                                    <option value={2}>Alarm Triggered</option>
                                                </select>
                                            </ControlRow>
                                        </GlassCard>
                                        <GlassCard title="Stream Parameters" icon={Video}>
                                            <div className="stream-group">
                                                <header>CH1 - Road Facing</header>
                                                <ControlRow label="Enable Feed">
                                                    <Toggle 
                                                        value={form.video.mainStream.CH1.enable} 
                                                        onChange={v => setForm({...form, video: {...form.video, mainStream: {...form.video.mainStream, CH1: {...form.video.mainStream.CH1, enable: v}}}})} 
                                                    />
                                                </ControlRow>
                                                <ControlRow label="Resolution">
                                                    <select 
                                                        value={form.video.mainStream.CH1.resolution}
                                                        onChange={e => setForm({...form, video: {...form.video, mainStream: {...form.video.mainStream, CH1: {...form.video.mainStream.CH1, resolution: parseInt(e.target.value)}}}})}
                                                        className="form-select"
                                                    >
                                                        <option value={6}>1080P</option>
                                                        <option value={5}>720P</option>
                                                        <option value={3}>D1</option>
                                                    </select>
                                                </ControlRow>
                                            </div>
                                        </GlassCard>
                                        <GlassCard title="OSD Overlay" icon={Layout}>
                                            <ControlRow label="Text Transparency">
                                                <input type="range" min="0" max="255" value={form.video.osd.alpha} onChange={e => setForm({...form, video: {...form.video, osd: {...form.video.osd, alpha: parseInt(e.target.value)}}})} className="form-range" />
                                            </ControlRow>
                                            <ControlRow label="Date/Time Overlay">
                                                <Toggle value={form.video.osd.regions[1].date} onChange={v => setForm({...form, video: {...form.video, osd: {...form.video.osd, regions: { 1: { ...form.video.osd.regions[1], date: v }}} }})} />
                                            </ControlRow>
                                        </GlassCard>
                                        {form.video.recordMode === 1 && (
                                            <GlassCard title="Timed Record Schedule" icon={Clock}>
                                                <div className="schedule-list">
                                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                                                        <div key={day} className="schedule-item">
                                                            <span className="day-label">{day}</span>
                                                            <div className="time-inputs">
                                                                <input type="number" min="0" max="23" value={form.video.timedRecord[`Day${i}`].startH} onChange={e => setForm({...form, video: {...form.video, timedRecord: {...form.video.timedRecord, [`Day${i}`]: {...form.video.timedRecord[`Day${i}`], startH: parseInt(e.target.value)}}}})} className="time-field" />:
                                                                <input type="number" min="0" max="59" value={form.video.timedRecord[`Day${i}`].startM} onChange={e => setForm({...form, video: {...form.video, timedRecord: {...form.video.timedRecord, [`Day${i}`]: {...form.video.timedRecord[`Day${i}`], startM: parseInt(e.target.value)}}}})} className="time-field" />
                                                                <span className="mx-2">to</span>
                                                                <input type="number" min="0" max="23" value={form.video.timedRecord[`Day${i}`].endH} onChange={e => setForm({...form, video: {...form.video, timedRecord: {...form.video.timedRecord, [`Day${i}`]: {...form.video.timedRecord[`Day${i}`], endH: parseInt(e.target.value)}}}})} className="time-field" />:
                                                                <input type="number" min="0" max="59" value={form.video.timedRecord[`Day${i}`].endM} onChange={e => setForm({...form, video: {...form.video, timedRecord: {...form.video.timedRecord, [`Day${i}`]: {...form.video.timedRecord[`Day${i}`], endM: parseInt(e.target.value)}}}})} className="time-field" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </GlassCard>
                                        )}
                                    </>
                                )}

                                {/* 4. ALARMS */}
                                {activeTab === 'Alarms' && (
                                    <>
                                        <div className="sub-nav-tabs">
                                            {['Sensors', 'Speed', 'Position', 'IO'].map(st => (
                                                <button key={st} onClick={() => setConfigEvent({ subTab: st })} className={`sub-tab ${configEvent?.subTab === st ? 'active' : ''}`}>
                                                    {st}
                                                </button>
                                            ))}
                                        </div>

                                        {configEvent?.subTab === 'Sensors' && (
                                            <>
                                                <GlassCard title="G-Sensor Sensitivity" icon={Activity}>
                                                    <ControlRow label="Rapid Accel" description="Threshold for acceleration alerts">
                                                        <input type="number" value={form.alarms.sensors.gSensor.rapidAccel} onChange={e => setForm({...form, alarms: {...form.alarms, sensors: {...form.alarms.sensors, gSensor: {...form.alarms.sensors.gSensor, rapidAccel: parseInt(e.target.value)}}}})} className="form-input" />
                                                    </ControlRow>
                                                    <ControlRow label="Emergency Brake">
                                                        <input type="number" value={form.alarms.sensors.gSensor.emergencyBrake} onChange={e => setForm({...form, alarms: {...form.alarms, sensors: {...form.alarms.sensors, gSensor: {...form.alarms.sensors.gSensor, emergencyBrake: parseInt(e.target.value)}}}})} className="form-input" />
                                                    </ControlRow>
                                                    <ControlRow label="Crash Sensitivity">
                                                        <input type="number" value={form.alarms.sensors.gSensor.crash} onChange={e => setForm({...form, alarms: {...form.alarms, sensors: {...form.alarms.sensors, gSensor: {...form.alarms.sensors.gSensor, crash: parseInt(e.target.value)}}}})} className="form-input" />
                                                    </ControlRow>
                                                </GlassCard>
                                                <GlassCard title="Voltage Protection" icon={Zap}>
                                                    <ControlRow label="Low Voltage Enable">
                                                        <Toggle value={form.alarms.sensors.voltage.enable} onChange={v => setForm({...form, alarms: {...form.alarms, sensors: {...form.alarms.sensors, voltage: {...form.alarms.sensors.voltage, enable: v}}}})} />
                                                    </ControlRow>
                                                    <ControlRow label="Limit Voltage (V)">
                                                        <input type="number" step="0.1" value={form.alarms.sensors.voltage.limit} onChange={e => setForm({...form, alarms: {...form.alarms, sensors: {...form.alarms.sensors, voltage: {...form.alarms.sensors.voltage, limit: parseFloat(e.target.value)}}}})} className="form-input" />
                                                    </ControlRow>
                                                </GlassCard>
                                            </>
                                        )}

                                        {configEvent?.subTab === 'IO' && (
                                            <GlassCard title="Alarm Input 1 (IN1)" icon={Shield}>
                                                <ControlRow label="Enable Type">
                                                    <select value={form.alarms.io.in1.type} onChange={e => setForm({...form, alarms: {...form.alarms, io: {...form.alarms.io, in1: {...form.alarms.io.in1, type: e.target.value}}}})} className="form-select">
                                                        <option value="Panic">Panic Button</option>
                                                        <option value="Door">Door Sensor</option>
                                                    </select>
                                                </ControlRow>
                                                <ControlRow label="Logic Level">
                                                    <select value={form.alarms.io.in1.level} onChange={e => setForm({...form, alarms: {...form.alarms, io: {...form.alarms.io, in1: {...form.alarms.io.in1, level: e.target.value}}}})} className="form-select">
                                                        <option value="Low">Active Low</option>
                                                        <option value="High">Active High</option>
                                                    </select>
                                                </ControlRow>
                                                <div className="mt-4">
                                                    <button className="config-sub-btn wide" onClick={() => { setConfigEvent({ type: 'io', key: 'in1', label: 'IO Input 1' }); setShowAiModal(true); }}>
                                                        <Settings size={14} /> <span>Configure Linkage</span>
                                                    </button>
                                                </div>
                                            </GlassCard>
                                        )}



                                        {configEvent?.subTab === 'Speed' && (
                                            <>
                                                <GlassCard title="Standard Speed Rules" icon={Gauge}>
                                                    <ControlRow label="Max Speed (km/h)">
                                                        <input type="number" value={form.alarms.speed.maxSpeed} onChange={e => setForm({...form, alarms: {...form.alarms, speed: {...form.alarms.speed, maxSpeed: parseInt(e.target.value)}}})} className="form-input" />
                                                    </ControlRow>
                                                    <ControlRow label="Overspeed Duration (s)">
                                                        <input type="number" value={form.alarms.speed.duration} onChange={e => setForm({...form, alarms: {...form.alarms, speed: {...form.alarms.speed, duration: parseInt(e.target.value)}}})} className="form-input" />
                                                    </ControlRow>
                                                    <ControlRow label="Speed Unit">
                                                        <select value={form.alarms.speed.unit} onChange={e => setForm({...form, alarms: {...form.alarms, speed: {...form.alarms.speed, unit: parseInt(e.target.value)}}})} className="form-select">
                                                            <option value={0}>Kilometers (km/h)</option>
                                                            <option value={1}>Miles (mph)</option>
                                                            <option value={2}>Knots (kn)</option>
                                                        </select>
                                                    </ControlRow>
                                                </GlassCard>
                                                <GlassCard title="Specialized Speed Alarms" icon={Shield}>
                                                    <div className="alarm-sub-grid">
                                                        {['otPark', 'lowSpeedWarn', 'lowSpeedAlarm'].map(key => (
                                                            <div key={key} className="alarm-mini-card" onClick={() => { setConfigEvent({ type: 'speed', key, label: key.replace(/([A-Z])/g, ' $1').trim() }); setShowAiModal(true); }}>
                                                                <div className="mini-header">
                                                                    <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                                    <div className={`status-dot ${form.alarms.speed[key].enable ? 'active' : ''}`} />
                                                                </div>
                                                                <p>Threshold: {form.alarms.speed[key].limit || 0}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </GlassCard>
                                            </>
                                        )}

                                        {configEvent?.subTab === 'Position' && (
                                            <GlassCard title="Geofence & Routing Rules" icon={MapPin}>
                                                <div className="alarm-sub-grid">
                                                    {['route', 'geofence', 'offline', 'fatigue', 'overtime'].map(key => (
                                                        <div key={key} className="alarm-mini-card" onClick={() => { setConfigEvent({ type: 'position', key, label: key.charAt(0).toUpperCase() + key.slice(1) }); setShowAiModal(true); }}>
                                                            <div className="mini-header">
                                                                <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                                                                <div className={`status-dot ${form.alarms.position[key].enable ? 'active' : ''}`} />
                                                            </div>
                                                            <p>Status: {form.alarms.position[key].enable ? 'Active' : 'Disabled'}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </GlassCard>
                                        )}
                                    </>
                                )}

                                {/* 5. AI SAFETY */}
                                {activeTab === 'AI Safety' && (
                                    <>
                                        <GlassCard title="ADAS Thresholds" icon={Shield}>
                                            <ControlRow label="Forward Collision (0.1s)" description="Detection time for FCW alerts">
                                                <div className="input-with-config">
                                                    <input type="number" value={form.ai.adas.fcw?.timeThreshold || ''} placeholder="N/A" onChange={e => setForm({...form, ai: {...form.ai, adas: {...form.ai.adas, fcw: {...form.ai.adas.fcw, timeThreshold: parseInt(e.target.value)}}}})} className="form-input" />
                                                    <button className="config-sub-btn" onClick={() => { setConfigEvent({ type: 'adas', key: 'fcw', label: 'Forward Collision' }); setShowAiModal(true); }}>
                                                        <Settings size={14} />
                                                    </button>
                                                </div>
                                            </ControlRow>
                                            <ControlRow label="Lane Departure (km/h)" description="Min speed for LDW activation">
                                                <div className="input-with-config">
                                                    <input type="number" value={form.ai.adas.ldw?.speedThreshold || ''} placeholder="N/A" onChange={e => setForm({...form, ai: {...form.ai, adas: {...form.ai.adas, ldw: {...form.ai.adas.ldw, speedThreshold: parseInt(e.target.value)}}}})} className="form-input" />
                                                    <button className="config-sub-btn" onClick={() => { setConfigEvent({ type: 'adas', key: 'ldw', label: 'Lane Departure' }); setShowAiModal(true); }}>
                                                        <Settings size={14} />
                                                    </button>
                                                </div>
                                            </ControlRow>
                                        </GlassCard>
                                        <GlassCard title="DMS / DSM Thresholds" icon={Activity}>
                                            <ControlRow label="Fatigue Sensitivity" description="1-10 sensitivity for eye closing">
                                                <div className="input-with-config">
                                                    <input type="number" value={form.ai.dms.fatigue?.threshold || ''} placeholder="N/A" onChange={e => setForm({...form, ai: {...form.ai, dms: {...form.ai.dms, fatigue: {...form.ai.dms.fatigue, threshold: parseInt(e.target.value)}}}})} className="form-input" />
                                                    <button className="config-sub-btn" onClick={() => { setConfigEvent({ type: 'dms', key: 'fatigue', label: 'Fatigue Driving' }); setShowAiModal(true); }}>
                                                        <Settings size={14} />
                                                    </button>
                                                </div>
                                            </ControlRow>
                                        </GlassCard>
                                    </>
                                )}

                                {/* 6. SYSTEM */}
                                {activeTab === 'System' && (
                                    <>
                                        <GlassCard title="Hardware Identity" icon={Shield}>
                                            <InfoRow label="Dev ID" value={telemetry.system?.devId} />
                                            <InfoRow label="IMEI" value={telemetry.system?.imei} />
                                            <InfoRow label="APP Version" value={telemetry.system?.appVersion} />
                                            <InfoRow label="Plate No." value={telemetry.system?.plateNo} />
                                        </GlassCard>
                                        <GlassCard title="Live Metrics" icon={Activity}>
                                            <InfoRow label="System Voltage" value={telemetry.system?.sysVoltage} icon={Zap} />
                                            <InfoRow label="CPU Temperature" value={telemetry.system?.cpuTemp} icon={Thermometer} />
                                            <InfoRow label="ACC Status" value={telemetry.system?.accStatus} badge={{ type: telemetry.system?.accStatus === 'ON' ? 'success' : 'neutral', text: telemetry.system?.accStatus }} />
                                            <InfoRow label="Record Status" value={telemetry.system?.recordStatus?.summary} />
                                        </GlassCard>
                                        <GlassCard title="Power Management" icon={Zap}>
                                            <ControlRow label="Power Mode" description="Trigger logic for startup/shutdown">
                                                <select 
                                                    value={form.system.powerMode} 
                                                    onChange={e => setForm({...form, system: {...form.system, powerMode: e.target.value}})}
                                                    className="form-select"
                                                >
                                                    <option value="ACC">ACC Triggered</option>
                                                    <option value="CONSTANT">Constant Power</option>
                                                </select>
                                            </ControlRow>
                                            <ControlRow label="Auto Reboot">
                                                <Toggle value={form.system.autoReboot} onChange={v => setForm({...form, system: {...form.system, autoReboot: v}})} />
                                            </ControlRow>
                                        </GlassCard>
                                        <GlassCard title="System Clock" icon={Clock}>
                                            <ControlRow label="NTP Server">
                                                <input 
                                                    value={form.system.ntpAddr} 
                                                    onChange={e => setForm({...form, system: {...form.system, ntpAddr: e.target.value}})}
                                                    className="form-input wide"
                                                />
                                            </ControlRow>
                                        </GlassCard>
                                        <GlassCard title="Maintenance Tools" icon={Wrench}>
                                            <div className="tool-actions-grid">
                                                <button onClick={() => handleToolAction('REBOOT')} className="tool-btn danger">
                                                    <RotateCw size={18} />
                                                    <span>Reboot Terminal</span>
                                                </button>
                                                <button onClick={() => handleToolAction('FORMAT_SD')} className="tool-btn danger">
                                                    <HardDrive size={18} />
                                                    <span>Format Storage</span>
                                                </button>
                                                <button onClick={() => handleToolAction('FACTORY_RESET')} className="tool-btn warning">
                                                    <RotateCcw size={18} />
                                                    <span>Factory Reset</span>
                                                </button>
                                            </div>
                                        </GlassCard>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon-wrapper">
                                    <Activity size={48} />
                                </div>
                                <h2>Awaiting Hardware Connection</h2>
                                <p>Select a terminal from the active index to synchronize its configuration stack.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Reconciliation Toolbar */}
            {selectedDevice && currentTab.mode !== 'extract_only' && (
                <div className="reconcile-toolbar glass-footer animate-slide-up">
                    <div className="toolbar-content">
                        <div className="status-info">
                            <div className="pulse-indicator" />
                            <span>Terminal Reconciliation Ready</span>
                        </div>
                        <button onClick={handleSave} disabled={loading} className="primary-reconcile-btn">
                            {loading ? <RefreshCw size={20} className="spin" /> : <Save size={20} />}
                            <span>{loading ? 'Processing...' : 'Apply & Reconcile'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Premium Toast System */}
            {notification && (
                <div className={`premium-toast ${notification.type} animate-slide-down`}>
                    {notification.type === 'error' ? <ZapOff size={18} /> : <CheckCircle2 size={18} />}
                    <span>{notification.message}</span>
                </div>
            )}

            <style>{`
                .terminal-config-container {
                    min-height: 100vh;
                    background: radial-gradient(circle at top left, #121214, #080809);
                    color: #fff;
                    font-family: 'Inter', system-ui, sans-serif;
                }

                .glass-header {
                    background: rgba(18, 18, 20, 0.8);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                    padding: 0 24px;
                }

                .header-top {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    height: 80px;
                }

                .header-title h1 {
                    font-size: 20px;
                    font-weight: 700;
                    margin: 0;
                    background: linear-gradient(to right, #fff, #999);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .subtitle {
                    font-size: 12px;
                    color: #888;
                    margin: 0;
                }

                .back-link {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #007AFF;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 14px;
                }

                .sync-btn {
                    background: rgba(0, 122, 255, 0.1);
                    border: 1px solid rgba(0, 122, 255, 0.2);
                    color: #007AFF;
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .sync-btn:hover { background: rgba(0, 122, 255, 0.2); transform: scale(1.05); }

                .terminal-main-layout {
                    display: flex;
                    min-height: calc(100vh - 80px);
                }

                .config-sidebar {
                    width: 260px;
                    background: rgba(255, 255, 255, 0.02);
                    border-right: 1px solid rgba(255, 255, 255, 0.05);
                    padding: 24px 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .sidebar-tab {
                    background: none;
                    border: none;
                    color: #888;
                    padding: 12px 16px;
                    font-size: 14px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    border-radius: 12px;
                    transition: all 0.2s;
                    text-align: left;
                }

                .sidebar-tab:hover {
                    background: rgba(255, 255, 255, 0.05);
                    color: #fff;
                }

                .sidebar-tab.active {
                    background: #007AFF;
                    color: #fff;
                    box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
                }

                .config-content {
                    flex: 1;
                    padding: 32px 40px;
                    overflow-y: auto;
                    max-height: calc(100vh - 80px);
                }

                .dashboard-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: 20px;
                }

                .dashboard-tile {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 24px;
                    padding: 24px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .dashboard-tile:hover {
                    background: rgba(255, 255, 255, 0.06);
                    transform: translateY(-5px);
                    border-color: rgba(0, 122, 255, 0.3);
                }

                .tile-icon-bg {
                    width: 56px;
                    height: 56px;
                    background: rgba(0, 122, 255, 0.1);
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .tile-info h4 { margin: 0; font-size: 16px; font-weight: 700; color: #fff; }
                .tile-info p { margin: 4px 0 0; font-size: 12px; color: #666; }

                .tile-status {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 11px;
                    font-weight: 700;
                    color: #34C759;
                    text-transform: uppercase;
                }

                .pulse-dot {
                    width: 6px;
                    height: 6px;
                    background: #34C759;
                    border-radius: 50%;
                    box-shadow: 0 0 8px #34C759;
                }

                .tab-navigator { display: none; }

                .nav-tab {
                    background: none;
                    border: none;
                    color: #666;
                    padding: 8px 0;
                    font-size: 13px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    white-space: nowrap;
                    position: relative;
                    transition: color 0.2s;
                }

                .nav-tab.active { color: #007AFF; }
                .nav-tab.active::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: #007AFF;
                    box-shadow: 0 0 10px rgba(0, 122, 255, 0.5);
                }

                .terminal-main {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 32px 24px 120px;
                }

                .glass-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 20px;
                    padding: 24px;
                    margin-bottom: 24px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                }

                .glass-card-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 20px;
                }

                .title-area {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .title-area h3 {
                    margin: 0;
                    font-size: 15px;
                    font-weight: 600;
                    color: #fff;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .icon-vibrant { color: #007AFF; filter: drop-shadow(0 0 5px rgba(0,122,255,0.3)); }

                .badge {
                    font-size: 10px;
                    font-weight: 700;
                    padding: 4px 8px;
                    border-radius: 6px;
                    text-transform: uppercase;
                }

                .badge.success { background: rgba(52, 199, 89, 0.1); color: #34C759; }
                .badge.neutral { background: rgba(255, 255, 255, 0.1); color: #888; }

                .info-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                }

                .info-label { display: flex; align-items: center; gap: 10px; color: #888; font-size: 14px; }
                .value-main { font-weight: 600; color: #fff; }

                .control-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                }

                .control-info span { font-weight: 600; display: block; margin-bottom: 2px; }
                .description { font-size: 11px; color: #666; margin: 0; }

                .premium-select {
                    width: 100%;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #fff;
                    padding: 14px;
                    border-radius: 12px;
                    font-size: 15px;
                    outline: none;
                }

                .form-input, .form-select {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #fff;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 14px;
                    outline: none;
                    text-align: right;
                }

                .form-input.wide { width: 240px; text-align: left; }

                .unit { color: #666; margin-left: 8px; font-size: 12px; }

                .ios-toggle {
                    width: 48px;
                    height: 26px;
                    border-radius: 26px;
                    background: #333;
                    border: none;
                    position: relative;
                    cursor: pointer;
                    transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .ios-toggle.active { background: #007AFF; }
                .toggle-knob {
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    width: 22px;
                    height: 22px;
                    background: #fff;
                    border-radius: 50%;
                    transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }

                .ios-toggle.active .toggle-knob { left: 24px; }

                /* Alarms Sub-navigation */
                .sub-nav-tabs {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 24px;
                    padding: 4px;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 14px;
                    width: fit-content;
                }

                .sub-tab {
                    background: none;
                    border: none;
                    color: #666;
                    padding: 8px 16px;
                    font-size: 13px;
                    font-weight: 600;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .sub-tab:hover { color: #fff; }
                .sub-tab.active {
                    background: rgba(255, 255, 255, 0.05);
                    color: #007AFF;
                }

                .alarm-sub-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
                    gap: 16px;
                    margin-top: 12px;
                }

                .alarm-mini-card {
                    background: rgba(255, 255, 255, 0.02);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    padding: 16px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .alarm-mini-card:hover {
                    background: rgba(255, 255, 255, 0.05);
                    border-color: #007AFF;
                }

                .mini-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }

                .mini-header span { font-size: 13px; font-weight: 700; color: #eee; }
                .status-dot { width: 6px; height: 6px; border-radius: 50%; background: #333; }
                .status-dot.active { background: #34C759; box-shadow: 0 0 8px #34C759; }
                .alarm-mini-card p { margin: 0; font-size: 11px; color: #666; }

                .tool-actions-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 12px;
                    margin-top: 12px;
                }

                .tool-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 14px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.05);
                    background: rgba(255,255,255,0.02);
                    color: #eee;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .tool-btn:hover { background: rgba(255,255,255,0.08); transform: translateY(-2px); }
                .tool-btn.danger { color: #FF3B30; border-color: rgba(255, 59, 48, 0.2); }
                .tool-btn.danger:hover { background: rgba(255, 59, 48, 0.1); }
                .tool-btn.warning { color: #FF9500; border-color: rgba(255, 149, 0, 0.2); }
                .tool-btn.warning:hover { background: rgba(255, 149, 0, 0.1); }

                .reconcile-toolbar {
                    position: fixed;
                    bottom: 24px;
                    left: 24px;
                    right: 24px;
                    max-width: 852px;
                    margin: 0 auto;
                    background: rgba(24, 24, 28, 0.8);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 16px 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .toolbar-content { width: 100%; display: flex; align-items: center; justify-content: space-between; }

                .status-info { display: flex; align-items: center; gap: 12px; font-size: 13px; font-weight: 500; color: #888; }
                .pulse-indicator { width: 8px; height: 8px; background: #34C759; border-radius: 50%; box-shadow: 0 0 10px #34C759; animation: pulse 2s infinite; }

                .primary-reconcile-btn {
                    background: #007AFF;
                    color: #fff;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 14px;
                    font-size: 14px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    transition: 0.2s;
                    box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);
                }

                .primary-reconcile-btn:hover { background: #006ee6; transform: translateY(-2px); }

                .premium-toast {
                    position: fixed;
                    top: 100px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #121214;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 12px 24px;
                    border-radius: 100px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 2000;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    font-size: 14px;
                    font-weight: 600;
                }

                .premium-toast.success span { color: #34C759; }
                .premium-toast.error span { color: #FF3B30; }

                .empty-state {
                    text-align: center;
                    padding: 80px 40px;
                    color: #444;
                }

                .empty-icon-wrapper {
                    width: 100px;
                    height: 100px;
                    background: rgba(255, 255, 255, 0.02);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 24px;
                    color: #222;
                }

                .empty-state h2 { color: #888; font-size: 20px; margin-bottom: 8px; }

                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes slide-down { from { transform: translate(-50%, -20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

                .animate-fade-in { animation: fade-in 0.4s ease-out; }
                .animate-slide-up { animation: slide-up 0.4s ease-out; }
                .animate-slide-down { animation: slide-down 0.4s ease-out; }

                /* AI Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.8);
                    backdrop-filter: blur(10px);
                    z-index: 2000;
                    display: flex; align-items: center; justify-content: center;
                    padding: 20px;
                }
                .premium-modal {
                    background: #121214;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 32px;
                    width: 100%; max-width: 500px;
                    overflow: hidden;
                    box-shadow: 0 30px 60px rgba(0,0,0,0.5);
                }
                .modal-header {
                    padding: 24px;
                    background: rgba(255,255,255,0.02);
                    display: flex; align-items: center; justify-content: space-between;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .header-info { display: flex; align-items: center; gap: 16px; }
                .header-info h2 { margin: 0; font-size: 18px; font-weight: 700; }
                .close-btn { background: none; border: none; color: #666; font-size: 28px; cursor: pointer; }
                .modal-body { padding: 24px; max-height: 70vh; overflow-y: auto; }
                .modal-section { margin-bottom: 32px; }
                .modal-section h4 { color: #007AFF; font-size: 12px; text-transform: uppercase; margin-bottom: 16px; letter-spacing: 1px; }
                .modal-footer { padding: 24px; border-top: 1px solid rgba(255,255,255,0.05); text-align: right; }
                .done-btn { background: #007AFF; color: #fff; border: none; padding: 12px 40px; border-radius: 14px; font-weight: 700; cursor: pointer; }
                
                .input-with-config { display: flex; align-items: center; gap: 12px; }
                .config-sub-btn {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #888;
                    width: 32px; height: 32px;
                    border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: 0.2s;
                }
                .config-sub-btn:hover { background: #007AFF; color: #fff; }

                .channel-selector {
                    display: flex; align-items: center; gap: 12px;
                    margin-top: -8px; margin-bottom: 16px; padding-left: 20px;
                }
                .channel-selector span { font-size: 11px; color: #666; }
                .ch-chip {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #888;
                    padding: 4px 10px; border-radius: 6px;
                    font-size: 11px; font-weight: 700;
                    cursor: pointer; transition: 0.2s;
                }
                .ch-chip.active { background: rgba(0,122,255,0.2); border-color: #007AFF; color: #007AFF; }
            `}</style>
            {showAiModal && <AiEventModal />}
        </div>
    );
}
