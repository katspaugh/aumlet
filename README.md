Modular Synth Implementation Plan

     Overview

     Build a modular synthesizer using AudioWorklets where the entire modular graph runs inside a single 
     AudioWorkletProcessor. Initial UI is a textarea for JSON graph definition.

     Architecture

     Main Thread (index.html + inline/separate JS)

     - Create AudioContext and load AudioWorklet module
     - Parse JSON graph from textarea
     - Send graph configuration via port.postMessage()
     - Connect AudioWorkletNode to destination

     Audio Thread (modular-processor.js)

     - Single ModularProcessor class handling entire synth
     - Module instances stored in a Map
     - Connections define patch cables between module ports
     - Topological sort determines processing order
     - All buffers are Float32Array(128) representing "volts"

     File Structure

     /Users/ivan/Sites/omlette/
     ├── index.html          # UI with textarea + start button
     ├── main.js             # AudioContext setup, graph loading
     └── modular-processor.js # AudioWorkletProcessor + modules

     Modules to Implement

     1. VCO (Voltage Controlled Oscillator)

     - Inputs: pitch (1V/oct), fm (linear FM)
     - Outputs: out (±5V saw wave)
     - Params: baseFreq (Hz at 0V)

     2. VCA (Voltage Controlled Amplifier)

     - Inputs: in (audio), cv (control voltage)
     - Outputs: out
     - Behavior: out = in * (cv / 5) where 5V = unity gain

     3. LFO (Low Frequency Oscillator)

     - Inputs: rate (optional CV modulation)
     - Outputs: out (bipolar ±5V)
     - Params: freq (Hz), shape (sine/tri/saw/square)
     - Note: Bipolar output means VCA will cut to silence at negative CV values (classic tremolo with full 
     dropout)

     4. OUTPUT

     - Inputs: in
     - Outputs: out (passes through for final mix)

     JSON Graph Format

     {
       "modules": [
         { "id": "lfo1", "kind": "LFO", "params": { "freq": 2 } },
         { "id": "vco1", "kind": "VCO", "params": { "baseFreq": 220 } },
         { "id": "vca1", "kind": "VCA" },
         { "id": "out", "kind": "OUTPUT" }
       ],
       "connections": [
         { "from": { "id": "vco1", "port": "out" }, "to": { "id": "vca1", "port": "in" } },
         { "from": { "id": "lfo1", "port": "out" }, "to": { "id": "vca1", "port": "cv" } },
         { "from": { "id": "vca1", "port": "out" }, "to": { "id": "out", "port": "in" } }
       ]
     }

     Implementation Steps

     Step 1: Create index.html

     - Basic HTML with:
       - Textarea prefilled with sample graph JSON
       - "Start" button to initialize audio
       - Status display

     Step 2: Create modular-processor.js

     - ModularProcessor class with:
       - handleMsg() for loadGraph messages
       - rebuild() for topological sort and input binding
       - process() to run DSP graph
     - Module classes: VCO, VCA, LFO, OutputModule
     - Soft clipping for final output

     Step 3: Create main.js

     - AudioContext creation (user gesture required)
     - Load AudioWorklet module
     - Parse JSON and send to processor
     - Error handling

     Key Implementation Details

     Topological Sort (Kahn's algorithm)

     1. Build in-degree count for each module
     2. Start with modules that have no inputs connected
     3. Process queue, decrementing in-degrees of dependents
     4. Result is valid processing order

     Input Binding

     - Single source: direct buffer reference
     - Multi-source (banana stacking): simple sum into scratch buffer
       - Note: levels can grow with many connections, but keeps implementation simple

     Volt/Octave Standard

     - 0V = base frequency
     - +1V = +1 octave (frequency × 2)
     - -1V = -1 octave (frequency ÷ 2)

     Sample Graph Behavior

     LFO (2Hz sine) → VCA CV input
     VCO (220Hz saw) → VCA audio input
     VCA → OUTPUT → speakers

     Result: A 220Hz saw wave amplitude-modulated by a 2Hz LFO (tremolo effect)