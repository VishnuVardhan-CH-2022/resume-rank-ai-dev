import type { CandidateProfile } from "@/modules/candidates/api/candidates-api";

const EMPTY = "Not found in resume";

function asText(value: unknown): string {
  if (value == null) return EMPTY;
  if (typeof value === "string") {
    const t = value.trim();
    return t || EMPTY;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return EMPTY;
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return JSON.stringify(item);
        }
        return String(item);
      })
      .join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * CandidateProfileView — CE-01–CE-14 sparse display (UXD §6.12).
 */
export function CandidateProfileView({
  profile,
}: {
  profile: CandidateProfile | null;
}) {
  if (!profile) {
    return (
      <p className="text-sm text-muted-foreground">
        No extracted profile fields yet.
      </p>
    );
  }

  const fields: Array<{ label: string; value: unknown }> = [
    { label: "Name", value: profile.name },
    { label: "Email", value: profile.email },
    { label: "Phone", value: profile.phone },
    { label: "Skills", value: profile.skills },
    { label: "Education", value: profile.education },
    { label: "Experience", value: profile.experience },
    { label: "Certifications", value: profile.certifications },
    { label: "Projects", value: profile.projects },
    { label: "Resume summary", value: profile.resume_summary },
    { label: "LinkedIn", value: profile.linkedin },
    { label: "GitHub", value: profile.github },
    { label: "Portfolio", value: profile.portfolio },
    { label: "Languages", value: profile.languages },
    { label: "Location", value: profile.location },
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.label} className="border border-border px-3 py-2">
          <dt className="text-xs text-muted-foreground">{field.label}</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm">
            {asText(field.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
