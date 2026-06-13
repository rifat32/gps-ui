import { formatDeviceDateTime } from "../utils/deviceTime";
import { GRAPHQL_URL } from "./authApi";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const OBD_API_BASE_URL = import.meta.env.VITE_OBD_API_URL || "";

const getAuthHeaders = (extraHeaders = {}) => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return extraHeaders;
  
  try {
    const user = JSON.parse(userStr);
    const token = user.accessToken || user.token;
    return {
      ...extraHeaders,
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    };
  } catch (e) {
    console.error("Error parsing user in deviceApi:", e);
    return extraHeaders;
  }
};

const fetchWithAuth = async (url, options = {}) => {
  const headers = getAuthHeaders(options.headers || {});
  
  const response = await fetch(url, {
    ...options,
    headers
  });

  // fetchInterceptor already handles 401, but we keep this as a secondary safety
  if (response.status === 401) {
    console.warn("🔐 Session expired in deviceApi. Redirecting...");
    localStorage.removeItem("user");
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
    throw new Error("Unauthorized");
  }

  return response;
};

const deviceIdToUuidMap = new Map();

const fetchGraphql = async (query, variables = {}) => {
  const response = await fetchWithAuth(GRAPHQL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  
  if (!response.ok) {
    throw new Error(`GraphQL query failed: ${response.statusText}`);
  }
  
  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0].message);
  }
  
  return result.data;
};

const findUuidByDeviceId = async (deviceId) => {
  const query = `
    query GetAllDevices($deviceQueryInput: DeviceQueryInput!) {
      getAllDevices(deviceQueryInput: $deviceQueryInput) {
        data {
          id
          deviceId
        }
      }
    }
  `;
  try {
    const data = await fetchGraphql(query, { deviceQueryInput: { deviceId } });
    const found = data.getAllDevices?.data?.[0];
    if (found && found.deviceId === deviceId) {
      deviceIdToUuidMap.set(deviceId, found.id);
      return found.id;
    }
  } catch (e) {
    console.error("Error finding UUID for device:", e);
  }
  return null;
};

const mapParamsToQueryInput = (params = {}) => {
  const input = {};
  if (params.device_type) {
    input.deviceType = params.device_type;
  }
  if (params.status) {
    input.status = params.status;
  }
  if (params.imei) {
    input.imei = params.imei;
  }
  if (params.deviceId) {
    input.deviceId = params.deviceId;
  }
  return input;
};

const deviceApi = {
  checkStatus: async () => {
    const response = await fetchWithAuth(`${BASE_URL}/api/status`);
    if (!response.ok) throw new Error("Failed to check status");
    return response.json();
  },

  sendCommand: async (payload) => {
    const response = await fetchWithAuth(`${BASE_URL}/api/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to send command");
    }
    return response.json();
  },

  getFiles: async (deviceId) => {
    const response = await fetchWithAuth(`${BASE_URL}/api/files?deviceId=${deviceId}`);
    if (!response.ok) throw new Error("Failed to get files");
    return response.json();
  },

  getGpsData: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithAuth(`${BASE_URL}/api/gps?${query}`);
    if (!response.ok) throw new Error("Failed to get GPS data");
    return response.json();
  },

  getLiveGpsData: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithAuth(`${BASE_URL}/api/live/gps?${query}`);
    if (!response.ok) throw new Error("Failed to get Live GPS data");
    return response.json();
  },

  // Helper to start live stream
  // Use the existing REST command path only.
  // Do not call GraphQL here; the old REST path is the working live-control flow.
  startLive: async (deviceId, channel = 1, socketId = null, streamType = 0) => {
    return deviceApi.sendCommand({
      deviceId,
      commandType: "START_LIVE",
      parameters: {
        channel: Number(channel) || 1,
        streamType: Number(streamType) || 0,
        ...(socketId ? { socketId } : {}),
      },
    });
  },

  // Get available parameter definitions
  getParameterList: async (category = "") => {
    const url = category ? `${BASE_URL}/api/parameters/list?category=${category}` : `${BASE_URL}/api/parameters/list`;
    const response = await fetchWithAuth(url);
    if (!response.ok) throw new Error("Failed to get parameter list");
    return response.json();
  },

  // Query live parameter values from device
  queryParams: async (deviceId, paramIds) => {
    const response = await fetchWithAuth(`${BASE_URL}/api/device/query-params`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, parameters: { paramIds } }),
    });
    if (!response.ok) throw new Error("Failed to query parameters");
    return response.json();
  },

  // Update parameters on the device
  setParams: async (deviceId, category, settings) => {
    const response = await fetchWithAuth(`${BASE_URL}/api/device/set-params`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, category, settings }),
    });
    if (!response.ok) throw new Error("Failed to set parameters");
    return response.json();
  },

  updateSettingsBatch: async (deviceId, settings) => {
    const response = await fetchWithAuth(`${BASE_URL}/api/v2/devices/${deviceId}/settings/batch`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to update settings batch");
    }
    return response.json();
  },

  // Get cached settings from server
  getSettings: async (deviceId) => {
    const response = await fetchWithAuth(`${BASE_URL}/api/v2/devices/${deviceId}/settings`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to get settings");
    }
    return response.json();
  },

  // Get extraction telemetry (read-only diagnostics)
  getTelemetry: async (deviceId, category) => {
    const response = await fetchWithAuth(`${BASE_URL}/api/v2/devices/${deviceId}/telemetry/${category}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to get telemetry");
    }
    return response.json();
  },

  getDeviceCommandCatalog: async () => {
    const response = await fetchWithAuth(`${OBD_API_BASE_URL}/api/obd/device/commands/catalog`);
    if (!response.ok) throw new Error("Failed to get OBD command catalog");
    return response.json();
  },

  getOnlineObdCommandDevices: async () => {
    const response = await fetchWithAuth(`${OBD_API_BASE_URL}/api/obd/device/commands/online`);
    if (!response.ok) throw new Error("Failed to get online OBD devices");
    return response.json();
  },

  sendTextCommand: async (deviceId, textCommand) => {
    const response = await fetchWithAuth(`${OBD_API_BASE_URL}/api/obd/device/commands/send-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, textCommand }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Failed to send OBD text command");
    return data;
  },

  setTimeslotCommand: async (deviceId, values) => {
    const response = await fetchWithAuth(`${OBD_API_BASE_URL}/api/obd/device/commands/set-timeslot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, values }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Failed to send OBD AT+TIMESLOT command");
    return data;
  },

  setTerminalServerCommand: async (deviceId, serverHost, serverPort) => {
    const response = await fetchWithAuth(`${OBD_API_BASE_URL}/api/obd/device/commands/set-server`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, serverHost, serverPort }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Failed to set OBD terminal server parameters");
    return data;
  },

  // Get available parameter definitions
  getLiveUrl: (deviceId, channel = 1) => {
    return `${BASE_URL}/live/live_${deviceId}_ch${channel}.m3u8`;
  },

  getAiEvents: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const response = await fetchWithAuth(`${BASE_URL}/api/ai-events?${query}`);
    if (!response.ok) throw new Error("Failed to get AI events");
    return response.json();
  },

  getDevices: async () => {
    return deviceApi.getDevicesV2();
  },

  getDevicesV2: async (params = {}) => {
    const input = mapParamsToQueryInput(params);
    const query = `
      query GetAllDevices($deviceQueryInput: DeviceQueryInput!) {
        getAllDevices(deviceQueryInput: $deviceQueryInput) {
          success
          data {
            id
            deviceId
            updatedAt
            liveStatus
            lastSeenAt
            deviceType
            imei
            simNumber
            name
            status
            batteryVoltage
            externalVoltage
            obdProfile {
              protocol
            }
            dashcamProfile {
              dashcamType
              channelCount
            }
            j42Profile {
              protocol
            }
          }
        }
      }
    `;
    const data = await fetchGraphql(query, { deviceQueryInput: input });
    const rawDevices = data.getAllDevices?.data || [];
    
    const mapped = rawDevices.map(d => {
      deviceIdToUuidMap.set(d.deviceId, d.id);
      return {
        id: d.deviceId,
        name: d.name,
        imei: d.imei,
        device_type: d.deviceType,
        status: d.status,
        liveStatus: d.liveStatus || (d.status === "ONLINE" ? "Online" : "Offline"),
        model: d.dashcamProfile?.dashcamType || d.obdProfile?.protocol || d.j42Profile?.protocol || "",
        fwVersion: "N/A",
        iccid: d.simNumber || "N/A",
        lastSeen: d.lastSeenAt ? formatDeviceDateTime(d.lastSeenAt) : "Never",
        batteryVoltage: d.batteryVoltage || null,
        externalVoltage: d.externalVoltage || null
      };
    });
    return { success: true, data: mapped };
  },

  createDevice: async (data) => {
    const input = {
      deviceId: data.deviceId,
      deviceType: data.device_type,
      imei: data.imei,
      simNumber: data.simNumber || data.imei || "",
      name: data.name,
      isRegistered: true,
    };
    
    if (data.device_type === "AI_DASHCAM") {
      input.dashcamProfile = {
        dashcamType: "DUAL_FACING_AI_DASHCAM",
        channelCount: 2
      };
    } else if (data.device_type === "OBD") {
      input.obdProfile = {
        protocol: data.model || "OBD-II"
      };
    } else if (data.device_type === "J42") {
      input.j42Profile = {
        protocol: data.model || "J42"
      };
    }

    const mutation = `
      mutation CreateDevice($createDeviceInput: CreateDeviceInput!) {
        createDevice(createDeviceInput: $createDeviceInput) {
          success
          message
          data {
            id
            deviceId
            deviceType
            name
            status
          }
        }
      }
    `;

    const res = await fetchGraphql(mutation, { createDeviceInput: input });
    const createdDevice = res.createDevice?.data;
    if (createdDevice) {
      deviceIdToUuidMap.set(createdDevice.deviceId, createdDevice.id);
      return {
        success: true,
        data: {
          id: createdDevice.deviceId,
          device_type: createdDevice.deviceType,
          name: createdDevice.name,
          status: createdDevice.status
        }
      };
    }
    throw new Error("Failed to create device");
  },

  updateDevice: async (deviceId, data) => {
    const uuid = deviceIdToUuidMap.get(deviceId) || await findUuidByDeviceId(deviceId);
    if (!uuid) {
      throw new Error(`Could not find internal ID for device ${deviceId}`);
    }

    const input = {
      name: data.name,
      simNumber: data.simNumber || data.imei || "",
      isRegistered: true
    };

    if (data.device_type === "AI_DASHCAM") {
      input.dashcamProfile = {
        dashcamType: "DUAL_FACING_AI_DASHCAM",
        channelCount: 2
      };
    } else if (data.device_type === "OBD") {
      input.obdProfile = {
        protocol: data.model || "OBD-II"
      };
    } else if (data.device_type === "J42") {
      input.j42Profile = {
        protocol: data.model || "J42"
      };
    }

    const mutation = `
      mutation UpdateDevice($id: ID!, $updateDeviceInput: UpdateDeviceInput!) {
        updateDevice(id: $id, updateDeviceInput: $updateDeviceInput) {
          success
          message
          data {
            id
            deviceId
            deviceType
            name
            status
          }
        }
      }
    `;

    const res = await fetchGraphql(mutation, { id: uuid, updateDeviceInput: input });
    const updatedDevice = res.updateDevice?.data;
    if (updatedDevice) {
      return {
        success: true,
        data: {
          id: updatedDevice.deviceId,
          device_type: updatedDevice.deviceType,
          name: updatedDevice.name,
          status: updatedDevice.status
        }
      };
    }
    throw new Error("Failed to update device");
  },

  deleteDevice: async (deviceId) => {
    const uuid = deviceIdToUuidMap.get(deviceId) || await findUuidByDeviceId(deviceId);
    if (!uuid) {
      throw new Error(`Could not find internal ID for device ${deviceId}`);
    }

    const mutation = `
      mutation DeleteDevice($id: ID!) {
        deleteDevice(id: $id) {
          success
        }
      }
    `;

    const res = await fetchGraphql(mutation, { id: uuid });
    if (res.deleteDevice?.success) {
      deviceIdToUuidMap.delete(deviceId);
      return { success: true };
    }
    throw new Error("Failed to delete device");
  },

  // Trigger FRP tunnel — sends wake-up command to dashcam and returns the login URL
  triggerRemoteSettings: async (deviceId) => {
    const response = await fetchWithAuth(`${BASE_URL}/api/v2/devices/${deviceId}/remote-settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Failed to trigger remote settings tunnel");
    }
    return data;
  },
};

export default deviceApi;
