// Base Module class
class Module {
  constructor(id, kind, params = {}) {
    this.id = id;
    this.kind = kind;
    this.params = params;

    // All buffers are Float32Array(128) representing "volts"
    this.inputs = {};
    this.outputs = {};

    // Scratch buffers for multi-source inputs
    this.scratchBuffers = new Map();
  }

  // Subclasses override this to implement DSP
  process() {
    throw new Error(`Module ${this.kind} must implement process()`);
  }

  // Helper to get or create a scratch buffer
  getScratchBuffer() {
    if (!this.scratchBuffers.has('temp')) {
      this.scratchBuffers.set('temp', new Float32Array(128));
    }
    return this.scratchBuffers.get('temp');
  }
}

// ModularProcessor - handles entire synth in AudioWorklet
class ModularProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this.modules = new Map();
    this.sortedModules = [];
    this.outputModule = null;

    // Listen for messages from main thread
    this.port.onmessage = (e) => this.handleMsg(e.data);
  }

  handleMsg(msg) {
    if (msg.type === 'loadGraph') {
      try {
        this.loadGraph(msg.graph);
        this.port.postMessage({ type: 'graphLoaded', success: true });
      } catch (err) {
        this.port.postMessage({
          type: 'error',
          message: err.message
        });
      }
    }
  }

  loadGraph(graph) {
    // Clear existing state
    this.modules.clear();
    this.sortedModules = [];
    this.outputModule = null;

    // Create module instances
    for (const modDef of graph.modules) {
      const module = this.createModule(modDef);
      this.modules.set(modDef.id, module);

      if (modDef.kind === 'OUTPUT') {
        this.outputModule = module;
      }
    }

    // Build connection graph
    const connections = graph.connections || [];

    // Rebuild processing order and input bindings
    this.rebuild(connections);
  }

  createModule(def) {
    // Module factory - will be extended as modules are implemented
    const ModuleClass = {
      'VCO': VCO,
      'VCA': VCA,
      'LFO': LFO,
      'OUTPUT': OutputModule
    }[def.kind];

    if (!ModuleClass) {
      throw new Error(`Unknown module kind: ${def.kind}`);
    }

    return new ModuleClass(def.id, def.kind, def.params);
  }

  rebuild(connections) {
    // Build adjacency lists for topological sort
    const inDegree = new Map();
    const adjacency = new Map();

    // Initialize all modules
    for (const [id, module] of this.modules) {
      inDegree.set(id, 0);
      adjacency.set(id, []);

      // Initialize output buffers
      const outputPorts = this.getOutputPorts(module.kind);
      for (const port of outputPorts) {
        module.outputs[port] = new Float32Array(128);
      }

      // Initialize input buffers and connection tracking
      const inputPorts = this.getInputPorts(module.kind);
      module.inputs = {};
      module.inputConnections = {};
      for (const port of inputPorts) {
        module.inputs[port] = new Float32Array(128);
        module.inputConnections[port] = [];
      }
    }

    // Process connections
    for (const conn of connections) {
      const fromModule = this.modules.get(conn.from.id);
      const toModule = this.modules.get(conn.to.id);

      if (!fromModule || !toModule) {
        throw new Error(`Invalid connection: ${conn.from.id} -> ${conn.to.id}`);
      }

      // Track dependency for topological sort
      adjacency.get(conn.from.id).push(conn.to.id);
      inDegree.set(conn.to.id, inDegree.get(conn.to.id) + 1);

      // Track connection: store reference to source output buffer
      toModule.inputConnections[conn.to.port].push({
        buffer: fromModule.outputs[conn.from.port],
        sourceId: conn.from.id,
        sourcePort: conn.from.port
      });
    }

    // Topological sort using Kahn's algorithm
    const queue = [];
    const sorted = [];

    // Start with modules that have no inputs
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    while (queue.length > 0) {
      const id = queue.shift();
      sorted.push(id);

      // Process all modules that depend on this one
      for (const nextId of adjacency.get(id)) {
        const newDegree = inDegree.get(nextId) - 1;
        inDegree.set(nextId, newDegree);

        if (newDegree === 0) {
          queue.push(nextId);
        }
      }
    }

    // Check for cycles
    if (sorted.length !== this.modules.size) {
      throw new Error('Circular dependency detected in graph');
    }

    // Store sorted module references
    this.sortedModules = sorted.map(id => this.modules.get(id));
  }

  getInputPorts(kind) {
    const ports = {
      'VCO': ['pitch', 'fm'],
      'VCA': ['in', 'cv'],
      'LFO': ['rate'],
      'OUTPUT': ['in']
    };
    return ports[kind] || [];
  }

  getOutputPorts(kind) {
    const ports = {
      'VCO': ['out'],
      'VCA': ['out'],
      'LFO': ['out'],
      'OUTPUT': ['out']
    };
    return ports[kind] || [];
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];

    // If no graph loaded, output silence
    if (this.sortedModules.length === 0) {
      if (output && output[0]) {
        output[0].fill(0);
        if (output[1]) output[1].fill(0);
      }
      return true;
    }

    // Process modules in topologically sorted order
    for (const module of this.sortedModules) {
      // Prepare inputs: handle banana stacking (multi-source)
      for (const [portName, sources] of Object.entries(module.inputConnections)) {
        const inputBuffer = module.inputs[portName];

        if (sources.length === 0) {
          // No connection, fill with zero volts
          inputBuffer.fill(0);
        } else if (sources.length === 1) {
          // Single source: copy from source buffer
          const sourceBuffer = sources[0].buffer;
          for (let i = 0; i < 128; i++) {
            inputBuffer[i] = sourceBuffer[i];
          }
        } else {
          // Multiple sources: sum into input buffer (banana stacking)
          inputBuffer.fill(0);
          for (const source of sources) {
            for (let i = 0; i < 128; i++) {
              inputBuffer[i] += source.buffer[i];
            }
          }
        }
      }

      // Run module's DSP
      module.process();
    }

    // Get final output from OUTPUT module with soft clipping
    if (this.outputModule && output && output[0]) {
      const finalOut = this.outputModule.outputs.out;

      // Apply soft clipping (tanh) to prevent harsh clipping
      for (let i = 0; i < 128; i++) {
        const clipped = Math.tanh(finalOut[i]);
        output[0][i] = clipped;
        if (output[1]) {
          output[1][i] = clipped; // Mono to stereo
        }
      }
    } else if (output && output[0]) {
      // No output module, silence
      output[0].fill(0);
      if (output[1]) output[1].fill(0);
    }

    return true;
  }
}

// Placeholder module classes (will be implemented in separate tasks)
class VCO extends Module {
  constructor(id, kind, params) {
    super(id, kind, params);
    this.phase = 0;
    this.baseFreq = params.baseFreq || 110; // Default 110Hz
    this.fmSensitivity = params.fmSensitivity || 50; // FM sensitivity in Hz/V
  }

  process() {
    const out = this.outputs.out;
    const pitch = this.inputs.pitch || new Float32Array(128);
    const fm = this.inputs.fm || new Float32Array(128);

    for (let i = 0; i < 128; i++) {
      // 1V/oct for pitch input: freq = baseFreq * 2^(pitchV)
      let freq = this.baseFreq * Math.pow(2, pitch[i]);

      // Linear FM: add frequency modulation
      freq += fm[i] * this.fmSensitivity;

      // Clamp frequency to reasonable range
      freq = Math.max(0.1, Math.min(freq, sampleRate / 2));

      // Generate saw wave (±5V range)
      // Phase 0→1 maps to -5→+5V
      out[i] = (this.phase * 2 - 1) * 5;

      // Advance phase
      this.phase += freq / sampleRate;
      while (this.phase >= 1) this.phase -= 1;
      while (this.phase < 0) this.phase += 1;
    }
  }
}

class VCA extends Module {
  process() {
    const out = this.outputs.out;
    const audioIn = this.inputs.in || new Float32Array(128);
    const cv = this.inputs.cv || new Float32Array(128);

    for (let i = 0; i < 128; i++) {
      // VCA behavior: out = in * (cv / 5) where 5V = unity gain
      // Negative CV values cut to silence (classic VCA behavior)
      // At 5V: gain = 1.0 (unity)
      // At 0V: gain = 0.0 (silence)
      // At -5V: gain = -1.0 (inverted + silence when bipolar LFO used)
      out[i] = audioIn[i] * (cv[i] / 5);
    }
  }
}

class LFO extends Module {
  constructor(id, kind, params) {
    super(id, kind, params);
    this.phase = 0;
    this.freq = params.freq || 2; // Default 2Hz
    this.shape = params.shape || 'sine';
  }

  process() {
    const out = this.outputs.out;
    const rate = this.inputs.rate || new Float32Array(128);

    for (let i = 0; i < 128; i++) {
      // Optional CV modulation of rate (simple linear offset)
      const modFreq = this.freq + rate[i];

      // Generate waveform based on shape (bipolar ±5V)
      let sample = 0;
      switch (this.shape) {
        case 'sine':
          sample = Math.sin(this.phase * Math.PI * 2);
          break;
        case 'tri':
          // Triangle: ramp up 0→0.5, ramp down 0.5→1
          sample = this.phase < 0.5
            ? (this.phase * 4 - 1)      // 0→0.5: -1→+1
            : (3 - this.phase * 4);     // 0.5→1: +1→-1
          break;
        case 'saw':
          // Saw: linear ramp from -1 to +1
          sample = this.phase * 2 - 1;
          break;
        case 'square':
          // Square: -1 for first half, +1 for second half
          sample = this.phase < 0.5 ? -1 : 1;
          break;
        default:
          sample = Math.sin(this.phase * Math.PI * 2);
      }

      // Scale to ±5V range
      out[i] = sample * 5;

      // Advance phase
      this.phase += Math.max(0.001, modFreq) / sampleRate;
      while (this.phase >= 1) this.phase -= 1;
    }
  }
}

class OutputModule extends Module {
  process() {
    // OUTPUT module: simple pass-through to mark final output point
    // The ModularProcessor will apply soft clipping to this module's output
    const out = this.outputs.out;
    const input = this.inputs.in || new Float32Array(128);

    for (let i = 0; i < 128; i++) {
      out[i] = input[i];
    }
  }
}

// Register the processor
registerProcessor('modular-processor', ModularProcessor);
