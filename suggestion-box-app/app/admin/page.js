"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [items, setItems] = useState([]);

  async function loadItems() {
    const res = await fetch("/api/suggestions", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setItems(data.items || []);
      setAuthed(true);
    } else {
      setAuthed(false);
    }
    setChecking(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function login() {
    setLoginError("");
    const res = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setPassword("");
      await loadItems();
    } else {
      const data = await res.json().catch(() => ({}));
      setLoginError(data.error || "암호가 올바르지 않아요.");
    }
  }

  async function logout() {
    await fetch("/api/admin-login", { method: "DELETE" });
    setAuthed(false);
    setItems([]);
  }

  if (checking) {
    return (
      <main className="page">
        <p className="lede">확인 중…</p>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="page">
        <h1>관리자 로그인</h1>
        <section className="card">
          <label htmlFor="pw">관리자 암호</label>
          <input
            id="pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />
          <button onClick={login}>로그인</button>
          {loginError && <p className="status err">{loginError}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="admin-header">
        <h1>접수된 건의 ({items.length}건)</h1>
        <button onClick={logout}>로그아웃</button>
      </div>
      {items.length === 0 && <p className="empty">아직 접수된 건의가 없어요.</p>}
      <ul className="admin-list">
        {items.map((item, i) => (
          <li key={i}>
            <div className="entry-text">{item.content}</div>
            <div className="entry-time">
              {item.createdAt ? new Date(item.createdAt).toLocaleString("ko-KR") : ""}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
