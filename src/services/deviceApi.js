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
    if (!response.ok) throw new Error("Failed to send command");
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

  // Get live stream URL
  getLiveUrl: (deviceId, channel = 1) => {
    return `${BASE_URL}/live/live_${deviceId}_ch${channel}.m3u8`;
  },
};

export default deviceApi;
