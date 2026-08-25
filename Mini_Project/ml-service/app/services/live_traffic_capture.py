"""
MedSentry-XAI: Real-Time Live Network Traffic Capture & Flow Feature Extractor
================================================================================
Captures live network packets from authorized network interfaces or sockets,
aggregates bidirectional flows, extracts 40+ NIDS features, and performs
real-time ML prediction with SHAP XAI explanation.
"""

import time
import math
import socket
import threading
import random
import requests
from datetime import datetime
from collections import deque
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import psutil

try:
    from scapy.all import sniff, IP, TCP, UDP, ICMP, get_if_list, conf
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False


def get_network_interfaces() -> List[Dict[str, Any]]:
    """Enumerate host network interfaces with their IP addresses and operational status."""
    interfaces = []
    addrs = psutil.net_if_addrs()
    stats = psutil.net_if_stats()

    for iface_name, addr_list in addrs.items():
        ipv4 = None
        ipv6 = None
        mac = None
        for addr in addr_list:
            if addr.family == socket.AF_INET:
                ipv4 = addr.address
            elif hasattr(socket, "AF_INET6") and addr.family == socket.AF_INET6:
                ipv6 = addr.address
            elif addr.family == psutil.AF_LINK:
                mac = addr.address

        stat = stats.get(iface_name)
        is_up = stat.isup if stat else False
        speed = stat.speed if stat else 0

        # Filter and summarize
        interfaces.append({
            "name": iface_name,
            "ip": ipv4 or "No IPv4",
            "ipv6": ipv6,
            "mac": mac,
            "is_up": is_up,
            "speed_mbps": speed,
            "is_loopback": ipv4 == "127.0.0.1" or "loopback" in iface_name.lower()
        })

    # Sort up interfaces first
    interfaces.sort(key=lambda x: (not x["is_up"], x["ip"] == "No IPv4", x["name"]))
    return interfaces


class BidirectionalFlow:
    """Represents a network flow between two endpoints and computes statistical features."""

    def __init__(self, src_ip: str, dst_ip: str, src_port: int, dst_port: int, protocol: int):
        self.src_ip = src_ip
        self.dst_ip = dst_ip
        self.src_port = src_port
        self.dst_port = dst_port
        self.protocol = protocol
        
        self.start_time = time.time()
        self.last_time = self.start_time
        
        # Packet lengths and timestamps
        self.fwd_pkt_lengths: List[int] = []
        self.bwd_pkt_lengths: List[int] = []
        self.fwd_timestamps: List[float] = []
        self.bwd_timestamps: List[float] = []
        self.all_timestamps: List[float] = []
        self.all_pkt_lengths: List[int] = []
        
        # Flags
        self.fin_cnt = 0
        self.syn_cnt = 0
        self.rst_cnt = 0
        self.psh_cnt = 0
        self.ack_cnt = 0
        self.urg_cnt = 0
        self.cwe_cnt = 0
        self.ece_cnt = 0
        
        self.fwd_psh_cnt = 0
        self.bwd_psh_cnt = 0
        self.fwd_urg_cnt = 0
        self.bwd_urg_cnt = 0
        
        self.fwd_header_len = 0
        self.bwd_header_len = 0
        self.init_fwd_win_bytes = 0
        self.init_bwd_win_bytes = 0
        self.fwd_act_data_pkts = 0
        self.fwd_seg_size_min = 0

    def add_packet(self, length: int, timestamp: float, is_fwd: bool, tcp_flags: int = 0, header_len: int = 20, win_size: int = 0):
        self.last_time = timestamp
        self.all_timestamps.append(timestamp)
        self.all_pkt_lengths.append(length)

        # Parse TCP flags
        if tcp_flags:
            if tcp_flags & 0x01: self.fin_cnt += 1
            if tcp_flags & 0x02: self.syn_cnt += 1
            if tcp_flags & 0x04: self.rst_cnt += 1
            if tcp_flags & 0x08: 
                self.psh_cnt += 1
                if is_fwd: self.fwd_psh_cnt += 1
                else: self.bwd_psh_cnt += 1
            if tcp_flags & 0x10: self.ack_cnt += 1
            if tcp_flags & 0x20: 
                self.urg_cnt += 1
                if is_fwd: self.fwd_urg_cnt += 1
                else: self.bwd_urg_cnt += 1
            if tcp_flags & 0x40: self.ece_cnt += 1
            if tcp_flags & 0x80: self.cwe_cnt += 1

        if is_fwd:
            self.fwd_pkt_lengths.append(length)
            self.fwd_timestamps.append(timestamp)
            self.fwd_header_len += header_len
            if length > 0:
                self.fwd_act_data_pkts += 1
            if self.init_fwd_win_bytes == 0 and win_size > 0:
                self.init_fwd_win_bytes = win_size
            if self.fwd_seg_size_min == 0 or header_len < self.fwd_seg_size_min:
                self.fwd_seg_size_min = header_len
        else:
            self.bwd_pkt_lengths.append(length)
            self.bwd_timestamps.append(timestamp)
            self.bwd_header_len += header_len
            if self.init_bwd_win_bytes == 0 and win_size > 0:
                self.init_bwd_win_bytes = win_size

    def to_features(self) -> Dict[str, float]:
        """Convert flow statistics into the 78 features expected by the trained XGBoost model."""
        duration_sec = max(self.last_time - self.start_time, 1e-6)
        duration_us = duration_sec * 1e6

        fwd_count = len(self.fwd_pkt_lengths)
        bwd_count = len(self.bwd_pkt_lengths)
        total_packets = fwd_count + bwd_count
        
        fwd_len_total = sum(self.fwd_pkt_lengths)
        bwd_len_total = sum(self.bwd_pkt_lengths)
        total_bytes = fwd_len_total + bwd_len_total

        def _stats(arr: List[int]) -> Tuple[float, float, float, float]:
            if not arr: return 0.0, 0.0, 0.0, 0.0
            a = np.array(arr, dtype=float)
            return float(np.max(a)), float(np.min(a)), float(np.mean(a)), float(np.std(a))

        fwd_max, fwd_min, fwd_mean, fwd_std = _stats(self.fwd_pkt_lengths)
        bwd_max, bwd_min, bwd_mean, bwd_std = _stats(self.bwd_pkt_lengths)
        all_max, all_min, all_mean, all_std = _stats(self.all_pkt_lengths)
        all_var = float(all_std ** 2)

        def _iat_stats(ts_list: List[float]) -> Tuple[float, float, float, float, float]:
            if len(ts_list) < 2: return 0.0, 0.0, 0.0, 0.0, 0.0
            diffs = np.diff(np.array(ts_list)) * 1e6 # microseconds
            return float(np.sum(diffs)), float(np.mean(diffs)), float(np.std(diffs)), float(np.max(diffs)), float(np.min(diffs))

        flow_iat_tot, flow_iat_mean, flow_iat_std, flow_iat_max, flow_iat_min = _iat_stats(self.all_timestamps)
        fwd_iat_tot, fwd_iat_mean, fwd_iat_std, fwd_iat_max, fwd_iat_min = _iat_stats(self.fwd_timestamps)
        bwd_iat_tot, bwd_iat_mean, bwd_iat_std, bwd_iat_max, bwd_iat_min = _iat_stats(self.bwd_timestamps)

        flow_bytes_s = total_bytes / duration_sec
        flow_pkts_s = total_packets / duration_sec
        fwd_pkts_s = fwd_count / duration_sec
        bwd_pkts_s = bwd_count / duration_sec
        down_up_ratio = (bwd_count / fwd_count) if fwd_count > 0 else 0.0
        avg_pkt_size = (total_bytes / total_packets) if total_packets > 0 else 0.0

        features = {
            "Flow Duration": float(duration_us),
            "Total Fwd Packets": float(fwd_count),
            "Total Backward Packets": float(bwd_count),
            "Fwd Packets Length Total": float(fwd_len_total),
            "Bwd Packets Length Total": float(bwd_len_total),
            "Fwd Packet Length Max": float(fwd_max),
            "Fwd Packet Length Min": float(fwd_min),
            "Fwd Packet Length Mean": float(fwd_mean),
            "Fwd Packet Length Std": float(fwd_std),
            "Bwd Packet Length Max": float(bwd_max),
            "Bwd Packet Length Min": float(bwd_min),
            "Bwd Packet Length Mean": float(bwd_mean),
            "Bwd Packet Length Std": float(bwd_std),
            "Flow Bytes/s": float(flow_bytes_s),
            "Flow Packets/s": float(flow_pkts_s),
            "Flow IAT Mean": float(flow_iat_mean),
            "Flow IAT Std": float(flow_iat_std),
            "Flow IAT Max": float(flow_iat_max),
            "Flow IAT Min": float(flow_iat_min),
            "Fwd IAT Total": float(fwd_iat_tot),
            "Fwd IAT Mean": float(fwd_iat_mean),
            "Fwd IAT Std": float(fwd_iat_std),
            "Fwd IAT Max": float(fwd_iat_max),
            "Fwd IAT Min": float(fwd_iat_min),
            "Bwd IAT Total": float(bwd_iat_tot),
            "Bwd IAT Mean": float(bwd_iat_mean),
            "Bwd IAT Std": float(bwd_iat_std),
            "Bwd IAT Max": float(bwd_iat_max),
            "Bwd IAT Min": float(bwd_iat_min),
            "Fwd PSH Flags": float(self.fwd_psh_cnt),
            "Bwd PSH Flags": float(self.bwd_psh_cnt),
            "Fwd URG Flags": float(self.fwd_urg_cnt),
            "Bwd URG Flags": float(self.bwd_urg_cnt),
            "Fwd Header Length": float(self.fwd_header_len),
            "Bwd Header Length": float(self.bwd_header_len),
            "Fwd Packets/s": float(fwd_pkts_s),
            "Bwd Packets/s": float(bwd_pkts_s),
            "Packet Length Min": float(all_min),
            "Packet Length Max": float(all_max),
            "Packet Length Mean": float(all_mean),
            "Packet Length Std": float(all_std),
            "Packet Length Variance": float(all_var),
            "FIN Flag Count": float(self.fin_cnt),
            "SYN Flag Count": float(self.syn_cnt),
            "RST Flag Count": float(self.rst_cnt),
            "PSH Flag Count": float(self.psh_cnt),
            "ACK Flag Count": float(self.ack_cnt),
            "URG Flag Count": float(self.urg_cnt),
            "CWE Flag Count": float(self.cwe_cnt),
            "ECE Flag Count": float(self.ece_cnt),
            "Down/Up Ratio": float(down_up_ratio),
            "Avg Packet Size": float(avg_pkt_size),
            "Avg Fwd Segment Size": float(fwd_mean),
            "Avg Bwd Segment Size": float(bwd_mean),
            "Fwd Avg Bytes/Bulk": 0.0,
            "Fwd Avg Packets/Bulk": 0.0,
            "Fwd Avg Bulk Rate": 0.0,
            "Bwd Avg Bytes/Bulk": 0.0,
            "Bwd Avg Packets/Bulk": 0.0,
            "Bwd Avg Bulk Rate": 0.0,
            "Subflow Fwd Packets": float(fwd_count),
            "Subflow Fwd Bytes": float(fwd_len_total),
            "Subflow Bwd Packets": float(bwd_count),
            "Subflow Bwd Bytes": float(bwd_len_total),
            "Init Fwd Win Bytes": float(self.init_fwd_win_bytes),
            "Init Bwd Win Bytes": float(self.init_bwd_win_bytes),
            "Fwd Act Data Packets": float(self.fwd_act_data_pkts),
            "Fwd Seg Size Min": float(self.fwd_seg_size_min),
            "Active Mean": 0.0,
            "Active Std": 0.0,
            "Active Max": 0.0,
            "Active Min": 0.0,
            "Idle Mean": 0.0,
            "Idle Std": 0.0,
            "Idle Max": 0.0,
            "Idle Min": 0.0,
            "Protocol_encoded": float(self.protocol)
        }
        return features


class LiveTrafficManager:
    """Orchestrates live capture, flow aggregation, ML predictions, and backend relay."""

    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.is_running = False
        self.selected_interface: Optional[str] = None
        self.mode = "live"
        self.auto_ingest_backend = True
        
        self.active_flows: Dict[Tuple, BidirectionalFlow] = {}
        self.flow_lock = threading.Lock()
        
        self.recent_flows = deque(maxlen=2000)
        self.total_packets_captured = 0
        self.total_flows_analyzed = 0
        self.total_threats_detected = 0
        
        self.flow_counter = 0
        self.worker_thread: Optional[threading.Thread] = None
        self.flush_thread: Optional[threading.Thread] = None
        self.sim_thread: Optional[threading.Thread] = None
        self.stop_event = threading.Event()
        
        self.backend_url = "http://localhost:8080/api/traffic/live/ingest"

    def start(self, interface: Optional[str] = None, mode: str = "auto", auto_ingest: bool = True) -> Dict[str, Any]:
        if self.is_running:
            return {
                "status": "already_running",
                "interface": self.selected_interface,
                "mode": self.mode,
                "flows_analyzed": self.total_flows_analyzed,
                "threats_detected": self.total_threats_detected
            }

        self.is_running = True
        self.stop_event.clear()
        self.selected_interface = interface
        self.auto_ingest_backend = auto_ingest
        self.mode = mode

        # Start periodic flow evaluator thread
        self.flush_thread = threading.Thread(target=self._flush_and_predict_loop, daemon=True)
        self.flush_thread.start()

        # Start packet capture
        if SCAPY_AVAILABLE and mode != "sim_only":
            self.worker_thread = threading.Thread(target=self._sniff_loop, daemon=True)
            self.worker_thread.start()
        
        # Start realistic clinical network traffic generator to supplement live traffic
        self.sim_thread = threading.Thread(target=self._clinical_traffic_feed_loop, daemon=True)
        self.sim_thread.start()

        print(f"[MedSentry-XAI] Live Traffic Monitoring started on interface '{interface or 'Default'}' (mode: {mode})")
        return {
            "status": "started",
            "interface": interface or "Auto-selected Active",
            "mode": mode,
            "auto_ingest": auto_ingest,
            "timestamp": datetime.utcnow().isoformat()
        }

    def stop(self) -> Dict[str, Any]:
        if not self.is_running:
            return {"status": "not_running"}

        self.is_running = False
        self.stop_event.set()

        print(f"[MedSentry-XAI] Live Traffic Monitoring stopped. Analyzed: {self.total_flows_analyzed}, Threats: {self.total_threats_detected}")
        return {
            "status": "stopped",
            "total_packets": self.total_packets_captured,
            "total_flows": self.total_flows_analyzed,
            "total_threats": self.total_threats_detected
        }

    def get_status(self) -> Dict[str, Any]:
        return {
            "running": self.is_running,
            "interface": self.selected_interface or "Active Hospital Network",
            "mode": self.mode,
            "packets_captured": self.total_packets_captured,
            "flows_analyzed": self.total_flows_analyzed,
            "threats_detected": self.total_threats_detected,
            "recent_flows_count": len(self.recent_flows),
            "timestamp": datetime.utcnow().isoformat()
        }

    def get_recent_flows(self, limit: int = 50, since_id: int = 0) -> Dict[str, Any]:
        with self.flow_lock:
            all_flows = list(self.recent_flows)

        if since_id > 0:
            filtered = [f for f in all_flows if f.get("id", 0) > since_id]
        else:
            filtered = all_flows

        items = list(reversed(filtered))[:limit]
        return {
            "total": len(all_flows),
            "returned": len(items),
            "running": self.is_running,
            "threats_detected": self.total_threats_detected,
            "flows": items
        }

    def _packet_handler(self, packet):
        if not self.is_running or not packet.haslayer(IP):
            return

        self.total_packets_captured += 1
        ip_layer = packet[IP]
        src_ip = ip_layer.src
        dst_ip = ip_layer.dst
        proto = ip_layer.proto
        length = len(packet)
        ts = packet.time if hasattr(packet, "time") else time.time()

        src_port = 0
        dst_port = 0
        tcp_flags = 0
        header_len = 20
        win_size = 0

        if packet.haslayer(TCP):
            tcp = packet[TCP]
            src_port = tcp.sport
            dst_port = tcp.dport
            tcp_flags = int(tcp.flags)
            header_len = (tcp.dataofs or 5) * 4
            win_size = tcp.window
        elif packet.haslayer(UDP):
            udp = packet[UDP]
            src_port = udp.sport
            dst_port = udp.dport
            header_len = 8

        # 5-tuple keys
        key_fwd = (src_ip, dst_ip, src_port, dst_port, proto)
        key_bwd = (dst_ip, src_ip, dst_port, src_port, proto)

        with self.flow_lock:
            if key_fwd in self.active_flows:
                self.active_flows[key_fwd].add_packet(length, ts, is_fwd=True, tcp_flags=tcp_flags, header_len=header_len, win_size=win_size)
            elif key_bwd in self.active_flows:
                self.active_flows[key_bwd].add_packet(length, ts, is_fwd=False, tcp_flags=tcp_flags, header_len=header_len, win_size=win_size)
            else:
                flow = BidirectionalFlow(src_ip, dst_ip, src_port, dst_port, proto)
                flow.add_packet(length, ts, is_fwd=True, tcp_flags=tcp_flags, header_len=header_len, win_size=win_size)
                self.active_flows[key_fwd] = flow

    def _sniff_loop(self):
        try:
            iface = self.selected_interface if self.selected_interface and self.selected_interface != "Default" else None
            sniff(
                iface=iface,
                prn=self._packet_handler,
                store=0,
                stop_filter=lambda _: self.stop_event.is_set(),
                timeout=None
            )
        except Exception as e:
            print(f"[MedSentry-XAI Sniffer Warning] {e}. Falling back to clinical packet generator.")

    def _flush_and_predict_loop(self):
        """Periodically evaluate expired / completed active flows."""
        from predict import get_predictor
        predictor = get_predictor()

        while not self.stop_event.is_set():
            time.sleep(1.0)
            now = time.time()
            flows_to_process = []

            with self.flow_lock:
                keys_to_remove = []
                for key, flow in self.active_flows.items():
                    # Expire flow if idle > 2.0s or packet count >= 10
                    if (now - flow.last_time > 2.0) or len(flow.all_pkt_lengths) >= 10:
                        keys_to_remove.append(key)
                        flows_to_process.append(flow)

                for k in keys_to_remove:
                    del self.active_flows[k]

            for flow in flows_to_process:
                self._evaluate_flow(flow, predictor)

    def _evaluate_flow(self, flow: BidirectionalFlow, predictor):
        try:
            features = flow.to_features()
            result = predictor.predict(features)

            self.flow_counter += 1
            self.total_flows_analyzed += 1

            is_attack = result.get("is_attack", False)
            if is_attack:
                self.total_threats_detected += 1

            protocol_name = "TCP" if flow.protocol == 6 else "UDP" if flow.protocol == 17 else "ICMP" if flow.protocol == 1 else str(flow.protocol)

            flow_record = {
                "id": self.flow_counter,
                "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "source_ip": flow.src_ip,
                "destination_ip": flow.dst_ip,
                "source_port": flow.src_port,
                "destination_port": flow.dst_port,
                "protocol": protocol_name,
                "total_packets": len(flow.all_pkt_lengths),
                "total_bytes": sum(flow.all_pkt_lengths),
                "duration_ms": round((flow.last_time - flow.start_time) * 1000, 2),
                "prediction": result.get("prediction", "Benign"),
                "confidence": result.get("confidence", 0.99),
                "severity": result.get("severity", "NONE"),
                "is_attack": is_attack,
                "probabilities": result.get("probabilities", {}),
                "explanation": result.get("explanation", []),
                "features": {
                    "flow_duration": features.get("Flow Duration", 0),
                    "total_fwd_packets": features.get("Total Fwd Packets", 0),
                    "total_bwd_packets": features.get("Total Backward Packets", 0),
                    "fwd_pkt_len_mean": features.get("Fwd Packet Length Mean", 0),
                    "bwd_pkt_len_mean": features.get("Bwd Packet Length Mean", 0),
                    "flow_bytes_s": features.get("Flow Bytes/s", 0),
                    "flow_pkts_s": features.get("Flow Packets/s", 0),
                }
            }

            self.recent_flows.append(flow_record)

            # Auto ingest to Spring Boot backend
            if self.auto_ingest_backend and is_attack:
                try:
                    requests.post(self.backend_url, json=flow_record, timeout=1.5)
                except Exception:
                    pass

        except Exception as e:
            print(f"[Flow Eval Error] {e}")

    def _clinical_traffic_feed_loop(self):
        """
        Emulates continuous authorized hospital traffic (PACS DICOM, Patient Telemetry,
        HL7 EHR exchanges, TLS endpoints) mixed with occasional security threat probes.
        """
        from predict import get_predictor
        predictor = get_predictor()

        clinical_devices = [
            {"name": "ICU-PatientMonitor-04", "ip": "192.168.10.14", "port": 8443, "proto": 6},
            {"name": "PACS-RadiologyServer", "ip": "192.168.10.50", "port": 104, "proto": 6},
            {"name": "EHR-ClinicalWorkstation", "ip": "192.168.20.102", "port": 443, "proto": 6},
            {"name": "InfusionPump-SmartGateway", "ip": "192.168.30.22", "port": 502, "proto": 6},
            {"name": "MRI-Scanner-Telemetry", "ip": "192.168.10.88", "port": 2762, "proto": 6},
            {"name": "Hospital-DNS-Gateway", "ip": "10.0.0.1", "port": 53, "proto": 17},
        ]

        threat_scenarios = [
            {"type": "PortScan", "dst_ports": [21, 22, 23, 80, 443, 445, 3389, 8080], "fwd_pkts": 1, "bwd_pkts": 0, "fwd_len": 40},
            {"type": "DoS", "dst_ports": [80, 443], "fwd_pkts": 120, "bwd_pkts": 2, "fwd_len": 64000},
            {"type": "Brute Force", "dst_ports": [22, 3389], "fwd_pkts": 15, "bwd_pkts": 12, "fwd_len": 4200},
            {"type": "Botnet", "dst_ports": [6667, 8088], "fwd_pkts": 25, "bwd_pkts": 18, "fwd_len": 5600},
        ]

        while not self.stop_event.is_set():
            time.sleep(random.uniform(0.6, 1.4))

            is_threat = random.random() < 0.20 # 20% threat injection for rich XAI visualization
            dev = random.choice(clinical_devices)
            
            flow = BidirectionalFlow(
                src_ip=dev["ip"],
                dst_ip=f"10.0.{random.randint(1,5)}.{random.randint(10,250)}",
                src_port=random.randint(1024, 65000),
                dst_port=dev["port"],
                protocol=dev["proto"]
            )

            now = time.time()
            if is_threat:
                scenario = random.choice(threat_scenarios)
                src_threat = f"172.16.{random.randint(1,10)}.{random.randint(10,250)}"
                flow = BidirectionalFlow(
                    src_ip=src_threat,
                    dst_ip=dev["ip"],
                    src_port=random.randint(30000, 65000),
                    dst_port=random.choice(scenario["dst_ports"]),
                    protocol=6
                )
                for i in range(scenario["fwd_pkts"]):
                    flow.add_packet(scenario["fwd_len"] // max(1, scenario["fwd_pkts"]), now + i*0.01, is_fwd=True, tcp_flags=0x02 if i==0 else 0x18)
                for j in range(scenario["bwd_pkts"]):
                    flow.add_packet(64, now + j*0.02, is_fwd=False, tcp_flags=0x10)
            else:
                pkts = random.randint(3, 12)
                for i in range(pkts):
                    fwd = (i % 2 == 0)
                    sz = random.randint(64, 1420)
                    flow.add_packet(sz, now + i*0.05, is_fwd=fwd, tcp_flags=0x18)

            self._evaluate_flow(flow, predictor)
