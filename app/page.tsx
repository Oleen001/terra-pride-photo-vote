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
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-top px-2 sm:px-6">
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
