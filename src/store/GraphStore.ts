import { createSignal, createMemo } from 'solid-js';
import type { Graph, ModuleDefinition, Connection, ModuleKind } from '../types/graph';
import { createEmojiId } from '../utils/emojiIds';

interface ModuleRow {
  id: string;
  type: ModuleKind;
  params?: {
    freq?: number;
    vcoShape?: 'sine' | 'tri' | 'saw' | 'square';
    shape?: 'sine' | 'tri' | 'saw' | 'square';
    riseTime?: number;
    fallTime?: number;
    pan?: number;
    delayTime?: number;
    feedback?: number;
    mix?: number;
  };
}

export class GraphStore {
  // Core signals - use createSignal instead of Signal class
  private _modules = createSignal<ModuleRow[]>([]);
  readonly modules = this._modules[0]; // getter
  readonly setModules = this._modules[1]; // setter

  private _connections = createSignal<Connection[]>([]);
  readonly connections = this._connections[0];
  readonly setConnections = this._connections[1];

  // Computed signals - use createMemo instead of Computed class

  readonly stereoOutputs = createMemo(() => {
    const outputs: string[] = [];
    this.modules().forEach((m) => {
      const type = m.type.toUpperCase();
      if (type === 'PAN') {
        outputs.push(`${m.id}.outL`, `${m.id}.outR`);
      }
    });
    return outputs;
  });

  readonly inputs = createMemo(() => {
    const inputs: string[] = [];
    this.modules().forEach((m) => {
      const type = m.type.toUpperCase();
      if (type === 'VCO') {
        inputs.push(`${m.id}.pitch`, `${m.id}.fm`);
      } else if (type === 'VCA') {
        inputs.push(`${m.id}.in`, `${m.id}.cv`);
      } else if (type === 'LFO') {
        inputs.push(`${m.id}.rate`);
      } else if (type === 'SLEW') {
        inputs.push(`${m.id}.in`);
      } else if (type === 'PAN') {
        inputs.push(`${m.id}.in`, `${m.id}.pan`);
      } else if (type === 'DELAY') {
        inputs.push(`${m.id}.in`, `${m.id}.time`, `${m.id}.feedback`, `${m.id}.mix`);
      } else if (type === 'RECTIFIER') {
        inputs.push(`${m.id}.in`);
      } else if (type === 'OUTPUT') {
        inputs.push(`${m.id}.in`, `${m.id}.inL`, `${m.id}.inR`);
      }
    });
    return inputs;
  });

  readonly connectionMap = createMemo(() => {
    const map = new Map<string, Set<string>>();
    this.connections().forEach((conn) => {
      const key = `${conn.from.id}.${conn.from.port}`;
      const val = `${conn.to.id}.${conn.to.port}`;
      if (!map.has(key)) map.set(key, new Set());
      map.get(key)!.add(val);
    });
    return map;
  });

  private readonly outputsMono = createMemo(() => {
    return this.modules()
      .map((m) => {
        const type = m.type.toUpperCase();
      if (['VCO', 'VCA', 'LFO', 'SLEW', 'OUTPUT', 'DELAY'].includes(type)) {
        return `${m.id}.out`;
      }
      if (type === 'RECTIFIER') {
        return `${m.id}.out`;
      }
      return null;
    })
    .filter((x): x is string => x !== null);
  });

  readonly outputs = createMemo(() => {
    return [...this.outputsMono(), ...this.stereoOutputs()];
  });

  readonly graph = createMemo(() => {
    const modules: ModuleDefinition[] = this.modules().map((m) => ({
      id: m.id,
      kind: m.type,
      params: m.params,
    }));

    return {
      modules,
      connections: this.connections(),
    };
  });

  // Actions
  addModule(type: ModuleKind, params?: ModuleRow['params']): string {
    const existingIds = new Set(this.modules().map((m) => m.id));
    const id = createEmojiId(type.toLowerCase(), existingIds);

    const defaultParams: Record<ModuleKind, ModuleRow['params'] | undefined> = {
      VCO: { freq: 0, vcoShape: 'saw' },
      LFO: { freq: 0, shape: 'sine' },
      SLEW: { riseTime: 0.5, fallTime: 0.5 },
      PAN: { pan: 0 },
      DELAY: { delayTime: 0.25, feedback: 0.35, mix: 0.4 },
      RECTIFIER: undefined,
      VCA: undefined,
      OUTPUT: undefined,
    };

    const newModule: ModuleRow = {
      id,
      type,
      params: params || defaultParams[type],
    };

    this.setModules([...this.modules(), newModule]);
    return id;
  }

  deleteModule(id: string): void {
    const modules = this.modules();
    const connections = this.connections();
    const module = modules.find((m) => m.id === id);
    const outputIds = new Set(modules.filter((m) => m.type === 'OUTPUT').map((m) => m.id));
    const bypassInputs: Partial<Record<ModuleKind, string[]>> = {
      VCA: ['in'],
      PAN: ['in'],
      DELAY: ['in'],
      RECTIFIER: ['in'],
      SLEW: ['in'],
    };

    const outgoingToOutput = connections.filter(
      (conn) => conn.from.id === id && outputIds.has(conn.to.id)
    );
    const incoming = connections.filter((conn) => conn.to.id === id);
    const bypassPorts = module ? bypassInputs[module.type] || [] : [];
    const bypassSources = incoming.filter((conn) => bypassPorts.includes(conn.to.port));

    const remaining = connections.filter((conn) => conn.from.id !== id && conn.to.id !== id);
    if (outgoingToOutput.length > 0 && bypassSources.length > 0) {
      const existing = new Set(
        remaining.map((conn) => `${conn.from.id}.${conn.from.port}->${conn.to.id}.${conn.to.port}`)
      );
      for (const outConn of outgoingToOutput) {
        for (const inConn of bypassSources) {
          const key = `${inConn.from.id}.${inConn.from.port}->${outConn.to.id}.${outConn.to.port}`;
          if (existing.has(key)) continue;
          existing.add(key);
          remaining.push({
            from: { ...inConn.from },
            to: { ...outConn.to },
          });
        }
      }
    }

    this.setModules(modules.filter((m) => m.id !== id));
    this.setConnections(remaining);
  }

  updateModule(id: string, updates: Partial<ModuleRow>): void {
    this.setModules(this.modules().map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }

  updateModuleParam(id: string, param: string, value: number | string): void {
    this.setModules(
      this.modules().map((m) => {
        if (m.id !== id) return m;
        return {
          ...m,
          params: { ...m.params, [param]: value },
        };
      })
    );
  }

  addConnection(from: string, to: string): void {
    const [fromId, fromPort] = from.split('.');
    const [toId, toPort] = to.split('.');

    const newConn: Connection = {
      from: { id: fromId, port: fromPort },
      to: { id: toId, port: toPort },
    };

    const exists = this.connections().some(
      (c) =>
        c.from.id === fromId && c.from.port === fromPort && c.to.id === toId && c.to.port === toPort
    );

    if (!exists) {
      this.setConnections([...this.connections(), newConn]);
    }
  }

  removeConnection(from: string, to: string): void {
    const [fromId, fromPort] = from.split('.');
    const [toId, toPort] = to.split('.');

    this.setConnections(
      this.connections().filter(
        (c) =>
          !(
            c.from.id === fromId &&
            c.from.port === fromPort &&
            c.to.id === toId &&
            c.to.port === toPort
          )
      )
    );
  }

  loadGraph(graph: Graph): void {
    const modules: ModuleRow[] = graph.modules.map((mod) => ({
      id: mod.id,
      type: mod.kind,
      params: mod.params,
    }));

    this.setModules(modules);
    this.setConnections(graph.connections);
  }

  toGraph(): Graph {
    return this.graph();
  }
}
