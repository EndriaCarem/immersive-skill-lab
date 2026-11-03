/** Shared, browser-safe rules for course faculty (professionals linked to courses and activities). */

export type Professional = {
  id: string;
  fullName: string;
  title: string;
  specialty: string;
  bio: string;
  photoUrl: string | null;
};

export type ActivityStaff = {
  supervisor: Professional | null;
  feedback: Professional | null;
  demandVideoUrl: string;
};

export type CourseLink = { professional_id: string; is_lead: boolean; position: number };
export type StaffRow = { supervisor_id: string | null; feedback_professional_id: string | null; demand_video_url: string };

export const PHOTO_TYPES: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;

/** Returns an error message for an invalid profile photo, or null when it is accepted. */
export function photoError(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES[file.type]) return "Use uma foto em JPG, PNG ou WEBP.";
  if (file.size > PHOTO_MAX_BYTES) return "A foto deve ter até 2 MB.";
  if (file.size <= 0) return "Arquivo de foto vazio.";
  return null;
}

/** Linked professionals in display order: lead first, then by position. Only visible ones are kept. */
export function courseFaculty(links: CourseLink[], people: Map<string, Professional>): Professional[] {
  return [...links]
    .sort((a, b) => Number(b.is_lead) - Number(a.is_lead) || a.position - b.position)
    .map((l) => people.get(l.professional_id))
    .filter((p): p is Professional => Boolean(p));
}

/** The course's main professor: the one marked as lead, otherwise the first linked one. */
export function courseLead(links: CourseLink[], people: Map<string, Professional>): Professional | null {
  return courseFaculty(links, people)[0] ?? null;
}

/** Activity-specific choice when set and visible; otherwise falls back to the course's main professor. */
export function resolveActivityStaff(
  links: CourseLink[],
  row: StaffRow | undefined,
  people: Map<string, Professional>,
): ActivityStaff {
  const lead = courseLead(links, people);
  const pick = (id: string | null | undefined) => (id ? people.get(id) : undefined) ?? lead;
  return {
    supervisor: pick(row?.supervisor_id),
    feedback: pick(row?.feedback_professional_id),
    demandVideoUrl: row?.demand_video_url ?? "",
  };
}

type PersonRow = {
  id: string;
  full_name: string;
  title: string;
  specialty: string;
  bio: string;
  photo_path: string | null;
  active: boolean;
  display_authorized: boolean;
};

/** Builds the map of professionals that may be shown outside administration. */
export function visiblePeople(rows: PersonRow[], urls: Map<string, string>): Map<string, Professional> {
  return new Map(
    rows
      .filter((r) => r.active && r.display_authorized)
      .map((r) => [
        r.id,
        {
          id: r.id,
          fullName: r.full_name,
          title: r.title,
          specialty: r.specialty,
          bio: r.bio,
          photoUrl: r.photo_path ? (urls.get(r.photo_path) ?? null) : null,
        },
      ]),
  );
}
