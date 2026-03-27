const BASE_URL = "http://54.37.225.65:4020";

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
  startLive: async (deviceId, channel = 1) => {
    return deviceApi.sendCommand({
      deviceId,
      commandType: "START_LIVE",
      parameters: {
        serverIP: "54.37.225.65",
        port: 3377,
        channel,
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
    const response = await fetch(`${BASE_URL}/api/recording-settings?deviceId=${deviceId}`);
    if (!response.ok) throw new Error("Failed to get recording settings");
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

  getDevicesV2: async () => {
    const response = await fetch(`${BASE_URL}/api/devices/v2`);
    if (!response.ok) throw new Error("Failed to fetch devices V2");
    return response.json();
  },
};

export default deviceApi;
