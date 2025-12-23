import { Module } from './Module';
import type { ModuleParams } from '../../types/graph';

// Reference frequency for 0V (C1 = MIDI note 24)
const REFERENCE_FREQ = 32.703; // Hz

export class VCO extends Module {
  private phase: number;
  private freq: number; // Base frequency in volts
  private fmSensitivity: number;

  constructor(id: string, kind: string, params: ModuleParams) {
    super(id, kind, params);
    this.phase = 0;
    this.freq = params.freq !== undefined ? params.freq : 0; // Default to 0V (C1)
    this.fmSensitivity = params.fmSensitivity || 50;
  }

  process(): void {
    const out = this.outputs.out;
    const pitch = this.inputs.pitch || new Float32Array(128);
    const fm = this.inputs.fm || new Float32Array(128);

    for (let i = 0; i < 128; i++) {
      // V/oct: freq = REFERENCE_FREQ * 2^(freqV + pitchV)
      // Base frequency from parameter + pitch CV input
      const totalVolts = this.freq + pitch[i];
      let freq = REFERENCE_FREQ * Math.pow(2, totalVolts);

      // Linear FM: add frequency modulation
      freq += fm[i] * this.fmSensitivity;

      // Clamp frequency to reasonable range
      freq = Math.max(0.1, Math.min(freq, sampleRate / 2));

      // Generate saw wave (±5V range)
      out[i] = (this.phase * 2 - 1) * 5;

      // Advance phase
      this.phase += freq / sampleRate;
      while (this.phase >= 1) this.phase -= 1;
      while (this.phase < 0) this.phase += 1;
    }
  }
}
