import { useQuery } from "@tanstack/react-query";
import { projectService, ListProjectsParams } from "@/lib/api/projectService";
import { useAuth } from "@/lib/context/AuthContext";

export function useProjects(params?: ListProjectsParams) {
  const { isLoggedIn } = useAuth();
  return useQuery({
    queryKey: ["projects", params],
    queryFn: () => projectService.listProjects(params),
    enabled: isLoggedIn,
  });
}
