import { For } from 'solid-js';
import { ModuleKind } from '../types/graph';

interface AddModuleButtonsProps {
  onAddModule: (type: ModuleKind) => void;
  onRandomizeGraph: () => void;
  binauralEnabled: boolean;
  onToggleBinaural: (enabled: boolean) => void;
}

export function AddModuleButtons(props: AddModuleButtonsProps) {
  const moduleTypes = Object.values(ModuleKind);

  return (
    <div class="module-controls">
      <For each={moduleTypes}>
        {(type) => (
          <button onClick={() => props.onAddModule(type)}>
            + {type}
          </button>
        )}
      </For>
      <div class="randomize-controls">
        <label class="binaural-toggle">
          <input
            type="checkbox"
            checked={props.binauralEnabled}
            onChange={(e) => props.onToggleBinaural(e.currentTarget.checked)}
          />
          Binaural
        </label>
        <button class="randomize-btn" onClick={props.onRandomizeGraph}>
          🎲 Randomize
        </button>
      </div>
    </div>
  );
}
