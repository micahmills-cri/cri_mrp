"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const r = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok || !data.ok) return setErr(data.error || "Login failed");
    r.push(data.redirectTo || "/operator");
  }

  return (
    <div style={{ maxWidth: 420, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>Boat Factory Operations</h1>
      <form onSubmit={onSubmit}>
        <label>Email<br />
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email" />
        </label>
        <br /><br />
        <label>Password<br />
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" />
        </label>
        <br /><br />
        <button disabled={loading} type="submit">{loading ? "Signing in..." : "Sign in"}</button>
      </form>
      {err && <p style={{ color: "crimson" }}>{err}</p>}
      <div style={{ marginTop: 16, opacity: 0.7 }}>
        <p>Operator: operator@cri.local / Operator123!</p>
        <p>Supervisor: supervisor@cri.local / Supervisor123!</p>
        <p>Admin: admin@cri.local / Admin123!</p>
      </div>
    </div>
  );
}