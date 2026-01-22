import { createId } from "./id";
import type { FluxaEventMeta } from "../core/types";

export function createMeta(params: {
  sourceId?: string;
  sourceLocationFile?: string;
  traceId?: string;
  path?: string[];
  extra?: Record<string, unknown>;
}): FluxaEventMeta {
  return {
    id: createId(),
    timestamp: Date.now(),
    sourceId: params.sourceId,
    sourceLocationFile: params.sourceLocationFile,
    traceId: params.traceId,
    path: params.path ?? [],
    ...(params.extra ?? {}),
  };
}
