// Daily health check: a handful of counts that only matter when they jump.
// Kept free of Firebase/GitHub setup so it can be tested with fakes.
// Raise a limit here if a normal busy day trips it; don't add more checks than Lucas will actually read.
export const CHECKS = [
  { id: 'feedback', name: 'Bug reports and ideas', col: 'feedback', field: 't', ms: true, limit: 40,
    why: 'a script may be flooding feedback (it becomes GitHub issues)' },
  { id: 'claims', name: 'Card Club rewards handed over', col: 'clubClaims', field: 't', limit: 15,
    why: 'more free items than a normal day: check the counter screen claims and who approved them' },
  { id: 'requests', name: 'Card Club claim codes', col: 'clubReq', field: 't', limit: 60,
    why: 'lots of reward attempts: someone may be testing edited binders' },
  { id: 'scans', name: 'Card Club packs opened (counter scans)', col: 'clubScans', field: 't', limit: 300,
    why: "today's counter code may have leaked (it's only shown on the staff screen)" },
  { id: 'ladder', name: 'Ladder updates', col: 'ladder', field: 'st', limit: 500,
    why: 'possible fake accounts or a script on the ladder' },
];

// counts: { [id]: number | null } (null = couldn't count). Returns the checks over their limit.
export function overLimit(counts, checks = CHECKS) {
  return checks.filter(c => typeof counts[c.id] === 'number' && counts[c.id] > c.limit)
    .map(c => ({ ...c, count: counts[c.id] }));
}

export function report(counts, day, checks = CHECKS) {
  const rows = checks.map(c => `| ${c.name} | ${counts[c.id] ?? 'n/a'} | ${c.limit} |`);
  return ['| Last 24 hours | Count | Alert above |', '|---|---|---|', ...rows].join('\n');
}

export function alertIssue(hits, counts, day, checks = CHECKS) {
  return {
    title: `Health alert ${day}: ${hits.map(h => h.name).join(', ')}`,
    body: [
      `Something in the last 24 hours went well past a normal day. This alert only opens when a limit is crossed, so it's worth a look.`,
      '',
      ...hits.map(h => `- **${h.name}: ${h.count}** (alert above ${h.limit}). ${h.why}.`),
      '',
      report(counts, day, checks),
      '',
      'If it was a genuinely busy day, raise the limit in `scripts/health-lib.mjs`. Never mute this check.',
    ].join('\n'),
    labels: ['alert'],
  };
}
