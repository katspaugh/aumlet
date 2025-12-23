import { Module } from './Module';

export class OutputModule extends Module {
  process(): void {
    // OUTPUT module: simple pass-through to mark final output point
    // The ModularProcessor will apply soft clipping to this module's output
    const out = this.outputs.out;
    const input = this.inputs.in || new Float32Array(128);

    for (let i = 0; i < 128; i++) {
      out[i] = input[i];
    }
  }
}
