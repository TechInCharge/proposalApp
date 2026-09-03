"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { generateProposal } from "@/server/generate";
import type { GenerateResult } from "@/server/generate";

export function GeneratePanel({
  proposalId,
  generatedAt,
  pdfUrl,
  docxUrl,
}: {
  proposalId: string;
  generatedAt: string | null;
  pdfUrl: string | null;
  docxUrl: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<GenerateResult | null>(null);

  function run() {
    setResult(null);
    start(async () => {
      const res = await generateProposal(proposalId);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <Card className="grid gap-3">
        <div className="flex items-center gap-3">
          <Button onClick={run} disabled={pending}>
            {pending ? "Generating…" : "Generate DOCX + PDF"}
          </Button>
          <a
            href={`/api/proposals/${proposalId}/preview`}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 underline"
          >
            Open HTML preview
          </a>
        </div>

        {result && !result.ok && (
          <p className="text-sm text-red-600">{result.error}</p>
        )}
        {result?.ok && result.missingTokens && result.missingTokens.length > 0 && (
          <p className="text-sm text-amber-700">
            Unresolved placeholders left as-is: {result.missingTokens.join(", ")}
          </p>
        )}
        {result?.ok && (
          <p className="text-sm text-green-600">Generated.</p>
        )}
      </Card>

      <Card className="grid gap-2">
        <h3 className="font-semibold">Latest output</h3>
        {generatedAt ? (
          <>
            <p className="text-sm text-slate-500">
              {new Date(generatedAt).toLocaleString()}
            </p>
            <div className="flex gap-3 text-sm">
              {pdfUrl && (
                <a href={pdfUrl} className="text-blue-600 underline" download>
                  Download PDF
                </a>
              )}
              {docxUrl && (
                <a href={docxUrl} className="text-blue-600 underline" download>
                  Download DOCX
                </a>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">Not generated yet.</p>
        )}
      </Card>
    </div>
  );
}
