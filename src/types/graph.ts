export enum ModuleKind {
  VCO = 'VCO',
  VCA = 'VCA',
  LFO = 'LFO',
  OUTPUT = 'OUTPUT',
}

export interface ModuleParams {
  baseFreq?: number;
  freq?: number;
  fmSensitivity?: number;
  shape?: 'sine' | 'tri' | 'saw' | 'square';
}

export interface ModuleDefinition {
  id: string;
  kind: ModuleKind;
  params?: ModuleParams;
}

export interface PortRef {
  id: string;
  port: string;
}

export interface Connection {
  from: PortRef;
  to: PortRef;
}

export interface Graph {
  modules: ModuleDefinition[];
  connections: Connection[];
}
