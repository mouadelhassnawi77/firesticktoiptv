/**
 * Hero graphic: a TV guide from 6 PM to 10 PM ET in 15-minute slots.
 * The red line sits at 8:15 PM – US primetime, right after kickoff.
 * Pure HTML/CSS, no JavaScript, no image: fast for LCP and crawlable.
 */
type Show = { title: string; start: number; end: number }; // minutes from 6:00 PM

const NOW = 135; // 8:15 PM
const TOTAL = 240;

const rows: { label: string; shows: Show[] }[] = [
  {
    label: "Football",
    shows: [
      { title: "Pregame Show", start: 0, end: 80 },
      { title: "Primetime Game", start: 80, end: 240 },
    ],
  },
  {
    label: "Basketball",
    shows: [
      { title: "Tip-Off", start: 0, end: 30 },
      { title: "Primetime Matchup", start: 30, end: 180 },
      { title: "Postgame", start: 180, end: 240 },
    ],
  },
  {
    label: "Fights",
    shows: [
      { title: "Prelims", start: 0, end: 120 },
      { title: "Main Card", start: 120, end: 240 },
    ],
  },
  {
    label: "News",
    shows: [
      { title: "Evening News", start: 0, end: 60 },
      { title: "Local News", start: 60, end: 120 },
      { title: "Primetime Report", start: 120, end: 240 },
    ],
  },
  {
    label: "Movies",
    shows: [
      { title: "Action Classic", start: 0, end: 120 },
      { title: "Premiere", start: 120, end: 240 },
    ],
  },
  {
    label: "Kids",
    shows: [
      { title: "Cartoons", start: 0, end: 60 },
      { title: "Family Movie", start: 60, end: 180 },
      { title: "Wildlife", start: 180, end: 240 },
    ],
  },
];

const q = (min: number) => min / 15 + 1; // minutes -> grid line

export default function Epg() {
  return (
    <figure className="epg" aria-label="Sample from the TV guide: tonight at 8:15 PM ET" style={{ margin: 0 }}>
      <div className="epg-head" aria-hidden="true">
        <span>Tonight</span>
        <div className="epg-times">
          <span>6 PM</span>
          <span>7 PM</span>
          <span>8 PM</span>
          <span>9 PM</span>
        </div>
      </div>
      <div className="epg-body">
        {rows.map((row, r) => (
          <div key={row.label} style={{ display: "contents" }}>
            <div className="epg-label" style={{ gridRow: r + 1 }}>
              {row.label}
            </div>
            <div className="epg-row" style={{ gridRow: r + 1 }}>
              {row.shows.map((s) => {
                const isNow = s.start <= NOW && NOW < s.end;
                return (
                  <div
                    key={s.title}
                    className={isNow ? "epg-show is-now" : "epg-show"}
                    style={{ gridColumn: `${q(s.start)} / ${q(s.end)}` }}
                  >
                    <span>{s.title}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <div className="epg-now" aria-hidden="true">
          <div className="epg-now-line" style={{ left: `${(NOW / TOTAL) * 100}%` }} />
          <div className="epg-now-tag" style={{ left: `${(NOW / TOTAL) * 100}%` }}>
            8:15 PM
          </div>
        </div>
      </div>
    </figure>
  );
}
