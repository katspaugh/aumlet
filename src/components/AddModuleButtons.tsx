import { For } from 'solid-js';
import { ModuleKind } from '../types/graph';

interface AddModuleButtonsProps {
  onAddModule: (type: ModuleKind) => void;
  onRandomizeGraph: () => void;
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
      <button class="randomize-btn" onClick={props.onRandomizeGraph}>
        🎲 Randomize
      </button>
    </div>
  );
}
