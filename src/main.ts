import type { Graph } from './types/graph';
import type { WorkletMessage } from './types/messages';
import { generateRandomGraph } from './utils/randomGraph';
import { PatchMatrix } from './ui/patchMatrix';

let audioContext: AudioContext | null = null;
let modularNode: AudioWorkletNode | null = null;
let currentGraph: Graph | null = null;

// DOM elements
const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;
const addVCOBtn = document.getElementById('addVCO') as HTMLButtonElement;
const addLFOBtn = document.getElementById('addLFO') as HTMLButtonElement;
const addVCABtn = document.getElementById('addVCA') as HTMLButtonElement;
const addOutputBtn = document.getElementById('addOutput') as HTMLButtonElement;
const randomizeBtn = document.getElementById('randomize') as HTMLButtonElement;

// Initialize patch matrix
const patchMatrix = new PatchMatrix('moduleTable', 'patchMatrix', (graph) => {
  currentGraph = graph;
});

// Generate random graph on page load
window.addEventListener('DOMContentLoaded', () => {
  const randomGraph = generateRandomGraph();
  patchMatrix.loadGraph(randomGraph);
  currentGraph = randomGraph;
});

// Add module buttons
addVCOBtn.addEventListener('click', () => patchMatrix.addModule('VCO'));
addLFOBtn.addEventListener('click', () => patchMatrix.addModule('LFO'));
addVCABtn.addEventListener('click', () => patchMatrix.addModule('VCA'));
addOutputBtn.addEventListener('click', () => patchMatrix.addModule('OUTPUT'));
randomizeBtn.addEventListener('click', () => {
  const randomGraph = generateRandomGraph();
  patchMatrix.loadGraph(randomGraph);
  currentGraph = randomGraph;
});

type StatusType = 'info' | 'success' | 'error';

// Status display helper
function setStatus(message: string, type: StatusType = 'info'): void {
  statusDiv.textContent = message;
  statusDiv.className = type;
}

// Initialize audio system
async function initAudio(): Promise<void> {
  try {
    setStatus('Initializing audio context...', 'info');

    // Create AudioContext (requires user gesture)
    if (!audioContext) {
      audioContext = new AudioContext();
    }

    // Resume if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    setStatus('Loading AudioWorklet module...', 'info');

    // Load the AudioWorklet processor module
    // In dev mode, Vite serves the TS file; in production, use the built bundle
    const workletPath = import.meta.env.DEV
      ? '/src/worklet/index.ts'
      : new URL('./assets/modular-processor.js', import.meta.url).href;

    await audioContext.audioWorklet.addModule(workletPath);

    setStatus('Creating modular processor...', 'info');

    // Create the AudioWorkletNode
    modularNode = new AudioWorkletNode(audioContext, 'modular-processor');

    // Listen for messages from the processor
    modularNode.port.onmessage = (e: MessageEvent<WorkletMessage>) => {
      if (e.data.type === 'graphLoaded') {
        setStatus('🎵 Audio running! Modular synth active.', 'success');
      } else if (e.data.type === 'error') {
        setStatus(`❌ Error: ${e.data.message}`, 'error');
      }
    };

    // Connect to output
    modularNode.connect(audioContext.destination);

    setStatus('Loading graph...', 'info');

    // Get graph from patch matrix
    const graph = currentGraph || patchMatrix.toGraph();

    // Send loadGraph message to processor
    modularNode.port.postMessage({
      type: 'loadGraph',
      graph: graph,
    });

    // Update button state
    startBtn.textContent = '⏸ Stop Audio';
    startBtn.onclick = stopAudio;
  } catch (err) {
    console.error('Audio initialization error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    setStatus(`❌ Error: ${message}`, 'error');
  }
}

// Stop audio
function stopAudio(): void {
  if (modularNode) {
    modularNode.disconnect();
    modularNode = null;
  }

  if (audioContext) {
    void audioContext.suspend();
  }

  setStatus('Audio stopped.', 'info');
  startBtn.textContent = '▶ Start Audio';
  startBtn.onclick = initAudio;
}

// Reload graph (for live editing)
function reloadGraph(): void {
  if (!modularNode) {
    setStatus('❌ Start audio first!', 'error');
    return;
  }

  try {
    setStatus('Reloading graph...', 'info');

    const graph = currentGraph || patchMatrix.toGraph();

    modularNode.port.postMessage({
      type: 'loadGraph',
      graph: graph,
    });
  } catch (err) {
    console.error('Graph reload error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    setStatus(`❌ Error: ${message}`, 'error');
  }
}

// Event listeners
startBtn.addEventListener('click', () => void initAudio());

// Keyboard shortcut for quick graph reload (Cmd/Ctrl + Enter)
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    if (modularNode) {
      reloadGraph();
    }
  }
});
