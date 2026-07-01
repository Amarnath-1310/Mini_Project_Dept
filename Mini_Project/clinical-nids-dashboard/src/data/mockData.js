// Mock data for Clinical-NIDS Dashboard

export const threatData = [
  { id: 1, time: '10:32:15', source: '192.168.1.45', destination: 'Port 443', protocol: 'TCP', attackType: 'DDoS Attack', confidence: 96, severity: 'HIGH', status: 'Blocked' },
  { id: 2, time: '10:31:48', source: '10.0.0.112', destination: 'Port 22', protocol: 'TCP', attackType: 'Brute Force', confidence: 89, severity: 'HIGH', status: 'Blocked' },
  { id: 3, time: '10:30:22', source: '172.16.0.88', destination: 'Port 80', protocol: 'HTTP', attackType: 'Port Scanning', confidence: 94, severity: 'MEDIUM', status: 'Monitoring' },
  { id: 4, time: '10:29:55', source: '192.168.2.201', destination: 'Port 3389', protocol: 'TCP', attackType: 'Malware C2', confidence: 99, severity: 'CRITICAL', status: 'Blocked' },
  { id: 5, time: '10:28:30', source: '10.0.1.55', destination: 'Port 53', protocol: 'UDP', attackType: 'DNS Tunneling', confidence: 78, severity: 'MEDIUM', status: 'Investigating' },
  { id: 6, time: '10:27:14', source: '192.168.3.14', destination: 'Port 8080', protocol: 'HTTP', attackType: 'SQL Injection', confidence: 92, severity: 'HIGH', status: 'Blocked' },
  { id: 7, time: '10:25:45', source: '10.0.2.99', destination: 'Port 445', protocol: 'TCP', attackType: 'Ransomware', confidence: 98, severity: 'CRITICAL', status: 'Quarantined' },
  { id: 8, time: '10:24:18', source: '172.16.1.33', destination: 'Port 21', protocol: 'FTP', attackType: 'Credential Stuffing', confidence: 85, severity: 'MEDIUM', status: 'Blocked' },
];

export const trafficData = Array.from({ length: 24 }, (_, i) => ({
  time: `${String(i).padStart(2, '0')}:00`,
  incoming: Math.floor(Math.random() * 5000 + 8000),
  outgoing: Math.floor(Math.random() * 4000 + 6000),
  threats: Math.floor(Math.random() * 50 + 5),
}));

export const attackTimeline = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  DDoS: Math.floor(Math.random() * 40 + 10),
  PortScan: Math.floor(Math.random() * 30 + 5),
  Malware: Math.floor(Math.random() * 20 + 3),
  BruteForce: Math.floor(Math.random() * 25 + 8),
}));

export const attackDistribution = [
  { name: 'Normal Traffic', value: 78, color: '#22c55e' },
  { name: 'DDoS', value: 8, color: '#ef4444' },
  { name: 'Port Scan', value: 6, color: '#f97316' },
  { name: 'Malware', value: 5, color: '#8b5cf6' },
  { name: 'Brute Force', value: 3, color: '#06b6d4' },
];

export const protocolUsage = [
  { name: 'TCP', count: 145200, percentage: 59 },
  { name: 'UDP', count: 62400, percentage: 25 },
  { name: 'HTTP', count: 24800, percentage: 10 },
  { name: 'HTTPS', count: 9600, percentage: 4 },
  { name: 'ICMP', count: 3890, percentage: 2 },
];

export const alerts = [
  { id: 1, type: 'Ransomware Detected', severity: 'CRITICAL', timestamp: '2026-06-30 10:25:45', source: '10.0.2.99', status: 'Active', description: 'Ransomware C2 communication detected on SMB port' },
  { id: 2, type: 'DDoS Attack', severity: 'HIGH', timestamp: '2026-06-30 10:32:15', source: '192.168.1.45', status: 'Resolved', description: 'Volumetric DDoS attack targeting HTTPS endpoint' },
  { id: 3, type: 'Data Exfiltration', severity: 'CRITICAL', timestamp: '2026-06-30 09:14:22', source: '10.0.3.77', status: 'Pending', description: 'Unusual outbound data transfer to external IP' },
  { id: 4, type: 'Brute Force SSH', severity: 'HIGH', timestamp: '2026-06-30 08:45:33', source: '172.16.0.22', status: 'Resolved', description: 'Multiple failed SSH login attempts detected' },
  { id: 5, type: 'Port Scanning', severity: 'MEDIUM', timestamp: '2026-06-30 07:22:11', source: '192.168.2.100', status: 'Pending', description: 'Sequential port scan on internal network segment' },
  { id: 6, type: 'Malware C2', severity: 'CRITICAL', timestamp: '2026-06-29 22:18:45', source: '10.0.1.201', status: 'Active', description: 'Command and control beacon detected' },
  { id: 7, type: 'SQL Injection', severity: 'HIGH', timestamp: '2026-06-29 18:30:00', source: '172.16.1.55', status: 'Resolved', description: 'SQL injection attempt on web application' },
  { id: 8, type: 'DNS Tunneling', severity: 'MEDIUM', timestamp: '2026-06-29 15:12:33', source: '192.168.1.88', status: 'Pending', description: 'Encoded data in DNS queries to external domain' },
];

export const aiFeatures = [
  { name: 'Packet Rate', importance: 90 },
  { name: 'Flow Duration', importance: 70 },
  { name: 'Destination Port', importance: 60 },
  { name: 'Byte Ratio', importance: 45 },
  { name: 'Protocol Anomaly', importance: 38 },
];

export const threatDetailsData = {
  id: 1,
  attackType: 'DDoS Attack',
  confidence: 97,
  detectedTime: '12:30 PM',
  protocol: 'TCP',
  sourcePort: '49152',
  destinationPort: '443',
  sourceIP: '192.168.1.45',
  destinationIP: '10.0.0.5',
  packetsPerSecond: 45000,
  bytesPerSecond: 2800000,
  duration: '4m 32s',
  aiExplanation: [
    'High packet frequency detected (45,000 pps) — exceeds baseline by 340%',
    'Abnormal flow pattern with sustained volumetric spike',
    'Suspicious source port behavior — ephemeral port range abuse',
    'Packet size distribution inconsistent with legitimate traffic',
  ],
  networkInfo: {
    totalPackets: '12.4M',
    totalBytes: '8.2 GB',
    uniqueSrcIPs: 1,
    uniqueDstIPs: 1,
    flagsAbnormal: 'SYN flood pattern',
  }
};
