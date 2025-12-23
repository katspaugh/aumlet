import { For, Show } from 'solid-js';
import type { GraphStore } from '../store/GraphStore';

interface ModuleTableProps {
  store: GraphStore;
  onDeleteModule: (id: string) => void;
  onParamChange: (id: string, param: string, value: number | string) => void;
}

export function ModuleTable(props: ModuleTableProps) {
  const renderParams = (module: {
    id: string;
    type: string;
    params?: Record<string, number | string>;
  }) => {
    const type = module.type.toUpperCase();
    const params = module.params || {};

    return (
      <>
        <Show when={type === 'VCO' || type === 'LFO'}>
          <input
            type="number"
            class="param-input"
            value={params.freq ?? 0}
            onInput={(e) =>
              props.onParamChange(module.id, 'freq', parseFloat(e.currentTarget.value))
            }
            placeholder="freq (V)"
            style={{ width: '80px' }}
          />
        </Show>

        <Show when={type === 'LFO'}>
          <select
            class="param-input"
            value={params.shape || 'sine'}
            onChange={(e) => props.onParamChange(module.id, 'shape', e.currentTarget.value)}
          >
            <option value="sine">sine</option>
            <option value="tri">tri</option>
            <option value="saw">saw</option>
            <option value="square">square</option>
          </select>
        </Show>

        <Show when={type === 'SLEW'}>
          <input
            type="number"
            class="param-input"
            value={params.riseTime ?? 0.5}
            onInput={(e) =>
              props.onParamChange(module.id, 'riseTime', parseFloat(e.currentTarget.value))
            }
            placeholder="rise (s)"
            style={{ width: '70px' }}
            step="0.1"
            min="0.001"
          />
          <input
            type="number"
            class="param-input"
            value={params.fallTime ?? 0.5}
            onInput={(e) =>
              props.onParamChange(module.id, 'fallTime', parseFloat(e.currentTarget.value))
            }
            placeholder="fall (s)"
            style={{ width: '70px' }}
            step="0.1"
            min="0.001"
          />
        </Show>

        <Show when={!['VCO', 'LFO', 'SLEW'].includes(type)}>
          <span class="no-params">-</span>
        </Show>
      </>
    );
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Type</th>
          <th>Parameters</th>
          <th>ID</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <For each={props.store.modules()}>
          {(module) => (
            <tr>
              <td>{module.type}</td>
              <td>{renderParams(module)}</td>
              <td class="id-cell">{module.id}</td>
              <td>
                <button class="delete-btn" onClick={() => props.onDeleteModule(module.id)}>
                  ×
                </button>
              </td>
            </tr>
          )}
        </For>
      </tbody>
    </table>
  );
}
