import type { MachineStatusValue } from '../alerts/alertService';

export type ColdChainStatus = 'SAFE' | 'WARNING' | 'CRITICAL' | 'NO_DATA';

export type DataFreshnessState = 'LOADING' | 'EMPTY' | 'STALE' | 'FRESH';

export interface TelemetryPoint {
  id?: number;
  machineId?: number;
  temperature: number;
  humidity: number;
  recordedAt: string;
  timeLabel: string;
  source?: 'HISTORY' | 'REALTIME';
}

export interface MachineLocationSummary {
  id: number;
  name: string;
  address?: string;
}

export interface MachineOperatorSummary {
  id: number;
  fullName?: string;
  name?: string;
  username?: string;
}

export interface MachineDetailDto {
  id: number;
  serialNumber: string;
  name: string;
  model?: string | null;
  status: MachineStatusValue;
  location?: MachineLocationSummary | null;
  locationName?: string | null;
  operator?: MachineOperatorSummary | null;
  lastPingAt?: string | null;
  tempMinThreshold?: number | null;
  tempMaxThreshold?: number | null;
  currentTemp?: number | null;
  // Dự phòng khi BE3 bổ sung trường độ ẩm & cảm biến cửa vào MachineResponse
  currentHumidity?: number | null;
  doorStatus?: 'OPEN' | 'CLOSED' | string | null;
  doorOpen?: boolean | null;
}