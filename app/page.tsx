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
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
      <div className="mb-8 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Gallery
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {settings.votingOpen
            ? "เลือกรูปที่คุณชอบ แล้วกดโหวตได้เลย"
            : "ชมภาพถ่ายทั้งหมดจากผู้เข้าร่วม"}
        </p>
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
