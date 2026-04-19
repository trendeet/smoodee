import { useQuery } from "@tanstack/react-query";
import { templateService } from "@/lib/api/templateService";

export function useTemplates() {
  return useQuery({
    queryKey: ["templates"],
    queryFn: () => templateService.listTemplates(),
    staleTime: 5 * 60_000,
  });
}
