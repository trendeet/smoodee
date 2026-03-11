"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, Search, MoreVertical, Share2, Download, Layers } from "lucide-react";
import StatusBar from "@/components/ui/StatusBar";
import { useUI } from "@/lib/context/UIContext";
import { useProjects } from "@/hooks/useProjects";

const RecentScreen = () => {
  const { openMenu } = useUI();
  const [searchText, setSearchText] = useState("");
  const { data: recentProjects = [], isLoading } = useProjects({ tab: "RECENT" });

  const filteredItems = recentProjects.filter(
    (item) => (item.title ?? "").toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white pb-safe overflow-y-auto no-scrollbar relative">
      <StatusBar theme="dark" />
      <div className="px-4 pt-4 pb-2 sticky top-0 bg-white/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={openMenu}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            보관함
          </h1>
        </div>
        <div className="relative mb-4">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="보관함 검색..."
            className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-black/10"
          />
        </div>
      </div>
      <div className="p-4 space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-3 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer group"
            >
              <div className="w-20 h-24 rounded-xl bg-gradient-to-br from-gray-300 to-gray-500 shrink-0 shadow-sm relative overflow-hidden">
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-white/30 backdrop-blur-sm m-2 rounded-lg" />
                )}
              </div>
              <div className="flex flex-col justify-center flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900">{item.title}</h3>
                  <button className="text-gray-300 hover:text-gray-600">
                    <MoreVertical size={16} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 font-medium mb-3">
                  {new Date(item.updatedAt).toLocaleDateString("ko-KR")}
                </p>
                <div className="flex gap-2">
                  <button className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:bg-blue-50 hover:text-blue-500">
                    <Share2 size={14} />
                  </button>
                  <button className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:bg-green-50 hover:text-green-500">
                    <Download size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Layers size={24} className="opacity-20" />
            </div>
            <p className="text-sm font-medium">
              {searchText ? "검색 결과가 없어요" : "완료된 항목이 없어요"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentScreen;
