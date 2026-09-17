const REPO_URL = "https://github.com/TechInCharge/proposalApp";

/**
 * AGPLv3 requires offering the exact source a user is interacting with, not
 * just a moving `main` link — so this links at `RAILWAY_GIT_COMMIT_SHA`
 * (auto-set by Railway on any git-connected deploy) when it's present, and
 * falls back to `main` otherwise (local dev, or a host that doesn't set it).
 * Read server-side in the already-dynamic (app)/layout.tsx and passed down
 * as a prop — no NEXT_PUBLIC_ build-time inlining needed.
 */
export function AppFooter({ commitSha }: { commitSha: string | null }) {
  const sourceUrl = commitSha ? `${REPO_URL}/tree/${commitSha}` : `${REPO_URL}/tree/main`;

  return (
    <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-400">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          ProposalBuilder is licensed under the{" "}
          <a
            href="https://www.gnu.org/licenses/agpl-3.0.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-slate-600"
          >
            GNU AGPLv3
          </a>
          .
        </span>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-600"
        >
          Source code{commitSha ? ` (${commitSha.slice(0, 7)})` : ""}
        </a>
      </div>
    </footer>
  );
}
