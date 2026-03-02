import { useState, useEffect } from 'react';
import {
    ArrowLeft, Settings, Video, Sliders, Save, RefreshCw,
    Monitor, Database, Camera, CheckCircle2, AlertCircle, Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import deviceApi from '../services/deviceApi';

export default function VideoSettings({ theme, toggleTheme }) {
    const [selectedDevice, setSelectedDevice] = useState("291078985963"); // Default for now
    const [loading, setLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    // Data from API
    const [videoDefinitions, setVideoDefinitions] = useState([]);
    const [mainRecordingIds, setMainRecordingIds] = useState([]);
    const [tuningIds, setTuningIds] = useState([]);

    // Form States
    const [recordingForm, setRecordingForm] = useState({
        audioVideo: {
            liveResolution: 6,
            liveTargetBitrate: 2048,
            liveTargetFrameRate: 25,
            storageEncodingMode: 0,
            storageResolution: 6,
            storageTargetBitrate: 4096,
            storageTargetFrameRate: 25,
            osdSettings: 0x003F,
            audioOutputEnable: 1
        }
    });

    const [tuningForm, setTuningForm] = useState({
        "0x0070": 7, // Quality
        "0x0071": 128, // Brightness
        "0x0072": 64, // Contrast
        "0x0073": 64, // Saturation
        "0x0074": 64  // Chroma
    });

    const RESOLUTIONS = [
        { value: 0, label: 'QCIF' },
        { value: 1, label: 'CIF' },
        { value: 2, label: 'WCIF' },
        { value: 3, label: 'D1' },
        { value: 4, label: 'WD1' },
        { value: 5, label: '720P' },
        { value: 6, label: '1080P' }
    ];

    const SHOW_NOTIFICATION = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    // Step 1: Load Definitions on Mount
    useEffect(() => {
        const loadDefinitions = async () => {
            try {
                const res = await deviceApi.getParameterList('Video');
                if (res.success) {
                    const params = res.data;
                    setVideoDefinitions(params);

                    const main = params.filter(p => ['0x0075', '0x0076', '0x0077'].includes(p.id)).map(p => p.idInt);
                    const tuning = params.filter(p => ['0x0070', '0x0071', '0x0072', '0x0073', '0x0074'].includes(p.id)).map(p => p.idInt);

                    setMainRecordingIds(main);
                    setTuningIds(tuning);
                }
            } catch (err) {
                console.error("Failed to load definitions", err);
            }
        };
        loadDefinitions();
    }, []);

    // Step 2: Fetch Current Values
    const fetchCurrentValues = async () => {
        if (!selectedDevice) return;
        setLoading(true);
        try {
            const allIds = [...mainRecordingIds, ...tuningIds];
            if (allIds.length === 0) return;

            const res = await deviceApi.queryParams(selectedDevice, allIds);
            if (res.success && res.parameters) {
                // Update Recording Form
                if (res.parameters["0x00000075"]) {
                    setRecordingForm({ audioVideo: res.parameters["0x00000075"] });
                }

                // Update Tuning Form
                const newTuning = { ...tuningForm };
                tuningIds.forEach(id => {
                    const hex = `0x${id.toString(16).padStart(8, '0')}`;
                    if (res.parameters[hex] !== undefined) {
                        newTuning[`0x${id.toString(16).padStart(4, '0')}`] = res.parameters[hex];
                    }
                });
                setTuningForm(newTuning);
                SHOW_NOTIFICATION("Successfully synchronized with device");
            }
        } catch (err) {
            SHOW_NOTIFICATION(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    // Step 4: Update Settings
    const handleSaveRecording = async () => {
        setLoading(true);
        try {
            await deviceApi.setParams(selectedDevice, 'recording', recordingForm);
            SHOW_NOTIFICATION("Main Recording settings updated. Verification query triggered.");
        } catch (err) {
            SHOW_NOTIFICATION(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveTuning = async () => {
        setLoading(true);
        try {
            await deviceApi.setParams(selectedDevice, 'generic', tuningForm);
            SHOW_NOTIFICATION("Image Tuning settings updated via generic handler.");
        } catch (err) {
            SHOW_NOTIFICATION(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRecordingChange = (field, value) => {
        setRecordingForm(prev => ({
            audioVideo: {
                ...prev.audioVideo,
                [field]: value
            }
        }));
    };

    const handleTuningChange = (id, value) => {
        setTuningForm(prev => ({
            ...prev,
            [id]: parseInt(value)
        }));
    };

    return (
        <div className="video-settings-page" style={{
            minHeight: '100vh',
            background: 'var(--bg-color)',
            color: 'var(--text-primary)',
            fontFamily: 'Inter, system-ui, sans-serif',
            padding: '24px',
            transition: 'all 0.3s ease'
        }}>
            {/* Header */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '40px',
                padding: '0 8px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <Link to="/dashcam" style={{
                        background: 'var(--btn-secondary-bg)',
                        border: '1px solid var(--surface-border)',
                        color: 'var(--text-primary)',
                        padding: '12px',
                        borderRadius: '16px',
                        display: 'flex',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'translateX(-4px)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
                            Video Configuration
                        </h1>
                        <p style={{ margin: '4px 0 0 0', fontSize: '15px', color: 'var(--text-secondary)' }}>
                            Optimize device stream parameters and visual quality
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={fetchCurrentValues}
                        disabled={loading}
                        style={{
                            background: 'var(--accent-color)',
                            border: 'none',
                            color: 'white',
                            padding: '12px 24px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            fontWeight: '700',
                            fontSize: '15px',
                            boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                        onMouseOut={(e) => e.currentTarget.style.filter = 'none'}
                    >
                        <RefreshCw size={19} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Synchronizing...' : 'Sync with Device'}
                    </button>
                </div>
            </div>

            {notification && (
                <div style={{
                    position: 'fixed',
                    top: '32px',
                    right: '32px',
                    background: notification.type === 'error' ? '#ef4444' : '#10b981',
                    color: 'white',
                    padding: '16px 28px',
                    borderRadius: '20px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    zIndex: 1000,
                    animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                    fontWeight: '600'
                }}>
                    {notification.type === 'error' ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
                    <span>{notification.message}</span>
                </div>
            )}

            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
                gap: '32px'
            }}>

                {/* Section A: Main Recording */}
                <div style={{
                    background: 'var(--surface-color)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '32px',
                    padding: '32px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
                    transition: 'transform 0.3s ease'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            padding: '12px',
                            borderRadius: '18px',
                            boxShadow: '0 8px 16px -4px rgba(37, 99, 235, 0.4)'
                        }}>
                            <Video color="white" size={26} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>Main Recording</h2>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Protocol structure 0x0075</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '24px' }}>
                        <div className="form-group">
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                                <Monitor size={14} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                Resolution
                            </label>
                            <select
                                value={recordingForm.audioVideo.liveResolution}
                                onChange={(e) => handleRecordingChange('liveResolution', parseInt(e.target.value))}
                                style={{
                                    width: '100%',
                                    background: 'var(--input-bg)',
                                    border: '1px solid var(--surface-border)',
                                    color: 'var(--text-primary)',
                                    padding: '14px 18px',
                                    borderRadius: '16px',
                                    outline: 'none',
                                    fontSize: '15px',
                                    fontWeight: '500',
                                    appearance: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {RESOLUTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '10px' }}>Bitrate (kbps)</label>
                                <input
                                    type="number"
                                    value={recordingForm.audioVideo.liveTargetBitrate}
                                    onChange={(e) => handleRecordingChange('liveTargetBitrate', parseInt(e.target.value))}
                                    style={{
                                        width: '100%',
                                        background: 'var(--input-bg)',
                                        border: '1px solid var(--surface-border)',
                                        color: 'var(--text-primary)',
                                        padding: '14px 18px',
                                        borderRadius: '16px',
                                        boxSizing: 'border-box',
                                        fontSize: '15px',
                                        fontWeight: '600'
                                    }}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '10px' }}>Target FPS</label>
                                <input
                                    type="number"
                                    value={recordingForm.audioVideo.liveTargetFrameRate}
                                    onChange={(e) => handleRecordingChange('liveTargetFrameRate', parseInt(e.target.value))}
                                    style={{
                                        width: '100%',
                                        background: 'var(--input-bg)',
                                        border: '1px solid var(--surface-border)',
                                        color: 'var(--text-primary)',
                                        padding: '14px 18px',
                                        borderRadius: '16px',
                                        boxSizing: 'border-box',
                                        fontSize: '15px',
                                        fontWeight: '600'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{
                            background: 'var(--bg-color)',
                            border: '1px solid var(--surface-border)',
                            borderRadius: '20px',
                            padding: '20px'
                        }}>
                            <label style={{ display: 'block', fontSize: '14px', fontWeight: '800', color: 'var(--accent-color)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                OSD Overlay Matrix
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                {[
                                    { bit: 0, label: 'Date/Time' },
                                    { bit: 1, label: 'Plate Number' },
                                    { bit: 2, label: 'Channel Name' },
                                    { bit: 3, label: 'Lat / Lon' },
                                    { bit: 4, label: 'Rec Speed' },
                                    { bit: 5, label: 'GPS Speed' }
                                ].map(osd => (
                                    <label key={osd.bit} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', cursor: 'pointer', fontWeight: '500', color: 'var(--text-primary)' }}>
                                        <input
                                            type="checkbox"
                                            checked={!!(recordingForm.audioVideo.osdSettings & (1 << osd.bit))}
                                            onChange={(e) => {
                                                const current = recordingForm.audioVideo.osdSettings;
                                                const next = e.target.checked ? (current | (1 << osd.bit)) : (current & ~(1 << osd.bit));
                                                handleRecordingChange('osdSettings', next);
                                            }}
                                            style={{ width: '18px', height: '18px', borderRadius: '4px', accentColor: 'var(--accent-color)' }}
                                        />
                                        {osd.label}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleSaveRecording}
                            disabled={loading}
                            style={{
                                marginTop: '12px',
                                background: 'var(--accent-color)',
                                color: 'white',
                                border: 'none',
                                padding: '18px',
                                borderRadius: '18px',
                                fontWeight: '800',
                                fontSize: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                boxShadow: '0 12px 20px -5px rgba(59, 130, 246, 0.4)',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <Save size={20} /> Update Parameters
                        </button>
                    </div>
                </div>

                {/* Section B: Image Tuning */}
                <div style={{
                    background: 'var(--surface-color)',
                    border: '1px solid var(--surface-border)',
                    borderRadius: '32px',
                    padding: '32px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            padding: '12px',
                            borderRadius: '18px',
                            boxShadow: '0 8px 16px -4px rgba(16, 185, 129, 0.4)'
                        }}>
                            <Sliders color="white" size={26} />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>Image Tuning</h2>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Generic ID-Value mapping</p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '32px' }}>
                        {[
                            { id: '0x0070', label: 'Image Quality', min: 1, max: 10, step: 1, icon: <Camera size={14} /> },
                            { id: '0x0071', label: 'Brightness', min: 0, max: 255, step: 1, icon: <Info size={14} /> },
                            { id: '0x0072', label: 'Contrast', min: 0, max: 127, step: 1, icon: <Info size={14} /> },
                            { id: '0x0073', label: 'Saturation', min: 0, max: 127, step: 1, icon: <Info size={14} /> },
                            { id: '0x0074', label: 'Chroma', min: 0, max: 255, step: 1, icon: <Info size={14} /> }
                        ].map(item => (
                            <div key={item.id} className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'flex-end' }}>
                                    <label style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                        {item.label} <span style={{ opacity: 0.5, fontWeight: '400', marginLeft: '6px' }}>{item.id}</span>
                                    </label>
                                    <span style={{ fontSize: '18px', fontWeight: '900', color: '#10b981', fontFamily: 'monospace' }}>{tuningForm[item.id]}</span>
                                </div>
                                <input
                                    type="range"
                                    min={item.min}
                                    max={item.max}
                                    step={item.step}
                                    value={tuningForm[item.id]}
                                    onChange={(e) => handleTuningChange(item.id, e.target.value)}
                                    style={{
                                        width: '100%',
                                        height: '8px',
                                        background: 'var(--bg-color)',
                                        border: '1px solid var(--surface-border)',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        accentColor: '#10b981',
                                        padding: '0'
                                    }}
                                />
                            </div>
                        ))}

                        <div style={{
                            background: 'rgba(16, 185, 129, 0.08)',
                            border: '1px solid rgba(16, 185, 129, 0.15)',
                            borderRadius: '20px',
                            padding: '20px',
                            fontSize: '13px',
                            lineHeight: '1.6',
                            color: '#059669',
                            display: 'flex',
                            gap: '16px',
                            fontWeight: '500'
                        }}>
                            <Info size={22} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>
                                Generic updates bypass static builders. The system dynamically encodes these based on standard protocol definitions (BYTE, WORD, DWORD).
                            </span>
                        </div>

                        <button
                            onClick={handleSaveTuning}
                            disabled={loading}
                            style={{
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '18px',
                                borderRadius: '18px',
                                fontWeight: '800',
                                fontSize: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px',
                                boxShadow: '0 12px 20px -5px rgba(16, 185, 129, 0.4)',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <Save size={20} /> Update Generic Tuning
                        </button>
                    </div>
                </div>

            </div>

            <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%) scale(0.9); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type="range"]::-webkit-slider-thumb {
          width: 24px;
          height: 24px;
          background: #ffffff;
          border: 4px solid #10b981;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          margin-top: -8.5px;
        }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 8px;
        }
      `}</style>
        </div>
    );
}
