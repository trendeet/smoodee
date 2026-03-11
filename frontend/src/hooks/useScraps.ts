import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { scrapService } from "@/lib/api/scrapService";
import { useAuth } from "@/lib/context/AuthContext";

export function useScraps() {
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["scraps"],
    queryFn: () => scrapService.listScraps(),
    enabled: isLoggedIn,
  });

  const add = useMutation<void, Error, string>({
    mutationFn: (templateType: string) => scrapService.addScrap(templateType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scraps"] }),
  });

  const remove = useMutation({
    mutationFn: (templateType: string) => scrapService.removeScrap(templateType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scraps"] }),
  });

  const isScrapped = (templateType: string) =>
    query.data?.some((s) => s.templateType === templateType) ?? false;

  const toggle = (templateType: string) => {
    if (isScrapped(templateType)) {
      remove.mutate(templateType);
    } else {
      add.mutate(templateType);
    }
  };

  return { ...query, isScrapped, toggle };
}
