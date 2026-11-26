import type { MachineStatusValue } from '../alerts/alertService';

export type ColdChainStatus =
  | 'SAFE'
  | 'WARNING'
  | 'CRITICAL'
  | 'SENSOR_ERROR'
  | 'NO_DATA';

export type DataFreshnessState = 'LOADING' | 'EMPTY' | 'STALE' | 'FRESH';

export type MachineConnectionState =
  | 'CONNECTED'
  | 'STALE_PING'
  | 'OFFLINE'
  | 'OUT_OF_ORDER'
  | 'MAINTENANCE'
  | 'UNKNOWN';

export type SensorHealthState = 'OK' | 'FAULT' | 'STALE' | 'NO_DATA';

export type DoorSensorState = 'CLOSED' | 'OPEN' | 'UNKNOWN';

export interface TelemetryPoint {
  id?: number;
  machineId?: number;
  temperature: number;
  humidity: number;
  recordedAt: string;
  timeLabel: string;
  source?: 'HISTORY' | 'REALTIME';
  // Các trường mở rộng sẵn sàng khi BE3 bổ sung cảm biến cửa / lỗi cảm biến
  doorOpen?: boolean | null;
  doorStatus?: 'OPEN' | 'CLOSED' | string | null;
  sensorStatus?: 'OK' | 'FAULT' | 'ERROR' | string | null;
  sensorError?: string | null;
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
  currentHumidity?: number | null;
  doorStatus?: 'OPEN' | 'CLOSED' | string | null;
  doorOpen?: boolean | null;
  sensorStatus?: 'OK' | 'FAULT' | 'ERROR' | string | null;
}