import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, RefreshCw, ChevronDown, Activity, ShieldAlert } from "lucide-react";
import "./VehicleHealth.css";

const OBD_API = import.meta.env.VITE_OBD_API_URL || "";

const VehicleHealth = () => {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState("");
    const [faults, setFaults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    useEffect(() => {
        fetchDevices();
    }, []);

    const fetchDevices = async () => {
        try {
            const res = await fetch(`${OBD_API}/api/logs/devices`);
            const data = await res.json();
            setDevices(data.devices || []);
        } catch {
            setError("Failed to load OBD devices.");
        }
    };

    const fetchFaults = async (deviceId, status = "") => {
        if (!deviceId) return;
        try {
            setLoading(true);
            setError("");
            const url = `${OBD_API}/api/logs/v1.0/devices/${deviceId}/faults${status ? `?status=${status}` : ""}`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.faults) {
                setFaults(data.faults);
            } else {
                setError(data.error || "No data");
                setFaults([]);
            }
        } catch {
            setError("Failed to load fault codes.");
            setFaults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDeviceChange = (e) => {
        const val = e.target.value;
        setSelectedDevice(val);
        fetchFaults(val, statusFilter);
    };

    const handleStatusFilter = (val) => {
        setStatusFilter(val);
        fetchFaults(selectedDevice, val);
    };

    const formatDate = (dateStr) => new Date(dateStr).toLocaleString();

    const ACTIVE_COUNT = faults.filter(f => f.status === "ACTIVE").length;
    const CLEARED_COUNT = faults.filter(f => f.status === "CLEARED").length;

    return (
        <div className="vh-page">
            <div className="vh-header">
                <div className="vh-header-left">
                    <div className="vh-icon-wrap">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h1>Vehicle Health</h1>
                        <p>OBD Diagnostic Trouble Codes (DTCs)</p>
                    </div>
                </div>
                <button
                    className="vh-refresh-btn"
                    onClick={() => fetchFaults(selectedDevice, statusFilter)}
                    disabled={!selectedDevice || loading}
                >
                    <RefreshCw size={18} className={loading ? "spin" : ""} />
                    Refresh
                </button>
            </div>

            {error && <div className="vh-error">{error}</div>}

            <div className="vh-controls">
                <div className="vh-control-group">
                    <label>OBD Device</label>
                    <div className="vh-select-wrap">
                        <select value={selectedDevice} onChange={handleDeviceChange}>
                            <option value="">-- Select Device --</option>
                            {devices.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="select-arrow" />
                    </div>
                </div>

                <div className="vh-status-filters">
                    {["", "ACTIVE", "CLEARED"].map(s => (
                        <button
                            key={s}
                            onClick={() => handleStatusFilter(s)}
                            className={`vh-filter-btn ${statusFilter === s ? "active" : ""} ${s === "ACTIVE" ? "active-type" : s === "CLEARED" ? "cleared-type" : ""}`}
                        >
                            {s === "" ? "All" : s}
                        </button>
                    ))}
                </div>
            </div>

            {selectedDevice && (
                <div className="vh-stats">
                    <div className="vh-stat active">
                        <AlertTriangle size={20} />
                        <div>
                            <span className="stat-value">{ACTIVE_COUNT}</span>
                            <span className="stat-label">Active Faults</span>
                        </div>
                    </div>
                    <div className="vh-stat cleared">
                        <CheckCircle size={20} />
                        <div>
                            <span className="stat-value">{CLEARED_COUNT}</span>
                            <span className="stat-label">Cleared</span>
                        </div>
                    </div>
                    <div className="vh-stat total">
                        <Activity size={20} />
                        <div>
                            <span className="stat-value">{faults.length}</span>
                            <span className="stat-label">Total Records</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="vh-table-container">
                {!selectedDevice ? (
                    <div className="vh-empty">
                        <ShieldAlert size={64} />
                        <p>Select an OBD device to view its fault history</p>
                    </div>
                ) : loading ? (
                    <div className="vh-empty">
                        <RefreshCw size={48} className="spin" />
                        <p>Loading faults...</p>
                    </div>
                ) : faults.length === 0 ? (
                    <div className="vh-empty">
                        <CheckCircle size={64} />
                        <p>No fault codes found{statusFilter ? ` with status "${statusFilter}"` : ""}. ✅</p>
                    </div>
                ) : (
                    <table className="vh-table">
                        <thead>
                            <tr>
                                <th>Fault Code</th>
                                <th>Description</th>
                                <th>Status</th>
                                <th>Detected At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {faults.map(fault => (
                                <tr key={fault.id}>
                                    <td>
                                        <span className={`fault-code ${fault.fault_code.startsWith("P") ? "powertrain" : fault.fault_code.startsWith("C") ? "chassis" : "body"}`}>
                                            {fault.fault_code}
                                        </span>
                                    </td>
                                    <td className="fault-desc">{fault.description}</td>
                                    <td>
                                        <span className={`status-badge ${fault.status === "ACTIVE" ? "status-active" : "status-cleared"}`}>
                                            {fault.status === "ACTIVE" ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                                            {fault.status}
                                        </span>
                                    </td>
                                    <td className="fault-date">{formatDate(fault.detected_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default VehicleHealth;
