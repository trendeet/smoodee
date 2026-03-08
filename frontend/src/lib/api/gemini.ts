const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

export const callGeminiAPI = async (prompt: string): Promise<string> => {
  if (!apiKey) {
    console.warn("API Key is missing (local environment).");
    return new Promise((resolve) =>
      setTimeout(
        () =>
          resolve("✨ AI가 생성한 멋진 텍스트 예시입니다! #Gemini #PhotoDump"),
        1000
      )
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Gemini API Error");

    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "AI 응답을 불러올 수 없습니다."
    );
  } catch (error) {
    console.error("Gemini API Call Failed:", error);
    return "죄송합니다. AI 서비스 연결에 실패했습니다.";
  }
};
