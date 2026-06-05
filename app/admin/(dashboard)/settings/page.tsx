import { getSettings } from "@/lib/settings";
import { SettingsToggle } from "@/components/admin/settings-toggle";

export const metadata = { title: "ตั้งค่า · ผู้ดูแล Terra Pride" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">ตั้งค่ากิจกรรม</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          ควบคุมขั้นตอนของงานด้วยตัวเอง การเปลี่ยนแปลงมีผลทันทีกับผู้เข้าร่วม
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <SettingsToggle
          settingKey="uploadOpen"
          label="เปิดให้อัปโหลด"
          description="เมื่อเปิด ผู้เข้าร่วมจะอัปโหลดรูปเข้าแกลเลอรีได้"
          initial={settings.uploadOpen}
        />
        <SettingsToggle
          settingKey="votingOpen"
          label="เปิดให้โหวต"
          description="เมื่อเปิด ผู้เข้าร่วมจะโหวตรูปในแกลเลอรีได้"
          initial={settings.votingOpen}
        />
        <SettingsToggle
          settingKey="revealResultsOpen"
          label="เผยผลโหวต"
          description="เมื่อเปิด ผลอันดับ Top 10 พร้อมจำนวนโหวตจะแสดงต่อสาธารณะ"
          warning="ระวัง: การเปิดจะทำให้ Top 10 และจำนวนโหวตเป็นสาธารณะทันที"
          initial={settings.revealResultsOpen}
        />
      </div>
    </div>
  );
}
