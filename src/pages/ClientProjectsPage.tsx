import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProjectsDashboard } from '@/components/projects/ProjectsDashboard';
import { useClient } from '@/hooks/useClients';
import { Loader2 } from 'lucide-react';

export default function ClientProjectsPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { data: client, isLoading, error } = useClient(clientId);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (error || !client) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-xl font-semibold">Client not found</h2>
          <p className="text-muted-foreground mb-4">The client you're looking for doesn't exist.</p>
          <button 
            onClick={() => navigate('/')}
            className="text-primary hover:underline"
          >
            Go back to clients
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ProjectsDashboard client={client} />
    </AppLayout>
  );
}
