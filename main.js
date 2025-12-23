// Main audio setup and control logic

let audioContext = null;
let modularNode = null;

// DOM elements
const startBtn = document.getElementById('startBtn');
const graphInput = document.getElementById('graphInput');
const statusDiv = document.getElementById('status');

// Status display helper
function setStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = type; // 'info', 'success', 'error'
}

// Initialize audio system
async function initAudio() {
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
    await audioContext.audioWorklet.addModule('modular-processor.js');

    setStatus('Creating modular processor...', 'info');

    // Create the AudioWorkletNode
    modularNode = new AudioWorkletNode(audioContext, 'modular-processor');

    // Listen for messages from the processor
    modularNode.port.onmessage = (e) => {
      if (e.data.type === 'graphLoaded') {
        setStatus('🎵 Audio running! Modular synth active.', 'success');
      } else if (e.data.type === 'error') {
        setStatus(`❌ Error: ${e.data.message}`, 'error');
      }
    };

    // Connect to output
    modularNode.connect(audioContext.destination);

    setStatus('Loading graph...', 'info');

    // Parse and send the graph
    const graphJson = graphInput.value;
    const graph = JSON.parse(graphJson);

    // Send loadGraph message to processor
    modularNode.port.postMessage({
      type: 'loadGraph',
      graph: graph
    });

    // Update button state
    startBtn.textContent = '⏸ Stop Audio';
    startBtn.onclick = stopAudio;

  } catch (err) {
    console.error('Audio initialization error:', err);
    setStatus(`❌ Error: ${err.message}`, 'error');
  }
}

// Stop audio
function stopAudio() {
  if (modularNode) {
    modularNode.disconnect();
    modularNode = null;
  }

  if (audioContext) {
    audioContext.suspend();
  }

  setStatus('Audio stopped.', 'info');
  startBtn.textContent = '▶ Start Audio';
  startBtn.onclick = initAudio;
}

// Reload graph (for live editing)
function reloadGraph() {
  if (!modularNode) {
    setStatus('❌ Start audio first!', 'error');
    return;
  }

  try {
    setStatus('Reloading graph...', 'info');

    const graphJson = graphInput.value;
    const graph = JSON.parse(graphJson);

    modularNode.port.postMessage({
      type: 'loadGraph',
      graph: graph
    });

  } catch (err) {
    console.error('Graph reload error:', err);
    setStatus(`❌ Error: ${err.message}`, 'error');
  }
}

// Event listeners
startBtn.addEventListener('click', initAudio);

// Optional: Keyboard shortcut for quick graph reload (Cmd/Ctrl + Enter)
graphInput.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    reloadGraph();
  }
});
