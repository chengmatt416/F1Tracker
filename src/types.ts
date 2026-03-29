export interface Driver {
  id: string;
  name: string;
  number: number;
  teamId: string;
  points: number;
  wins: number;
  podiums: number;
  country: string;
  image: string;
}

export interface Team {
  id: string;
  name: string;
  principal: string;
  base: string;
  points: number;
  wins: number;
  podiums: number;
  color: string;
  logo: string;
  carImage: string;
}

export interface Race {
  id: string;
  name: string;
  circuit: string;
  country: string;
  date: string;
  laps: number;
  length: number;
  status: 'upcoming' | 'completed' | 'live';
  winnerId?: string;
  layoutImage: string;
}

export interface TelemetryData {
  driverId: string;
  speed: number;
  gear: number;
  rpm: number;
  throttle: number;
  brake: number;
  position: number;
  lapTime: string;
  sector1: string;
  sector2: string;
  sector3: string;
}
