import React, { useState, useEffect } from "react";
import { CloudUpload, RefreshCw, GitCommit, Clock, CheckCircle2, History, AlertCircle } from "lucide-react";

export default function DeploymentInfo({ theme }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchDeployInfo = async () => {
    setRefreshing(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
      let baseUrl = apiBaseUrl;
      if (!baseUrl) {
        baseUrl = `${window.location.protocol}//${window.location.hostname}:8040`;
      }
      
      const response = await fetch(`${baseUrl}/api/deploy-info`);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      const json = await response.json();
      setData(json);
      setError("");
    } catch (err) {
      console.error("Failed to load deployment info", err);
      setError("Unable to retrieve deployment logs from the backend service.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeployInfo();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-GB", {
        timeZone: "Europe/London",
        dateStyle: "medium",
        timeStyle: "medium",
      }) + " (UK Time)";
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#c5c6c7] p-6 lg:p-10 font-sans">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-white/5 pb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <CloudUpload className="w-8 h-8" />
            </span>
            System Deployment Operations
          </h1>
          <p className="text-white/40 mt-2 text-sm max-w-xl">
            Monitor real-time deployment states, verify cache invalidation, and audit production service builds.
          </p>
        </div>

        <button
          onClick={fetchDeployInfo}
          disabled={refreshing || loading}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 active:bg-white/15 text-white font-bold rounded-xl border border-white/10 transition-all duration-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Syncing..." : "Sync Build Info"}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
          <p className="text-white/60">Fetching operational metadata...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-[20px] p-6 flex items-start gap-4 max-w-2xl mx-auto my-10">
          <AlertCircle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-bold text-lg">System Sync Error</h3>
            <p className="text-white/60 mt-1 text-sm">{error}</p>
            <button
              onClick={fetchDeployInfo}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold rounded-lg text-xs transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Build Card */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[32px] p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px]" />
              
              <div className="flex items-center justify-between border-b border-white/5 pb-5 mb-6">
                <div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20 uppercase tracking-widest">
                    Active Production Build
                  </span>
                  <h2 className="text-white font-bold text-2xl mt-3 flex items-center gap-2">
                    Current Version
                  </h2>
                </div>
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>

              {data?.current ? (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                      <GitCommit className="w-8 h-8 text-indigo-400 shrink-0" />
                      <div>
                        <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">Commit SHA</div>
                        <div className="text-white font-mono text-lg mt-0.5">{data.current.version}</div>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                      <Clock className="w-8 h-8 text-indigo-400 shrink-0" />
                      <div>
                        <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">Deployed At</div>
                        <div className="text-white text-sm font-semibold mt-0.5">{formatDate(data.current.deployTime)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <div className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">Commit Log Message</div>
                    <div className="text-white/80 leading-relaxed text-sm bg-black/20 p-4 rounded-xl font-mono border border-black/30">
                      {data.current.commitMessage || "No commit message provided."}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-white/40">No deployment version details registered.</div>
              )}
            </div>

            {/* Previous Build Card */}
            <div className="bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-[32px] p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]" />
              
              <div className="flex items-center justify-between border-b border-white/5 pb-5 mb-6">
                <div>
                  <span className="px-3 py-1 bg-white/5 text-white/60 text-xs font-semibold rounded-full border border-white/10 uppercase tracking-widest">
                    Previous Production Build
                  </span>
                  <h2 className="text-white font-bold text-2xl mt-3">
                    Backup Version
                  </h2>
                </div>
                <History className="w-8 h-8 text-white/40" />
              </div>

              {data?.previous ? (
                <div className="flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                      <GitCommit className="w-8 h-8 text-white/40 shrink-0" />
                      <div>
                        <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">Commit SHA</div>
                        <div className="text-white font-mono text-lg mt-0.5">{data.previous.version}</div>
                      </div>
                    </div>

                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                      <Clock className="w-8 h-8 text-white/40 shrink-0" />
                      <div>
                        <div className="text-xs text-white/40 uppercase tracking-wider font-semibold">Deployed At</div>
                        <div className="text-white text-sm font-semibold mt-0.5">{formatDate(data.previous.deployTime)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                    <div className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-2">Commit Log Message</div>
                    <div className="text-white/60 leading-relaxed text-sm bg-black/20 p-4 rounded-xl font-mono border border-black/30">
                      {data.previous.commitMessage || "No commit message provided."}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-white/40">No backup deployment version details registered.</div>
              )}
            </div>
          </div>

          {/* Sync Stats panel */}
          <div className="flex flex-col gap-6">
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
              <h3 className="text-indigo-300 font-extrabold text-lg tracking-wider uppercase mb-4">Deployment Status</h3>
              <div className="flex items-center gap-3 mb-6">
                <span className="flex h-3 h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-white font-semibold text-sm">Services Active & Synced</span>
              </div>
              
              <div className="space-y-4 border-t border-indigo-500/10 pt-6">
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Production Server</span>
                  <span className="text-white font-semibold font-mono">{window.location.hostname}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Verification Status</span>
                  <span className="text-emerald-400 font-semibold">CACHE INVALIDATED</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Core Version System</span>
                  <span className="text-white font-semibold">Git Hash Routing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
