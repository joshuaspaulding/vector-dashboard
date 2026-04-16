export type ComponentKind = "source" | "transform" | "sink";

export interface VectorComponent {
  id: string;
  kind: ComponentKind;
  componentType: string;
  inputs: { id: string }[];
}

export interface ComponentMetrics {
  componentId: string;
  receivedEventsTotal: number;
  sentEventsTotal: number;
  utilization: number | null;
  errorsTotal: number;
  // Derived from deltas
  receivedPerSecond: number;
  sentPerSecond: number;
}

export type TapEvent =
  | { type: "tap_event"; componentId: string; event: unknown }
  | { type: "tap_error"; componentId: string; message: string }
  | { type: "tap_end"; componentId: string }
  | { type: "error"; message: string };
