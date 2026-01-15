// Lightweight site data checker for GameRate
// Usage (PowerShell):
//   $env:SITE_BASE = 'http://localhost:3001'; node .\check-site-data.js
// Or simply: node .\check-site-data.js (defaults to http://localhost:3001)

(async function(){
  const base = process.env.SITE_BASE || 'http://localhost:3001';
  const out = (s='') => console.log(s);

  out(`Checking GameRate API at ${base}`);

  async function safeFetchJson(url, opts){
    try {
      const res = await fetch(url, opts);
      const txt = await res.text();
      try { return { ok: res.ok, status: res.status, json: JSON.parse(txt) }; } catch(e){ return { ok: res.ok, status: res.status, text: txt }; }
    } catch (err){ return { ok: false, error: err.message || String(err) }; }
  }

  // 1) config
  const cfg = await safeFetchJson(`${base}/api/config`);
  if (!cfg.ok){ out(`Failed to fetch /api/config: ${cfg.error || cfg.status}`); }
  else out(`Config: ${JSON.stringify(cfg.json)}`);

  // 2) games list
  const gamesRes = await safeFetchJson(`${base}/api/games`);
  if (!gamesRes.ok){ out(`Failed to fetch /api/games: ${gamesRes.error || gamesRes.status}`); return; }
  const games = gamesRes.json && gamesRes.json.games ? gamesRes.json.games : [];
  out(`\nFound ${games.length} games`);

  let totalReviews = 0;
  let totalReplies = 0;

  for (let i=0;i<games.length;i++){
    const g = games[i];
    out(`\n[${i+1}] ${g.title} (id: ${g.id})`);
    out(`  Genre: ${g.genre || '-'}  Avg: ${g.avgRating || 0}  Reviews: ${g.reviewCount || 0}`);

    // fetch reviews for this game
    const revRes = await safeFetchJson(`${base}/api/reviews/game/${encodeURIComponent(g.id)}`);
    if (!revRes.ok){ out(`  Failed to fetch reviews: ${revRes.error || revRes.status}`); continue; }
    const revs = revRes.json && revRes.json.reviews ? revRes.json.reviews : [];
    totalReviews += revs.length;
    out(`  Retrieved ${revs.length} reviews`);
    for (let j=0;j<Math.min(3,revs.length);j++){
      const r = revs[j];
      const snippet = (r.text || '').slice(0,120).replace(/\n/g,' ');
      const replies = r.replies || [];
      totalReplies += replies.length;
      out(`    - ${r.id} by ${r.userEmail} rating:${r.rating} replies:${replies.length} text:"${snippet}${r.text && r.text.length>120? '...':''}"`);
    }
  }

  out(`\nSummary:`);
  out(`  Games: ${games.length}`);
  out(`  Total reviews (summed per-game): ${totalReviews}`);
  out(`  Total replies (summed per-game): ${totalReplies}`);

  out('\nDone. If you need more (full dumps, or auth-checked endpoints), tell me and I can extend this script.');
})();
