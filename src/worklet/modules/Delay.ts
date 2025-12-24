import { Module } from './Module';
import type { ModuleParams } from '../../types/graph';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export class Delay extends Module {
  private buffer: Float32Array;
  private writeIndex: number;
  private maxSamples: number;
  private delayTime: number;
  private feedback: number;
  private mix: number;

  constructor(id: string, kind: string, params: ModuleParams) {
    super(id, kind, params);
    const sr = globalThis.sampleRate || 48000;
    this.maxSamples = Math.max(1, Math.floor(sr * 2));
    this.buffer = new Float32Array(this.maxSamples);
    this.writeIndex = 0;
    this.delayTime = params.delayTime !== undefined ? params.delayTime : 0.25;
    this.feedback = params.feedback !== undefined ? params.feedback : 0.35;
    this.mix = params.mix !== undefined ? params.mix : 0.4;
  }

  process(): void {
    const input = this.inputs.in || new Float32Array(128);
    const out = this.outputs.out;
    const sr = globalThis.sampleRate || 48000;
    const delaySeconds = clamp(this.delayTime, 0.01, 2);
    const feedback = clamp(this.feedback, 0, 0.95);
    const mix = clamp(this.mix, 0, 1);
    const delaySamples = Math.min(this.maxSamples - 1, Math.max(1, Math.round(delaySeconds * sr)));

    let readIndex = this.writeIndex - delaySamples;
    if (readIndex < 0) readIndex += this.maxSamples;

    for (let i = 0; i < 128; i++) {
      const delayed = this.buffer[readIndex];
      const dry = input[i];
      out[i] = dry * (1 - mix) + delayed * mix;
      this.buffer[this.writeIndex] = dry + delayed * feedback;

      this.writeIndex += 1;
      if (this.writeIndex >= this.maxSamples) this.writeIndex = 0;
      readIndex += 1;
      if (readIndex >= this.maxSamples) readIndex = 0;
    }
  }
}
