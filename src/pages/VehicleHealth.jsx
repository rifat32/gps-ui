import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, RefreshCw, ChevronDown, Activity, ShieldAlert, Search } from "lucide-react";
import "./VehicleHealth.css";

const OBD_API = import.meta.env.VITE_OBD_API_URL || "";

const VehicleHealth = () => {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState("");
    const [faults, setFaults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        fetchDevices();
        
        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (!event.target.closest(".vh-custom-select")) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
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

    const handleDeviceSelect = (deviceId) => {
        setSelectedDevice(deviceId);
        setIsDropdownOpen(false);
        setSearchTerm("");
        fetchFaults(deviceId, statusFilter);
    };

    const handleStatusFilter = (val) => {
        setStatusFilter(val);
        fetchFaults(selectedDevice, val);
    };

    const filteredDevices = devices.filter(d => 
        d.device_id.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <div className="vh-custom-select">
                        <div 
                            className={`vh-select-trigger ${isDropdownOpen ? "open" : ""}`}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <Activity size={16} className="trigger-icon" />
                            <span>{selectedDevice || "-- Select Device --"}</span>
                            <ChevronDown size={16} className={`chevron ${isDropdownOpen ? "rotated" : ""}`} />
                        </div>

                        {isDropdownOpen && (
                            <div className="vh-dropdown-menu">
                                <div className="vh-dropdown-search">
                                    <Search size={14} className="search-icon" />
                                    <input 
                                        type="text" 
                                        placeholder="Search Device..." 
                                        autoFocus
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div className="vh-options-list">
                                    {filteredDevices.length > 0 ? (
                                        filteredDevices.map(d => (
                                            <div 
                                                key={d.device_id}
                                                className={`vh-option ${selectedDevice === d.device_id ? "selected" : ""}`}
                                                onClick={() => handleDeviceSelect(d.device_id)}
                                            >
                                                <CheckCircle size={14} className="check-icon" />
                                                {d.device_id}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="vh-no-options">No devices found</div>
                                    )}
                                </div>
                            </div>
                        )}
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
                                <th>Category</th>
                                <th>Description</th>
                                <th>Severity</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>First Occurred</th>
                                <th>Last Active</th>
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
                                    <td className="fault-cat">{fault.category || "General"}</td>
                                    <td className="fault-desc">
                                        {fault.description}
                                        {!fault.drivable && <span className="drivable-warning">⚠️ Non-Drivable</span>}
                                    </td>
                                    <td>
                                        <span className={`severity-badge sev-${(fault.severity || "medium").toLowerCase()}`}>
                                            {fault.severity || "Medium"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`priority-badge prio-${(fault.priority || "none").toLowerCase()}`}>
                                            {fault.priority || "None"}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${fault.status === "ACTIVE" ? "status-active" : "status-cleared"}`}>
                                            {fault.status === "ACTIVE" ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                                            {fault.status}
                                        </span>
                                    </td>
                                    <td className="fault-date">{formatDate(fault.first_occurrence)}</td>
                                    <td className="fault-date">
                                        {fault.last_occurrence ? formatDate(fault.last_occurrence) : "--"}
                                    </td>
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
