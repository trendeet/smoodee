"use client";

import React from "react";
import { Heart } from "lucide-react";
import { ManittoCertPostResponse } from "../types";

interface FeedCardProps {
  post: ManittoCertPostResponse;
  onLike: () => void;
}

const FeedCard = ({ post, onLike }: FeedCardProps) => (
  <div className="bg-white border-4 border-black shadow-[4px_4px_0px_0px_black]">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={post.imageUrl}
      alt="인증 이미지"
      className="w-full aspect-square object-cover border-b-4 border-black"
    />
    <div className="p-4 space-y-2">
      <p className="text-[11px] font-black text-[#E9967A] uppercase tracking-tight">
        🎁 {post.manittiName}의 마니또가 도와줬어요!
      </p>
      {post.comment && (
        <p className="text-xs font-bold text-slate-700 bg-[#FAF9F6] border-2 border-slate-100 px-3 py-2">
          💬 &ldquo;{post.comment}&rdquo;
        </p>
      )}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 px-3 py-1.5 border-2 border-black text-[10px] font-black shadow-[2px_2px_0px_0px_black] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all ${
            post.liked ? "bg-[#E9967A] text-white" : "bg-white text-black"
          }`}
        >
          <Heart
            size={11}
            fill={post.liked ? "white" : "none"}
            color={post.liked ? "white" : "black"}
          />
          {post.likeCount > 0 ? post.likeCount : "좋아요"}
        </button>
        <p className="text-[9px] font-black text-slate-300 uppercase">
          {post.createdAt}
        </p>
      </div>
    </div>
  </div>
);

export default FeedCard;
