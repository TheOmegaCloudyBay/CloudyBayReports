// Shared frame for every Cloudy Bay page. One place defines the topics: the top bar's nav, the
// landing page's topic grid and each topic hub page (a page with <body data-topic="...">) all
// render from TOPICS below, so adding a page here adds it everywhere.
(function(){
  const TOPICS = [
    { id:'tb', href:'tb.html', label:'TB', title:'Territory Battle',
      lede:'Rise of the Empire — results, platoons and what we need to farm for more stars.',
      pages:[
        { href:'guild-stats.html#tb', title:'Latest results', desc:'Guild stars per TB and every member’s banners and GP deployed' },
        { href:'rote-platoons.html', title:'Platoons', desc:'Platoon fill by planet, assignments, and who’s closest' },
        { title:'Required toons', desc:'Units we’re missing for more platoons — and who’s closest to them', soon:true },
        { href:'reva-readiness.html', title:'Reva', desc:'Who can field the Inquisitor team for the Reva special mission', tag:'Farm' },
      ]},
    { id:'tw', href:'tw.html', label:'TW', title:'Territory War',
      lede:'Our war record — results, opponents and margins.',
      pages:[
        { href:'guild-stats.html#tw', title:'War record', desc:'Every recent war: score, opponent, win or loss' },
        { title:'TW readiness', desc:'Per-member strength for war, from rosters', soon:true },
      ]},
    { id:'raid', href:'raid.html', label:'Raid', title:'Raids',
      lede:'Guild raid results with every member’s score and trend.',
      pages:[
        { href:'guild-stats.html#raids', title:'Raid results', desc:'Guild total per raid and each member’s score' },
      ]},
    { id:'daily', href:'daily.html', label:'Daily', title:'Daily activity',
      lede:'The everyday stuff — raid tickets, donations, reputation and who’s been around.',
      pages:[
        { href:'guild-stats.html#tickets', title:'Raid tickets', desc:'10-day average, last day, today and last seen' },
        { title:'Donations & reputation', desc:'Daily guild contributions per member', soon:true },
      ]},
    { id:'members', href:'members.html', label:'Members', title:'Members',
      lede:'Every member’s roster, plus tools to plan your own farming.',
      pages:[
        { href:'player.html', title:'Players data', desc:'Roster, gear and relics, GP, journeys, mods — and the gear planner' },
        { title:'Roster changes', desc:'Who joined, who left, and returning members', soon:true },
      ]},
    { id:'assessment', href:'assessment.html', label:'Assessment', title:'Member assessment',
      lede:'How each member contributes — participation and overall worth to the guild.',
      pages:[
        { title:'Member scores', desc:'Participation and worth scores with the full breakdown', soon:true },
      ]},
  ];
  // Which topic a non-hub page belongs to (guild-stats is split by tab, see topicOf).
  const PARENT = { 'rote-platoons.html':'tb', 'reva-readiness.html':'tb', 'player.html':'members' };
  const GS_TAB = { tb:'tb', tw:'tw', raids:'raid', tickets:'daily' };

  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  function topicOf(){
    if (file === 'guild-stats.html') return GS_TAB[location.hash.slice(1)] || 'raid';
    const hub = TOPICS.find(t => t.href === file);
    return hub ? hub.id : PARENT[file] || null;
  }

  // Site meta (last updated + guild numbers) — fetched fresh, shared with the landing page.
  const meta = fetch('site-meta.json?_=' + Date.now(), { cache:'no-store' })
    .then(r => r.ok ? r.json() : null).catch(() => null);
  window.CB = { TOPICS, meta, esc };

  function ago(iso){
    const h = (Date.now() - new Date(iso)) / 3600000;
    if (h < 1) return 'just now';
    if (h < 24) return Math.round(h) + 'h ago';
    return Math.round(h / 24) + 'd ago';
  }

  function cardHtml(p){
    const tag = p.tag ? `<em class="cb-tag">${esc(p.tag)}</em>` : p.soon ? '<em class="cb-tag">Soon</em>' : '';
    const body = `<b>${esc(p.title)}${tag}</b><span>${esc(p.desc)}</span>`;
    return p.soon || !p.href ? `<li><div class="cb-card soon">${body}</div></li>`
                             : `<li><a class="cb-card" href="${esc(p.href)}">${body}</a></li>`;
  }
  window.CB.cardHtml = cardHtml;

  function renderBar(){
    const bar = document.createElement('header');
    bar.className = 'cb-bar';
    bar.innerHTML =
      `<a class="cb-brand" href="index.html">Cloudy Bay</a>` +
      `<nav class="cb-nav">${TOPICS.map(t => `<a href="${t.href}" data-topic="${t.id}">${esc(t.label)}</a>`).join('')}</nav>` +
      `<div class="cb-tools"><span class="cb-upd"></span>` +
      `<label title="Some members share a name — the ally code tells them apart"><input type="checkbox" class="cb-ally"> Ally codes</label></div>`;
    document.body.prepend(bar);
    if (parseFloat(getComputedStyle(document.body).paddingLeft) < 8) bar.classList.add('cb-pad');

    const mark = () => { const cur = topicOf();
      bar.querySelectorAll('.cb-nav a').forEach(a => a.classList.toggle('on', a.dataset.topic === cur)); };
    mark(); window.addEventListener('hashchange', mark);

    // Ally-code reveal: one site-wide switch, remembered per browser. Pages pre-render codes as
    // hidden .ally spans; the body class shows them.
    const tog = bar.querySelector('.cb-ally');
    let on = false; try { on = localStorage.getItem('cb-show-ally') === '1'; } catch {}
    tog.checked = on; document.body.classList.toggle('show-ally', on);
    tog.onchange = () => {
      document.body.classList.toggle('show-ally', tog.checked);
      try { localStorage.setItem('cb-show-ally', tog.checked ? '1' : '0'); } catch {}
    };

    meta.then(m => {
      if (!m || !m.updated) return;
      const el = bar.querySelector('.cb-upd');
      el.textContent = 'Updated ' + ago(m.updated);
      el.title = new Date(m.updated).toLocaleString();
      // Publishing runs every few hours; flag it if a run seems to have been missed.
      if ((Date.now() - new Date(m.updated)) / 3600000 > 12) el.classList.add('stale');
    });
  }

  function renderHub(id){
    const t = TOPICS.find(x => x.id === id); if (!t) return;
    const main = document.querySelector('main') || document.body;
    main.classList.add('cb-hub');
    main.insertAdjacentHTML('beforeend',
      `<h1>${esc(t.title)}</h1><p class="cb-lede">${esc(t.lede)}</p>` +
      `<ul class="cb-cards">${t.pages.map(cardHtml).join('')}</ul>`);
    document.title = t.title + ' — Cloudy Bay';
  }

  function init(){
    renderBar();
    const hub = document.body.dataset.topic;
    if (hub) renderHub(hub);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
