import { Module } from './Module';
import type { ModuleParams } from '../../types/graph';

export class VCO extends Module {
  private phase: number;
  private baseFreq: number;
  private fmSensitivity: number;

  constructor(id: string, kind: string, params: ModuleParams) {
    super(id, kind, params);
    this.phase = 0;
    this.baseFreq = params.baseFreq || 110;
    this.fmSensitivity = params.fmSensitivity || 50;
  }

  process(): void {
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
      out[i] = (this.phase * 2 - 1) * 5;

      // Advance phase
      this.phase += freq / sampleRate;
      while (this.phase >= 1) this.phase -= 1;
      while (this.phase < 0) this.phase += 1;
    }
  }
}
