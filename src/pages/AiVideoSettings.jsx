import { useState, useEffect } from 'react';
import {
  Video,
  Save,
  RefreshCw,
  CheckCircle2,
  ZapOff,
  Sliders,
} from 'lucide-react';
import deviceApi from '../services/deviceApi';

export default function AiVideoSettings({ theme }) {
  const [aiEventConfigs, setAiEventConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await deviceApi.getAiEventConfigs();
      if (res && res.success && Array.isArray(res.data)) {
        setAiEventConfigs(res.data);
      } else {
        showNotification(res?.error || 'Failed to fetch AI configuration', 'error');
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleToggleVideoRequest = (eventCode) => {
    setAiEventConfigs(prev =>
      prev.map(item =>
        item.event_code === eventCode
          ? { ...item, request_video: item.request_video === false ? true : false }
          : item
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await deviceApi.updateAiEventConfigs(aiEventConfigs);
      if (res && res.success) {
        showNotification('AI Alert Video Request Configuration saved successfully!');
        if (Array.isArray(res.data)) setAiEventConfigs(res.data);
      } else {
        showNotification(res?.error || 'Failed to save configuration', 'error');
      }
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const CATEGORIES = ['ADAS', 'DSM', 'BSD', 'BEHAVIOR', 'HARDWARE', 'SPEED_GPS'];

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at top left, #121214, #080809)', color: '#fff', padding: '32px 40px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Toast Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: notification.type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(34, 197, 94, 0.9)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '600',
          fontSize: '14px',
          zIndex: 9999,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)',
        }}>
          {notification.type === 'error' ? <ZapOff size={18} /> : <CheckCircle2 size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sliders size={26} color="#3b82f6" />
            AI Alert Video Request Settings
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            System-level control: toggle whether the backend automatically requests video clips from dashcam terminals when each AI alert triggers.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          style={{
            background: saving ? '#64748b' : '#22c55e',
            color: '#fff',
            border: 'none',
            padding: '10px 22px',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
            transition: 'all 0.2s',
          }}
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' }}>
          <RefreshCw size={24} className="animate-spin" style={{ marginBottom: '12px' }} />
          <div>Loading AI Event Configurations...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1000px' }}>
          {CATEGORIES.map(cat => {
            const groupEvents = aiEventConfigs.filter(item => (item.category || 'OTHER').toUpperCase() === cat);
            if (groupEvents.length === 0) return null;
            return (
              <div key={cat} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px 24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#60a5fa', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{cat} Events</span>
                  <span style={{ fontSize: '11px', background: 'rgba(96, 165, 250, 0.15)', padding: '2px 8px', borderRadius: '12px', color: '#93c5fd' }}>
                    {groupEvents.length} types
                  </span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {groupEvents.map(evt => {
                    const isEnabled = evt.request_video !== false;
                    return (
                      <div key={evt.event_code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div>
                          <div style={{ fontWeight: '700', fontSize: '14px', color: '#f8fafc' }}>
                            {evt.friendly_name || evt.event_code} <span style={{ fontSize: '11px', opacity: 0.6, fontWeight: '400' }}>({evt.event_code})</span>
                          </div>
                          {evt.description && (
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                              {evt.description}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: isEnabled ? '#22c55e' : '#94a3b8' }}>
                            {isEnabled ? 'Request Video' : 'No Video'}
                          </span>
                          <button
                            onClick={() => handleToggleVideoRequest(evt.event_code)}
                            style={{
                              width: '46px',
                              height: '24px',
                              borderRadius: '24px',
                              background: isEnabled ? '#22c55e' : '#475569',
                              border: 'none',
                              position: 'relative',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              padding: 0,
                            }}
                          >
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: '#fff',
                              position: 'absolute',
                              top: '2px',
                              left: isEnabled ? '24px' : '2px',
                              transition: 'all 0.2s',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
