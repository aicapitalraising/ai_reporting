import { useState } from 'react';
import { useStaticBatch } from '@/hooks/useStaticBatch';
import { useAdStyles } from '@/hooks/useAdStyles';
import { useClient } from '@/hooks/useClients';
import { useStaticBatchGeneration } from '@/hooks/useStaticBatchGeneration';
import { StyleSelection } from './steps/StyleSelection';
import { ProjectSetup } from './steps/ProjectSetup';
import { GenerationConfig } from './steps/GenerationConfig';
import { ResultsGallery } from './steps/ResultsGallery';
import { cn } from '@/lib/utils';

interface StaticBatchCreatorProps {
  projectId: string;
  clientId: string;
  projectOfferDescription?: string | null;
}

const steps = [
  { id: 0, name: 'Styles', description: 'Select ad styles' },
  { id: 1, name: 'Setup', description: 'Product details' },
  { id: 2, name: 'Config', description: 'Ratios & variations' },
  { id: 3, name: 'Results', description: 'Generated ads' },
];

export function StaticBatchCreator({ projectId, clientId, projectOfferDescription }: StaticBatchCreatorProps) {
  const [editableOffer, setEditableOffer] = useState(projectOfferDescription || '');
  const { data: client } = useClient(clientId);
  const { data: styles = [] } = useAdStyles(clientId);
  
  const {
    currentStep,
    config,
    generatedAds,
    isGenerating,
    setIsGenerating,
    setGeneratedAds,
    updateConfig,
    toggleStyle,
    toggleAspectRatio,
    getTotalAdsCount,
    nextStep,
    prevStep,
    goToStep,
    reset,
  } = useStaticBatch();

  // Use the generation hook - editableOffer overrides projectOfferDescription
  const { generateAds } = useStaticBatchGeneration({
    projectId,
    clientId,
    config,
    styles,
    client,
    projectOfferDescription: editableOffer || projectOfferDescription,
    setGeneratedAds,
    setIsGenerating,
  });

  const handleGenerate = async () => {
    nextStep(); // Go to results first
    await generateAds();
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {steps.map((step, stepIdx) => (
            <li
              key={step.name}
              className={cn(
                'relative',
                stepIdx !== steps.length - 1 && 'flex-1'
              )}
            >
              <div className="flex items-center">
                <button
                  onClick={() => !isGenerating && step.id < currentStep && goToStep(step.id)}
                  disabled={isGenerating || step.id > currentStep}
                  className={cn(
                    'relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    step.id < currentStep
                      ? 'bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90'
                      : step.id === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step.id + 1}
                </button>
                {stepIdx !== steps.length - 1 && (
                  <div
                    className={cn(
                      'ml-2 h-0.5 flex-1',
                      step.id < currentStep ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
              <div className="mt-1.5 hidden sm:block">
                <p className="text-xs font-medium">{step.name}</p>
                <p className="text-[10px] text-muted-foreground">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </nav>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {currentStep === 0 && (
          <StyleSelection
            config={config}
            toggleStyle={toggleStyle}
            updateConfig={updateConfig}
            onNext={nextStep}
            clientId={clientId}
          />
        )}
        {currentStep === 1 && (
          <ProjectSetup
            config={config}
            updateConfig={updateConfig}
            client={client}
            projectOfferDescription={editableOffer || projectOfferDescription}
            onOfferChange={setEditableOffer}
            onNext={nextStep}
            onBack={prevStep}
          />
        )}
        {currentStep === 2 && (
          <GenerationConfig
            config={config}
            updateConfig={updateConfig}
            toggleAspectRatio={toggleAspectRatio}
            getTotalAdsCount={getTotalAdsCount}
            onGenerate={handleGenerate}
            onBack={prevStep}
            isGenerating={isGenerating}
            clientId={clientId}
          />
        )}
        {currentStep === 3 && (
          <ResultsGallery
            generatedAds={generatedAds}
            styles={styles}
            isGenerating={isGenerating}
            onBack={() => goToStep(2)}
            onReset={reset}
            projectId={projectId}
            clientId={clientId}
            setGeneratedAds={setGeneratedAds}
          />
        )}
      </div>
    </div>
  );
}
