import { For } from 'solid-js';
import type { GraphStore } from '../store/GraphStore';
import { ModuleKind } from '../types/graph';
import type { ParamDefMap } from '../types/params';
import { DELAY_PARAM_KEYS } from '../worklet/modules/Delay';
import { LFO_PARAM_KEYS } from '../worklet/modules/LFO';
import { PAN_PARAM_KEYS } from '../worklet/modules/Pan';
import { SLEW_PARAM_KEYS } from '../worklet/modules/Slew';
import { VCO_PARAM_KEYS } from '../worklet/modules/VCO';

interface ModuleTableProps {
  store: GraphStore;
  onDeleteModule: (id: string) => void;
  onParamChange: (id: string, param: string, value: number | string) => void;
}

export function ModuleTable(props: ModuleTableProps) {
  const PARAM_DEFS: Record<ModuleKind, ParamDefMap> = {
    [ModuleKind.VCO]: {
      [VCO_PARAM_KEYS.FREQ]: {
        kind: 'number',
        placeholder: 'freq (V)',
        width: '80px',
        defaultValue: 0,
      },
      [VCO_PARAM_KEYS.SHAPE]: {
        kind: 'select',
        options: ['sine', 'tri', 'saw', 'square'],
        defaultValue: 'saw',
      },
    },
    [ModuleKind.LFO]: {
      [LFO_PARAM_KEYS.FREQ]: {
        kind: 'number',
        placeholder: 'freq (V)',
        width: '80px',
        defaultValue: 0,
      },
      [LFO_PARAM_KEYS.SHAPE]: {
        kind: 'select',
        options: ['sine', 'tri', 'saw', 'square'],
        defaultValue: 'sine',
      },
    },
    [ModuleKind.SLEW]: {
      [SLEW_PARAM_KEYS.RISE_TIME]: {
        kind: 'number',
        placeholder: 'rise (s)',
        width: '70px',
        step: 0.1,
        min: 0.001,
        defaultValue: 0.5,
      },
      [SLEW_PARAM_KEYS.FALL_TIME]: {
        kind: 'number',
        placeholder: 'fall (s)',
        width: '70px',
        step: 0.1,
        min: 0.001,
        defaultValue: 0.5,
      },
    },
    [ModuleKind.PAN]: {
      [PAN_PARAM_KEYS.PAN]: {
        kind: 'number',
        placeholder: 'pan',
        width: '70px',
        step: 0.1,
        min: -1,
        max: 1,
        defaultValue: 0,
      },
    },
    [ModuleKind.DELAY]: {
      [DELAY_PARAM_KEYS.DELAY_TIME]: {
        kind: 'number',
        placeholder: 'time (s)',
        width: '80px',
        step: 0.01,
        min: 0.01,
        max: 2,
        defaultValue: 0.25,
      },
      [DELAY_PARAM_KEYS.FEEDBACK]: {
        kind: 'number',
        placeholder: 'fb',
        width: '70px',
        step: 0.05,
        min: 0,
        max: 0.95,
        defaultValue: 0.35,
      },
      [DELAY_PARAM_KEYS.MIX]: {
        kind: 'number',
        placeholder: 'mix',
        width: '70px',
        step: 0.05,
        min: 0,
        max: 1,
        defaultValue: 0.4,
      },
    },
    [ModuleKind.VCA]: {},
    [ModuleKind.RECTIFIER]: {},
    [ModuleKind.OUTPUT]: {},
  };

  const renderParams = (module: {
    id: string;
    type: ModuleKind;
    params?: Record<string, number | string>;
  }) => {
    const params = module.params || {};
    const defs = PARAM_DEFS[module.type] || {};
    const defEntries = Object.entries(defs);

    if (defEntries.length === 0) {
      return <span class="no-params">-</span>;
    }

    return defEntries.map(([key, def]) => {
      if (def.kind === 'select') {
        const rawValue = params[key] as string | undefined;
        const fallbackValue =
          key === VCO_PARAM_KEYS.SHAPE
            ? (params[LFO_PARAM_KEYS.SHAPE] as string | undefined)
            : undefined;
        const picked = rawValue ?? fallbackValue;
        const value = picked && def.options.includes(picked) ? picked : def.defaultValue;
        return (
          <select
            class="param-input"
            value={value}
            onChange={(e) => props.onParamChange(module.id, key, e.currentTarget.value)}
          >
            {def.options.map((option) => (
              <option value={option} selected={option === value}>
                {option}
              </option>
            ))}
          </select>
        );
      }

      const value = (params[key] as number | undefined) ?? def.defaultValue;
      return (
        <input
          type="number"
          class="param-input"
          value={value}
          onInput={(e) => props.onParamChange(module.id, key, parseFloat(e.currentTarget.value))}
          placeholder={def.placeholder}
          style={{ width: def.width }}
          step={def.step}
          min={def.min}
          max={def.max}
        />
      );
    });
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
