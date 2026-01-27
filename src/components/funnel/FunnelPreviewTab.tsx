import { useState } from 'react';
import { Plus, LayoutGrid, GitBranch } from 'lucide-react';
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { DeviceSwitcher, DeviceType } from './DeviceSwitcher';
import { SortableFunnelStep } from './SortableFunnelStep';
import { FunnelFlowDiagram } from './FunnelFlowDiagram';
import { useFunnelSteps, useCreateFunnelStep, useUpdateFunnelStep, useDeleteFunnelStep, useReorderFunnelSteps, FunnelStep } from '@/hooks/useFunnelSteps';

interface FunnelPreviewTabProps {
  clientId: string;
  isPublicView?: boolean;
}

type ViewMode = 'preview' | 'flow';

export function FunnelPreviewTab({ clientId, isPublicView = false }: FunnelPreviewTabProps) {
  const { data: steps = [], isLoading } = useFunnelSteps(clientId);
  const createStep = useCreateFunnelStep();
  const updateStep = useUpdateFunnelStep();
  const deleteStep = useDeleteFunnelStep();
  const reorderSteps = useReorderFunnelSteps();
  
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newStepUrl, setNewStepUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('phone');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleAddStep = async () => {
    if (!newStepName.trim() || !newStepUrl.trim()) return;
    
    let validUrl = newStepUrl;
    if (!newStepUrl.startsWith('http://') && !newStepUrl.startsWith('https://')) {
      validUrl = 'https://' + newStepUrl;
    }
    
    await createStep.mutateAsync({
      client_id: clientId,
      name: newStepName.trim(),
      url: validUrl,
      sort_order: steps.length,
    });
    
    setNewStepName('');
    setNewStepUrl('');
    setAddModalOpen(false);
  };

  const startEditing = (step: FunnelStep) => {
    setEditingId(step.id);
    setEditName(step.name);
    setEditUrl(step.url);
  };

  const saveEdit = async (step: FunnelStep) => {
    if (!editName.trim() || !editUrl.trim()) return;
    
    let validUrl = editUrl;
    if (!editUrl.startsWith('http://') && !editUrl.startsWith('https://')) {
      validUrl = 'https://' + editUrl;
    }
    
    await updateStep.mutateAsync({
      id: step.id,
      clientId,
      updates: { name: editName.trim(), url: validUrl },
    });
    
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditUrl('');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = steps.findIndex(s => s.id === active.id);
    const newIndex = steps.findIndex(s => s.id === over.id);
    
    const newOrder = arrayMove(steps, oldIndex, newIndex);
    reorderSteps.mutate({
      clientId,
      orderedIds: newOrder.map(s => s.id),
    });
  };

  // Get grid columns based on device type
  const getGridCols = () => {
    switch (deviceType) {
      case 'desktop':
        return 'grid-cols-1 xl:grid-cols-2';
      case 'tablet':
        return 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3';
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading funnel...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">Funnel Preview</h2>
          <p className="text-sm text-muted-foreground">
            Preview your funnel pages across different devices
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* View Mode Toggle */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && setViewMode(v as ViewMode)}
            className="border rounded-lg p-1"
          >
            <ToggleGroupItem value="preview" className="gap-2 px-3">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Preview</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="flow" className="gap-2 px-3">
              <GitBranch className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Flow</span>
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Device Switcher (only in preview mode) */}
          {viewMode === 'preview' && (
            <DeviceSwitcher value={deviceType} onChange={setDeviceType} />
          )}

          {!isPublicView && (
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          )}
        </div>
      </div>

      {/* Funnel Content */}
      {steps.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No funnel steps added yet</p>
            {!isPublicView && (
              <Button variant="outline" onClick={() => setAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Funnel Step
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'flow' ? (
        <FunnelFlowDiagram steps={steps} />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={steps.map(s => s.id)} strategy={rectSortingStrategy}>
            <div className={`grid ${getGridCols()} gap-8`}>
              {steps.map((step, index) => (
                <SortableFunnelStep
                  key={step.id}
                  step={step}
                  index={index}
                  deviceType={deviceType}
                  isPublicView={isPublicView}
                  isEditing={editingId === step.id}
                  editName={editName}
                  editUrl={editUrl}
                  onEditNameChange={setEditName}
                  onEditUrlChange={setEditUrl}
                  onStartEdit={() => startEditing(step)}
                  onSaveEdit={() => saveEdit(step)}
                  onCancelEdit={cancelEdit}
                  onDelete={() => deleteStep.mutate({ id: step.id, clientId })}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Step Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Funnel Step</DialogTitle>
            <DialogDescription>
              Add a new page to your funnel preview. The page will be displayed in device mockups.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="step-name">Step Name</Label>
              <Input
                id="step-name"
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                placeholder="e.g., Landing Page, Form, Thank You"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="step-url">Page URL</Label>
              <Input
                id="step-url"
                value={newStepUrl}
                onChange={(e) => setNewStepUrl(e.target.value)}
                placeholder="https://example.com/landing-page"
              />
              <p className="text-xs text-muted-foreground">
                Make sure the URL allows embedding (some sites block iframes)
              </p>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddStep}
                disabled={!newStepName.trim() || !newStepUrl.trim() || createStep.isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
