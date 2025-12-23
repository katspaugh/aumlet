import { ModuleKind, type Graph } from '../types/graph';

export const DEFAULT_GRAPH: Graph = {
  modules: [
    { id: 'lfo1', kind: ModuleKind.LFO, params: { freq: -5 } }, // -5V = ~1Hz
    { id: 'vco1', kind: ModuleKind.VCO, params: { freq: 6 } }, // 6V = ~2093Hz (C7)
    { id: 'vca1', kind: ModuleKind.VCA },
    { id: 'pan1', kind: ModuleKind.PAN, params: { pan: 0 } },
    { id: 'out', kind: ModuleKind.OUTPUT },
  ],
  connections: [
    { from: { id: 'vco1', port: 'out' }, to: { id: 'vca1', port: 'in' } },
    { from: { id: 'lfo1', port: 'out' }, to: { id: 'vca1', port: 'cv' } },
    { from: { id: 'vca1', port: 'out' }, to: { id: 'pan1', port: 'in' } },
    { from: { id: 'pan1', port: 'outL' }, to: { id: 'out', port: 'inL' } },
    { from: { id: 'pan1', port: 'outR' }, to: { id: 'out', port: 'inR' } },
  ],
};
