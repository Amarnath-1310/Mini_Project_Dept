import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Wifi,
  ShieldCheck,
} from "lucide-react";
import {
  getLiveFlows,
  getLiveInterfaces,
  getLiveStatus,
  startLiveCapture,
  stopLiveCapture,
} from "../data/api";

export default function Monitoring() {
  const [interfaces, setInterfaces] = useState([]);
  const [selectedInterface, setSelectedInterface] = useState("");
  const [status, setStatus] = useState(null);
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    try {
      const [nextStatus, nextFlows] = await Promise.all([
        getLiveStatus(),
        getLiveFlows(50),
      ]);
      setStatus(nextStatus);
      setFlows(Array.isArray(nextFlows?.flows) ? nextFlows.flows : []);
      setError("");
    } catch (err) {
      setError(err.message || "Live traffic service is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getLiveInterfaces()
      .then((result) => {
        const available = Array.isArray(result?.interfaces)
          ? result.interfaces
          : [];
        setInterfaces(available);
        setSelectedInterface(
          available.find((item) => item.is_up)?.name ||
            available[0]?.name ||
            "",
        );
      })
      .catch(() => setError("Network interfaces could not be loaded."));
    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => window.clearInterval(timer);
  }, []);

  async function toggleCapture() {
    setWorking(true);
    setError("");
    try {
      if (status?.running) await stopLiveCapture();
      else await startLiveCapture(selectedInterface, "auto");
      await refresh();
    } catch (err) {
      setError(err.message || "Could not change capture state.");
    } finally {
      setWorking(false);
    }
  }

  const running = Boolean(status?.running);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-sm text-gray-400">
          Loading live traffic controls...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Live Traffic &amp; Threats
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Capture authorized network traffic and analyze flows as they arrive.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedInterface}
            onChange={(event) => setSelectedInterface(event.target.value)}
            disabled={running || working}
            className="input-field w-auto min-w-52 text-sm"
          >
            <option value="">Automatic interface</option>
            {interfaces.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name} {item.ip ? `(${item.ip})` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={toggleCapture}
            disabled={working}
            className={
              running
                ? "btn-danger flex items-center gap-2"
                : "btn-primary flex items-center gap-2"
            }
          >
            {running ? (
              <Square className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {working
              ? "Updating..."
              : running
                ? "Stop Capture"
                : "Start Capture"}
          </button>
          <button
            onClick={refresh}
            className="btn-secondary p-2"
            title="Refresh live traffic"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric
          icon={running ? Activity : Square}
          label="Capture status"
          value={running ? "Running" : "Stopped"}
          tone={running ? "text-emerald-300" : "text-gray-300"}
        />
        <Metric
          icon={Wifi}
          label="Packets captured"
          value={(status?.packets_captured || 0).toLocaleString()}
        />
        <Metric
          icon={Activity}
          label="Flows analyzed"
          value={(status?.flows_analyzed || 0).toLocaleString()}
        />
        <Metric
          icon={AlertTriangle}
          label="Threats detected"
          value={(status?.threats_detected || 0).toLocaleString()}
          tone="text-orange-300"
        />
      </div>
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Recent analyzed flows
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {running
                ? "Updating every 3 seconds"
                : "Start capture to receive live flow records"}
            </p>
          </div>
          <span className="text-xs text-gray-400">{flows.length} shown</span>
        </div>
        {flows.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-cyber-blue opacity-70" />
            <p className="text-sm text-gray-300">No live flows yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Choose an interface and start capture.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-700/60 text-gray-500">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Source</th>
                  <th className="px-5 py-3">Destination</th>
                  <th className="px-5 py-3">Protocol</th>
                  <th className="px-5 py-3">Prediction</th>
                  <th className="px-5 py-3">Confidence</th>
                  <th className="px-5 py-3">Severity</th>
                </tr>
              </thead>
              <tbody>
                {flows.map((flow) => (
                  <tr key={flow.id} className="border-b border-slate-700/40">
                    <td className="whitespace-nowrap px-5 py-3 text-gray-400">
                      {flow.timestamp}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-200">
                      {flow.source_ip}:{flow.source_port}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-gray-200">
                      {flow.destination_ip}:{flow.destination_port}
                    </td>
                    <td className="px-5 py-3 text-gray-400">{flow.protocol}</td>
                    <td
                      className={
                        flow.is_attack
                          ? "px-5 py-3 font-medium text-orange-300"
                          : "px-5 py-3 text-emerald-300"
                      }
                    >
                      {flow.prediction}
                    </td>
                    <td className="px-5 py-3 text-gray-300">
                      {((flow.confidence || 0) * 100).toFixed(1)}%
                    </td>
                    <td className="px-5 py-3">
                      <span className="rounded px-2 py-1 text-gray-300 bg-slate-700/50">
                        {flow.severity || "NONE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500">
        Capture requires permission to inspect the selected interface. The
        configured simulator provides testable flow telemetry when packet
        capture is unavailable.
      </p>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone = "text-white" }) {
  return (
    <div className="stat-card">
      <Icon className="mb-3 h-5 w-5 text-cyber-blue" />
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{label}</p>
    </div>
  );
}
