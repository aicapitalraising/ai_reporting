import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useCustomGPTs, useCreateGPT, useDeleteGPT, useUpdateGPT, useGPTKnowledgeLinks, useLinkKnowledgeToGPT, useUnlinkKnowledgeFromGPT, CustomGPT } from '@/hooks/useCustomGPTs';
import { useKnowledgeDocuments } from '@/hooks/useKnowledgeBase';
import { Plus, Bot, Trash2, Loader2, MessageSquare, Settings, BookOpen, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { GPTDataSourcesPanel } from './GPTDataSourcesPanel';
import { useGPTFiles } from '@/hooks/useGPTFiles';

interface CustomGPTsPanelProps {
  onSelectGPT: (gpt: CustomGPT) => void;
}

const ICON_OPTIONS = [
  { value: 'bot', label: 'Bot', icon: '🤖' },
  { value: 'brain', label: 'Brain', icon: '🧠' },
  { value: 'rocket', label: 'Rocket', icon: '🚀' },
  { value: 'chart', label: 'Chart', icon: '📊' },
  { value: 'money', label: 'Money', icon: '💰' },
  { value: 'target', label: 'Target', icon: '🎯' },
  { value: 'star', label: 'Star', icon: '⭐' },
  { value: 'lightning', label: 'Lightning', icon: '⚡' },
];

const COLOR_OPTIONS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', 
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

export function CustomGPTsPanel({ onSelectGPT }: CustomGPTsPanelProps) {
  const { data: gpts = [], isLoading } = useCustomGPTs();
  const { data: documents = [] } = useKnowledgeDocuments();
  const { data: allLinks = [] } = useGPTKnowledgeLinks();
  const createGPT = useCreateGPT();
  const deleteGPT = useDeleteGPT();
  const updateGPT = useUpdateGPT();
  const linkKnowledge = useLinkKnowledgeToGPT();
  const unlinkKnowledge = useUnlinkKnowledgeFromGPT();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [configureGPT, setConfigureGPT] = useState<CustomGPT | null>(null);
  const [editGPT, setEditGPT] = useState<CustomGPT | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('bot');
  const [selectedColor, setSelectedColor] = useState('#6366f1');

  const handleCreate = async () => {
    if (!name.trim() || !systemPrompt.trim()) return;

    await createGPT.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      system_prompt: systemPrompt.trim(),
      icon: selectedIcon,
      color: selectedColor,
    });

    resetForm();
    setCreateDialogOpen(false);
  };

  const handleUpdate = async () => {
    if (!editGPT || !name.trim() || !systemPrompt.trim()) return;

    await updateGPT.mutateAsync({
      id: editGPT.id,
      name: name.trim(),
      description: description.trim() || undefined,
      system_prompt: systemPrompt.trim(),
      icon: selectedIcon,
      color: selectedColor,
    });

    resetForm();
    setEditGPT(null);
  };

  const openEditDialog = (gpt: CustomGPT) => {
    setName(gpt.name);
    setDescription(gpt.description || '');
    setSystemPrompt(gpt.system_prompt);
    setSelectedIcon(gpt.icon);
    setSelectedColor(gpt.color);
    setEditGPT(gpt);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setSystemPrompt('');
    setSelectedIcon('bot');
    setSelectedColor('#6366f1');
  };

  const getIconEmoji = (iconName: string) => {
    return ICON_OPTIONS.find(i => i.value === iconName)?.icon || '🤖';
  };

  const getGPTLinks = (gptId: string) => {
    return allLinks.filter(l => l.gpt_id === gptId);
  };

  const toggleDocumentLink = async (gptId: string, documentId: string, isLinked: boolean) => {
    if (isLinked) {
      await unlinkKnowledge.mutateAsync({ gptId, documentId });
    } else {
      await linkKnowledge.mutateAsync({ gptId, documentId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Custom GPTs</h3>
          <p className="text-sm text-muted-foreground">
            Create specialized AI assistants with custom instructions and data sources
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create GPT
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Custom GPT</DialogTitle>
              <DialogDescription>
                Create a specialized AI assistant with custom instructions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My GPT..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={selectedIcon} onValueChange={setSelectedIcon}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <span>{opt.icon}</span>
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What this GPT does..."
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        selectedColor === color ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>System Prompt</Label>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful assistant that specializes in..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  Define the GPT's personality, expertise, and behavior
                </p>
              </div>

              <Button 
                onClick={handleCreate} 
                disabled={createGPT.isPending || !name.trim() || !systemPrompt.trim()}
                className="w-full"
              >
                {createGPT.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create GPT'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {gpts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No custom GPTs created yet.<br />
              Create one to get started with specialized AI assistants.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {gpts.map((gpt) => {
            const links = getGPTLinks(gpt.id);
            return (
              <GPTCard
                key={gpt.id}
                gpt={gpt}
                links={links}
                getIconEmoji={getIconEmoji}
                onChat={() => onSelectGPT(gpt)}
                onConfigure={() => setConfigureGPT(gpt)}
                onEdit={() => openEditDialog(gpt)}
                onDelete={() => deleteGPT.mutate(gpt.id)}
                deleteLoading={deleteGPT.isPending}
              />
            );
          })}
        </div>
      )}

      {/* Edit GPT Dialog */}
      <Dialog open={!!editGPT} onOpenChange={(open) => !open && setEditGPT(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {editGPT?.name}</DialogTitle>
            <DialogDescription>
              Update the GPT's settings and instructions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My GPT..."
                />
              </div>
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select value={selectedIcon} onValueChange={setSelectedIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <span>{opt.icon}</span>
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this GPT does..."
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedColor === color ? 'border-foreground scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are a helpful assistant that specializes in..."
                rows={6}
              />
            </div>

            <Button 
              onClick={handleUpdate} 
              disabled={updateGPT.isPending || !name.trim() || !systemPrompt.trim()}
              className="w-full"
            >
              {updateGPT.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Configure GPT Data Sources Dialog */}
      <Dialog open={!!configureGPT} onOpenChange={(open) => !open && setConfigureGPT(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
                style={{ backgroundColor: `${configureGPT?.color}20` }}
              >
                {configureGPT && getIconEmoji(configureGPT.icon)}
              </div>
              {configureGPT?.name}
            </DialogTitle>
            <DialogDescription>
              Manage data sources and linked knowledge base documents
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-4">
              {/* GPT-Specific Files */}
              {configureGPT && (
                <GPTDataSourcesPanel gptId={configureGPT.id} gptName={configureGPT.name} />
              )}

              <Separator />

              {/* Linked Knowledge Base Documents */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Linked Knowledge Base</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Select shared documents from the agency knowledge base
                </p>
                {documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No documents in knowledge base. Add some first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => {
                      const isLinked = configureGPT 
                        ? allLinks.some(l => l.gpt_id === configureGPT.id && l.document_id === doc.id)
                        : false;
                      return (
                        <div 
                          key={doc.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted"
                        >
                          <Checkbox
                            checked={isLinked}
                            onCheckedChange={() => 
                              configureGPT && toggleDocumentLink(configureGPT.id, doc.id, isLinked)
                            }
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.document_type.toUpperCase()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Extracted GPT Card component
function GPTCard({ 
  gpt, 
  links, 
  getIconEmoji, 
  onChat, 
  onConfigure, 
  onEdit,
  onDelete, 
  deleteLoading 
}: { 
  gpt: CustomGPT;
  links: any[];
  getIconEmoji: (icon: string) => string;
  onChat: () => void;
  onConfigure: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteLoading: boolean;
}) {
  const { data: gptFiles = [] } = useGPTFiles(gpt.id);
  const totalFiles = gptFiles.length + links.length;

  return (
    <Card className="relative overflow-hidden group">
      <div 
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: gpt.color }}
      />
      <CardContent className="p-4 pt-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: `${gpt.color}20` }}
            >
              {getIconEmoji(gpt.icon)}
            </div>
            <div>
              <h4 className="font-semibold">{gpt.name}</h4>
              {gpt.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {gpt.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {totalFiles > 0 && (
          <div className="flex items-center gap-1 mb-3">
            <BookOpen className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {gptFiles.length} file{gptFiles.length !== 1 ? 's' : ''} • {links.length} linked doc{links.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
          {gpt.system_prompt}
        </p>

        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            onClick={onChat}
            className="flex-1"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Chat
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onConfigure}
          >
            <Settings className="h-3 w-3" />
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onEdit}
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onDelete}
            disabled={deleteLoading}
          >
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
