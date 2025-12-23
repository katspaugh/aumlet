import type { Graph, ModuleDefinition, Connection } from '../types/graph';
import { ModuleKind } from '../types/graph';

interface ModuleRow {
  type: string;
  freq?: number;
  shape?: string;
  id: string;
}

export class PatchMatrix {
  private moduleTable: HTMLTableElement;
  private patchMatrix: HTMLTableElement;
  private modules: ModuleRow[] = [];

  constructor(
    moduleTableId: string,
    patchMatrixId: string,
    private onGraphChange: (graph: Graph) => void
  ) {
    this.moduleTable = document.getElementById(moduleTableId) as HTMLTableElement;
    this.patchMatrix = document.getElementById(patchMatrixId) as HTMLTableElement;
  }

  loadGraph(graph: Graph): void {
    // Convert graph to module rows
    this.modules = graph.modules.map((mod) => ({
      type: mod.kind,
      freq: mod.params?.freq,
      shape: mod.params?.shape,
      id: mod.id,
    }));

    this.renderModuleTable();
    this.renderPatchMatrix(graph.connections);
  }

  private renderModuleTable(): void {
    const tbody = this.moduleTable.querySelector('tbody')!;
    tbody.innerHTML = '';

    this.modules.forEach((module, index) => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td><input type="text" list="moduleTypes" value="${module.type}"
                   data-index="${index}" class="type-input" /></td>
        <td>${this.renderParamInputs(module, index)}</td>
        <td class="id-cell">${module.id}</td>
        <td><button class="delete-btn" data-index="${index}">×</button></td>
      `;
    });

    // Add event listeners
    tbody.querySelectorAll('.type-input').forEach((input) => {
      input.addEventListener('change', (e) => this.handleTypeChange(e));
    });
    tbody.querySelectorAll('.param-input').forEach((input) => {
      input.addEventListener('change', () => this.updateGraph());
    });
    tbody.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => this.deleteModule(e));
    });
  }

  private renderParamInputs(module: ModuleRow, index: number): string {
    const type = module.type.toUpperCase();
    let html = '';

    if (type === 'VCO' || type === 'LFO') {
      html += `<input type="number" class="param-input" data-index="${index}"
                      data-param="freq" value="${module.freq ?? 0}"
                      placeholder="freq (V)" style="width: 80px" />`;
    }

    if (type === 'LFO') {
      const shape = module.shape || 'sine';
      html += `<select class="param-input" data-index="${index}" data-param="shape">
                 <option value="sine" ${shape === 'sine' ? 'selected' : ''}>sine</option>
                 <option value="tri" ${shape === 'tri' ? 'selected' : ''}>tri</option>
                 <option value="saw" ${shape === 'saw' ? 'selected' : ''}>saw</option>
                 <option value="square" ${shape === 'square' ? 'selected' : ''}>square</option>
               </select>`;
    }

    return html || '<span class="no-params">-</span>';
  }

  private renderPatchMatrix(connections: Connection[]): void {
    const outputs = this.getOutputs();
    const inputs = this.getInputs();

    // Build connection map
    const connMap = new Map<string, Set<string>>();
    connections.forEach((conn) => {
      const key = `${conn.from.id}.${conn.from.port}`;
      const val = `${conn.to.id}.${conn.to.port}`;
      if (!connMap.has(key)) connMap.set(key, new Set());
      connMap.get(key)!.add(val);
    });

    // Render matrix
    let html = '<thead><tr><th>From \\ To</th>';
    inputs.forEach((input) => {
      html += `<th class="input-header">${input}</th>`;
    });
    html += '</tr></thead><tbody>';

    outputs.forEach((output) => {
      html += `<tr><th class="output-header">${output}</th>`;
      inputs.forEach((input) => {
        const isConnected = connMap.get(output)?.has(input) || false;
        html += `<td><input type="checkbox" ${isConnected ? 'checked' : ''}
                           data-from="${output}" data-to="${input}" /></td>`;
      });
      html += '</tr>';
    });

    html += '</tbody>';
    this.patchMatrix.innerHTML = html;

    // Add event listeners
    this.patchMatrix.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => this.updateGraph());
    });
  }

  private getOutputs(): string[] {
    return this.modules
      .map((m) => {
        if (m.type === 'VCO' || m.type === 'VCA' || m.type === 'LFO' || m.type === 'OUTPUT') {
          return `${m.id}.out`;
        }
        return null;
      })
      .filter((x): x is string => x !== null);
  }

  private getInputs(): string[] {
    const inputs: string[] = [];
    this.modules.forEach((m) => {
      const type = m.type.toUpperCase();
      if (type === 'VCO') {
        inputs.push(`${m.id}.pitch`, `${m.id}.fm`);
      } else if (type === 'VCA') {
        inputs.push(`${m.id}.in`, `${m.id}.cv`);
      } else if (type === 'LFO') {
        inputs.push(`${m.id}.rate`);
      } else if (type === 'OUTPUT') {
        inputs.push(`${m.id}.in`);
      }
    });
    return inputs;
  }

  private handleTypeChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    const index = parseInt(input.dataset.index!);
    this.modules[index].type = input.value;

    // Regenerate ID based on type
    const type = input.value.toLowerCase();
    const count = this.modules.filter((m) => m.type === input.value).length;
    this.modules[index].id = `${type}${count}`;

    this.renderModuleTable();
    this.updateGraph();
  }

  private deleteModule(e: Event): void {
    const btn = e.target as HTMLButtonElement;
    const index = parseInt(btn.dataset.index!);
    this.modules.splice(index, 1);
    this.renderModuleTable();
    this.updateGraph();
  }

  addModule(type: string): void {
    const lowerType = type.toLowerCase();
    const count = this.modules.filter((m) => m.type === type).length + 1;
    const id = `${lowerType}${count}`;

    this.modules.push({
      type,
      freq: type === 'VCO' || type === 'LFO' ? 0 : undefined,
      shape: type === 'LFO' ? 'sine' : undefined,
      id,
    });

    this.renderModuleTable();
    this.updateGraph();
  }

  private updateGraph(): void {
    // Read current state from inputs
    this.moduleTable.querySelectorAll<HTMLInputElement>('.param-input').forEach((input) => {
      const index = parseInt(input.dataset.index!);
      const param = input.dataset.param!;
      const module = this.modules[index];

      if (param === 'freq' && input.type === 'number') {
        module.freq = parseFloat(input.value);
      } else if (param === 'shape') {
        module.shape = input.value;
      }
    });

    const graph = this.toGraph();
    this.renderPatchMatrix(graph.connections);
    this.onGraphChange(graph);
  }

  toGraph(): Graph {
    const modules: ModuleDefinition[] = this.modules.map((m) => ({
      id: m.id,
      kind: m.type as ModuleKind,
      params:
        m.freq !== undefined || m.shape
          ? {
              freq: m.freq,
              shape: m.shape as 'sine' | 'tri' | 'saw' | 'square' | undefined,
            }
          : undefined,
    }));

    const connections: Connection[] = [];
    this.patchMatrix
      .querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')
      .forEach((checkbox) => {
        const [fromId, fromPort] = checkbox.dataset.from!.split('.');
        const [toId, toPort] = checkbox.dataset.to!.split('.');
        connections.push({
          from: { id: fromId, port: fromPort },
          to: { id: toId, port: toPort },
        });
      });

    return { modules, connections };
  }
}
