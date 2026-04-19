import { useQuery } from "@tanstack/react-query";
import { groupService } from "@/lib/api/groupService";
import { slotService } from "@/lib/api/slotService";
import { useAuth } from "@/lib/context/AuthContext";

export function useGroup(groupId: number | null) {
  const { isLoggedIn } = useAuth();
  const enabled = isLoggedIn && groupId !== null;

  const group = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => groupService.getGroup(groupId!),
    enabled,
  });

  const members = useQuery({
    queryKey: ["group", groupId, "members"],
    queryFn: () => groupService.getMembers(groupId!),
    enabled,
  });

  const slots = useQuery({
    queryKey: ["group", groupId, "slots"],
    queryFn: () => slotService.listSlots(groupId!),
    enabled,
  });

  const progress = useQuery({
    queryKey: ["group", groupId, "progress"],
    queryFn: () => slotService.getProgress(groupId!),
    enabled,
  });

  return { group, members, slots, progress };
}
