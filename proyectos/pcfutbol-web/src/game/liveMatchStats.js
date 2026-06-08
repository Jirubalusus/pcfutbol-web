// Helpers for the live (in-progress) MatchDay scoreboard.
//
// The match simulation produces final aggregate stats (total shots, shots on
// target, etc.) up front. Showing those totals from the first tick makes the
// live screen claim e.g. "18 shots each" at minute 6 while the event feed still
// says the match is just starting. These helpers derive progressive values from
// the live clock so counters start low and converge to the real totals.

/**
 * Scale a final-match total by the elapsed fraction of the match.
 *
 * @param {number} finalValue Real end-of-match total for this stat.
 * @param {number} progress   Elapsed fraction in [0, 1] (currentMinute / fullTime).
 * @param {number} [floor=0]  Minimum to show (e.g. goals already scored, which
 *                            necessarily count as shots / shots on target).
 * @returns {number} Progressive live value, never above the final total and
 *                   never below the floor. Returns the exact final total at
 *                   progress >= 1 so live counters converge to the post-match stats.
 */
export const progressiveLiveStat = (finalValue, progress, floor = 0) => {
  const safeFinal = Math.max(0, Number(finalValue) || 0);
  const safeFloor = Math.max(0, Number(floor) || 0);
  const clampedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  // The final value caps the floor so a generous goal floor can never exceed the
  // real total (final on-target is always >= goals, but guard defensively).
  const cap = Math.max(safeFinal, safeFloor);
  if (clampedProgress >= 1) return cap;
  const scaled = Math.round(safeFinal * clampedProgress);
  return Math.min(cap, Math.max(safeFloor, scaled));
};

/**
 * Progressive live expected goals (xG). Like {@link progressiveLiveStat} but
 * keeps decimals (xG is a tenths-scale quality figure, not a counter) so the
 * "goles esperados" row starts near 0 and accumulates toward the real match xG.
 *
 * xG is chance QUALITY, not goals: a scored goal must NOT snap xG to 1.0. The
 * optional `floor` lets the caller credit a modest amount of xG per goal already
 * scored (each shot that went in was at least a half-chance) without ever
 * exceeding the real final xG, which already accounts for those goals.
 *
 * @param {number} finalValue End-of-match xG total for this team.
 * @param {number} progress   Elapsed fraction in [0, 1] (currentMinute / fullTime).
 * @param {number} [floor=0]  Minimum xG to show (e.g. goals * a small per-goal xG).
 * @returns {number} Progressive xG rounded to one decimal, never above the final
 *                   total and converging to it exactly at full time.
 */
export const progressiveLiveXg = (finalValue, progress, floor = 0) => {
  const safeFinal = Math.max(0, Number(finalValue) || 0);
  const clampedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  // The floor can never push live xG past the real final total.
  const safeFloor = Math.min(safeFinal, Math.max(0, Number(floor) || 0));
  const round1 = (v) => Math.round(v * 10) / 10;
  if (clampedProgress >= 1) return round1(safeFinal);
  const scaled = safeFinal * clampedProgress;
  return round1(Math.min(safeFinal, Math.max(safeFloor, scaled)));
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Deterministic FNV-1a string hash. Used to seed stable per-bucket / per-player
// variance so the live panel looks lively without changing on every render.
const hashString = (str = '') => {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const ratingNameOf = (p) => {
  if (!p) return '';
  if (typeof p === 'string') return p;
  return p.name || '';
};

/**
 * Build a live possession value that starts near 50/50 and drifts toward the
 * final match possession with stable phase swings. This keeps the stat moving
 * during the match while still converging exactly at full time.
 */
export const progressiveLivePossession = ({
  finalHome = 50,
  currentMinute = 0,
  fullTimeMinute = 95,
  events = [],
  seed = 0
} = {}) => {
  const safeFull = Math.max(1, Number(fullTimeMinute) || 95);
  const progress = clamp((Number(currentMinute) || 0) / safeFull, 0, 1);
  const final = clamp(Math.round(Number(finalHome) || 50), 25, 75);
  if (progress >= 1) return { home: final, away: 100 - final };

  const base = 50 + (final - 50) * Math.pow(progress, 0.72);
  const phaseIndex = Math.floor((Number(currentMinute) || 0) / 15);
  const phaseNoise = ((hashString(`${seed}:pos:${phaseIndex}`) % 100) / 100) * 7 - 3.5;
  const wave = Math.sin((progress * Math.PI * 3.2) + ((hashString(`${seed}:wave`) % 60) / 10)) * 2.2;
  const eventTilt = (events || []).reduce((sum, ev) => {
    if (ev.type !== 'goal') return sum;
    const age = Math.max(0, (Number(currentMinute) || 0) - (Number(ev.minute) || 0));
    if (age > 18) return sum;
    const dir = ev.team === 'home' ? 1 : -1;
    return sum + dir * (2.8 * (1 - age / 18));
  }, 0);

  const liveHome = clamp(Math.round(base + (phaseNoise + wave + eventTilt) * (1 - progress * 0.78)), 34, 66);
  return { home: liveHome, away: 100 - liveHome };
};

/**
 * Build a SofaScore-style momentum (live pressure) chart split into time buckets.
 *
 * Each bucket carries a signed value in [-100, 100]: positive leans home (bar
 * drawn above the baseline), negative leans away (below). Only buckets the clock
 * has already reached are filled, so the chart grows as the match progresses.
 * Values are deterministic for a given `seed`, so they don't jitter per render,
 * and goal events spike the bucket they fall into and are flagged for markers.
 *
 * @returns {Array<{start:number,end:number,value:number,active:boolean,goals:string[]}>}
 */
export const buildMomentumBuckets = ({
  currentMinute = 0,
  fullTimeMinute = 95,
  possessionHome = 50,
  events = [],
  seed = 0,
  bucketCount = 46
} = {}) => {
  const safeFull = Math.max(1, Number(fullTimeMinute) || 95);
  const span = safeFull / bucketCount;
  const lean = (Math.max(0, Math.min(100, Number(possessionHome) || 50)) - 50); // -50..50, home-positive
  // Macro pressure waves are time-based (≈ one swing per 12'), so the silhouette
  // stays coherent no matter how many thin buckets we slice the match into.
  const segmentCount = Math.max(3, Math.round(safeFull / 12));
  const bucketsPerSegment = bucketCount / segmentCount;
  const segmentValues = [];
  let lastDir = 0;
  for (let s = 0; s <= segmentCount; s++) {
    const raw = ((hashString(`${seed}:segment:${s}`) % 100) / 100) * 2 - 1;
    let dir = raw >= 0 ? 1 : -1;
    if (s > 0 && Math.abs(raw) < 0.28) dir = lastDir === 0 ? dir : -lastDir;
    lastDir = dir;
    segmentValues.push(dir * (18 + Math.abs(raw) * 34) + lean * 0.75);
  }
  const buckets = [];
  for (let i = 0; i < bucketCount; i++) {
    const start = i * span;
    const end = (i + 1) * span;
    const active = currentMinute > start;
    // Stable pseudo-noise per (match, bucket) so the silhouette varies but holds.
    // Keep it strong enough for a SofaScore-like comb of thin, individual bars.
    const noise = ((hashString(`${seed}:${i}`) % 100) / 100) * 38 - 19; // -19..19
    const microWave = Math.sin((i + (Number(seed) % 17)) * 0.92) * 7;
    const pos = i / bucketsPerSegment;
    const segIndex = Math.min(segmentValues.length - 1, Math.floor(pos));
    const nextIndex = Math.min(segmentValues.length - 1, segIndex + 1);
    const blend = pos - Math.floor(pos);
    const segment = segmentValues[segIndex] || 0;
    const neighbor = segmentValues[nextIndex] ?? segment;
    let value = active ? (segment * (1 - blend) + neighbor * blend) + noise + microWave : 0;
    const goals = [];
    events.forEach((ev) => {
      if (ev.type !== 'goal') return;
      const m = Number(ev.minute) || 0;
      if (m >= start && m < end) {
        goals.push(ev.team);
        value += ev.team === 'home' ? 60 : -60;
      }
    });
    if (goals.includes('home')) value = Math.max(value, 55);
    if (goals.includes('away')) value = Math.min(value, -55);
    value = active ? Math.max(-100, Math.min(100, Math.round(value))) : 0;
    buckets.push({ start: Math.round(start), end: Math.round(end), value, active, goals });
  }
  return buckets;
};

/**
 * Derive deterministic, plausible live player ratings for one team.
 *
 * The simulation does not expose per-player ratings during the live phase, so we
 * synthesise them from each player's overall plus the events seen so far (only
 * events up to the current minute should be passed in). Everyone starts near 6.5
 * and differentiation grows with `progress`; scorers/assisters get boosts and
 * booked/sent-off players a penalty. Output is sorted best-first and is stable
 * across renders for the same inputs (no per-render randomness).
 *
 * @returns {Array<{name:string,position:string,rating:number,goals:number,assists:number}>}
 */
export const deriveLivePlayerRatings = (lineup = [], events = [], teamLabel = 'home', progress = 0) => {
  const clampedProgress = Math.max(0, Math.min(1, Number(progress) || 0));
  const teamEvents = (events || []).filter((e) => e.team === teamLabel);
  const rated = (lineup || []).map((player) => {
    const name = ratingNameOf(player);
    const overall = Math.max(40, Math.min(99, Number(player?.overall) || 65));
    // Map overall 40 -> ~6.0, 99 -> ~7.6.
    const ability = 6.0 + ((overall - 40) / 59) * 1.6;
    // Everyone hovers near 6.5 early; ability matters more as the match unfolds.
    const blend = 0.45 + 0.55 * clampedProgress;
    let rating = 6.5 + (ability - 6.5) * blend;
    // Deterministic per-player jitter so the figure is stable across renders.
    const jitter = ((hashString(`${teamLabel}:${name}`) % 9) - 4) / 20; // -0.2..0.2
    rating += jitter * (0.5 + 0.5 * clampedProgress);
    let goals = 0;
    let assists = 0;
    teamEvents.forEach((ev) => {
      const scorer = ratingNameOf(ev.player);
      const assister = ratingNameOf(ev.assist);
      if (ev.type === 'goal') {
        if (scorer && scorer === name) { rating += 1.15; goals += 1; }
        if (assister && assister === name) { rating += 0.6; assists += 1; }
      } else if (ev.type === 'yellow_card' && scorer && scorer === name) {
        rating -= 0.3;
      } else if (ev.type === 'red_card' && scorer && scorer === name) {
        rating -= 1.3;
      }
    });
    rating = Math.max(4.5, Math.min(10, rating));
    return {
      name,
      position: player?.position || player?.playingPosition || '',
      rating: Math.round(rating * 10) / 10,
      goals,
      assists
    };
  });
  return rated.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
};
