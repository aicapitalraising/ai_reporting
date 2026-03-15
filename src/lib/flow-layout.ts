import Dagre from '@dagrejs/dagre';
import type { FlowNode, FlowEdge } from '@/types/flowboard';

export function getAutoLayoutedElements(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction: 'LR' | 'TB' = 'LR'
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: direction,
    nodesep: 80,
    ranksep: 120,
    marginx: 50,
    marginy: 50,
  });

  nodes.forEach((node) => {
    // Estimate node dimensions based on type
    const width = node.type === 'scene-combiner' ? 260 : 280;
    const height = node.type === 'scene-combiner' ? 200 : 320;
    g.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  Dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const dagreNode = g.node(node.id);
    const width = node.type === 'scene-combiner' ? 260 : 280;
    const height = node.type === 'scene-combiner' ? 200 : 320;

    return {
      ...node,
      position: {
        x: dagreNode.x - width / 2,
        y: dagreNode.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}
