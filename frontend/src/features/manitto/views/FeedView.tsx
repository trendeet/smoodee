"use client";

import React from "react";
import { Newspaper } from "lucide-react";
import { ManittoCertPostResponse } from "../types";
import FeedCard from "../components/FeedCard";

interface FeedViewProps {
  posts: ManittoCertPostResponse[];
  onLike: (postId: number) => void;
}

const FeedView = ({ posts, onLike }: FeedViewProps) => (
  <div className="p-4 pb-32 space-y-5 text-black">
    <div className="flex items-center gap-2 border-b-4 border-black pb-3">
      <Newspaper size={18} className="text-[#E9967A]" />
      <h2 className="text-sm font-black uppercase tracking-tighter">인증 피드</h2>
      {posts.length > 0 && (
        <span className="text-[10px] font-black px-1.5 py-0.5 border-2 border-black bg-[#E9967A] text-white">
          {posts.length}
        </span>
      )}
    </div>

    {posts.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 border-4 border-slate-200 flex items-center justify-center bg-[#FAF9F6]">
          <Newspaper size={28} className="text-slate-200" />
        </div>
        <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest text-center">
          아직 올라온 인증이 없어요
          <br />
          마니또의 첫 활약을 기다려보세요!
        </p>
      </div>
    ) : (
      <div className="space-y-5">
        {posts.map((post) => (
          <FeedCard key={post.id} post={post} onLike={() => onLike(post.id)} />
        ))}
      </div>
    )}
  </div>
);

export default FeedView;
