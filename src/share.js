/* FRANK'S COMPUTER — share your score (the end screen, src/boot.js ending()).
   A 1200x630 score card drawn in the browser as a Windows XP screen, like the game: the game's own hill-and-sky
   wallpaper, a Luna-blue window "Packa Corporation — Board Pack.xls" where the player just saved Packa Corp (the real
   Packa logo, the score, a full green Board Pack progress bar), a yellow notification balloon "Join the search and save
   Packa at WhereisFrank.help" (the campaign's words) and the taskbar with Start, the clock at 8:59 AM and the Datarails
   logo as the "Official search partner" (cut out of public/og-image.png by tools/make_share_card.py →
   src/share_assets.js). Plus the ways to share it: the phone's own share sheet (with the picture), LinkedIn, X,
   Facebook, WhatsApp, Download and Copy link. The social sites can't take a picture through a link, so their buttons
   also download the card (and copy it, where the browser allows) and say so: one click to attach it. Prefix: .fr-share- */
(() => {
  const $ = FR.$, esc = FR.esc;
  const W = 1200, H = 630;
  const cfg = window.FR_CONFIG || {};
  // where the game lives (config.json "shareUrl"); the card prints it as WhereisFrank.help
  const shareUrl = () => cfg.shareUrl || 'https://whereisfrank.help/';
  const SITE = 'WhereisFrank.help';
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
  const svg = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(/xmlns=/.test(s) ? s : s.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"'));
  const TITLE = '"Trebuchet MS", Tahoma, "DejaVu Sans", sans-serif';     // XP's title bars
  const UI = 'Tahoma, Verdana, "Segoe UI", "DejaVu Sans", sans-serif';    // XP's everything else
  const PINK = '#f93576', PACKA = '#a33a1e', NAVY = '#0a246a';

  function grad(g, y0, y1, stops) { const l = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => l.addColorStop(o, c)); return l; }
  function rrect(g, x, y, w, h, r) {
    const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
    g.beginPath(); g.moveTo(x + tl, y); g.lineTo(x + w - tr, y); g.quadraticCurveTo(x + w, y, x + w, y + tr); g.lineTo(x + w, y + h - br);
    g.quadraticCurveTo(x + w, y + h, x + w - br, y + h); g.lineTo(x + bl, y + h); g.quadraticCurveTo(x, y + h, x, y + h - bl); g.lineTo(x, y + tl);
    g.quadraticCurveTo(x, y, x + tl, y); g.closePath();
  }
  function fit(g, text, weight, size, family, maxW, min = 14) {   // the biggest font (down to min) that fits maxW
    let s = size; g.font = `${weight} ${s}px ${family}`;
    while (g.measureText(text).width > maxW && s > min) { s--; g.font = `${weight} ${s}px ${family}`; }
    return s;
  }
  function shadowText(g, t, x, y, col = '#fff', sh = 'rgba(0,0,0,.65)') {
    g.fillStyle = sh; g.fillText(t, x + 1, y + 1); g.fillStyle = col; g.fillText(t, x, y);
  }

  /* ---------- the XP scene, shared by the score card and the game's link preview (public/og-image.png) ---------- */
  const TB = 46, DH = H - TB;
  async function scene() {
    const D = FR.data;
    const [wall, mark, dr] = await Promise.all([load(D.images.wallpaper), load(svg(D.logo.markWhite)), load(D.share.drLogo.src)]);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    // the desktop: the game's wallpaper, the hill kept in view; a soft shade behind the right-hand text
    const sc = Math.max(W / wall.width, DH / wall.height);
    g.drawImage(wall, (W - wall.width * sc) / 2, DH - wall.height * sc, wall.width * sc, wall.height * sc);
    const shade = g.createRadialGradient(905, 250, 40, 905, 250, 470);
    shade.addColorStop(0, 'rgba(0,25,90,.42)'); shade.addColorStop(1, 'rgba(0,25,90,0)');
    g.fillStyle = shade; g.fillRect(560, 0, W - 560, DH);
    taskbar(g, mark, dr);
    return { c, g, mark };
  }
  // an XP window (Luna title bar, close button, beige body); returns the body's inner box
  function xpWindow(g, mark, wx, wy, ww, wh, title) {
    const tbh = 32;
    g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 28; g.shadowOffsetY = 10;
    rrect(g, wx, wy, ww, wh, [9, 9, 3, 3]); g.fillStyle = '#0831d9'; g.fill(); g.restore();
    rrect(g, wx, wy, ww, tbh + 4, [9, 9, 0, 0]);
    g.fillStyle = grad(g, wy, wy + tbh + 4, [[0, '#0997ff'], [0.08, '#0053ee'], [0.4, '#0050ee'], [0.88, '#0066ff'], [0.93, '#0066ff'], [0.95, '#005bff'], [0.96, '#003dd7'], [1, '#003dd7']]); g.fill();
    g.fillStyle = '#ece9d8'; g.fillRect(wx + 4, wy + tbh + 4, ww - 8, wh - tbh - 8);
    g.drawImage(mark, wx + 11, wy + 7, 20, 22);
    g.font = `bold 16px ${TITLE}`; shadowText(g, title, wx + 38, wy + 24, '#fff', 'rgba(10,24,131,.9)');
    rrect(g, wx + ww - 33, wy + 6, 25, 25, 4);
    g.fillStyle = grad(g, wy + 6, wy + 31, [[0, '#f08c6e'], [0.5, '#e04a2c'], [1, '#c6371b']]); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
    g.lineWidth = 2.5; g.beginPath(); g.moveTo(wx + ww - 26, wy + 13); g.lineTo(wx + ww - 15, wy + 24); g.moveTo(wx + ww - 15, wy + 13); g.lineTo(wx + ww - 26, wy + 24); g.stroke();
    return { x: wx + 32, y: wy + tbh + 30, w: ww - 64 };
  }
  // an XP progress bar: done of total, in green blocks
  function progress(g, x, y, w, h, frac) {
    rrect(g, x, y, w, h, 4); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#686868'; g.lineWidth = 1; g.stroke();
    for (let bx = x + 3; bx + 7 <= x + 3 + (w - 6) * frac; bx += 9) { g.fillStyle = grad(g, y + 3, y + h - 3, [[0, '#acedad'], [0.5, '#2fd02f'], [1, '#2fb62f']]); g.fillRect(bx, y + 3, 7, h - 6); }
  }
  // RIGHT: what this is, and what to do (one button)
  function pitch(g, button) {
    const rx = 650, rw = W - rx - 48;
    g.font = `bold 21px ${UI}`; const kick = 'A FREE GAME FOR FINANCE PEOPLE', kw = g.measureText(kick).width + 30;
    g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
    rrect(g, rx, 64, kw, 40, 8); g.fillStyle = grad(g, 64, 104, [[0, '#fff3a3'], [1, '#ffd84a']]); g.fill(); g.restore();
    rrect(g, rx, 64, kw, 40, 8); g.strokeStyle = '#b88a00'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#1b1b1b'; g.fillText(kick, rx + 15, 91);
    g.save(); g.shadowColor = 'rgba(0,20,70,.7)'; g.shadowBlur = 10; g.shadowOffsetY = 2; g.fillStyle = '#fff';
    fit(g, 'Frank is missing.', 'bold', 54, TITLE, rw, 30); g.fillText('Frank is missing.', rx, 170);
    fit(g, 'The Board meets at 9.', 'bold', 40, TITLE, rw, 24); g.fillText('The Board meets at 9.', rx, 222);
    ['An escape-room game on his old Windows XP', 'computer. Crack the files, fix the numbers,', 'save the company.'].forEach((l, i) => { fit(g, l, '', 22, UI, rw, 16); g.fillText(l, rx, 270 + i * 31); });
    g.restore();
    // the button: the campaign's pink, XP-glossy
    const bx = rx, by = 384, bw = rw, bh = 84;
    g.save(); g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
    rrect(g, bx, by, bw, bh, 14); g.fillStyle = grad(g, by, by + bh, [[0, '#ff6b9b'], [0.48, PINK], [0.52, '#e8205f'], [1, '#c9124d']]); g.fill(); g.restore();
    rrect(g, bx + 3, by + 3, bw - 6, bh / 2 - 3, [11, 11, 4, 4]); g.fillStyle = 'rgba(255,255,255,.18)'; g.fill();
    rrect(g, bx, by, bw, bh, 14); g.strokeStyle = 'rgba(120,0,40,.6)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#fff'; fit(g, button, 'bold', 19, UI, bw - 52, 14); g.fillText(button, bx + 26, by + 31);
    g.save(); g.shadowColor = 'rgba(100,0,30,.6)'; g.shadowBlur = 4; g.shadowOffsetY = 1.5;
    fit(g, '▶ ' + SITE, 'bold', 36, TITLE, bw - 52, 22); g.fillText('▶ ' + SITE, bx + 24, by + 69); g.restore();
  }
  // the taskbar: Start, and Datarails as the official search partner by the clock
  function taskbar(g, mark, dr) {
    const ty = DH, L = FR.data.share.drLogo;
    g.fillStyle = grad(g, ty, H, [[0, '#1f2f86'], [0.03, '#3165c4'], [0.06, '#3682e5'], [0.1, '#4490e6'], [0.12, '#3883e5'], [0.15, '#2b71e0'], [0.2, '#235bd6'], [0.4, '#2157d6'], [0.55, '#245ddb'], [0.86, '#2562df'], [0.92, '#2158d4'], [0.96, '#1d4ec0'], [1, '#1941a5']]);
    g.fillRect(0, ty, W, TB);
    rrect(g, 0, ty, 140, TB, [0, 14, 14, 0]);
    g.fillStyle = grad(g, ty, H, [[0, '#4fb14f'], [0.15, '#3c9e3c'], [0.5, '#37963a'], [0.85, '#2c8a2f'], [1, '#226e25']]); g.fill();
    g.drawImage(mark, 15, ty + 9, 27, 29);
    g.font = `italic bold 24px ${TITLE}`; shadowText(g, 'start', 50, ty + 31);
    const trayX = 730;
    g.fillStyle = grad(g, ty, H, [[0, '#0c59b9'], [0.05, '#139ee9'], [0.1, '#18b5f2'], [0.14, '#139beb'], [0.2, '#1290e8'], [0.63, '#0d8dea'], [0.9, '#0f9eed'], [1, '#095bc9']]);
    g.fillRect(trayX, ty, W - trayX, TB); g.fillStyle = '#0a3f9b'; g.fillRect(trayX, ty, 1.5, TB);
    g.font = `bold 16px ${UI}`; shadowText(g, 'Official search partner', trayX + 18, ty + 29);
    const dh = 26, dw = dh * L.w / L.h, ow = g.measureText('Official search partner').width;
    g.drawImage(dr, trayX + 32 + ow, ty + 9, dw, dh);
    g.font = `15px ${UI}`; g.textAlign = 'right'; shadowText(g, '8:59 AM', W - 14, ty + 29); g.textAlign = 'left';
  }

  /* the score card: info = { score, name, time, rank, players, hints, bonus } → a canvas.
     Three things, in this order: what happened (left: one XP window, "[name] just saved Packa Corp." and the score),
     what this is (right, on the sky: a free escape-room game for finance people), what to do (one button: play free
     at WhereisFrank.help). */
  async function draw(info) {
    const [{ c, g, mark }, logo] = await Promise.all([scene(), load(svg(FR.data.logo.full))]);
    const box = xpWindow(g, mark, 52, 82, 540, 388, "Frank's Computer");
    const ix = box.x, iy = box.y, iw = box.w;
    const lh = 96, lw = lh * 1130 / 1220;
    g.drawImage(logo, ix, iy, lw, lh);
    const tx = ix + lw + 22, tw = ix + iw - tx;
    g.fillStyle = '#2a8a2a'; g.font = `bold 16px ${UI}`; g.fillText('✔ MISSION COMPLETE', tx, iy + 14);
    const who = info.name ? `${info.name} just saved` : 'I just saved';
    g.fillStyle = NAVY; fit(g, who, 'bold', 32, TITLE, tw, 20); g.fillText(who, tx, iy + 54);
    g.fillStyle = PACKA; fit(g, 'Packa Corp.', 'bold', 44, TITLE, tw, 26); g.fillText('Packa Corp.', tx, iy + 98);
    // the score, in a sunken XP field, with its title on the field's edge
    const fx = ix, fy = iy + lh + 34, fw = iw, fh = 128;
    g.fillStyle = '#fff'; g.fillRect(fx, fy, fw, fh);
    g.strokeStyle = '#7f9db9'; g.lineWidth = 1.5; g.strokeRect(fx + .5, fy + .5, fw - 1, fh - 1);
    g.font = `bold 15px ${UI}`; const tt = tier(info.score), ttw = g.measureText(tt).width + 28;
    rrect(g, fx + 16, fy - 15, ttw, 30, 15); g.fillStyle = grad(g, fy - 15, fy + 15, [[0, '#5ec85e'], [1, '#2f9a2f']]); g.fill();
    g.strokeStyle = '#1f7a1f'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#fff'; g.fillText(tt, fx + 30, fy + 5);
    g.fillStyle = NAVY; g.font = `bold 64px ${TITLE}`; const sTxt = fmt(info.score); g.fillText(sTxt, fx + 18, fy + 82);
    const sw = g.measureText(sTxt).width;
    g.fillStyle = '#4b5a78'; g.font = `bold 20px ${UI}`; g.fillText('points', fx + 28 + sw, fy + 80);
    progress(g, fx + 18, fy + 96, fw - 36, 18, 1);
    const bits = [];
    if (info.rank) bits.push(`#${fmt(info.rank)}${info.players ? ' of ' + fmt(info.players) : ''} players`);
    bits.push(`${info.time} at Frank's desk`);
    bits.push(`${info.hints || 0} hint${info.hints === 1 ? '' : 's'}`);
    g.fillStyle = '#26324d'; fit(g, bits.join('  ·  '), 'bold', 20, UI, iw, 13); g.fillText(bits.join('  ·  '), ix, fy + fh + 36);
    pitch(g, 'CAN YOU SAVE PACKA?  PLAY FREE AT');
    return c;
  }

  /* the game's link preview (public/og-image.png, made by tools/make_og_image.py): the same scene, and on the left
     Frank's MISSING notice: his photo, last seen Friday, the Board at 9:00 AM, the Board Pack at 0 of 10 */
  async function drawPreview() {
    const [{ c, g, mark }, photo] = await Promise.all([scene(), load(FR.data.images.frankAvatar)]);
    const box = xpWindow(g, mark, 52, 82, 540, 388, "Frank's Computer — MISSING.txt");
    const ix = box.x, iy = box.y, iw = box.w;
    // the polaroid, a little crooked, with a pink MISSING tape across its corner
    g.save(); g.translate(ix + 92, iy + 120); g.rotate(-0.05);
    g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 4; g.fillStyle = '#fff'; g.fillRect(-92, -116, 184, 222); g.shadowColor = 'transparent';
    g.drawImage(photo, -80, -104, 160, 160);
    g.fillStyle = '#222'; g.font = `bold 17px ${UI}`; g.textAlign = 'center'; g.fillText('FRANK', 0, 80); g.font = `14px ${UI}`; g.fillStyle = '#555'; g.fillText('FP&A Manager', 0, 98);
    g.rotate(-0.22); rrect(g, -112, -120, 150, 38, 6); g.fillStyle = PINK; g.fill();
    g.fillStyle = '#fff'; g.font = `bold 21px ${TITLE}`; g.fillText('MISSING', -37, -94); g.textAlign = 'left';
    g.restore();
    // the facts, like a case file
    const tx = ix + 214, tw = ix + iw - tx;
    const rows = [['Last seen', 'Friday night'], ['Board meets', 'Tue 9:00 AM'], ['Bank waiting on', '$4.0M rescue'], ['Left behind', '47 tabs, 1 password']];
    rows.forEach(([k, v], i) => {
      const y = iy + 22 + i * 52;
      g.fillStyle = '#5b6a85'; g.font = `bold 13px ${UI}`; g.fillText(k.toUpperCase(), tx, y);
      g.fillStyle = NAVY; fit(g, v, 'bold', 22, TITLE, tw, 14); g.fillText(v, tx, y + 26);
    });
    // the Board Pack: nothing done yet
    const py = iy + 252;
    g.fillStyle = '#26324d'; g.font = `bold 17px ${UI}`; g.fillText('Board Pack: 0 of 10 done', ix, py);
    progress(g, ix, py + 12, iw, 20, 0);
    g.fillStyle = PACKA; g.font = `bold 17px ${UI}`; g.fillText('Packa Corp needs someone at his desk.', ix, py + 62);
    pitch(g, 'JOIN THE SEARCH.  PLAY FREE AT');
    return c;
  }
  const blobOf = c => new Promise(res => c.toBlob(res, 'image/png'));

  function text(info) {
    return `I just saved Packa Corp! ${fmt(info.score)} points in ${info.time}${info.rank ? ` (#${fmt(info.rank)} on the leaderboard)` : ''}. Frank is still missing. Join the search and save Packa at ${SITE} #FrankIsMissing`;
  }
  const FILE = 'franks-computer-score.png';

  /* the "Share your score" block on the end screen. Returns { update(info) } for when the rank arrives.
     opts.opener (phones): a button row to put a gold "Share your score" button in; the block stays folded until it's
     tapped, so the end screen's main button stays on screen */
  function mount(host, info, opts = {}) {
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
    if (opts.opener) {
      box.classList.add('fr-share-folded');
      const ob = $('<button class="sec fr-share-opener" type="button">Share your score</button>');
      const pri = opts.opener.querySelector('.pri');
      pri ? pri.after(ob) : opts.opener.prepend(ob);
      ob.onclick = () => { FR.sound.play('click'); box.classList.remove('fr-share-folded'); ob.remove(); box.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
    }
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
      // (the post names WhereisFrank.help, which the sites link by themselves; Facebook only takes the link)
      const t = text(cur), u = shareUrl(), k = b.dataset.s;
      if (k === 'native') {
        try { await navigator.share({ files: [new File([blob], FILE, { type: 'image/png' })], title: "Frank's Computer", text: t }); FR.bus.emit('share', 'native'); } catch (err) {}
      } else if (k === 'linkedin') withPicture('LinkedIn', 'https://www.linkedin.com/feed/?shareActive=true&text=' + encodeURIComponent(t));
      else if (k === 'x') withPicture('X', 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(t));
      else if (k === 'facebook') withPicture('Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(u));
      else if (k === 'whatsapp') { open('https://wa.me/?text=' + encodeURIComponent(t)); say('WhatsApp opened in a new tab.'); FR.bus.emit('share', 'whatsapp'); }
      else if (k === 'download') say(download() ? 'Your score card was downloaded.' : 'The score card is still being drawn. Try again in a second.');
      else if (k === 'copy') {
        try { await navigator.clipboard.writeText(t); say('Copied. Paste it anywhere.'); } catch (err) { say(u); }
      }
    });
    render();
    return { update(more) { cur = Object.assign({}, cur, more); render(); }, el: box, canvas: () => canvas };
  }

  FR.share = { draw, drawPreview, mount, text, tier, url: shareUrl };
})();
