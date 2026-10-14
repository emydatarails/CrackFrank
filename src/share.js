/* FRANK'S COMPUTER — share your score (the end screen, src/boot.js ending()).
   A 1200x630 score card in the game's own look (the artwork comes from public/og-image.png via
   tools/make_share_card.py → src/share_assets.js), drawn in the browser with the player's score, name, time and rank,
   plus the ways to share it: the phone's own share sheet (with the picture), LinkedIn, X, Facebook, WhatsApp, Download
   and Copy link. The social sites can't take a picture through a link, so their buttons also download the card (and copy
   it, where the browser allows) and say so: one click to attach it. Prefix: .fr-share- */
(() => {
  const $ = FR.$, esc = FR.esc;
  const W = 1200, H = 630;
  const cfg = window.FR_CONFIG || {};
  const http = /^https?:$/.test(location.protocol);
  // the link that goes with a share: config.json "shareUrl", else this game's own address, else the Packa site
  const shareUrl = () => cfg.shareUrl || (http ? location.origin + location.pathname.replace(/[^/]*$/, '') : (cfg.siteUrl || 'https://www.packacorp.com/'));
  const fmt = n => Math.round(n).toLocaleString('en-US');

  // a title for the score (the most a game can make is 10,000 + every bonus, egg and the Solitaire win)
  function tier(score) {
    const max = FR.scoreRules ? 10 * FR.scoreRules.PER_SOLVED + FR.scoreRules.BONUS_MAX : 11650;
    if (score >= max) return 'PERFECT GAME · KRISTIANS IS NERVOUS';
    if (score >= 10000) return 'FRANK-LEVEL FP&A';
    if (score >= 8000) return 'BOARD-READY';
    if (score >= 6000) return 'SURVIVED THE BOARD MEETING';
    return 'MADE IT TO 9:00 AM';
  }

  const imgs = {};
  const load = src => imgs[src] || (imgs[src] = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
  const SANS = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

  function spaced(g, text, x, y, spacing) {   // letter-spaced text, centred on x (canvas letterSpacing isn't everywhere)
    const chars = [...text], widths = chars.map(c => g.measureText(c).width);
    let cx = x - (widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)) / 2;
    g.textAlign = 'left';
    chars.forEach((c, i) => { g.fillText(c, cx, y); cx += widths[i] + spacing; });
    g.textAlign = 'center';
  }
  function chip(g, x, y, w, h, label, value) {
    g.fillStyle = 'rgba(255,255,255,0.07)'; g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, 10) : g.rect(x, y, w, h); g.fill(); g.stroke();
    g.fillStyle = '#ffffff'; g.font = `700 30px ${SANS}`; g.fillText(value, x + w / 2, y + 42);
    g.fillStyle = '#9fb0d9'; g.font = `700 13px ${SANS}`; spaced(g, label, x + w / 2, y + 66, 1.5);
  }

  /* the card: info = { score, name, time, rank, players, hints, bonus } → a canvas */
  async function draw(info) {
    const A = FR.data.share;
    const [bg, title, sub, cta] = await Promise.all([load(A.bg), load(A.title.src), load(A.sub.src), load(A.cta.src)]);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.drawImage(bg, 0, 0, W, H);
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    // FRANK'S COMPUTER / A FRANK IS MISSING GAME, in their own lettering, smaller, at the top
    const tw = A.title.w * 0.6, th = A.title.h * 0.6;
    g.drawImage(title, (W - tw) / 2, 40, tw, th);
    g.drawImage(sub, (W - A.sub.w * 0.85) / 2, 40 + th + 14, A.sub.w * 0.85, A.sub.h * 0.85);
    // the title for this score, in the brand's gold
    g.fillStyle = A.ctaColor; g.font = `800 20px ${SANS}`; spaced(g, tier(info.score), W / 2, 172, 4);
    // the score
    g.fillStyle = '#ffffff'; g.font = `800 132px ${SANS}`;
    g.shadowColor = 'rgba(255,207,90,0.28)'; g.shadowBlur = 36;
    const s = fmt(info.score); g.fillText(s, W / 2 - 46, 300);
    g.shadowBlur = 0;
    const sw = g.measureText(s).width;
    g.fillStyle = '#9fb0d9'; g.font = `800 22px ${SANS}`; g.textAlign = 'left'; g.fillText('POINTS', W / 2 - 46 + sw / 2 + 14, 296); g.textAlign = 'center';
    // who
    g.fillStyle = '#d6dcef'; g.font = `600 26px ${SANS}`;
    const who = info.name ? `${info.name} covered for Frank. Packa Corp is saved.` : 'I covered for Frank. Packa Corp is saved.';
    let fs = 26; while (g.measureText(who).width > W - 160 && fs > 16) { fs--; g.font = `600 ${fs}px ${SANS}`; }
    g.fillText(who, W / 2, 350);
    // the numbers
    const chips = [['TIME AT FRANK\'S DESK', info.time]];
    if (info.rank) chips.push(['ON THE BOARD', `#${fmt(info.rank)}` + (info.players ? ` of ${fmt(info.players)}` : '')]);
    chips.push(['HINTS USED', String(info.hints || 0)]);
    if (info.bonus) chips.push(['BONUS & EGGS', '+' + fmt(info.bonus)]);
    const cw = 236, gap = 16, x0 = (W - (chips.length * cw + (chips.length - 1) * gap)) / 2;
    chips.forEach(([l, v], i) => chip(g, x0 + i * (cw + gap), 380, cw, 82, l, v));
    // PLAY FREE AT PACKACORP.COM (the gold pill, as on the game's own card)
    g.drawImage(cta, (W - A.cta.w) / 2, 486, A.cta.w, A.cta.h);
    return c;
  }
  const blobOf = c => new Promise(res => c.toBlob(res, 'image/png'));

  function text(info) {
    return `I covered for Frank and saved Packa Corp: ${fmt(info.score)} points in ${info.time}${info.rank ? ` (#${fmt(info.rank)} on the leaderboard)` : ''}. Frank is in Vegas. Don't tell Drew. Can you beat me? #FrankIsMissing`;
  }
  const FILE = 'franks-computer-score.png';

  /* the "Share your score" block on the end screen. Returns { update(info) } for when the rank arrives. */
  function mount(host, info) {
    const box = $(`<div class="fr-share">
      <div class="fr-share-h"><b>Brag a little.</b> Share your score and dare your finance friends to beat it.</div>
      <div class="fr-share-pic"><img class="fr-share-img" alt="Your Frank's Computer score card"></div>
      <div class="fr-share-btns">
        <button class="fr-share-b fr-share-native" data-s="native" hidden>Share…</button>
        <button class="fr-share-b" data-s="linkedin">LinkedIn</button><button class="fr-share-b" data-s="x">X</button>
        <button class="fr-share-b" data-s="facebook">Facebook</button><button class="fr-share-b" data-s="whatsapp">WhatsApp</button>
        <button class="fr-share-b" data-s="download">Download image</button><button class="fr-share-b" data-s="copy">Copy link</button>
      </div>
      <p class="fr-share-note" aria-live="polite"></p></div>`);
    host.appendChild(box);
    const img = box.querySelector('.fr-share-img'), note = box.querySelector('.fr-share-note');
    let cur = info, canvas = null, blob = null, url = null, gen = 0;
    const say = t => { note.textContent = t; };
    async function render() {
      const n = ++gen;
      try {
        const c = await draw(cur); if (n !== gen) return;
        const b = await blobOf(c); if (n !== gen) return;
        canvas = c; blob = b;
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(b); img.src = url;
        const file = new File([b], FILE, { type: 'image/png' });
        const nat = box.querySelector('[data-s=native]');
        nat.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
      } catch (e) { box.querySelector('.fr-share-pic').hidden = true; }
    }
    function download() {
      if (!url) return false;
      const a = document.createElement('a'); a.href = url; a.download = FILE; document.body.appendChild(a); a.click(); a.remove();
      return true;
    }
    async function copyImage() {
      // (a browser can sit on a permission prompt here: give up after a second, the download is there anyway)
      if (!blob || !navigator.clipboard || !window.ClipboardItem) return false;
      const put = navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(() => true, () => false);
      return Promise.race([put, new Promise(r => setTimeout(() => r(false), 1000))]);
    }
    const open = href => window.open(href, '_blank', 'noopener');
    const withPicture = async (site, href) => {
      // open the site first (a pop-up must come straight from the click), then hand over the picture
      open(href);
      const copied = await copyImage(), saved = download();
      say(`${site} opened in a new tab. ${saved ? 'Your score card was downloaded' : ''}${copied ? (saved ? ' and copied: paste it into your post, or attach the file.' : 'Your score card was copied: paste it into your post.') : (saved ? ': attach it to your post.' : '')}`);
      FR.bus.emit('share', site);
    };
    box.querySelector('.fr-share-btns').addEventListener('click', async e => {
      const b = e.target.closest('[data-s]'); if (!b) return;
      FR.sound.play('click');
      const t = text(cur), u = shareUrl(), k = b.dataset.s;
      if (k === 'native') {
        try { await navigator.share({ files: [new File([blob], FILE, { type: 'image/png' })], title: "Frank's Computer", text: t + ' ' + u }); FR.bus.emit('share', 'native'); } catch (err) {}
      } else if (k === 'linkedin') withPicture('LinkedIn', 'https://www.linkedin.com/feed/?shareActive=true&text=' + encodeURIComponent(t + ' ' + u));
      else if (k === 'x') withPicture('X', 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(t) + '&url=' + encodeURIComponent(u));
      else if (k === 'facebook') withPicture('Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(u));
      else if (k === 'whatsapp') { open('https://wa.me/?text=' + encodeURIComponent(t + ' ' + u)); say('WhatsApp opened in a new tab.'); FR.bus.emit('share', 'whatsapp'); }
      else if (k === 'download') say(download() ? 'Your score card was downloaded.' : 'The score card is still being drawn. Try again in a second.');
      else if (k === 'copy') {
        try { await navigator.clipboard.writeText(t + ' ' + u); say('Copied. Paste it anywhere.'); } catch (err) { say(u); }
      }
    });
    render();
    return { update(more) { cur = Object.assign({}, cur, more); render(); }, el: box, canvas: () => canvas };
  }

  FR.share = { draw, mount, text, tier, url: shareUrl };
})();
