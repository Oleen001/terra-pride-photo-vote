import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getTopPhotos } from "@/lib/photos";
import { ResultsList } from "@/components/results-list";
import { TrophyIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const settings = await getSettings().catch(() => ({
    uploadOpen: false,
    votingOpen: false,
    revealResultsOpen: false,
  }));

  const photos = settings.revealResultsOpen ? await getTopPhotos(10) : [];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-10 sm:py-16">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-[8px] bg-foreground text-background shadow-sm">
          <TrophyIcon className="h-6 w-6" />
        </span>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
          Results
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-normal text-foreground">
          Top 10
        </h1>
        <p className="text-sm text-muted">
          The most-voted photos
        </p>
      </div>

      {!settings.revealResultsOpen ? (
        <NotRevealed />
      ) : photos.length === 0 ? (
        <div className="rounded-[8px] border border-line bg-surface px-6 py-14 text-center shadow-sm">
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
    <div className="flex flex-col items-center gap-3 rounded-[8px] border border-line bg-surface px-6 py-16 text-center shadow-sm">
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
