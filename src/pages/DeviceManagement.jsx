import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Cpu, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  MoreVertical,
  Filter
} from "lucide-react";
import deviceApi from "../services/deviceApi";
import "./DeviceManagement.css";

const DeviceManagement = ({ theme }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({
    deviceId: "",
    name: "",
    imei: "",
    type: "DASHCAM",
    model: ""
  });

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await deviceApi.getDevicesV2();
      if (response.success) {
        setDevices(response.data);
      }
      setError(null);
    } catch (err) {
      setError("Failed to load devices. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleOpenModal = (device = null) => {
    if (device) {
      setEditingDevice(device);
      setFormData({
        deviceId: device.id,
        name: device.name || "",
        imei: device.imei || "",
        type: device.type || "DASHCAM",
        model: device.model || ""
      });
    } else {
      setEditingDevice(null);
      setFormData({
        deviceId: "",
        name: "",
        imei: "",
        type: "DASHCAM",
        model: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDevice(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDevice) {
        await deviceApi.updateDevice(editingDevice.id, formData);
      } else {
        await deviceApi.createDevice(formData);
      }
      fetchDevices();
      handleCloseModal();
    } catch (err) {
      alert(err.message || "Failed to save device");
    }
  };

  const handleDelete = async (deviceId) => {
    if (window.confirm("Are you sure you want to delete this device? This action cannot be undone.")) {
      try {
        await deviceApi.deleteDevice(deviceId);
        fetchDevices();
      } catch (err) {
        alert(err.message || "Failed to delete device");
      }
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      device.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.name && device.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (device.imei && device.imei.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === "ALL" || device.type === filterType;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className={`device-mgmt-container ${theme}-theme animate-fade-in`}>
      <header className="page-header glass-header">
        <div className="header-titles">
          <h1>Device Management</h1>
          <p className="subtitle">Configure and monitor your fleet hardware assets</p>
        </div>
        <button className="primary-btn glass-btn" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          <span>Add New Device</span>
        </button>
      </header>

      <div className="controls-section glass-panel">
        <div className="search-wrapper">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by ID, Name or IMEI..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-wrapper">
          <Filter size={18} className="filter-icon" />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="ALL">All Types</option>
            <option value="DASHCAM">Dashcam</option>
            <option value="OBD">OBD Tracker</option>
            <option value="J42">J42 Device</option>
          </select>
        </div>
      </div>

      <main className="devices-grid">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Syncing with hardware inventory...</p>
          </div>
        ) : error ? (
          <div className="error-state glass-panel">
            <AlertCircle size={48} className="error-icon" />
            <p>{error}</p>
            <button className="secondary-btn" onClick={fetchDevices}>Retry Connection</button>
          </div>
        ) : filteredDevices.length === 0 ? (
          <div className="empty-state glass-panel">
            <Cpu size={48} className="empty-icon" />
            <p>No devices found matching your criteria.</p>
          </div>
        ) : (
          filteredDevices.map(device => (
            <div key={device.id} className="device-card glass-panel hover-lift">
              <div className="device-card-header">
                <div className={`status-badge ${device.status.toLowerCase()}`}>
                  {device.status === "online" ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  <span>{device.status}</span>
                </div>
                <div className="device-type-tag">{device.type}</div>
              </div>
              
              <div className="device-info">
                <h3>{device.name || "Unnamed Device"}</h3>
                <code className="device-id">{device.id}</code>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">IMEI</span>
                    <span className="value">{device.imei || "N/A"}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Model</span>
                    <span className="value">{device.model || "N/A"}</span>
                  </div>
                  <div className="info-item full-width">
                    <span className="label">Last Seen</span>
                    <span className="value">{device.lastSeen}</span>
                  </div>
                </div>
              </div>

              <div className="device-actions">
                <button className="icon-btn edit" onClick={() => handleOpenModal(device)} title="Edit Device">
                  <Edit2 size={16} />
                </button>
                <button className="icon-btn delete" onClick={() => handleDelete(device.id)} title="Delete Device">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {isModalOpen && (
        <div className="modal-overlay blur-bg animate-fade-in">
          <div className="modal-content glass-panel animate-slide-up">
            <div className="modal-header">
              <h2>{editingDevice ? "Edit Device" : "Register New Device"}</h2>
              <button className="close-btn" onClick={handleCloseModal}><XCircle size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="device-form">
              <div className="form-group">
                <label>Device ID (Serial Number) *</label>
                <input 
                  type="text" 
                  name="deviceId" 
                  value={formData.deviceId}
                  onChange={handleInputChange}
                  required 
                  disabled={!!editingDevice}
                  placeholder="e.g. SN12345678"
                />
              </div>
              <div className="form-group">
                <label>IMEI *</label>
                <input 
                  type="text" 
                  name="imei" 
                  value={formData.imei}
                  onChange={handleInputChange}
                  required 
                  placeholder="15-digit IMEI number"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Display Name</label>
                  <input 
                    type="text" 
                    name="name" 
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Truck-01"
                  />
                </div>
                <div className="form-group">
                  <label>Device Type</label>
                  <select name="type" value={formData.type} onChange={handleInputChange}>
                    <option value="DASHCAM">Dashcam</option>
                    <option value="OBD">OBD Tracker</option>
                    <option value="J42">J42 Device</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Model</label>
                <input 
                  type="text" 
                  name="model" 
                  value={formData.model}
                  onChange={handleInputChange}
                  placeholder="e.g. JC400, GV300, etc."
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn glass-btn" onClick={handleCloseModal}>Cancel</button>
                <button type="submit" className="primary-btn glass-btn">
                  {editingDevice ? "Save Changes" : "Register Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;
