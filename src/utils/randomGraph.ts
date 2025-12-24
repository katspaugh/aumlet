import { ModuleKind, type Graph } from '../types/graph';
import { createEmojiId } from './emojiIds';

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
  const existingIds = new Set<string>();
  const nextId = (prefix: string): string => {
    const id = createEmojiId(prefix, existingIds);
    existingIds.add(id);
    return id;
  };

  // Create 2-3 VCOs with random frequencies
  const numVCOs = randomInt(2, 3);
  const vcoIds: string[] = [];

  for (let i = 0; i < numVCOs; i++) {
    const id = nextId('vco');
    vcoIds.push(id);
    // Random frequency from -2V to 8V (sub-audio to high pitch)
    const freq = Math.round(random(-2, 8));
    modules.push({ id, kind: ModuleKind.VCO, params: { freq } });
  }

  // Create 1-2 LFOs with random frequencies and shapes
  const numLFOs = randomInt(1, 2);
  const lfoIds: string[] = [];

  for (let i = 0; i < numLFOs; i++) {
    const id = nextId('lfo');
    lfoIds.push(id);
    // Random LFO frequency from -6V to -3V (0.5Hz to 4Hz)
    const freq = Math.round(random(-6, -3));
    const shape = randomChoice(['sine', 'tri', 'saw', 'square'] as const);
    modules.push({ id, kind: ModuleKind.LFO, params: { freq, shape } });
  }

  // Create 1 Slew module (looping envelope generator)
  const slewId = nextId('slew');
  const riseTime = random(0.1, 2); // 100ms to 2s
  const fallTime = random(0.1, 2); // 100ms to 2s
  modules.push({ id: slewId, kind: ModuleKind.SLEW, params: { riseTime, fallTime } });

  // Create VCA, PAN, and OUTPUT
  const vcaId = nextId('vca');
  const delayId = nextId('delay');
  const panId = nextId('pan');
  const outId = nextId('out');
  modules.push({ id: vcaId, kind: ModuleKind.VCA });
  modules.push({
    id: delayId,
    kind: ModuleKind.DELAY,
    params: {
      delayTime: random(0.1, 0.6),
      feedback: random(0.1, 0.6),
      mix: random(0.2, 0.7),
    },
  });
  modules.push({ id: panId, kind: ModuleKind.PAN, params: { pan: random(-1, 1) } });
  modules.push({ id: outId, kind: ModuleKind.OUTPUT });

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

  // 1b. Slew (looping envelope) modulates VCO or VCA
  const slewTarget = randomChoice([...vcoIds, vcaId]);
  if (slewTarget === vcaId) {
    // Modulate VCA CV (envelope-like amplitude control)
    connections.push({
      from: { id: slewId, port: 'out' },
      to: { id: vcaId, port: 'cv' },
    });
  } else {
    // Modulate a VCO pitch (slow pitch sweeps)
    connections.push({
      from: { id: slewId, port: 'out' },
      to: { id: slewTarget, port: 'pitch' },
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
      to: { id: vcaId, port: 'in' },
    });
  }

  // 6. LFO to VCA CV (amplitude modulation)
  const vcaLFO = randomChoice(lfoIds);
  connections.push({
    from: { id: vcaLFO, port: 'out' },
    to: { id: vcaId, port: 'cv' },
  });

  // 7. VCA to DELAY
  connections.push({
    from: { id: vcaId, port: 'out' },
    to: { id: delayId, port: 'in' },
  });

  // 8. DELAY to PAN
  connections.push({
    from: { id: delayId, port: 'out' },
    to: { id: panId, port: 'in' },
  });

  // 9. PAN to OUTPUT (stereo)
  connections.push({
    from: { id: panId, port: 'outL' },
    to: { id: outId, port: 'inL' },
  });
  connections.push({
    from: { id: panId, port: 'outR' },
    to: { id: outId, port: 'inR' },
  });

  // 10. Maybe add feedback from VCA back to a VCO (extra weird!)
  if (Math.random() > 0.7) {
    const feedbackVCO = randomChoice(vcoIds);
    connections.push({
      from: { id: vcaId, port: 'out' },
      to: { id: feedbackVCO, port: 'fm' },
    });
  }

  return { modules, connections };
}
