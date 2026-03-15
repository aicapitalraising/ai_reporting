import { AppLayout } from '@/components/layout/AppLayout';
import { BatchVideoWorkflow } from '@/components/batch-video/BatchVideoWorkflow';

export default function BatchVideoPage() {
  return (
    <AppLayout>
      <div className="container mx-auto py-6 max-w-6xl">
        <BatchVideoWorkflow />
      </div>
    </AppLayout>
  );
}
