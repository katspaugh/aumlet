import { ModuleKind, type Graph } from '../types/graph';

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1));
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomGraph(): Graph {
  const modules = [];
  const connections = [];

  // Create 2-3 VCOs with random frequencies
  const numVCOs = randomInt(2, 3);
  const vcoIds: string[] = [];

  for (let i = 0; i < numVCOs; i++) {
    const id = `vco${i + 1}`;
    vcoIds.push(id);
    // Random frequency from -2V to 8V (sub-audio to high pitch)
    const freq = Math.round(random(-2, 8));
    modules.push({ id, kind: ModuleKind.VCO, params: { freq } });
  }

  // Create 1-2 LFOs with random frequencies and shapes
  const numLFOs = randomInt(1, 2);
  const lfoIds: string[] = [];

  for (let i = 0; i < numLFOs; i++) {
    const id = `lfo${i + 1}`;
    lfoIds.push(id);
    // Random LFO frequency from -6V to -3V (0.5Hz to 4Hz)
    const freq = Math.round(random(-6, -3));
    const shape = randomChoice(['sine', 'tri', 'saw', 'square']);
    modules.push({ id, kind: ModuleKind.LFO, params: { freq, shape } });
  }

  // Create VCA and OUTPUT
  modules.push({ id: 'vca1', kind: ModuleKind.VCA });
  modules.push({ id: 'out', kind: ModuleKind.OUTPUT });

  // Now create weird connections with feedback

  // 1. LFOs modulate VCO pitch or FM (classic)
  for (const lfoId of lfoIds) {
    const targetVCO = randomChoice(vcoIds);
    const port = randomChoice(['pitch', 'fm']);
    connections.push({
      from: { id: lfoId, port: 'out' },
      to: { id: targetVCO, port },
    });
  }

  // 2. VCO cross-modulation (weird FM feedback)
  if (numVCOs >= 2) {
    // Random cross-modulation between VCOs
    const vco1 = vcoIds[0];
    const vco2 = vcoIds[1];

    // Maybe bidirectional feedback
    if (Math.random() > 0.5) {
      connections.push({
        from: { id: vco1, port: 'out' },
        to: { id: vco2, port: 'fm' },
      });
      connections.push({
        from: { id: vco2, port: 'out' },
        to: { id: vco1, port: 'fm' },
      });
    } else {
      // One-way modulation
      connections.push({
        from: { id: vco1, port: 'out' },
        to: { id: vco2, port: 'fm' },
      });
    }
  }

  // 3. Self-modulation (chaotic!)
  if (Math.random() > 0.6) {
    const selfModVCO = randomChoice(vcoIds);
    connections.push({
      from: { id: selfModVCO, port: 'out' },
      to: { id: selfModVCO, port: 'fm' },
    });
  }

  // 4. If we have 3 VCOs, create a modulation chain
  if (numVCOs === 3) {
    const vco3 = vcoIds[2];
    const target = randomChoice([vcoIds[0], vcoIds[1]]);
    const port = randomChoice(['pitch', 'fm']);
    connections.push({
      from: { id: vco3, port: 'out' },
      to: { id: target, port },
    });
  }

  // 5. Route VCOs to VCA (mix them if multiple)
  for (const vcoId of vcoIds) {
    connections.push({
      from: { id: vcoId, port: 'out' },
      to: { id: 'vca1', port: 'in' },
    });
  }

  // 6. LFO to VCA CV (amplitude modulation)
  const vcaLFO = randomChoice(lfoIds);
  connections.push({
    from: { id: vcaLFO, port: 'out' },
    to: { id: 'vca1', port: 'cv' },
  });

  // 7. VCA to OUTPUT
  connections.push({
    from: { id: 'vca1', port: 'out' },
    to: { id: 'out', port: 'in' },
  });

  // 8. Maybe add feedback from VCA back to a VCO (extra weird!)
  if (Math.random() > 0.7) {
    const feedbackVCO = randomChoice(vcoIds);
    connections.push({
      from: { id: 'vca1', port: 'out' },
      to: { id: feedbackVCO, port: 'fm' },
    });
  }

  return { modules, connections };
}
