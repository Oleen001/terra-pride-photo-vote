import { listAllPhotosAdmin } from "@/lib/photos";
import { PhotoActionButton } from "@/components/admin/photo-action-button";
import { ImageIcon, VoteIcon } from "@/components/admin/icons";

export const metadata = { title: "Photos · Terra Pride Admin" };

const dateFmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
}

export default async function AdminPhotosPage() {
  const photos = await listAllPhotosAdmin();
  const activeCount = photos.filter((p) => !p.isDeleted).length;
  const deletedCount = photos.length - activeCount;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">All photos</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {photos.length} photos · {activeCount} active · {deletedCount} deleted
        </p>
      </header>

      {photos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <ImageIcon className="size-6 text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            No photos uploaded yet
          </p>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Photos from participants will appear here.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className={`flex flex-col overflow-hidden rounded-xl border transition ${
                photo.isDeleted
                  ? "border-red-200 bg-red-50/40 dark:border-red-500/30 dark:bg-red-500/5"
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                {/* plain img: avoids next/image remotePatterns dependency (next.config.ts owned by another agent) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbnailUrl ?? photo.imageUrl}
                  alt={photo.caption || "Uploaded photo"}
                  loading="lazy"
                  className={`size-full object-cover ${
                    photo.isDeleted ? "opacity-50 grayscale" : ""
                  }`}
                />
                {photo.isDeleted && (
                  <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs font-medium text-white">
                    Deleted
                  </span>
                )}
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
                  <VoteIcon className="size-3" />
                  {photo.voteCount.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {photo.caption || (
                      <span className="italic text-zinc-400">No caption</span>
                    )}
                  </p>
                  <p
                    className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400"
                    title={photo.ownerEmail}
                  >
                    {photo.ownerEmail}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    {photo.isDeleted && photo.deletedAt
                      ? `Deleted ${formatDate(photo.deletedAt)}`
                      : `Uploaded ${formatDate(photo.createdAt)}`}
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                      photo.isDeleted
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        photo.isDeleted ? "bg-red-500" : "bg-emerald-500"
                      }`}
                      aria-hidden
                    />
                    {photo.isDeleted ? "Deleted" : "Active"}
                  </span>
                  <PhotoActionButton
                    photoId={photo.id}
                    isDeleted={photo.isDeleted}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
