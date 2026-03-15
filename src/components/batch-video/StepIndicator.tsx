import { cn } from '@/lib/utils';
import { FileText, Image, Layers, Video, Check } from 'lucide-react';
import type { BatchVideoStep } from '@/types/batch-video';

interface StepIndicatorProps {
  currentStep: BatchVideoStep;
  onStepClick?: (step: BatchVideoStep) => void;
}

const steps: { key: BatchVideoStep; label: string; icon: React.ElementType }[] = [
  { key: 'script', label: 'Script', icon: FileText },
  { key: 'visual', label: 'Visual', icon: Image },
  { key: 'scenes', label: 'Scenes', icon: Layers },
  { key: 'generate', label: 'Generate', icon: Video },
];

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.key === currentStep;
        const Icon = isCompleted ? Check : step.icon;

        return (
          <div key={step.key} className="flex items-center">
            <button
              type="button"
              onClick={() => onStepClick?.(step.key)}
              className="flex flex-col items-center"
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  'text-xs mt-1 font-medium',
                  (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-16 h-0.5 mx-2 mb-5',
                  index < currentIndex ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
