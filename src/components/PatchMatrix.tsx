import { For, Index, createEffect } from 'solid-js';
import type { GraphStore } from '../store/GraphStore';

interface PatchMatrixProps {
  store: GraphStore;
  onConnectionToggle: (from: string, to: string, connected: boolean) => void;
  scopeData: Record<string, number[]>;
}

export function PatchMatrix(props: PatchMatrixProps) {
  const drawScope = (canvas: HTMLCanvasElement, samples: number[] | undefined) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#0f1410';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#4cff8f';
    ctx.lineWidth = 1;
    ctx.beginPath();

    if (!samples || samples.length === 0) {
      const mid = height / 2;
      ctx.moveTo(0, mid);
      ctx.lineTo(width, mid);
      ctx.stroke();
      return;
    }

    const len = samples.length;
    for (let i = 0; i < len; i++) {
      const x = (i / (len - 1)) * width;
      const y = (1 - Math.max(-1, Math.min(1, samples[i] / 5)) * 0.5 - 0.5) * height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };
  const isConnected = (output: string, input: string): boolean => {
    return props.store.connectionMap().get(output)?.has(input) || false;
  };

  return (
    <table class="patch-matrix">
      <thead>
        <tr>
          <th>From \ To</th>
          <For each={props.store.inputs()}>
            {(input) => <th class="input-header">{input}</th>}
          </For>
        </tr>
      </thead>
      <tbody>
        <For each={props.store.outputs()}>
          {(output) => (
            <tr>
              <th class="output-header">
                <MiniScope
                  samples={props.scopeData[output.split('.')[0]]}
                  onDraw={drawScope}
                />
                <span class="output-label">{output}</span>
              </th>
              <Index each={props.store.inputs()}>
                {(input) => (
                  <td>
                    <input
                      type="checkbox"
                      checked={isConnected(output, input())}
                      onChange={(e) =>
                        props.onConnectionToggle(output, input(), e.currentTarget.checked)
                      }
                    />
                  </td>
                )}
              </Index>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}

function MiniScope(props: { samples?: number[]; onDraw: (c: HTMLCanvasElement, s?: number[]) => void }) {
  let canvasRef: HTMLCanvasElement | undefined;

  createEffect(() => {
    if (!canvasRef) return;
    props.onDraw(canvasRef, props.samples);
  });

  return <canvas class="scope-canvas tiny" width="20" height="20" ref={canvasRef} />;
}
