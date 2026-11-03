import { embedUrl } from "@/lib/webinar-utils";
import type { Professional } from "@/lib/professionals";

/** Real portrait when available; otherwise the professional's initials (never a stock avatar). */
export function Portrait({ person, size = "sm" }: { person: Professional; size?: "sm" | "lg" }) {
  const initials = person.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span className={`fac-portrait ${size}`}>
      {person.photoUrl ? <img src={person.photoUrl} alt={`Foto de ${person.fullName}`} loading="lazy" /> : <span aria-hidden="true">{initials}</span>}
    </span>
  );
}

/** Name + title line for the professional responsible for an activity step. */
export function StaffTag({ label, person }: { label: string; person: Professional }) {
  return (
    <div className="fac-tag">
      <Portrait person={person} />
      <span>
        <small>{label}</small>
        <b>{person.fullName}</b>
        {person.title ? <em>{person.title}</em> : null}
      </span>
    </div>
  );
}

/**
 * Activity video region. With a published URL it plays the real video (YouTube/Vimeo embed or a
 * native player with the professional's portrait as poster). Without one it shows an honest empty
 * state: no play button, duration or invented presenter.
 */
export function ActivityVideo({
  url,
  person,
  label,
  emptyTitle,
  emptyText,
}: {
  url: string;
  person: Professional | null;
  label: string;
  emptyTitle: string;
  emptyText: string;
}) {
  const embed = url ? embedUrl(url) : null;
  return (
    <figure className="fac-video">
      {url ? (
        embed ? (
          <div className="video">
            <iframe
              src={embed}
              title={person ? `${label} — ${person.fullName}` : label}
              allow="encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
            />
          </div>
        ) : (
          <video className="video" src={url} controls playsInline preload="metadata" poster={person?.photoUrl ?? undefined} />
        )
      ) : (
        <div className="video is-empty" role="note">
          <span className="fac-empty-mark" aria-hidden="true" />
          <b>{emptyTitle}</b>
          <span>{emptyText}</span>
        </div>
      )}
      {person ? (
        <figcaption>
          <StaffTag label={label} person={person} />
        </figcaption>
      ) : null}
    </figure>
  );
}
