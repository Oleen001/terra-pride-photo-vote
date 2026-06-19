import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getTopPhotos } from "@/lib/photos";
import { ResultsList } from "@/components/results-list";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const settings = await getSettings().catch(() => ({
    uploadOpen: false,
    votingOpen: false,
    revealResultsOpen: false,
    quizOpen: false,
    activeQuizSetId: null,
  }));

  const photos = settings.revealResultsOpen ? await getTopPhotos(10) : [];

  return (
    <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-5 sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute inset-0 -z-10 mx-[calc(50%-50vw)] w-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,color-mix(in_srgb,var(--accent)_9%,transparent),transparent_28%),radial-gradient(circle_at_82%_64%,color-mix(in_srgb,var(--accent-2)_9%,transparent),transparent_30%),radial-gradient(circle,color-mix(in_srgb,var(--foreground)_8%,transparent)_0_0.85px,transparent_1.15px)] bg-[length:auto,auto,11px_11px]" />
      </div>

      {!settings.revealResultsOpen ? (
        <NotRevealed />
      ) : photos.length === 0 ? (
        <div className="rounded-[8px] border border-line bg-surface/88 px-6 py-14 text-center shadow-sm backdrop-blur">
          <p className="text-sm text-muted">
            No photos to rank yet
          </p>
        </div>
      ) : (
        <ResultsList photos={photos} />
      )}
    </main>
  );
}

function NotRevealed() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3 rounded-[8px] border border-line bg-surface/88 px-6 py-16 text-center shadow-sm backdrop-blur">
      <h2 className="text-base font-semibold text-foreground">
        Results aren&apos;t out yet
      </h2>
      <p className="max-w-xs text-sm text-muted">
        The results will be revealed once the organizers officially announce the Top 10.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-9 items-center rounded-[8px] bg-foreground px-4 text-[13px] font-semibold text-background shadow-sm transition hover:translate-y-[-1px] hover:shadow-md"
      >
        Back to the gallery
      </Link>
    </div>
  );
}
