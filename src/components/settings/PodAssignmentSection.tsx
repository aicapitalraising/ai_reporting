import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { 
  useAgencyPods, 
  useClientPodAssignments, 
  useAssignPodToClient, 
  useRemovePodFromClient,
  useUpdatePodAssignment,
} from '@/hooks/useAgencyPods';

interface PodAssignmentSectionProps {
  clientId: string;
}

export function PodAssignmentSection({ clientId }: PodAssignmentSectionProps) {
  const { data: pods = [] } = useAgencyPods();
  const { data: assignments = [] } = useClientPodAssignments(clientId);
  const assignPod = useAssignPodToClient();
  const removePod = useRemovePodFromClient();
  const updateAssignment = useUpdatePodAssignment();

  const assignedPodIds = new Set(assignments.map(a => a.pod_id));
  const leadPodId = assignments.find(a => a.is_lead)?.pod_id;

  const handleTogglePod = async (podId: string, checked: boolean) => {
    if (checked) {
      await assignPod.mutateAsync({ clientId, podId });
    } else {
      await removePod.mutateAsync({ clientId, podId });
    }
  };

  const handleSetLead = async (podId: string) => {
    await updateAssignment.mutateAsync({ clientId, podId, isLead: true });
  };

  if (pods.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No pods created yet. Go to Agency Settings → Team to create pods.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pods.map(pod => {
        const isAssigned = assignedPodIds.has(pod.id);
        const isLead = leadPodId === pod.id;
        
        return (
          <div
            key={pod.id}
            className="flex items-center justify-between p-3 border rounded-lg bg-background"
          >
            <div className="flex items-center gap-3">
              <Checkbox
                id={`pod-${pod.id}`}
                checked={isAssigned}
                onCheckedChange={(checked) => handleTogglePod(pod.id, !!checked)}
              />
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: pod.color }}
              />
              <Label htmlFor={`pod-${pod.id}`} className="cursor-pointer">
                {pod.name}
              </Label>
              {isLead && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  Lead
                </Badge>
              )}
            </div>
            {isAssigned && !isLead && (
              <button
                onClick={() => handleSetLead(pod.id)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Set as Lead
              </button>
            )}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        The lead pod (typically Project Management) oversees the client relationship.
        Clients see pod names instead of individual team member names.
      </p>
    </div>
  );
}
