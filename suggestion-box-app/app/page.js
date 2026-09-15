"use client";

import { useState } from "react";

const MAX_CHARS = 1000;

export default function Home() {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  async function submit() {
    const text = content.trim();
    if (!text) {
      setStatus({ ok: false, message: "내용을 입력한 뒤 보내주세요." });
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "전송 중 문제가 생겼어요.");
      setContent("");
      setStatus({ ok: true, message: "건의가 접수됐어요. 감사합니다." });
    } catch (e) {
      setStatus({ ok: false, message: e.message || "전송 중 문제가 생겼어요." });
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="page">
      <span className="eyebrow">사내 전용 · 완전 익명</span>
      <h1>익명 건의함</h1>
      <p className="lede">
        누구 글인지 저장하지 않아요. 하고 싶은 이야기를 편하게 적어서 보내주세요.
      </p>

      <section className="card">
        <label htmlFor="content">건의 내용</label>
        <textarea
          id="content"
          maxLength={MAX_CHARS}
          placeholder="불편한 점, 제안하고 싶은 아이디어, 무엇이든 좋아요."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="composer-footer">
          <span className="counter">
            {content.length} / {MAX_CHARS}
          </span>
          <button onClick={submit} disabled={sending}>
            {sending ? "보내는 중…" : "보내기"}
          </button>
        </div>
        {status && (
          <p className={`status ${status.ok ? "ok" : "err"}`}>{status.message}</p>
        )}
      </section>

      <footer className="note">
        작성자 정보, 접속 위치, 로그인 여부는 어디에도 남지 않습니다. 보낸 건의는
        관리자만 따로 확인합니다.
      </footer>
    </main>
  );
}
