import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Send, Server, SlidersHorizontal, Terminal, Wifi } from "lucide-react";
import deviceApi from "../services/deviceApi";

const DEFAULT_TIMESLOT = [30, 5, 60, 0, 360, 3];

export default function DeviceCommands({ theme }) {
  const [selectedDevice, setSelectedDevice] = useState("");
  const [devices, setDevices] = useState({ active: [], historical: [] });
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const [serverForm, setServerForm] = useState({ serverHost: "s18.iotdat.com", serverPort: 7018 });
  const [timeslotValues, setTimeslotValues] = useState(DEFAULT_TIMESLOT);
  const [textCommand, setTextCommand] = useState("AT+TIMESLOT=30,5,60,0,360,3;");

  const isDark = theme === "dark";
  const activeDevices = useMemo(() => devices.active || [], [devices.active]);
  const offlineDevices = useMemo(() => devices.historical || [], [devices.historical]);

  const showNotice = (message, type = "success") => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 6000);
  };

  const fetchDevices = async () => {
    try {
      const res = await deviceApi.getOnlineObdCommandDevices();
      if (res.success) {
        const active = res.devices || [];
        setDevices({ active, historical: [] });
        if (!selectedDevice && active.length > 0) setSelectedDevice(active[0]);
      }
    } catch (error) {
      showNotice(error.message || "Failed to load devices", "error");
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await deviceApi.getDeviceCommandCatalog();
      if (res.success) setCatalog(res.data || []);
    } catch (error) {
      console.error("Command catalog load failed", error);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCommand = async (action) => {
    if (!selectedDevice) {
      showNotice("Please select an online device first.", "error");
      return;
    }

    setLoading(true);
    setLastResult(null);
    try {
      const result = await action();
      setLastResult(result);
      showNotice(result.ackReceived ? "Command sent and confirmed by device." : "Command sent. Device ACK was not confirmed before timeout.", result.ackReceived ? "success" : "warning");
    } catch (error) {
      showNotice(error.message || "Command failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const updateTimeslot = (index, value) => {
    setTimeslotValues((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const cardClass = `rounded-2xl border p-5 shadow-sm ${isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"}`;
  const inputClass = `w-full rounded-xl border px-3 py-2 text-sm outline-none ${isDark ? "bg-slate-950 border-slate-700 text-white" : "bg-white border-slate-300 text-slate-900"}`;
  const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-600 p-3 text-white"><Terminal size={24} /></div>
              <div>
                <h1 className="text-2xl font-bold">OBD Device Commands</h1>
                <p className={isDark ? "text-slate-400" : "text-slate-600"}>Safe J63S / 4G-OBD settings commands only. This page does not change any existing tab.</p>
              </div>
            </div>
          </div>
          <button className={buttonClass} onClick={fetchDevices} disabled={loading}>
            <RefreshCw size={16} /> Refresh Devices
          </button>
        </div>

        {notice && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === "error" ? "border-red-300 bg-red-50 text-red-700" : notice.type === "warning" ? "border-amber-300 bg-amber-50 text-amber-700" : "border-green-300 bg-green-50 text-green-700"}`}>
            {notice.message}
          </div>
        )}

        <div className={cardClass}>
          <label className="mb-2 block text-sm font-semibold">Online OBD Device</label>
          <select className={inputClass} value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
            <option value="">Select a connected device</option>
            {activeDevices.map((deviceId) => <option key={deviceId} value={deviceId}>{deviceId} - Online</option>)}
          </select>
          {offlineDevices.length > 0 && (
            <p className={`mt-2 text-xs ${isDark ? "text-slate-500" : "text-slate-500"}`}>Offline OBD devices are hidden because commands require a writable OBD TCP connection.</p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className={cardClass}>
            <div className="mb-4 flex items-center gap-3">
              <Server className="text-blue-500" size={22} />
              <div>
                <h2 className="text-lg font-bold">Set Terminal Server Parameters</h2>
                <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-600"}>Message ID 0x8103. Uses parameter 0x00000013 for host and 0x00000018 for TCP port.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">Server Host / Domain</label>
                <input className={inputClass} value={serverForm.serverHost} onChange={(e) => setServerForm((p) => ({ ...p, serverHost: e.target.value }))} placeholder="s18.iotdat.com" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">TCP Port</label>
                <input className={inputClass} type="number" min="1" max="65535" value={serverForm.serverPort} onChange={(e) => setServerForm((p) => ({ ...p, serverPort: e.target.value }))} />
              </div>
              <button className={buttonClass} disabled={loading || !selectedDevice} onClick={() => runCommand(() => deviceApi.setTerminalServerCommand(selectedDevice, serverForm.serverHost, Number(serverForm.serverPort)))}>
                <Send size={16} /> Send 0x8103
              </button>
            </div>
          </section>

          <section className={cardClass}>
            <div className="mb-4 flex items-center gap-3">
              <Wifi className="text-blue-500" size={22} />
              <div>
                <h2 className="text-lg font-bold">Set Signal Sending Frequency</h2>
                <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-600"}>Message ID 0x8300. Sends AT+TIMESLOT with all six numeric values.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {timeslotValues.map((value, index) => (
                <div key={index}>
                  <label className="mb-1 block text-xs font-semibold">Value {index + 1}</label>
                  <input className={inputClass} type="number" min="0" max="86400" value={value} onChange={(e) => updateTimeslot(index, e.target.value)} />
                </div>
              ))}
            </div>
            <div className={`mt-3 rounded-xl p-3 font-mono text-xs ${isDark ? "bg-slate-950 text-slate-300" : "bg-slate-100 text-slate-700"}`}>
              AT+TIMESLOT={timeslotValues.join(",")};
            </div>
            <button className={`${buttonClass} mt-4`} disabled={loading || !selectedDevice} onClick={() => runCommand(() => deviceApi.setTimeslotCommand(selectedDevice, timeslotValues.map(Number)))}>
              <Send size={16} /> Send AT+TIMESLOT
            </button>
          </section>
        </div>

        <section className={cardClass}>
          <div className="mb-4 flex items-center gap-3">
            <SlidersHorizontal className="text-blue-500" size={22} />
            <div>
              <h2 className="text-lg font-bold">Raw Text / AT Command Downlink</h2>
              <p className={isDark ? "text-sm text-slate-400" : "text-sm text-slate-600"}>Message ID 0x8300. Use carefully. The default value is the J63S example command.</p>
            </div>
          </div>
          <textarea className={`${inputClass} min-h-24 font-mono`} value={textCommand} onChange={(e) => setTextCommand(e.target.value)} maxLength={256} />
          <button className={`${buttonClass} mt-4`} disabled={loading || !selectedDevice} onClick={() => runCommand(() => deviceApi.sendTextCommand(selectedDevice, textCommand))}>
            <Send size={16} /> Send Text Command
          </button>
        </section>

        <section className={cardClass}>
          <h2 className="mb-3 text-lg font-bold">Available Commands</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {catalog.map((item) => (
              <div key={item.key} className={`rounded-xl border p-3 ${isDark ? "border-slate-800 bg-slate-950" : "border-slate-200 bg-slate-50"}`}>
                <div className="text-sm font-bold">{item.label}</div>
                <div className="mt-1 text-xs opacity-70">{item.messageId}</div>
                <p className="mt-2 text-xs opacity-80">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {lastResult && (
          <section className={cardClass}>
            <h2 className="mb-3 text-lg font-bold">Last Command Result</h2>
            <pre className={`overflow-auto rounded-xl p-4 text-xs ${isDark ? "bg-slate-950 text-slate-300" : "bg-slate-100 text-slate-800"}`}>{JSON.stringify(lastResult, null, 2)}</pre>
          </section>
        )}
      </div>
    </div>
  );
}
