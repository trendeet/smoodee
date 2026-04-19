"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { groupService } from "@/lib/api/groupService";

export default function GroupByInviteCodePage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const router = useRouter();
  const [joinError, setJoinError] = useState<"full" | "unknown" | null>(null);

  const { data: group, isLoading, error } = useQuery({
    queryKey: ["group-by-invite", inviteCode],
    queryFn: () => groupService.getGroupByInviteCode(inviteCode),
    enabled: !!inviteCode,
  });

  useEffect(() => {
    if (!group) return;
    groupService
      .joinGroup({ inviteCode })
      .then(() => {
        router.replace(`/inprogress/group/${group.id}`);
      })
      .catch((err) => {
        const code = err?.response?.data?.code ?? "";
        if (code === "GROUP_FULL") {
          setJoinError("full");
        } else if (code === "ALREADY_GROUP_MEMBER") {
          // 이미 멤버면 그냥 이동
          router.replace(`/inprogress/group/${group.id}`);
        } else {
          setJoinError("unknown");
        }
      });
  }, [group]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
        <div className="text-4xl">🔍</div>
        <p className="font-bold text-gray-800">그룹을 찾을 수 없어요.</p>
        <p className="text-sm text-gray-400">초대코드를 다시 확인해주세요.</p>
        <button
          onClick={() => router.back()}
          className="mt-2 px-6 py-2.5 bg-black text-white text-sm font-bold rounded-2xl"
        >
          돌아가기
        </button>
      </div>
    );
  }

  if (joinError === "full") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
        <div className="text-4xl">😅</div>
        <p className="font-bold text-gray-800">그룹 인원이 초과됐어요.</p>
        <p className="text-sm text-gray-400">이 그룹은 이미 최대 8명이 참여 중이에요.</p>
        <button
          onClick={() => router.back()}
          className="mt-2 px-6 py-2.5 bg-black text-white text-sm font-bold rounded-2xl"
        >
          돌아가기
        </button>
      </div>
    );
  }

  if (joinError === "unknown") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
        <div className="text-4xl">⚠️</div>
        <p className="font-bold text-gray-800">입장에 실패했어요.</p>
        <p className="text-sm text-gray-400">잠시 후 다시 시도해주세요.</p>
        <button
          onClick={() => router.back()}
          className="mt-2 px-6 py-2.5 bg-black text-white text-sm font-bold rounded-2xl"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
      로딩 중...
    </div>
  );
}
