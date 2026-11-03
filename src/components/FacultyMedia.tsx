import { useId, useState } from "react";
import { embedUrl } from "@/lib/webinar-utils";
import { formatDuration } from "@/lib/activity-room";
import type { DemandVideo, Professional } from "@/lib/professionals";

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

/** Neutral line shown when no professional is registered/authorized for the role. */
function NeutralTag({ label }: { label: string }) {
  return (
    <div className="fac-tag is-neutral">
      <span className="fac-portrait" aria-hidden="true">
        <span className="fac-neutral-mark" />
      </span>
      <span>
        <small>{label}</small>
        <em>Profissional responsável a definir</em>
      </span>
    </div>
  );
}

/**
 * Activity video region. With a published URL it plays the real video (YouTube/Vimeo embed or a
 * native player with the cover — or the professional's portrait — as poster). Without one it shows an
 * honest empty state: no play button, duration or invented presenter. Duration is shown only when real:
 * configured by the administration or read from the file's own metadata.
 */
export function ActivityVideo({
  url,
  person,
  label,
  emptyTitle,
  emptyText,
  video,
  showNeutral = false,
}: {
  url: string;
  person: Professional | null;
  label: string;
  emptyTitle: string;
  emptyText: string;
  video?: DemandVideo | undefined;
  showNeutral?: boolean;
}) {
  const embed = url ? embedUrl(url) : null;
  const descId = useId();
  const [metaSeconds, setMetaSeconds] = useState<number | null>(null);
  const description = video?.description ?? "";
  const duration = formatDuration(video?.durationSeconds ?? metaSeconds);
  const title = person ? `${label} — ${person.fullName}` : label;
  return (
    <figure className={`fac-video${url ? " is-reveal" : ""}`}>
      {url ? (
        embed ? (
          <div className="video">
            <iframe
              src={embed}
              title={title}
              allow="encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
              aria-describedby={description ? descId : undefined}
            />
          </div>
        ) : (
          <video
            className="video"
            src={url}
            controls
            playsInline
            preload="metadata"
            poster={video?.posterUrl ?? person?.photoUrl ?? undefined}
            aria-label={title}
            aria-describedby={description ? descId : undefined}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setMetaSeconds(d);
            }}
          />
        )
      ) : (
        <div className="video is-empty" role="note">
          <span className="fac-empty-mark" aria-hidden="true" />
          <b>{emptyTitle}</b>
          <span>{emptyText}</span>
        </div>
      )}
      {url && (description || duration) ? (
        <div className="fac-video-meta">
          {duration ? <span className="fac-duration">Duração {duration}</span> : null}
          {description ? <p id={descId}>{description}</p> : null}
        </div>
      ) : null}
      {person ? (
        <figcaption>
          <StaffTag label={label} person={person} />
        </figcaption>
      ) : showNeutral ? (
        <figcaption>
          <NeutralTag label={label} />
        </figcaption>
      ) : null}
    </figure>
  );
}
