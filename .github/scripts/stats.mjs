// Generates assets/stats-{dark,light}.svg from the GitHub GraphQL API.
// The token must belong to the profile owner: only the owner's token sees private
// repositories' languages, which public stats services can never count.

import { mkdir, writeFile } from 'node:fs/promises';

const TOKEN = process.env.STATS_TOKEN;
const LOGIN = process.env.GITHUB_LOGIN ?? 'N1b3lung0';
const OUT_DIR = process.env.OUT_DIR ?? 'assets';

const THEMES = {
  dark: { bg: '#0d1117', border: '#30363d', fg: '#e6edf3', muted: '#8b949e', accent: '#58a6ff', track: '#21262d' },
  light: { bg: '#ffffff', border: '#d1d9e0', fg: '#1f2328', muted: '#59636e', accent: '#0969da', track: '#eff2f5' },
};

const QUERY = `
query ($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    createdAt
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalIssueContributions
      totalRepositoryContributions
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, orderBy: { field: PUSHED_AT, direction: DESC }) {
      totalCount
      nodes {
        name
        isPrivate
        pushedAt
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
  }
}`;

async function fetchRaw() {
  const to = new Date();
  const from = new Date(to);
  from.setFullYear(from.getFullYear() - 1);

  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-stats' },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN, from: from.toISOString(), to: to.toISOString() } }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) {
    throw new Error(`GraphQL request failed (${res.status}): ${JSON.stringify(body.errors ?? body)}`);
  }
  return body.data.user;
}

/** Contribution days of the last 12 months, oldest first: [{ date, contributionCount }]. */
export function days(raw) {
  return raw.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
}

/** Weekly contribution totals, oldest first, for the activity strip. */
export function weeklyTotals(raw) {
  return raw.contributionsCollection.contributionCalendar.weeks.map((w) =>
    w.contributionDays.reduce((sum, d) => sum + d.contributionCount, 0),
  );
}

/** Language share by bytes across every owned, non-fork repo (private included). */
export function languageShares(raw, top = 5) {
  const bytes = new Map();
  for (const repo of raw.repositories.nodes) {
    for (const { size, node } of repo.languages.edges) {
      const prev = bytes.get(node.name) ?? { size: 0, color: node.color ?? '#8b949e' };
      bytes.set(node.name, { size: prev.size + size, color: prev.color });
    }
  }
  const total = [...bytes.values()].reduce((s, l) => s + l.size, 0) || 1;
  return [...bytes.entries()]
    .map(([name, { size, color }]) => ({ name, color, share: size / total }))
    .filter((l) => l.share >= 0.01) // a 0% legend entry is noise, not information
    .sort((a, b) => b.share - a.share)
    .slice(0, top);
}

/**
 * Chooses the four headline numbers shown on the card, left to right.
 * Returns exactly four { label, value } items; value is a number or a short string.
 *
 * Available data: raw.contributionsCollection (totals and restrictedContributionsCount),
 * raw.repositories (totalCount, nodes with isPrivate and pushedAt), raw.createdAt,
 * and the helpers days(raw) and weeklyTotals(raw).
 */
export function selectMetrics(raw) {
  // Four angles that don't overlap with each other or with the weekly strip below them:
  // volume, breadth, daily intensity, seniority. Commit counts are deliberately absent:
  // GitHub reports private commits only inside restrictedContributionsCount.
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  // The profile repo itself is excluded: this Action pushes to it daily, so it would always count.
  const activeRepos = raw.repositories.nodes.filter(
    (r) => r.name !== LOGIN && new Date(r.pushedAt) >= yearAgo,
  ).length;

  let longest = 0;
  let current = 0;
  for (const d of days(raw)) {
    current = d.contributionCount > 0 ? current + 1 : 0;
    longest = Math.max(longest, current);
  }

  const years = Math.floor((Date.now() - new Date(raw.createdAt)) / (365.25 * 24 * 3600 * 1000));

  return [
    { label: 'contributions', value: raw.contributionsCollection.contributionCalendar.totalContributions },
    { label: 'repositories shipped to', value: activeRepos },
    { label: 'longest streak (days)', value: longest },
    { label: 'years on GitHub', value: years },
  ];
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const fmt = (v) => (typeof v === 'number' ? v.toLocaleString('en-US') : v);

function render(theme, { metrics, weeks, languages }) {
  const t = THEMES[theme];
  const W = 840;
  const H = 260;
  const pad = 28;
  const font = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;

  const colW = (W - pad * 2) / metrics.length;
  const metricEls = metrics
    .map(
      (m, i) => `
    <text x="${pad + i * colW}" y="78" font-size="30" font-weight="600" fill="${t.fg}">${esc(fmt(m.value))}</text>
    <text x="${pad + i * colW}" y="100" font-size="13" fill="${t.muted}">${esc(m.label)}</text>`,
    )
    .join('');

  // Weekly activity strip: one bar per week, height relative to the busiest week.
  const stripTop = 128;
  const stripH = 52;
  const max = Math.max(1, ...weeks);
  const gap = 2;
  const barW = (W - pad * 2 - gap * (weeks.length - 1)) / weeks.length;
  const bars = weeks
    .map((n, i) => {
      const h = n === 0 ? 2 : Math.max(3, (n / max) * stripH);
      const fill = n === 0 ? t.track : t.accent;
      return `<rect x="${(pad + i * (barW + gap)).toFixed(2)}" y="${(stripTop + stripH - h).toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" rx="1.5" fill="${fill}" />`;
    })
    .join('');

  // Language bar plus legend.
  const langTop = 212;
  let x = pad;
  const langBar = languages
    .map((l) => {
      const w = l.share * (W - pad * 2);
      const r = `<rect x="${x.toFixed(2)}" y="${langTop}" width="${w.toFixed(2)}" height="8" fill="${l.color}" />`;
      x += w;
      return r;
    })
    .join('');
  let lx = pad;
  const legend = languages
    .map((l) => {
      const label = `${l.name} ${(l.share * 100).toFixed(0)}%`;
      const el = `<circle cx="${lx + 4}" cy="${langTop + 30}" r="4" fill="${l.color}" /><text x="${lx + 13}" y="${langTop + 34}" font-size="12" fill="${t.muted}">${esc(label)}</text>`;
      lx += 26 + label.length * 6.6;
      return el;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub activity over the last 12 months">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${t.bg}" stroke="${t.border}" />
  <g font-family="${font}">
    <text x="${pad}" y="34" font-size="12" letter-spacing="1.2" fill="${t.muted}">LAST 12 MONTHS · PRIVATE REPOSITORIES INCLUDED</text>
    ${metricEls}
    ${bars}
    <clipPath id="lang"><rect x="${pad}" y="${langTop}" width="${W - pad * 2}" height="8" rx="4" /></clipPath>
    <g clip-path="url(#lang)">${langBar}</g>
    ${legend}
  </g>
</svg>
`;
}

async function main() {
  if (!TOKEN) throw new Error('STATS_TOKEN is not set');
  const raw = await fetchRaw();
  const metrics = selectMetrics(raw);
  if (!Array.isArray(metrics) || metrics.length !== 4) {
    throw new Error(`selectMetrics must return exactly four items, got ${JSON.stringify(metrics)}`);
  }
  const data = { metrics, weeks: weeklyTotals(raw), languages: languageShares(raw) };

  await mkdir(OUT_DIR, { recursive: true });
  for (const theme of Object.keys(THEMES)) {
    await writeFile(`${OUT_DIR}/stats-${theme}.svg`, render(theme, data));
  }
  console.log(`Wrote ${OUT_DIR}/stats-{dark,light}.svg:`, metrics.map((m) => `${m.label}=${m.value}`).join(', '));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
