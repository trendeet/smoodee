"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import GroupScreen from "@/features/dayshare/components/GroupScreen";
import { groupService } from "@/lib/api/groupService";
import { useApp } from "@/lib/context/AppContext";

export default function InProgressGroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const { setSelectedGroup } = useApp();
  const [ready, setReady] = useState(false);

  const { data: group, isLoading, error } = useQuery({
    queryKey: ["group", Number(groupId)],
    queryFn: () => groupService.getGroup(Number(groupId)),
    enabled: !!groupId,
  });

  useEffect(() => {
    if (!group || ready) return;
    setSelectedGroup({
      id: group.id,
      projectId: group.projectId ?? undefined,
      name: group.name,
      inviteCode: group.inviteCode,
      memberCount: group.memberCount,
      source: "inprogress",
    });
    setReady(true);
  }, [group]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        로딩 중...
      </div>
    );
  }
  if (error || !group) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        그룹을 찾을 수 없어요.
      </div>
    );
  }
  if (!ready) return null;

  return (
    <Suspense>
      <GroupScreen />
    </Suspense>
  );
}
