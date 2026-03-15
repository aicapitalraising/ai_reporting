import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  Loader2,
  Volume2,
  Mic,
  Play,
  Pause,
  Check,
  Trash2,
  Plus,
  CloudDownload,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useVoices, useCloneVoice, useDeleteVoice, useElevenLabsVoices, useImportElevenLabsVoice, type Voice, type ElevenLabsVoice } from '@/hooks/useVoices';

// Stock ElevenLabs voices
const STOCK_VOICES = [
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', gender: 'Male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'Female' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'Female' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'Male' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', gender: 'Male' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', gender: 'Male' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', gender: 'Non-binary' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'Male' },
  { id: 'Xb7hH8MSUJpSbSDYk0k2', name: 'Alice', gender: 'Female' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', gender: 'Female' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'Male' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'Female' },
  { id: 'cjVigY5qzO86Huf0OWal', name: 'Eric', gender: 'Male' },
  { id: 'iP95p4xoKVk53GoZ742B', name: 'Chris', gender: 'Male' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'Male' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', gender: 'Male' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', gender: 'Female' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', gender: 'Male' },
];

interface VoiceTabProps {
  currentVoiceId: string;
  onVoiceChange: (voiceId: string) => void;
  clientId?: string | null;
}

export function VoiceTab({ currentVoiceId, onVoiceChange, clientId }: VoiceTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { data: clonedVoices = [] } = useVoices(clientId);
  const cloneVoice = useCloneVoice();
  const deleteVoice = useDeleteVoice();
  const { data: elevenLabsVoices = [], refetch: fetchElevenLabsVoices, isLoading: isLoadingEL, isFetching: isFetchingEL } = useElevenLabsVoices();
  const importVoice = useImportElevenLabsVoice();

  const [showCloneForm, setShowCloneForm] = useState(false);
  const [showImportSection, setShowImportSection] = useState(false);
  const [cloneName, setCloneName] = useState('');
  const [cloneGender, setCloneGender] = useState('female');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large. Max 10MB.');
        return;
      }
      setSelectedFile(file);
      if (!cloneName) {
        setCloneName(file.name.replace(/\.[^.]+$/, ''));
      }
    }
  };

  const handleClone = async () => {
    if (!selectedFile || !cloneName) {
      toast.error('Please provide a name and audio file');
      return;
    }

    try {
      const voice = await cloneVoice.mutateAsync({
        audioFile: selectedFile,
        name: cloneName,
        clientId: clientId || undefined,
        gender: cloneGender,
      });
      toast.success(`Voice "${voice.name}" cloned successfully!`);
      onVoiceChange(voice.elevenlabs_voice_id);
      setShowCloneForm(false);
      setCloneName('');
      setSelectedFile(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to clone voice');
    }
  };

  const handleDelete = async (voice: Voice) => {
    try {
      await deleteVoice.mutateAsync(voice.id);
      if (currentVoiceId === voice.elevenlabs_voice_id) {
        onVoiceChange('');
      }
      toast.success('Voice deleted');
    } catch {
      toast.error('Failed to delete voice');
    }
  };

  const playPreview = (url: string, id: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => setPlayingId(null);
    audio.play();
    setPlayingId(id);
  };

  const isSelected = (voiceId: string) => currentVoiceId === voiceId;

  return (
    <div className="space-y-6">
      {/* Clone Voice Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-base font-semibold">
            <Mic className="h-4 w-4" />
            Clone a Voice
          </Label>
          {!showCloneForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCloneForm(true)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              New Clone
            </Button>
          )}
        </div>

        {showCloneForm && (
          <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
            <div className="space-y-2">
              <Label className="text-sm">Voice Name</Label>
              <Input
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="e.g. Sarah's Voice"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Gender</Label>
              <Select value={cloneGender} onValueChange={setCloneGender}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Audio Sample</Label>
              <p className="text-xs text-muted-foreground">
                Upload a clean audio sample (MP3, WAV, M4A). 30s–5min recommended.
              </p>
              {selectedFile ? (
                <div className="flex items-center gap-2 p-2 rounded-md bg-background border">
                  <Volume2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{selectedFile.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)}MB
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Upload Audio File
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleClone}
                disabled={!selectedFile || !cloneName || cloneVoice.isPending}
                className="flex-1 gap-2"
              >
                {cloneVoice.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cloning...
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Clone Voice
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCloneForm(false);
                  setSelectedFile(null);
                  setCloneName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Import from ElevenLabs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-base font-semibold">
            <CloudDownload className="h-4 w-4" />
            Import from ElevenLabs
          </Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowImportSection(!showImportSection);
              if (!showImportSection) fetchElevenLabsVoices();
            }}
            className="gap-1.5"
          >
            {showImportSection ? 'Hide' : 'Browse Voices'}
          </Button>
        </div>

        {showImportSection && (
          <div className="space-y-2 p-3 rounded-lg border bg-muted/30 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">
                Import custom voices from your ElevenLabs account
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchElevenLabsVoices()}
                disabled={isFetchingEL}
                className="gap-1 h-7"
              >
                <RefreshCw className={cn("h-3 w-3", isFetchingEL && "animate-spin")} />
                Refresh
              </Button>
            </div>

            {isFetchingEL && elevenLabsVoices.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : elevenLabsVoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No voices found in your ElevenLabs account</p>
            ) : (
              <div className="space-y-1.5">
                  {elevenLabsVoices
                    .filter(v => v.category !== 'premade') // Hide premade, show cloned/generated/professional
                    .map((voice) => {
                      const alreadyImported = clonedVoices.some(cv => cv.elevenlabs_voice_id === voice.voice_id);
                      return (
                        <div
                          key={voice.voice_id}
                          className={cn(
                            "flex items-center gap-2 p-2.5 rounded-lg border overflow-hidden cursor-pointer transition-all",
                            alreadyImported && isSelected(voice.voice_id)
                              ? 'border-primary bg-primary/10 ring-1 ring-primary'
                              : 'border-border hover:border-foreground/30'
                          )}
                          onClick={() => {
                            if (alreadyImported) {
                              onVoiceChange(voice.voice_id);
                              toast.success(`Selected "${voice.name}"`);
                            }
                          }}
                        >
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Mic className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate block">{voice.name}</span>
                            <Badge variant="outline" className="text-[9px] capitalize mt-0.5">
                              {voice.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {voice.preview_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => { e.stopPropagation(); playPreview(voice.preview_url!, voice.voice_id); }}
                              >
                                {playingId === voice.voice_id ? (
                                  <Pause className="h-3 w-3" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            {alreadyImported ? (
                              <Badge variant={isSelected(voice.voice_id) ? "default" : "secondary"} className="text-[9px] gap-0.5">
                                <Check className="h-2.5 w-2.5" />
                                {isSelected(voice.voice_id) ? 'Selected' : 'Added'}
                              </Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1 h-6 text-[10px] px-2"
                                disabled={importVoice.isPending}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const imported = await importVoice.mutateAsync({
                                      voice,
                                      clientId: clientId || undefined,
                                    });
                                    toast.success(`"${imported.name}" imported!`);
                                    onVoiceChange(imported.elevenlabs_voice_id);
                                  } catch (err: any) {
                                    toast.error(err.message || 'Import failed');
                                  }
                                }}
                              >
                                {importVoice.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CloudDownload className="h-3 w-3" />
                                )}
                                Import
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
              </div>
            )}
          </div>
        )}
      </div>
      {clonedVoices.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Custom Voices
          </Label>
          <div className="space-y-1.5">
            {clonedVoices.map((voice) => (
              <button
                key={voice.id}
                onClick={() => onVoiceChange(voice.elevenlabs_voice_id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                  isSelected(voice.elevenlabs_voice_id)
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border hover:border-foreground/30'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Mic className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{voice.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {voice.gender || 'Unknown'}
                    </Badge>
                    {voice.is_stock && (
                      <Badge variant="secondary" className="text-[10px]">Stock</Badge>
                    )}
                  </div>
                </div>
                {isSelected(voice.elevenlabs_voice_id) && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
                {voice.sample_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      playPreview(voice.sample_url!, voice.id);
                    }}
                  >
                    {playingId === voice.id ? (
                      <Pause className="h-3.5 w-3.5" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(voice);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stock Voices */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Stock Voices
        </Label>
          <div className="space-y-1.5">
            <button
              onClick={() => onVoiceChange('')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                !currentVoiceId
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-border hover:border-foreground/30'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">No Voice</span>
              {!currentVoiceId && (
                <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
              )}
            </button>
            {STOCK_VOICES.map((voice) => (
              <button
                key={voice.id}
                onClick={() => onVoiceChange(voice.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                  isSelected(voice.id)
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border hover:border-foreground/30'
                )}
              >
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                  <Volume2 className="h-4 w-4 text-secondary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{voice.name}</span>
                    <Badge variant="outline" className="text-[10px]">{voice.gender}</Badge>
                  </div>
                </div>
                {isSelected(voice.id) && (
                  <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
      </div>
    </div>
  );
}
