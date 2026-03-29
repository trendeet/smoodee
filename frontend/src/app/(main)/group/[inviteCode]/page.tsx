"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import GroupScreen from "@/features/dayshare/components/GroupScreen";
import { groupService } from "@/lib/api/groupService";
import { useApp } from "@/lib/context/AppContext";

export default function GroupByInviteCodePage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { setSelectedGroup } = useApp();
  const [joining, setJoining] = useState(false);
  const [ready, setReady] = useState(false);

  const { data: group, isLoading, error } = useQuery({
    queryKey: ["group-by-invite", inviteCode],
    queryFn: () => groupService.getGroupByInviteCode(inviteCode),
    enabled: !!inviteCode,
  });

  useEffect(() => {
    if (!group || ready) return;
    setJoining(true);
    groupService
      .joinGroup({ inviteCode })
      .catch(() => {}) // ALREADY_GROUP_MEMBER 무시
      .finally(() => {
        setSelectedGroup({
          id: group.id,
          projectId: group.projectId ?? undefined,
          name: group.name,
          inviteCode: group.inviteCode,
          memberCount: group.memberCount,
          source: "inprogress",
        });
        setJoining(false);
        setReady(true);
      });
  }, [group]);

  if (isLoading || joining) {
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

  return <GroupScreen />;
}
