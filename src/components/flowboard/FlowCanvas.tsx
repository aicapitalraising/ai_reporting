import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Connection,
  NodeTypes,
  DefaultEdgeOptions,
  MarkerType,
  OnNodesChange,
  OnEdgesChange,
  OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ImageGeneratorNode } from './nodes/ImageGeneratorNode';
import { VideoGeneratorNode } from './nodes/VideoGeneratorNode';
import { PromptGeneratorNode } from './nodes/PromptGeneratorNode';
import { ImageToVideoNode } from './nodes/ImageToVideoNode';
import { AvatarSceneNode } from './nodes/AvatarSceneNode';
import { SceneCombinerNode } from './nodes/SceneCombinerNode';
import { ImageCombinerNode } from './nodes/ImageCombinerNode';
import { HooksNode } from './nodes/HooksNode';
import type { FlowNode, FlowEdge, AppNode } from '@/types/flowboard';

const nodeTypes: NodeTypes = {
  'image-generator': ImageGeneratorNode,
  'video-generator': VideoGeneratorNode,
  'prompt-generator': PromptGeneratorNode,
  'image-to-video': ImageToVideoNode,
  'avatar-scene': AvatarSceneNode,
  'scene-combiner': SceneCombinerNode,
  'image-combiner': ImageCombinerNode,
  'hooks': HooksNode,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  animated: true,
  style: {
    stroke: 'hsl(var(--primary))',
    strokeWidth: 2,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: 'hsl(var(--primary))',
  },
};

interface FlowCanvasProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange<FlowEdge>;
  onConnect: (connection: Connection) => void;
  onNodeSelect: (nodeId: string | null) => void;
  selectedNodeId: string | null;
}

export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeSelect,
}: FlowCanvasProps) {
  const handleSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      if (params.nodes.length > 0) {
        onNodeSelect(params.nodes[0].id);
      } else {
        onNodeSelect(null);
      }
    },
    [onNodeSelect]
  );

  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={handleSelectionChange}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        className="bg-background"
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="hsl(var(--muted-foreground) / 0.2)"
        />
        <Controls className="!bg-card !border-border !rounded-lg !shadow-lg [&_button]:!bg-card [&_button]:!border-border [&_button]:!text-foreground [&_button:hover]:!bg-muted" />
        <MiniMap 
          className="!bg-card !border-border !rounded-lg !shadow-lg"
          nodeColor="hsl(var(--primary))"
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>
    </div>
  );
}
