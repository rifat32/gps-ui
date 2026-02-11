import { Monitor } from "lucide-react";

function DeviceCard({ dev, selectedDevice, setSelectedDevice }) {
  return (
    <div
      onClick={() => setSelectedDevice(dev)}
      style={{
        margin: "4px 0",
        padding: "12px 14px",
        cursor: "pointer",
        background: selectedDevice.id === dev.id ? "#3b82f615" : "transparent",
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        transition: "all 0.2s",
        border:
          selectedDevice.id === dev.id
            ? "1px solid #3b82f633"
            : "1px solid transparent",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 40,
          height: 40,
          background: dev.status === "online" ? "#22c55e10" : "#47556910",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Monitor
          size={20}
          color={dev.status === "online" ? "#22c55e" : "#475569"}
        />
        {dev.status === "online" && (
          <div
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 10,
              height: 10,
              background: "#22c55e",
              borderRadius: "50%",
              border: "2px solid #0f172a",
            }}
          ></div>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: "14px", fontWeight: "700" }}>{dev.name}</div>
        <div
          style={{
            fontSize: "11px",
            color: "#475569",
            fontWeight: "500",
          }}
        >
          {dev.id}
        </div>
      </div>
      {dev.alert !== "none" && (
        <div
          style={{
            width: 8,
            height: 8,
            background: "#ef4444",
            borderRadius: "50%",
            boxShadow: "0 0 8px #ef4444",
          }}
        ></div>
      )}
    </div>
  );
}

export default DeviceCard;
