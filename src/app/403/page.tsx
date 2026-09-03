import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">403 — Not allowed</h1>
      <p className="text-sm text-gray-500">
        This area is for administrators only.
      </p>
      <Link href="/" className="text-sm text-blue-600 underline">
        Back to dashboard
      </Link>
    </main>
  );
}
