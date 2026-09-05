"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui";
import { createUserAndRedirect, updateUser } from "@/server/users";
import type { Role } from "@prisma/client";

export function UserForm({
  user,
}: {
  user?: { id: string; name: string | null; email: string; role: Role };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "AUTHOR");
  const [password, setPassword] = useState("");

  function submit() {
    setError(null);
    start(async () => {
      const res = user
        ? await updateUser(user.id, { name, role, password })
        : await createUserAndRedirect({ name, email, role, password });
      if (res && !res.ok) {
        setError(res.error);
        return;
      }
      if (user) {
        setSaved(true);
        setPassword("");
        router.refresh();
      }
    });
  }

  const canSubmit = user
    ? password === "" || password.length >= 8
    : email.trim() && password.length >= 8;

  return (
    <div className="grid max-w-md gap-4">
      <Field label="Name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          value={email}
          disabled={!!user}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Role" hint="Admin manages components, templates and users">
        <select
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
        >
          <option value="AUTHOR">Author</option>
          <option value="ADMIN">Admin</option>
        </select>
      </Field>
      <Field
        label={user ? "New password" : "Password"}
        hint={user ? "Leave blank to keep the current password" : "At least 8 characters"}
      >
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={pending || !canSubmit}>
          {pending ? "Saving…" : user ? "Save changes" : "Create user"}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved</span>}
      </div>
    </div>
  );
}
