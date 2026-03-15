import { useEffect, useCallback, useMemo, useState, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlowToolbar } from './FlowToolbar';
import { FlowCanvas } from './FlowCanvas';
import { NodeInspector } from './NodeInspector';
import { ScriptToFlowDialog } from './ScriptToFlowDialog';
import { ViralAdFlowDialog } from './ViralAdFlowDialog';
import { AvatarDetailDialog } from '@/components/avatars/AvatarDetailDialog';
import { useFlowboard } from '@/hooks/useFlowboard';
import { useFlowExecution } from '@/hooks/useFlowExecution';
import { useClients } from '@/hooks/useClients';
import { useAvatars, useStockAvatars } from '@/hooks/useAvatars';
import { supabase } from '@/integrations/supabase/client';
import type { FlowNodeType, FlowNode, FlowEdge } from '@/types/flowboard';
import type { Avatar } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getAutoLayoutedElements } from '@/lib/flow-layout';

interface FlowboardCreatorProps {
  projectId: string;
  clientId: string;
}

function FlowboardLoadingSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 p-3 bg-card border-b border-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded" />
        ))}
        <div className="ml-auto">
          <Skeleton className="h-8 w-24 rounded" />
        </div>
      </div>
      <div className="flex-1 flex">
        <div className="flex-1 bg-muted/30 flex items-center justify-center">
          <div className="space-y-3 text-center">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-4 w-40 mx-auto" />
            <Skeleton className="h-3 w-32 mx-auto" />
          </div>
        </div>
        <div className="w-80 border-l border-border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    </div>
  );
}

export function FlowboardCreator({ projectId, clientId }: FlowboardCreatorProps) {
  const navigate = useNavigate();
  const flowboard = useFlowboard({ projectId });
  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [viralAdDialogOpen, setViralAdDialogOpen] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [selectedAvatarForDialog, setSelectedAvatarForDialog] = useState<Avatar | null>(null);
  
  const { data: clients = [] } = useClients();
  const { data: clientAvatars = [] } = useAvatars(clientId);
  const { data: stockAvatars = [] } = useStockAvatars();
  const allAvatars = [...stockAvatars, ...clientAvatars.filter(a => !a.is_stock)];

  const {
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    isLoading,
    isSaving,
    saveStatus,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    duplicateNode,
    updateNodeData,
    setSelectedNodeId,
    saveFlowboard,
    clearFlow,
    deleteNode,
    setNodesAndEdges,
    undo,
    redo,
    canUndo,
    canRedo,
  } = flowboard;

  const flowExecution = useFlowExecution({
    nodes,
    edges,
    updateNodeData,
  });
  
  const { executeNode, executeFlow, retryHooksScene } = flowExecution;

  const handleDeleteNode = useCallback((nodeId: string) => {
    deleteNode(nodeId);
    toast.success('Node deleted');
  }, [deleteNode]);

  // Inject callbacks into node data
  useEffect(() => {
    nodes.forEach(n => {
      const needsDelete = !(n.data as any).onDeleteNode;
      const needsRetry = n.type === 'hooks' && !(n.data as any).onRetryScene;
      if (needsDelete || needsRetry) {
        const patch: any = {};
        if (needsDelete) patch.onDeleteNode = handleDeleteNode;
        if (needsRetry) patch.onRetryScene = retryHooksScene;
        updateNodeData(n.id, patch);
      }
    });
  }, [nodes, retryHooksScene, updateNodeData, handleDeleteNode]);

  // Auto-save after node completes generation
  const completedCount = useMemo(() => 
    nodes.filter(n => n.data.status === 'completed').length,
    [nodes]
  );
  const prevCompletedCountRef = useRef(0);

  useEffect(() => {
    if (completedCount > prevCompletedCountRef.current && completedCount > 0) {
      saveFlowboard();
    }
    prevCompletedCountRef.current = completedCount;
  }, [completedCount, saveFlowboard]);

  // Auto-save generated media to client asset history
  useEffect(() => {
    const saveGeneratedAssets = async () => {
      for (const node of nodes) {
        if (node.data.status !== 'completed') continue;
        const nodeData = node.data as any;
        
        const videoUrl = nodeData.generatedVideoUrl;
        if (videoUrl && !videoUrl.startsWith('blob:') && !nodeData._savedToHistory) {
          try {
            await supabase.from('assets').insert({
              client_id: clientId,
              project_id: projectId,
              type: 'video',
              public_url: videoUrl,
              name: `${nodeData.label || node.type} - Video`,
              status: 'completed',
              metadata: { source: 'flowboard', nodeType: node.type, nodeId: node.id },
            });
            updateNodeData(node.id, { _savedToHistory: true } as any);
          } catch (err) {
            console.error('Failed to save asset to history:', err);
          }
        }

        const imageUrl = nodeData.generatedImageUrl;
        if (imageUrl && !nodeData._imageSavedToHistory) {
          try {
            await supabase.from('assets').insert({
              client_id: clientId,
              project_id: projectId,
              type: 'image',
              public_url: imageUrl,
              name: `${nodeData.label || node.type} - Image`,
              status: 'completed',
              metadata: { source: 'flowboard', nodeType: node.type, nodeId: node.id },
            });
            updateNodeData(node.id, { _imageSavedToHistory: true } as any);
          } catch (err) {
            console.error('Failed to save image asset to history:', err);
          }
        }

        const outputVideoUrl = nodeData.outputVideoUrl;
        if (outputVideoUrl && !outputVideoUrl.startsWith('blob:') && !nodeData._combinedSavedToHistory) {
          try {
            await supabase.from('assets').insert({
              client_id: clientId,
              project_id: projectId,
              type: 'video',
              public_url: outputVideoUrl,
              name: `Combined Video`,
              status: 'completed',
              metadata: { source: 'flowboard', nodeType: 'scene-combiner', nodeId: node.id },
            });
            updateNodeData(node.id, { _combinedSavedToHistory: true } as any);
          } catch (err) {
            console.error('Failed to save combined video to history:', err);
          }
        }
      }
    };
    saveGeneratedAssets();
  }, [nodes, clientId, projectId, updateNodeData]);

  const handleAddNode = useCallback((type: FlowNodeType) => addNode(type), [addNode]);
  const handleSave = useCallback(() => saveFlowboard(), [saveFlowboard]);
  const handleRunFlow = useCallback(() => executeFlow(), [executeFlow]);
  const handleGenerateNode = useCallback((nodeId: string) => executeNode(nodeId), [executeNode]);

  const handleFlowGenerated = useCallback((newNodes: FlowNode[], newEdges: FlowEdge[]) => {
    setNodesAndEdges(newNodes, newEdges);
  }, [setNodesAndEdges]);

  const handleAutoAlign = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getAutoLayoutedElements(nodes, edges, 'LR');
    setNodesAndEdges(layoutedNodes as FlowNode[], layoutedEdges as FlowEdge[]);
    toast.success('Nodes auto-aligned');
  }, [nodes, edges, setNodesAndEdges]);

  const handleDuplicate = useCallback(() => {
    if (selectedNodeId) duplicateNode(selectedNodeId);
  }, [selectedNodeId, duplicateNode]);

  const handleOpenAvatarDialog = useCallback((avatarId: string) => {
    const avatar = allAvatars.find(a => a.id === avatarId);
    if (avatar) {
      setSelectedAvatarForDialog(avatar);
      setAvatarDialogOpen(true);
    }
  }, [allAvatars]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        handleDeleteNode(selectedNodeId);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedNodeId) {
        e.preventDefault();
        duplicateNode(selectedNodeId);
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.shiftKey && selectedNodeId) {
        e.preventDefault();
        handleGenerateNode(selectedNodeId);
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleRunFlow();
      }

      if (e.key === 'Escape' && selectedNodeId) {
        e.preventDefault();
        setSelectedNodeId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, handleDeleteNode, handleSave, handleGenerateNode, handleRunFlow, setSelectedNodeId, undo, redo, duplicateNode]);

  const isRunning = useMemo(() => 
    nodes.some((n) => n.data.status === 'generating'),
    [nodes]
  );

  const completedVideoUrls = useMemo(() => {
    const urls: string[] = [];
    nodes.forEach(n => {
      const d = n.data as any;
      if (d.status === 'completed') {
        if (d.generatedVideoUrl && !d.generatedVideoUrl.startsWith('blob:')) urls.push(d.generatedVideoUrl);
        else if (d.outputVideoUrl && !d.outputVideoUrl.startsWith('blob:')) urls.push(d.outputVideoUrl);
      }
    });
    return urls;
  }, [nodes]);

  const handleSendToEditor = useCallback(() => {
    if (completedVideoUrls.length === 0) return;
    // Detect aspect ratio from nodes
    const ar = nodes.find(n => (n.data as any).aspectRatio)?.data as any;
    const aspectRatio = ar?.aspectRatio || '16:9';
    const encoded = encodeURIComponent(JSON.stringify(completedVideoUrls));
    navigate(`/video-editor?clips=${encoded}&ar=${aspectRatio}&name=${encodeURIComponent('Flowboard Export')}`);
  }, [completedVideoUrls, nodes, navigate]);

  if (isLoading) {
    return <FlowboardLoadingSkeleton />;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px] border border-border rounded-lg overflow-hidden">
      <FlowToolbar
        onAddNode={handleAddNode}
        onSave={handleSave}
        onRunFlow={handleRunFlow}
        onClear={clearFlow}
        onOpenScriptToFlow={() => setScriptDialogOpen(true)}
        onOpenViralAd={() => setViralAdDialogOpen(true)}
        onAutoAlign={handleAutoAlign}
        onUndo={undo}
        onRedo={redo}
        onDuplicate={handleDuplicate}
        onSendToEditor={handleSendToEditor}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={isSaving}
        isRunning={isRunning}
        hasNodes={nodes.length > 0}
        hasSelection={!!selectedNodeId}
        hasCompletedVideos={completedVideoUrls.length > 0}
        saveStatus={saveStatus}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeSelect={setSelectedNodeId}
          selectedNodeId={selectedNodeId}
        />
        
        <NodeInspector
          selectedNode={selectedNode}
          onUpdateNode={updateNodeData}
          onGenerateNode={handleGenerateNode}
          clientId={clientId}
          onOpenAvatarDialog={handleOpenAvatarDialog}
        />
      </div>

      <ScriptToFlowDialog
        open={scriptDialogOpen}
        onOpenChange={setScriptDialogOpen}
        clientId={clientId}
        onFlowGenerated={handleFlowGenerated}
      />

      <ViralAdFlowDialog
        open={viralAdDialogOpen}
        onOpenChange={setViralAdDialogOpen}
        clientId={clientId}
        onFlowGenerated={handleFlowGenerated}
      />

      <AvatarDetailDialog
        avatar={selectedAvatarForDialog}
        open={avatarDialogOpen}
        onOpenChange={(open) => {
          setAvatarDialogOpen(open);
          if (!open) setSelectedAvatarForDialog(null);
        }}
        clients={clients.map(c => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
