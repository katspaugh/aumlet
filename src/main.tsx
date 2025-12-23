import { render } from 'solid-js/web';
import { createEffect, onCleanup } from 'solid-js';
import type { WorkletMessage } from './types/messages';
import type { ModuleKind } from './types/graph';
import { generateRandomGraph } from './utils/randomGraph';
import { GraphStore } from './store/GraphStore';
import { ModuleTable } from './components/ModuleTable';
import { PatchMatrix } from './components/PatchMatrix';
import { AddModuleButtons } from './components/AddModuleButtons';

let audioContext: AudioContext | null = null;
let modularNode: AudioWorkletNode | null = null;

// Create reactive graph store
const graphStore = new GraphStore();

// Generate initial random graph
const randomGraph = generateRandomGraph();
graphStore.loadGraph(randomGraph);

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
        : new URL('./assets/modular-processor.js', import.meta.url).href;

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

      <div class="section">
        <h2>🎚️ Controls</h2>
        <div class="controls">
          <button ref={startBtn} onClick={initAudio}>
            ▶ Start Audio
          </button>
          <div ref={statusDiv} id="status">
            Ready to start...
          </div>
        </div>
        <p class="info-text">
          🔊 Click <code>Start Audio</code> to initialize the Web Audio API and load your graph.
          You may need to interact with the page first (browser security requirement).
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
