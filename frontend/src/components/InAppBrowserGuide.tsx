"use client";

import { useEffect, useState } from "react";

export default function InAppBrowserGuide() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/KAKAOTALK/i.test(ua)) {
      setShow(true);
      setIsIOS(/iPhone|iPad|iPod/i.test(ua));
    }
  }, []);

  if (!show) return null;

  const handleOpen = () => {
    const url = window.location.href;
    // Android: intent 스킴으로 Chrome 강제 오픈
    window.location.href =
      "intent://" +
      url.replace(/https?:\/\//, "") +
      "#Intent;scheme=https;action=android.intent.action.VIEW;end";
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center px-6">
      <div className="text-5xl mb-5">🌐</div>
      <h2 className="text-xl font-black mb-2 text-center">
        외부 브라우저에서 열어주세요
      </h2>
      <p className="text-gray-500 text-sm text-center mb-8 leading-relaxed">
        카카오톡 내에서는 일부 기능이 제한됩니다.
        <br />
        Safari 또는 Chrome으로 접속해주세요.
      </p>
      {isIOS ? (
        <div className="w-full bg-gray-50 rounded-2xl p-5 text-center">
          <p className="text-sm font-bold text-gray-800 mb-2">iPhone 사용자</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            하단 오른쪽{" "}
            <strong className="text-gray-800">··· 메뉴</strong>를 탭한 후
            <br />
            <strong className="text-gray-800">기본 브라우저로 열기</strong>를
            선택해주세요.
          </p>
        </div>
      ) : (
        <button
          onClick={handleOpen}
          className="w-full py-4 bg-black text-white font-bold rounded-2xl"
        >
          외부 브라우저로 열기
        </button>
      )}
    </div>
  );
}
