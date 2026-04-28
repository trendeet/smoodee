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
    if (!isIOS) {
      window.location.href =
        "intent://" +
        url.replace(/https?:\/\//, "") +
        "#Intent;scheme=https;action=android.intent.action.VIEW;end";
    } else {
      window.open(url, "_blank");
    }
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
      <button
        onClick={handleOpen}
        className="w-full py-4 bg-black text-white font-bold rounded-2xl mb-4"
      >
        외부 브라우저로 열기
      </button>
      <p className="text-xs text-gray-400 text-center leading-relaxed">
        버튼이 작동하지 않으면
        <br />
        우측 하단 ··· 메뉴 →{" "}
        <strong className="text-gray-600">기본 브라우저로 열기</strong>를
        눌러주세요.
      </p>
    </div>
  );
}
