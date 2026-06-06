import { getParticipantSession } from "@/lib/session";
import { listActivePhotos } from "@/lib/photos";
import { getSettings } from "@/lib/settings";
import { getVotedPhotoIds } from "@/lib/votes";
import { Gallery } from "@/components/gallery";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getParticipantSession();

  const [photos, settings, votedIds] = await Promise.all([
    listActivePhotos(),
    getSettings().catch(() => ({
      uploadOpen: false,
      votingOpen: false,
      revealResultsOpen: false,
    })),
    session ? getVotedPhotoIds(session.userId) : Promise.resolve<string[]>([]),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-8 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 border-b border-line/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
            Private Photo Vote
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">
            Gallery
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted">
            {settings.votingOpen
              ? "เลือกรูปที่คุณชอบ แล้วกดโหวตได้เลย"
              : "ชมภาพถ่ายทั้งหมดจากผู้เข้าร่วม"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-muted shadow-sm">
            {photos.length.toLocaleString()} photos
          </span>
          <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-muted shadow-sm">
            {settings.votingOpen ? "Voting open" : "Viewing only"}
          </span>
        </div>
      </div>

      <Gallery
        photos={photos}
        initialVotedIds={votedIds}
        votingOpen={settings.votingOpen}
        loggedIn={session !== null}
        currentUserId={session?.userId ?? null}
      />
    </main>
  );
}
