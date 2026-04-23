import { useState, useEffect } from 'react';
import { MonitorSmartphone, Link2, RefreshCw, CheckCircle2, AlertCircle, Copy, ExternalLink, Radio } from 'lucide-react';
import deviceApi from '../services/deviceApi';

export default function RemoteAccess() {
    const [devices, setDevices] = useState({ active: [], historical: [] });
    const [selectedDevice, setSelectedDevice] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null); // { url, deviceId }
    const [notification, setNotification] = useState(null);
    const [copied, setCopied] = useState(false);

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

    useEffect(() => { fetchDevices(); }, []);

    const handleGenerate = async () => {
        if (!selectedDevice) return;
        setLoading(true);
        setResult(null);
        showNotification('Sending wake-up command to camera...', 'info');
        try {
            const res = await deviceApi.triggerRemoteSettings(selectedDevice);
            if (res.success) {
                setResult({ url: res.url, deviceId: selectedDevice });
                showNotification('Tunnel established! Login link is ready.', 'success');
            } else {
                showNotification(res.error || 'Failed to establish tunnel.', 'error');
            }
        } catch (err) {
            showNotification(err.message || 'Connection failed. Is the camera online?', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!result?.url) return;
        navigator.clipboard.writeText(result.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isActive = devices.active.includes(selectedDevice);

    return (
        <div className="remote-access-page" style={{
            minHeight: '100vh',
            padding: '2rem',
            background: 'var(--bg-primary, #0f0f0f)',
            color: 'var(--text-primary, #f1f1f1)',
            fontFamily: 'inherit'
        }}>
            {/* Notification */}
            {notification && (
                <div style={{
                    position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '1rem 1.5rem', borderRadius: '12px',
                    background: notification.type === 'error' ? '#450a0a' : notification.type === 'info' ? '#0c2340' : '#052e16',
                    border: `1px solid ${notification.type === 'error' ? '#dc2626' : notification.type === 'info' ? '#3b82f6' : '#16a34a'}`,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    maxWidth: '380px',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    {notification.type === 'error'
                        ? <AlertCircle size={18} color="#dc2626" />
                        : notification.type === 'info'
                        ? <Radio size={18} color="#3b82f6" />
                        : <CheckCircle2 size={18} color="#16a34a" />}
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{notification.message}</p>
                </div>
            )}

            {/* Page Header */}
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 24px rgba(99,102,241,0.4)'
                    }}>
                        <MonitorSmartphone size={24} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                            Remote Camera Access
                        </h1>
                        <p style={{ margin: 0, fontSize: '13px', opacity: 0.5, fontWeight: 500 }}>
                            Generate a secure FRP login link for native camera settings
                        </p>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.08)', margin: '1.5rem 0' }} />

                {/* How it works */}
                <div style={{
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem',
                    fontSize: '13px', lineHeight: '1.6', opacity: 0.85
                }}>
                    <strong style={{ color: '#a5b4fc' }}>How it works:</strong> Selecting a device and clicking{' '}
                    <em>Generate Login Link</em> sends a JT808 wake-up command to the dashcam. The camera
                    then opens a secure FRP tunnel and your direct login link to the camera's native web UI is generated below.
                </div>

                {/* Device Selector Card */}
                <div style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px', padding: '1.5rem', marginBottom: '1.25rem'
                }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, opacity: 0.5, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                        Select Device
                    </label>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select
                            value={selectedDevice}
                            onChange={e => { setSelectedDevice(e.target.value); setResult(null); }}
                            style={{
                                flex: 1, minWidth: '200px', background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
                                padding: '0.75rem 1rem', color: 'inherit', fontSize: '14px',
                                fontWeight: 600, outline: 'none', cursor: 'pointer'
                            }}
                        >
                            <option value="">— Select a camera terminal —</option>
                            <optgroup label="🟢 Live Connections">
                                {devices.active.map(id => (
                                    <option key={id} value={id}>{id}</option>
                                ))}
                            </optgroup>
                            <optgroup label="⚪ Last Seen (Offline)">
                                {devices.historical.map(id => (
                                    <option key={id} value={id}>{id}</option>
                                ))}
                            </optgroup>
                        </select>

                        {selectedDevice && (
                            <span style={{
                                fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
                                padding: '0.3rem 0.75rem', borderRadius: '20px',
                                background: isActive ? 'rgba(22,163,74,0.15)' : 'rgba(100,100,100,0.15)',
                                border: `1px solid ${isActive ? 'rgba(22,163,74,0.4)' : 'rgba(100,100,100,0.3)'}`,
                                color: isActive ? '#4ade80' : '#888'
                            }}>
                                {isActive ? '● LIVE' : '○ OFFLINE'}
                            </span>
                        )}
                    </div>

                    {selectedDevice && !isActive && (
                        <p style={{ margin: '0.75rem 0 0', fontSize: '12px', color: '#f59e0b', opacity: 0.8 }}>
                            ⚠ This device is offline. The camera may not respond to the wake-up command.
                        </p>
                    )}
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={loading || !selectedDevice}
                    style={{
                        width: '100%', padding: '1rem', borderRadius: '12px',
                        background: loading || !selectedDevice
                            ? 'rgba(255,255,255,0.06)'
                            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        border: 'none', color: 'white', fontSize: '15px', fontWeight: 800,
                        letterSpacing: '-0.01em', cursor: loading || !selectedDevice ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                        transition: 'all 0.2s ease', opacity: loading || !selectedDevice ? 0.5 : 1,
                        marginBottom: '1.5rem',
                        boxShadow: loading || !selectedDevice ? 'none' : '0 8px 24px rgba(99,102,241,0.35)'
                    }}
                >
                    {loading
                        ? <><RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Establishing Tunnel...</>
                        : <><Link2 size={18} /> Generate Login Link</>
                    }
                </button>

                {/* Result Card */}
                {result && (
                    <div style={{
                        background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)',
                        borderRadius: '16px', padding: '1.5rem',
                        animation: 'fadeIn 0.4s ease'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <CheckCircle2 size={18} color="#4ade80" />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#4ade80', letterSpacing: '0.04em' }}>
                                TUNNEL ACTIVE — Login link ready
                            </span>
                        </div>

                        <p style={{ margin: '0 0 0.5rem', fontSize: '11px', fontWeight: 700, opacity: 0.4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            Device ID: {result.deviceId}
                        </p>

                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            background: 'rgba(0,0,0,0.3)', borderRadius: '10px',
                            padding: '0.875rem 1rem', marginBottom: '1rem',
                            border: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <code style={{ flex: 1, fontSize: '13px', fontWeight: 600, wordBreak: 'break-all', color: '#a5b4fc' }}>
                                {result.url}
                            </code>
                            <button
                                onClick={handleCopy}
                                title="Copy link"
                                style={{
                                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px', padding: '0.4rem 0.6rem', cursor: 'pointer',
                                    color: copied ? '#4ade80' : 'inherit', transition: 'all 0.2s', flexShrink: 0
                                }}
                            >
                                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                            </button>
                        </div>

                        <a
                            href={result.url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                                background: 'linear-gradient(135deg, #059669, #10b981)',
                                color: 'white', textDecoration: 'none', fontWeight: 800,
                                fontSize: '14px', padding: '0.875rem', borderRadius: '10px',
                                boxShadow: '0 4px 16px rgba(16,185,129,0.3)', transition: 'opacity 0.2s'
                            }}
                        >
                            <ExternalLink size={18} />
                            Open Native Camera Settings
                        </a>

                        <p style={{ margin: '1rem 0 0', fontSize: '11px', opacity: 0.4, textAlign: 'center' }}>
                            This link connects directly to the camera's web interface. Default credentials may apply.
                        </p>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                select option { background: #1a1a2e; color: #f1f1f1; }
            `}</style>
        </div>
    );
}
