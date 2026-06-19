import { getParticipantSession } from "@/lib/session";
import { listActivePhotos } from "@/lib/photos";
import { listPhrases } from "@/lib/phrases";
import { getSettings } from "@/lib/settings";
import { getVotedPhotoIds } from "@/lib/votes";
import { Gallery } from "@/components/gallery";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getParticipantSession();

  const [photos, settings, votedIds, phrases] = await Promise.all([
    listActivePhotos(),
    getSettings().catch(() => ({
      uploadOpen: false,
      votingOpen: false,
      revealResultsOpen: false,
      quizOpen: false,
      activeQuizSetId: null,
    })),
    session ? getVotedPhotoIds(session.userId) : Promise.resolve<string[]>([]),
    listPhrases().catch(() => [] as string[]),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-top px-2 sm:px-6">
      <Gallery
        photos={photos}
        initialVotedIds={votedIds}
        votingOpen={settings.votingOpen}
        loggedIn={session !== null}
        currentUserId={session?.userId ?? null}
        phrases={phrases}
      />
    </main>
  );
}
