export type ColdChainStatus = 'SAFE' | 'WARNING' | 'CRITICAL';

export interface TelemetryPoint {
  id?: number;
  machineId?: number;
  temperature: number;
  humidity: number;
  recordedAt: string;
  timeLabel: string;
}

export interface MachineOption {
  id: number;
  name: string;
  serialNumber: string;
  location: string;
  currentTemp: number;
  currentHumidity: number;
  status: ColdChainStatus;
}