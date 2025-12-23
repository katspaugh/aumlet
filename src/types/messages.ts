import type { Graph } from './graph';

export interface LoadGraphMessage {
  type: 'loadGraph';
  graph: Graph;
}

export interface GraphLoadedMessage {
  type: 'graphLoaded';
  success: true;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type WorkletMessage = LoadGraphMessage | GraphLoadedMessage | ErrorMessage;
