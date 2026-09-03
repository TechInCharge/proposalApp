"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadCustomerLogo } from "@/server/customers";

export function LogoUpload({
  customerId,
  logoUrl,
}: {
  customerId: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const ref = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-4">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt="logo"
          className="h-16 w-16 rounded border border-slate-200 object-contain"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-slate-300 text-xs text-slate-400">
          No logo
        </div>
      )}
      <div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="text-sm"
          onChange={() => {
            const file = ref.current?.files?.[0];
            if (!file) return;
            setError(null);
            const fd = new FormData();
            fd.set("logo", file);
            start(async () => {
              const res = await uploadCustomerLogo(customerId, fd);
              if (!res.ok) setError(res.error);
              else router.refresh();
            });
          }}
        />
        {pending && <p className="text-xs text-slate-400">Uploading…</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
