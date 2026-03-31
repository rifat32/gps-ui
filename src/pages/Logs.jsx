import React, { useState, useEffect } from "react";
import axios from "axios";
import { FileText, Calendar, HardDrive, RefreshCw, Download, Search } from "lucide-react";

// Assuming API_BASE_URL is handled via proxy or env, matching existing patterns
const API_BASE = "/api";

const Logs = ({ theme }) => {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [logContent, setLogContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchDates();
  }, []);

  const fetchDates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/logs/dates`);
      if (response.data.success) {
        setDates(response.data.dates);
        if (response.data.dates.length > 0) {
          // Auto-select latest date
          // setSelectedDate(response.data.dates[0]);
        }
      }
    } catch (err) {
      setError("Failed to fetch log dates");
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async (date) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/logs/dates/${date}/devices`);
      if (response.data.success) {
        setDevices(response.data.devices);
        setLogContent("");
        setSelectedDevice("");
      }
    } catch (err) {
      setError("Failed to fetch devices for this date");
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (date, deviceId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/logs/dates/${date}/devices/${deviceId}`);
      if (response.data.success) {
        setLogContent(response.data.content);
      }
    } catch (err) {
      setError("Failed to fetch log content");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    setSelectedDate(val);
    if (val) fetchDevices(val);
    else {
      setDevices([]);
      setSelectedDevice("");
      setLogContent("");
    }
  };

  const handleDeviceChange = (e) => {
    const val = e.target.value;
    setSelectedDevice(val);
    if (val && selectedDate) fetchLogs(selectedDate, val);
    else setLogContent("");
  };

  const filteredLogs = logContent
    .split("\n")
    .filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase()))
    .join("\n");

  const downloadLogs = () => {
    const blob = new Blob([logContent], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raw_logs_${selectedDate}_${selectedDevice}.log`;
    a.click();
  };

  return (
    <div className={`logs-page p-6 ${theme === "dark" ? "text-white" : "text-gray-800"}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">System Communication Logs</h1>
            <p className="text-sm opacity-60">View raw hex data from connected devices</p>
          </div>
        </div>
        <button 
          onClick={() => selectedDate && selectedDevice ? fetchLogs(selectedDate, selectedDevice) : fetchDates()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-3">
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto hover:opacity-70">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Selectors */}
        <div className={`p-5 rounded-xl border ${theme === "dark" ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"} shadow-sm`}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider opacity-60 flex items-center gap-2">
                <Calendar size={14} /> Select Log Date
              </label>
              <select 
                value={selectedDate} 
                onChange={handleDateChange}
                className={`w-full p-2.5 rounded-lg border outline-none transition-all ${
                  theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
                } focus:border-blue-500`}
              >
                <option value="">-- Select Date --</option>
                {dates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider opacity-60 flex items-center gap-2">
                <HardDrive size={14} /> Select Device ID
              </label>
              <select 
                value={selectedDevice} 
                onChange={handleDeviceChange}
                disabled={!selectedDate}
                className={`w-full p-2.5 rounded-lg border outline-none transition-all ${
                  theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
                } focus:border-blue-500 disabled:opacity-50`}
              >
                <option value="">{selectedDate ? "-- Select Device --" : "-- Select a date first --"}</option>
                {devices.map((dev) => (
                  <option key={dev} value={dev}>{dev}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Search & Actions */}
        <div className={`p-5 rounded-xl border ${theme === "dark" ? "bg-gray-900/50 border-gray-800" : "bg-white border-gray-200"} shadow-sm flex flex-col justify-between`}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider opacity-60 flex items-center gap-2">
              <Search size={14} /> Filter Output
            </label>
            <input 
              type="text" 
              placeholder="Search in hex data or direction..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full p-2.5 rounded-lg border outline-none transition-all ${
                theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
              } focus:border-blue-500`}
            />
          </div>
          <button
            onClick={downloadLogs}
            disabled={!logContent}
            className={`mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
              logContent 
                ? "bg-green-600/10 border-green-600/20 text-green-500 hover:bg-green-600/20" 
                : "opacity-40 cursor-not-allowed border-gray-700"
            }`}
          >
            <Download size={18} />
            Download Log File
          </button>
        </div>
      </div>

      {/* Log Viewer */}
      <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "bg-black/40 border-gray-800" : "bg-gray-50 border-gray-200"}`}>
        <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-mono opacity-50 ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}>
          <span>raw_logs.log output</span>
          {selectedDevice && <span>Device: {selectedDevice}</span>}
        </div>
        <div className="h-[500px] overflow-auto p-4 font-mono text-sm leading-relaxed">
          {logContent ? (
            <pre className="whitespace-pre-wrap">
              {filteredLogs || <span className="opacity-30 italic">No matches for current filter</span>}
            </pre>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 italic">
              {loading ? "Loading logs..." : "Select a date and device to view logs"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Logs;
