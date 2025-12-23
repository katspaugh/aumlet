import { For, Index } from 'solid-js';
import type { GraphStore } from '../store/GraphStore';

interface PatchMatrixProps {
  store: GraphStore;
  onConnectionToggle: (from: string, to: string, connected: boolean) => void;
}

export function PatchMatrix(props: PatchMatrixProps) {
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
              <th class="output-header">{output}</th>
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
