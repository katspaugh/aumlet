import { render } from 'solid-js/web';
import { createEffect, onCleanup } from 'solid-js';
import type { WorkletMessage } from './types/messages';
import { ModuleKind } from './types/graph';
import type { Graph } from './types/graph';
import { generateRandomGraph } from './utils/randomGraph';
import { GraphStore } from './store/GraphStore';
import { ModuleTable } from './components/ModuleTable';
import { PatchMatrix } from './components/PatchMatrix';
import { AddModuleButtons } from './components/AddModuleButtons';

let audioContext: AudioContext | null = null;
let modularNode: AudioWorkletNode | null = null;

// Create reactive graph store
const graphStore = new GraphStore();

const isModuleKind = (value: string): value is ModuleKind =>
  Object.values(ModuleKind).includes(value as ModuleKind);

const base64UrlEncode = (bytes: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlDecode = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const serializeGraphToHash = (graph: Graph): string => {
  const json = JSON.stringify(graph);
  return base64UrlEncode(textEncoder.encode(json));
};

const tryParseGraph = (value: string): Graph | null => {
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const modules = (parsed as Graph).modules;
    const connections = (parsed as Graph).connections;
    if (!Array.isArray(modules) || !Array.isArray(connections)) return null;

    const modulesValid = modules.every(
      (mod) =>
        typeof mod.id === 'string' && typeof mod.kind === 'string' && isModuleKind(mod.kind)
    );
    if (!modulesValid) return null;

    const connectionsValid = connections.every(
      (conn) =>
        conn &&
        typeof conn === 'object' &&
        typeof conn.from?.id === 'string' &&
        typeof conn.from?.port === 'string' &&
        typeof conn.to?.id === 'string' &&
        typeof conn.to?.port === 'string'
    );
    if (!connectionsValid) return null;

    return parsed as Graph;
  } catch {
    return null;
  }
};

const deserializeGraphFromHash = (hash: string): Graph | null => {
  if (!hash) return null;
  const decodedBase64 = (() => {
    try {
      return textDecoder.decode(base64UrlDecode(hash));
    } catch {
      return null;
    }
  })();
  if (decodedBase64) {
    const parsed = tryParseGraph(decodedBase64);
    if (parsed) return parsed;
  }

  const decodedLegacy = (() => {
    try {
      return decodeURIComponent(hash);
    } catch {
      return null;
    }
  })();
  if (!decodedLegacy) return null;

  return tryParseGraph(decodedLegacy);
};

const initialGraph = (() => {
  const hash = window.location.hash.slice(1);
  return deserializeGraphFromHash(hash) ?? generateRandomGraph();
})();
graphStore.loadGraph(initialGraph);

// Main App Component
function App() {
  let startBtn: HTMLButtonElement | undefined;
  let statusDiv: HTMLDivElement | undefined;

  // Auto-reload graph when it changes (if audio is running)
  createEffect(() => {
    const graph = graphStore.graph();
    if (modularNode) {
      modularNode.port.postMessage({
        type: 'loadGraph',
        graph: graph,
      });
    }
  });

  // Event handlers
  const handleAddModule = (type: ModuleKind) => {
    graphStore.addModule(type);
  };

  const handleDeleteModule = (id: string) => {
    graphStore.deleteModule(id);
  };

  const handleParamChange = (id: string, param: string, value: number | string) => {
    graphStore.updateModuleParam(id, param, value);
  };

  const handleConnectionToggle = (from: string, to: string, connected: boolean) => {
    if (connected) {
      graphStore.addConnection(from, to);
    } else {
      graphStore.removeConnection(from, to);
    }
  };

  const handleRandomizeGraph = () => {
    const randomGraph = generateRandomGraph();
    graphStore.loadGraph(randomGraph);
    if (modularNode) {
      stopAudio();
      void initAudio();
    }
  };

  const handleSharePatch = async () => {
    const hash = serializeGraphToHash(graphStore.toGraph());
    const shareUrl = `${window.location.origin}${window.location.pathname}#${hash}`;
    window.history.replaceState(null, '', `#${hash}`);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setStatus('🔗 Share URL copied to clipboard.', 'success');
        return;
      }
    } catch {
      // Ignore clipboard errors and fall back to address bar.
    }

    setStatus('🔗 Share URL ready in the address bar.', 'info');
  };

  type StatusType = 'info' | 'success' | 'error';

  const setStatus = (message: string, type: StatusType = 'info') => {
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.className = type;
    }
  };

  const initAudio = async () => {
    try {
      setStatus('Initializing audio context...', 'info');

      if (!audioContext) {
        audioContext = new AudioContext();
      }

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      setStatus('Loading AudioWorklet module...', 'info');

      const workletPath = import.meta.env.DEV
        ? '/src/worklet/index.ts'
        : new URL('modular-processor.js', import.meta.url).href;

      await audioContext.audioWorklet.addModule(workletPath);

      setStatus('Creating modular processor...', 'info');

      modularNode = new AudioWorkletNode(audioContext, 'modular-processor');

      modularNode.port.onmessage = (e: MessageEvent<WorkletMessage>) => {
        if (e.data.type === 'graphLoaded') {
          setStatus('🎵 Audio running! Modular synth active.', 'success');
        } else if (e.data.type === 'error') {
          setStatus(`❌ Error: ${e.data.message}`, 'error');
        }
      };

      modularNode.connect(audioContext.destination);

      setStatus('Loading graph...', 'info');

      modularNode.port.postMessage({
        type: 'loadGraph',
        graph: graphStore.toGraph(),
      });

      if (startBtn) {
        startBtn.textContent = '⏸ Stop Audio';
        startBtn.onclick = stopAudio;
      }
    } catch (err) {
      console.error('Audio initialization error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatus(`❌ Error: ${message}`, 'error');
    }
  };

  const stopAudio = () => {
    if (modularNode) {
      modularNode.disconnect();
      modularNode = null;
    }

    if (audioContext) {
      void audioContext.suspend();
    }

    setStatus('Audio stopped.', 'info');
    if (startBtn) {
      startBtn.textContent = '▶ Start Audio';
      startBtn.onclick = initAudio;
    }
  };

  // Keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (modularNode) {
        modularNode.port.postMessage({
          type: 'loadGraph',
          graph: graphStore.toGraph(),
        });
        setStatus('Graph reloaded', 'info');
      }
    }
  };

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  // Setup keyboard listener after mount
  setTimeout(() => {
    document.addEventListener('keydown', handleKeyDown);
  }, 0);

  return (
    <div class="container">
      <h1>🎛️ Aumlet</h1>
      <p class="subtitle">Modular Synthesizer - AudioWorklet Edition</p>

      <div class="section">
        <h2>🎚️ Controls</h2>
        <div class="controls">
          <button class="start-audio-btn" ref={startBtn} onClick={initAudio}>
            ▶ Start Audio
          </button>
          <button onClick={handleSharePatch}>🔗 Share Patch</button>
          <div ref={statusDiv} id="status">
            Ready to start...
          </div>
        </div>
        <p class="info-text">
          🔊 Click <code>Start Audio</code> to initialize the Web Audio API and load your graph.
          You may need to interact with the page first (browser security requirement).
        </p>
      </div>

      <div class="section">
        <h2>🎛️ Modules</h2>
        <AddModuleButtons
          onAddModule={handleAddModule}
          onRandomizeGraph={handleRandomizeGraph}
        />
        <div class="table-container">
          <ModuleTable
            store={graphStore}
            onDeleteModule={handleDeleteModule}
            onParamChange={handleParamChange}
          />
        </div>
      </div>

      <div class="section">
        <h2>🔌 Patch Matrix</h2>
        <div class="table-container">
          <PatchMatrix store={graphStore} onConnectionToggle={handleConnectionToggle} />
        </div>
        <p class="info-text">
          💡 Click cells to connect outputs (rows) to inputs (columns). Multiple connections =
          banana stacking!
        </p>
      </div>
    </div>
  );
}

// Render the app
const root = document.getElementById('app');
if (root) {
  render(() => <App />, root);
}
