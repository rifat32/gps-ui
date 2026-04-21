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
    ZapOff
} from 'lucide-react';
import { Link } from 'react-router-dom';
import deviceApi from '../services/deviceApi';

export default function VideoSettings({ theme }) {
    const [selectedDevice, setSelectedDevice] = useState('');
    const [devices, setDevices] = useState({ active: [], historical: [] });
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);
    const [activeTab, setActiveTab] = useState('System Status');
    
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
            }
        },
        network: {
            protocol: 'JT808-2011',
            serverIp: '',
            serverPort: '',
            ftpAddr: '',
            apn: 'internet',
            wifiAuth: 1,
            wifiWorkMode: 1
        },
        alarms: {
            speedOver: 80,
            speedLow: 10,
            routeId: 0,
            geofenceId: 0,
            overtime: 0,
            aiCustomMappings: {}
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

                setForm(newForm);
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

    const handleSync = async () => {
        if (!selectedDevice) return;
        setLoading(true);
        try {
            await deviceApi.sendCommand({
                deviceId: selectedDevice,
                commandType: 'QUERY_RECORDING_SETTINGS'
            });
            showNotification('Query command dispatched to terminal. Reconciliation in progress...', 'info');
            setTimeout(() => {
                fetchSettings(selectedDevice);
                fetchTelemetryData(selectedDevice);
            }, 5000);
        } catch (err) {
            showNotification(err.message, 'error');
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
                case 'System Manage':
                    category = 'System Manage';
                    payload = {
                        'Power Manage': {
                            PowerMode: form.system.powerMode,
                            AutoReboot: form.system.autoReboot,
                            LowPowerOff: form.system.lowPowerOff,
                            PowerOffVoltage: form.system.powerOffVoltage,
                            DelayOff: form.system.delayOff
                        },
                        'System Clock': {
                            NTPAddr: form.system.ntpAddr,
                            TimezoneOffset: form.system.timezone,
                            DSTMode: form.system.dstMode
                        }
                    };
                    break;
                case 'Record Settings':
                    category = 'Record Settings';
                    payload = {
                        'Encode Type': { EncodeType: form.video.encodeType },
                        'Main Stream': { recordMode: form.video.recordMode, channels: form.video.mainStream }
                    };
                    break;
                case 'Network Settings':
                    category = 'Network Settings';
                    payload = {
                        'Center Server': { Protocol: form.network.protocol, APN: form.network.apn },
                        'WiFi': { AuthMode: form.network.wifiAuth, WorkMode: form.network.wifiWorkMode }
                    };
                    break;
                case 'Alarm Settings':
                    category = 'Alarm Settings';
                    payload = {
                        'Position': { RouteId: form.alarms.routeId, GeofenceId: form.alarms.geofenceId, Overtime: form.alarms.overtime }
                    };
                    break;
            }

            await deviceApi.setParams(selectedDevice, category, payload);
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

    const tabs = [
        { id: 'System Status', icon: Activity, mode: 'extract_only' },
        { id: 'Network', icon: Globe, mode: 'extract_only' },
        { id: 'Disk', icon: Database, mode: 'extract_only' },
        { id: 'Satellite', icon: Compass, mode: 'extract_only' },
        { id: 'System Manage', icon: Settings, mode: 'mixed' },
        { id: 'Record Settings', icon: Video, mode: 'mixed' },
        { id: 'Network Settings', icon: Wifi, mode: 'updateable' },
        { id: 'Alarm Settings', icon: Shield, mode: 'updateable' }
    ];

    const currentTab = tabs.find(t => t.id === activeTab);

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
                        <p className="subtitle">Hardware Reconciliation & Diagnostics</p>
                    </div>
                    <button onClick={handleSync} disabled={loading || !selectedDevice} className="sync-btn">
                        <RefreshCw size={22} className={loading ? 'spin' : ''} />
                    </button>
                </div>

                <nav className="tab-navigator">
                    {tabs.map(tab => (
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

            <main className="terminal-main">
                <div className="config-layout">
                    {/* Device Selection Section */}
                    <GlassCard title="Target Device" icon={Cpu}>
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
                            {/* 1. SYSTEM STATUS (Read-only) */}
                            {activeTab === 'System Status' && (
                                <>
                                    <GlassCard title="Hardware Identity" icon={Shield}>
                                        <InfoRow label="Dev ID" value={telemetry.system?.devId} />
                                        <InfoRow label="IMEI" value={telemetry.system?.imei} />
                                        <InfoRow label="APP Version" value={telemetry.system?.appVersion} />
                                        <InfoRow label="AI Version" value={telemetry.system?.aiVersion} />
                                        <InfoRow label="Plate No." value={telemetry.system?.plateNo} />
                                    </GlassCard>
                                    <GlassCard title="Live Metrics" icon={Activity}>
                                        <InfoRow label="System Voltage" value={telemetry.system?.sysVoltage} icon={Zap} />
                                        <InfoRow label="CPU Temperature" value={telemetry.system?.cpuTemp} icon={Thermometer} />
                                        <InfoRow label="ACC Status" value={telemetry.system?.accStatus} badge={{ type: telemetry.system?.accStatus === 'ON' ? 'success' : 'neutral', text: telemetry.system?.accStatus }} />
                                        <InfoRow label="Record Status" value={telemetry.system?.recordStatus?.summary} />
                                    </GlassCard>
                                    <GlassCard title="GPS Diagnostics" icon={Compass}>
                                        <InfoRow label="Fix Status" value={telemetry.system?.gpsStatus?.status} />
                                        <InfoRow label="Coordinates" value={`${telemetry.system?.gpsStatus?.latitude}, ${telemetry.system?.gpsStatus?.longitude}`} />
                                        <InfoRow label="Satellites Used" value={telemetry.system?.gpsStatus?.satellites} />
                                        <InfoRow label="Current Speed" value={telemetry.system?.gpsStatus?.speed} />
                                    </GlassCard>
                                </>
                            )}

                            {/* 2. NETWORK (Read-only) */}
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
                                        <InfoRow label="MAC Address" value={telemetry.network?.wifi?.mac} />
                                    </GlassCard>
                                </>
                            )}

                            {/* 3. DISK (Read-only) */}
                            {activeTab === 'Disk' && (
                                <>
                                    <GlassCard title="Internal Storage (SD1)" icon={HardDrive}>
                                        <InfoRow label="Status" value={telemetry.disk?.sd1?.status} />
                                        <InfoRow label="Total Capacity" value={telemetry.disk?.sd1?.capacity} />
                                        <InfoRow label="Free Space" value={telemetry.disk?.sd1?.free} />
                                    </GlassCard>
                                    <GlassCard title="External Interface (USB)" icon={Database}>
                                        <InfoRow label="Status" value={telemetry.disk?.usb?.status} />
                                        <InfoRow label="Total Capacity" value={telemetry.disk?.usb?.capacity} />
                                        <InfoRow label="Free Space" value={telemetry.disk?.usb?.free} />
                                    </GlassCard>
                                </>
                            )}

                            {/* 4. SATELLITE (Read-only) */}
                            {activeTab === 'Satellite' && (
                                <GlassCard title="Constellation Status" icon={Compass}>
                                    <InfoRow label="GPS Satellites" value={telemetry.satellite?.gpsVisible} />
                                    <InfoRow label="BD Satellites" value={telemetry.satellite?.bdVisible} />
                                    <div className="satellite-list">
                                        {telemetry.satellite?.list?.map((sat, idx) => (
                                            <div key={idx} className="sat-item">
                                                <span className="sat-prn">PRN {sat.prn}</span>
                                                <div className="sat-snr-bar">
                                                    <div className="fill" style={{ width: `${(sat.snr / 60) * 100}%` }} />
                                                </div>
                                                <span className="sat-snr">{sat.snr}</span>
                                            </div>
                                        ))}
                                    </div>
                                </GlassCard>
                            )}

                            {/* 5. SYSTEM MANAGE (Mixed/Read-write) */}
                            {activeTab === 'System Manage' && (
                                <>
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
                                        <ControlRow label="Cut-off Voltage" description="Battery protection threshold">
                                            <input 
                                                type="number" 
                                                value={form.system.powerOffVoltage} 
                                                onChange={e => setForm({...form, system: {...form.system, powerOffVoltage: e.target.value}})}
                                                className="form-input"
                                            />
                                            <span className="unit">V</span>
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
                                        <ControlRow label="Timezone Offset">
                                            <input 
                                                type="number" 
                                                value={form.system.timezone} 
                                                onChange={e => setForm({...form, system: {...form.system, timezone: e.target.value}})}
                                                className="form-input"
                                            />
                                            <span className="unit">Sec</span>
                                        </ControlRow>
                                    </GlassCard>
                                </>
                            )}

                            {/* 6. RECORD SETTINGS (Mixed) */}
                            {activeTab === 'Record Settings' && (
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
                                </>
                            )}

                            {/* 7. NETWORK SETTINGS (Read-write) */}
                            {activeTab === 'Network Settings' && (
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
                            )}

                            {/* 8. ALARM SETTINGS (Read-write) */}
                            {activeTab === 'Alarm Settings' && (
                                <GlassCard title="Safety Thresholds" icon={Shield}>
                                    <ControlRow label="Route ID">
                                        <input type="number" value={form.alarms.routeId} onChange={e => setForm({...form, alarms: {...form.alarms, routeId: e.target.value}})} className="form-input" />
                                    </ControlRow>
                                    <ControlRow label="Geofence ID">
                                        <input type="number" value={form.alarms.geofenceId} onChange={e => setForm({...form, alarms: {...form.alarms, geofenceId: e.target.value}})} className="form-input" />
                                    </ControlRow>
                                    <ControlRow label="Overtime (s)">
                                        <input type="number" value={form.alarms.overtime} onChange={e => setForm({...form, alarms: {...form.alarms, overtime: e.target.value}})} className="form-input" />
                                    </ControlRow>
                                </GlassCard>
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

                .tab-navigator {
                    display: flex;
                    gap: 20px;
                    overflow-x: auto;
                    padding-bottom: 12px;
                    scrollbar-width: none;
                }

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
            `}</style>
        </div>
    );
}
