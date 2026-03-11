import { useQuery } from "@tanstack/react-query";
import { colorworkService } from "@/lib/api/colorworkService";
import { useAuth } from "@/lib/context/AuthContext";

export function useColorworkState(projectId: number | null) {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: ["colorwork", projectId],
    queryFn: () => colorworkService.getState(projectId!),
    enabled: isLoggedIn && projectId !== null,
  });
}
