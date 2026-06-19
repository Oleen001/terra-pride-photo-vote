import { getSettings } from "@/lib/settings";
import { SettingsToggle } from "@/components/admin/settings-toggle";

export const metadata = { title: "Settings · Terra Pride Admin" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Event settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Control each stage of the event yourself. Changes take effect for participants right away.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <SettingsToggle
          settingKey="uploadOpen"
          label="Allow uploads"
          description="When on, participants can upload photos to the gallery."
          initial={settings.uploadOpen}
        />
        <SettingsToggle
          settingKey="votingOpen"
          label="Allow voting"
          description="When on, participants can vote on photos in the gallery."
          initial={settings.votingOpen}
        />
        <SettingsToggle
          settingKey="revealResultsOpen"
          label="Reveal results"
          description="When on, the Top 10 ranking and vote counts become publicly visible."
          warning="Heads up: turning this on makes the Top 10 and vote counts public immediately."
          initial={settings.revealResultsOpen}
        />
        <SettingsToggle
          settingKey="quizOpen"
          label="Open quiz entry"
          description="When on, signed-in participants can enter the quiz waiting room."
          initial={settings.quizOpen}
        />
      </div>
    </div>
  );
}
