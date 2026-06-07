import { listPhrasesAdmin } from "@/lib/phrases";
import { PhraseAddForm } from "@/components/admin/phrase-add-form";
import { PhraseList } from "@/components/admin/phrase-list";

export const metadata = { title: "Phrases · Terra Pride Admin" };

export default async function AdminPhrasesPage() {
  const rows = await listPhrasesAdmin();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Phrases</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          These phrases cycle through the typewriter in the graph view. Guests
          can add their own from the graph too — select any here to prune.
        </p>
      </header>

      <PhraseAddForm />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Active phrases
          </h2>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {rows.length} {rows.length === 1 ? "phrase" : "phrases"}
          </span>
        </div>

        <PhraseList rows={rows} />
      </section>
    </div>
  );
}
