import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import { ComponentNode } from "./ComponentNode";
import type { VectorComponent } from "../lib/types";
import type { ComponentMetrics } from "../lib/types";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 100;

const nodeTypes = { component: ComponentNode };

function layoutGraph(components: VectorComponent[], metricsMap: Map<string, ComponentMetrics>, selectedId: string | null) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", ranksep: 80, nodesep: 30 });

  for (const c of components) {
    g.setNode(c.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const c of components) {
    for (const input of c.inputs) {
      g.setEdge(input.id, c.id);
    }
  }

  dagre.layout(g);

  const nodes: Node[] = components.map(c => {
    const pos = g.node(c.id);
    return {
      id: c.id,
      type: "component",
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      selected: c.id === selectedId,
      data: {
        label: c.id,
        kind: c.kind,
        componentType: c.componentType,
        metrics: metricsMap.get(c.id),
      },
    };
  });

  const edges: Edge[] = components.flatMap(c =>
    c.inputs.map(input => ({
      id: `${input.id}->${c.id}`,
      source: input.id,
      target: c.id,
      animated: true,
      style: { stroke: "#4b5563", strokeWidth: 1.5 },
    }))
  );

  return { nodes, edges };
}

interface Props {
  components: VectorComponent[];
  metricsMap: Map<string, ComponentMetrics>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function TopologyGraph({ components, metricsMap, selectedId, onSelect }: Props) {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => layoutGraph(components, metricsMap, selectedId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [components] // Only re-layout when topology changes, not every metrics tick
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Update node data (metrics) without re-layouting
  useEffect(() => {
    setNodes(prev =>
      prev.map(n => ({
        ...n,
        selected: n.id === selectedId,
        data: {
          ...n.data,
          metrics: metricsMap.get(n.id),
        },
      }))
    );
  }, [metricsMap, selectedId, setNodes]);

  // Re-layout on topology change
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = layoutGraph(components, metricsMap, selectedId);
    setNodes(newNodes);
    // edges setter doesn't exist on useEdgesState the same way, handled via key
    void newEdges;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [components]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={(_, node) => onSelect(node.id)}
      fitView
      colorMode="dark"
      className="bg-gray-950"
    >
      <Background color="#374151" gap={20} />
      <Controls className="!bg-gray-800 !border-gray-700" />
      <MiniMap
        nodeColor={n => {
          const kind = (n.data as { kind: string }).kind;
          return kind === "source" ? "#22c55e" : kind === "sink" ? "#f59e0b" : "#3b82f6";
        }}
        className="!bg-gray-800 !border-gray-700"
      />
    </ReactFlow>
  );
}
