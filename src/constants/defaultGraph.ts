import { ModuleKind, type Graph } from '../types/graph';

export const DEFAULT_GRAPH: Graph = {
  modules: [
    { id: 'lfo1', kind: ModuleKind.LFO, params: { freq: 2 } },
    { id: 'vco1', kind: ModuleKind.VCO, params: { baseFreq: 220 } },
    { id: 'vca1', kind: ModuleKind.VCA },
    { id: 'out', kind: ModuleKind.OUTPUT },
  ],
  connections: [
    { from: { id: 'vco1', port: 'out' }, to: { id: 'vca1', port: 'in' } },
    { from: { id: 'lfo1', port: 'out' }, to: { id: 'vca1', port: 'cv' } },
    { from: { id: 'vca1', port: 'out' }, to: { id: 'out', port: 'in' } },
  ],
};
