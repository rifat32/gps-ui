const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const deviceApi = {
  checkStatus: async () => {
    const response = await fetch(`${BASE_URL}/api/status`);
    if (!response.ok) throw new Error("Failed to check status");
    return response.json();
  },

  sendCommand: async (payload) => {
    const response = await fetch(`${BASE_URL}/api/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to send command");
    }
    return response.json();
  },

  getFiles: async (deviceId) => {
    const response = await fetch(`${BASE_URL}/api/files?deviceId=${deviceId}`);
    if (!response.ok) throw new Error("Failed to get files");
    return response.json();
  },

  getGpsData: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}/api/gps?${query}`);
    if (!response.ok) throw new Error("Failed to get GPS data");
    return response.json();
  },

  // Helper to start live stream
  startLive: async (deviceId, channel = 1, socketId = null) => {
    return deviceApi.sendCommand({
      deviceId,
      commandType: "START_LIVE",
      parameters: {
        channel,
        socketId,
      },
    });
  },

  // Get available parameter definitions
  getParameterList: async (category = "") => {
    const url = category ? `${BASE_URL}/api/parameters/list?category=${category}` : `${BASE_URL}/api/parameters/list`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to get parameter list");
    return response.json();
  },

  // Query live parameter values from device
  queryParams: async (deviceId, paramIds) => {
    const response = await fetch(`${BASE_URL}/api/device/query-params`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, parameters: { paramIds } }),
    });
    if (!response.ok) throw new Error("Failed to query parameters");
    return response.json();
  },

  // Update parameters on the device
  setParams: async (deviceId, category, settings) => {
    const response = await fetch(`${BASE_URL}/api/device/set-params`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, category, settings }),
    });
    if (!response.ok) throw new Error("Failed to set parameters");
    return response.json();
  },

  // Get cached settings from server
  getSettings: async (deviceId) => {
    const response = await fetch(`${BASE_URL}/api/v2/devices/${deviceId}/settings`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to get settings");
    }
    return response.json();
  },

  // Get extraction telemetry (read-only diagnostics)
  getTelemetry: async (deviceId, category) => {
    const response = await fetch(`${BASE_URL}/api/v2/devices/${deviceId}/telemetry/${category}`);
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to get telemetry");
    }
    return response.json();
  },

  // Get available parameter definitions
  getLiveUrl: (deviceId, channel = 1) => {
    return `${BASE_URL}/live/live_${deviceId}_ch${channel}.m3u8`;
  },

  getAiEvents: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}/api/ai-events?${query}`);
    if (!response.ok) throw new Error("Failed to get AI events");
    return response.json();
  },

  getDevices: async () => {
    const response = await fetch(`${BASE_URL}/api/devices`);
    if (!response.ok) throw new Error("Failed to fetch devices");
    return response.json();
  },

  getDevicesV2: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}/api/devices/v2?${query}`);
    if (!response.ok) throw new Error("Failed to fetch devices V2");
    return response.json();
  },

  createDevice: async (data) => {
    const response = await fetch(`${BASE_URL}/api/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to create device");
    }
    return response.json();
  },

  updateDevice: async (deviceId, data) => {
    const response = await fetch(`${BASE_URL}/api/devices/${deviceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update device");
    }
    return response.json();
  },

  deleteDevice: async (deviceId) => {
    const response = await fetch(`${BASE_URL}/api/devices/${deviceId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to delete device");
    }
    return response.json();
  },

};

export default deviceApi;
