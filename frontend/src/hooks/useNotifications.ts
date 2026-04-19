import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/lib/api/notificationService";
import { useAuth } from "@/lib/context/AuthContext";

export function useNotifications() {
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.listNotifications(),
    enabled: isLoggedIn,
    refetchInterval: 30000,
    staleTime: 0,
    select: (data) => data ?? [],
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return { ...query, markRead, markAllRead };
}
