import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button, Chip, Icons } from "@bainder/ui";
import type { User } from "@bainder/sdk";
import { signOutProfile, useProfileName } from "../../profile";
import { LibraryRail } from "../components/LibraryRail";
import { useLibraryDocuments } from "../hooks/useLibraryDocuments";
import { useLibraryHighlights } from "../hooks/useLibraryHighlights";
import { useSdk } from "../../../sdk";

export function Settings() {
  const reader = useProfileName();
  const { client } = useSdk();
  const { documents, counts, uploading, uploadDocument } = useLibraryDocuments();
  const { highlights } = useLibraryHighlights(documents);
  const [user, setUser] = useState<User | null>(null);
  const [citePages, setCitePages] = useState(true);
  const [followups, setFollowups] = useState(true);
  const [personalize, setPersonalize] = useState(false);
  const [dailyNudge, setDailyNudge] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  useEffect(() => {
    let cancelled = false;
    client.user
      .me()
      .then((res) => {
        if (!cancelled && res.data) setUser(res.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [client]);

  const displayName = user?.name?.trim() || reader;
  const email = user?.email ?? "";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="flex h-dvh min-h-screen overflow-hidden bg-paper-50 text-paper-900">
      <LibraryRail
        totalCount={counts.all}
        highlightsCount={highlights?.length ?? 0}
        reader={reader}
        uploading={uploading}
        onUpload={uploadDocument}
      />

      <section className="min-w-0 flex-1 overflow-y-auto px-6 py-8 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-paper-200 font-display text-2xl font-medium text-paper-700">
              {initials || "R"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="t-label-s text-paper-500">Settings</div>
              <h1 className="t-display-m mt-0.5 text-paper-900">{displayName}</h1>
              <div className="t-body-m mt-1 truncate text-paper-700">
                {email || "Reader profile"} · {counts.all} imports
              </div>
            </div>
            <Button variant="secondary">Edit profile</Button>
          </div>

          <div>
            <Section label="Reading">
              <Row label="Default theme" sub="Light · Sepia · Night">
                <div className="flex gap-1 rounded-full bg-paper-100 p-1">
                  {["Light", "Sepia", "Night"].map((theme, index) => (
                    <Chip key={theme} variant={index === 0 ? "active" : "filled"}>
                      {theme}
                    </Chip>
                  ))}
                </div>
              </Row>
              <Row label="Reading font" sub="Newsreader, Iowan Old Style, Charter, Georgia">
                <Chip variant="outline" iconEnd={<Icons.Chevron size={12} />}>
                  Newsreader
                </Chip>
              </Row>
              <Row label="Default highlight color" sub="The color when you tap Highlight">
                <div className="flex gap-1.5">
                  {[
                    "var(--hl-pink)",
                    "var(--hl-yellow)",
                    "var(--hl-green)",
                    "var(--hl-blue)",
                    "var(--hl-purple)",
                  ].map((color, index) => (
                    <span
                      key={color}
                      className="h-6 w-6 rounded-full"
                      style={{
                        background: color,
                        border:
                          index === 0 ? "2px solid var(--paper-900)" : "2px solid transparent",
                      }}
                    />
                  ))}
                </div>
              </Row>
            </Section>

            <Section label="AI · Bainder">
              <Row label="Cite the page in every answer" sub="Show page or section references">
                <Toggle checked={citePages} onChange={() => setCitePages((value) => !value)} />
              </Row>
              <Row label="Suggest follow-up questions" sub="Three contextual chips after answers">
                <Toggle checked={followups} onChange={() => setFollowups((value) => !value)} />
              </Row>
              <Row
                label="Use my highlights to personalize"
                sub="Bainder learns what passages matter"
              >
                <Toggle checked={personalize} onChange={() => setPersonalize((value) => !value)} />
              </Row>
            </Section>

            <Section label="Account">
              <Row label="Email" sub={email || "Not available"}>
                <Button variant="ghost" size="sm">
                  Change
                </Button>
              </Row>
              <Row label="Plan" sub={`${counts.all} imports / unlimited reading`}>
                <Chip variant="outline">Free</Chip>
              </Row>
              <Row label="Session" sub="Sign out of this device">
                <Button variant="wine" size="sm" onClick={signOutProfile}>
                  Sign out
                </Button>
              </Row>
            </Section>

            <Section label="Notifications">
              <Row label="Daily reading nudge" sub="A quiet evening reminder">
                <Toggle checked={dailyNudge} onChange={() => setDailyNudge((value) => !value)} />
              </Row>
              <Row label="Weekly digest" sub="What you read, highlighted, and asked about">
                <Toggle
                  checked={weeklyDigest}
                  onChange={() => setWeeklyDigest((value) => !value)}
                />
              </Row>
            </Section>
          </div>
        </div>
      </section>
    </main>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-paper-200 py-6 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
      <div className="t-label-s text-paper-500">{label}</div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="t-label-l text-paper-900">{label}</div>
        {sub && <div className="t-body-s mt-0.5 text-paper-500">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onChange}
      className="relative h-[22px] w-10 rounded-full border-0 transition-colors"
      style={{ background: checked ? "var(--paper-900)" : "var(--paper-300)" }}
    >
      <span
        className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-paper-50 shadow-sm transition-[left]"
        style={{ left: checked ? 20 : 2 }}
      />
    </button>
  );
}
