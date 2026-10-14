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

  /* the card: info = { score, name, time, rank, players, hints, bonus } → a canvas */
  async function draw(info) {
    const D = FR.data, I = FR.icons || {};
    const [wall, logo, mark, dr, folder, xls, recycle] = await Promise.all([load(D.images.wallpaper), load(svg(D.logo.full)), load(svg(D.logo.markWhite)),
      load(D.share.drLogo.src), load(svg(I.folder)), load(svg(I.excel)), load(svg(I.recycleFull || I.recycle))]);
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const TB = 50;   // taskbar height

    // the desktop: the game's wallpaper, cover-fitted, the hill kept in view
    const sc = Math.max(W / wall.width, (H - TB) / wall.height);
    g.drawImage(wall, (W - wall.width * sc) / 2, H - TB - wall.height * sc, wall.width * sc, wall.height * sc);

    // two desktop icons, top right
    g.font = `12px ${UI}`; g.textAlign = 'center';
    [[folder, 'FOR THE BOARD', 40], [recycle, 'Recycle Bin', 132]].forEach(([im, label, y]) => {
      g.drawImage(im, 1106, y, 48, 48); shadowText(g, label, 1130, y + 66);
    });
    g.textAlign = 'left';

    // the window
    const wx = 48, wy = 64, ww = 760, wh = 448, tbh = 34;
    g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
    rrect(g, wx, wy, ww, wh, [9, 9, 2, 2]); g.fillStyle = '#0831d9'; g.fill(); g.restore();
    rrect(g, wx, wy, ww, tbh + 4, [9, 9, 0, 0]);
    g.fillStyle = grad(g, wy, wy + tbh + 4, [[0, '#0997ff'], [0.08, '#0053ee'], [0.4, '#0050ee'], [0.88, '#0066ff'], [0.93, '#0066ff'], [0.95, '#005bff'], [0.96, '#003dd7'], [1, '#003dd7']]); g.fill();
    g.fillStyle = '#ece9d8'; g.fillRect(wx + 4, wy + tbh + 4, ww - 8, wh - tbh - 8);
    g.drawImage(xls, wx + 10, wy + 8, 22, 22);
    g.font = `bold 17px ${TITLE}`; shadowText(g, 'Packa Corporation — Board Pack.xls', wx + 40, wy + 25, '#fff', 'rgba(10,24,131,.9)');
    // min / max / close
    const bx = wx + ww - 96;
    [['min', '#2463e0'], ['max', '#2463e0'], ['close', '#e04a2c']].forEach(([k, col], i) => {
      const x = bx + i * 30, y = wy + 6;
      rrect(g, x, y, 25, 25, 4); g.fillStyle = grad(g, y, y + 25, k === 'close' ? [[0, '#f08c6e'], [0.5, '#e04a2c'], [1, '#c6371b']] : [[0, '#6fa2ff'], [0.5, col], [1, '#1c4fc8']]);
      g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath();
      if (k === 'min') { g.moveTo(x + 7, y + 18); g.lineTo(x + 15, y + 18); }
      else if (k === 'max') { g.rect(x + 7, y + 7, 11, 11); }
      else { g.moveTo(x + 7, y + 7); g.lineTo(x + 18, y + 18); g.moveTo(x + 18, y + 7); g.lineTo(x + 7, y + 18); }
      g.stroke();
    });

    // inside: the Packa logo and the news
    const ix = wx + 34, iy = wy + tbh + 30;
    const lh = 150, lw = lh * 1130 / 1220;
    g.drawImage(logo, ix, iy, lw, lh);
    const tx = ix + lw + 34, tw = wx + ww - 34 - tx;
    g.fillStyle = '#2a8a2a'; g.font = `bold 15px ${UI}`; g.fillText('✔  BOARD PACK DELIVERED · 8:59 AM', tx, iy + 22);
    const who = info.name ? `${info.name} just saved` : 'I just saved';
    g.fillStyle = NAVY; fit(g, who, 'bold', 46, TITLE, tw, 26); g.fillText(who, tx, iy + 76);
    g.fillStyle = PACKA; fit(g, 'Packa Corp.', 'bold', 64, TITLE, tw, 30); g.fillText('Packa Corp.', tx, iy + 142);

    // the score, in a sunken XP field
    const fx = ix, fy = iy + lh + 26, fw = ww - 68, fh = 132;
    g.fillStyle = '#fff'; g.fillRect(fx, fy, fw, fh);
    g.strokeStyle = '#7f9db9'; g.lineWidth = 1.5; g.strokeRect(fx + .5, fy + .5, fw - 1, fh - 1);
    g.fillStyle = NAVY; g.font = `bold 66px ${TITLE}`; const sTxt = fmt(info.score); g.fillText(sTxt, fx + 22, fy + 74);
    const sw = g.measureText(sTxt).width;
    g.fillStyle = '#4b5a78'; g.font = `bold 20px ${UI}`; g.fillText('POINTS', fx + 32 + sw, fy + 72);
    // the score's title, as an XP-style green badge sitting on the field's top edge (clear of the score, any length)
    g.font = `bold 15px ${UI}`; const tt = tier(info.score), ttw = g.measureText(tt).width + 28, tyy = fy - 16;
    rrect(g, fx + fw - ttw - 18, tyy, ttw, 32, 16); g.fillStyle = grad(g, tyy, tyy + 32, [[0, '#5ec85e'], [1, '#2f9a2f']]); g.fill();
    g.strokeStyle = '#1f7a1f'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#fff'; g.fillText(tt, fx + fw - ttw - 4, tyy + 21);
    // Board Pack: 10 of 10 done, as the XP progress bar (all green blocks)
    const px = fx + 22, py = fy + 92, pw = fw - 44, ph = 22;
    rrect(g, px, py, pw, ph, 4); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#686868'; g.lineWidth = 1; g.stroke();
    for (let x = px + 3; x + 8 <= px + pw - 3; x += 10) {
      g.fillStyle = grad(g, py + 3, py + ph - 3, [[0, '#acedad'], [0.5, '#2fd02f'], [1, '#2fb62f']]); g.fillRect(x, py + 3, 8, ph - 6);
    }

    // the details, one line under the field
    const bits = [`${info.time} at Frank's desk`];
    if (info.rank) bits.push(`#${fmt(info.rank)}${info.players ? ' of ' + fmt(info.players) : ''} on the leaderboard`);
    bits.push(`${info.hints || 0} hint${info.hints === 1 ? '' : 's'}`);
    g.fillStyle = '#333'; fit(g, bits.join('   ·   '), '', 18, UI, fw, 13); g.fillText(bits.join('   ·   '), fx + 2, fy + fh + 34);

    // the taskbar: Start, the game's window, the tray with Datarails and the clock
    const ty = H - TB;
    g.fillStyle = grad(g, ty, H, [[0, '#1f2f86'], [0.03, '#3165c4'], [0.06, '#3682e5'], [0.1, '#4490e6'], [0.12, '#3883e5'], [0.15, '#2b71e0'], [0.2, '#235bd6'], [0.4, '#2157d6'], [0.55, '#245ddb'], [0.86, '#2562df'], [0.92, '#2158d4'], [0.96, '#1d4ec0'], [1, '#1941a5']]);
    g.fillRect(0, ty, W, TB);
    rrect(g, 0, ty, 150, TB, [0, 14, 14, 0]);
    g.fillStyle = grad(g, ty, H, [[0, '#4fb14f'], [0.15, '#3c9e3c'], [0.5, '#37963a'], [0.85, '#2c8a2f'], [1, '#226e25']]); g.fill();
    g.drawImage(mark, 16, ty + 9, 30, 32);
    g.font = `italic bold 26px ${TITLE}`; shadowText(g, 'start', 54, ty + 34);
    rrect(g, 166, ty + 6, 280, TB - 12, 4); g.fillStyle = grad(g, ty + 6, H - 6, [[0, '#1e52b7'], [1, '#174ab0']]); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
    g.drawImage(xls, 176, ty + 14, 22, 22);
    g.font = `16px ${UI}`; shadowText(g, 'Board Pack.xls — SAVED', 206, ty + 31);
    const trayX = 820;
    g.fillStyle = grad(g, ty, H, [[0, '#0c59b9'], [0.05, '#139ee9'], [0.1, '#18b5f2'], [0.14, '#139beb'], [0.2, '#1290e8'], [0.63, '#0d8dea'], [0.9, '#0f9eed'], [1, '#095bc9']]);
    g.fillRect(trayX, ty, W - trayX, TB); g.fillStyle = '#0a3f9b'; g.fillRect(trayX, ty, 1.5, TB);
    const dh = 26, dw = dh * D.share.drLogo.w / D.share.drLogo.h;
    g.drawImage(dr, trayX + 16, ty + 10, dw, dh);
    g.font = `13px ${UI}`; shadowText(g, 'Official search partner', trayX + 26 + dw, ty + 30);
    g.font = `16px ${UI}`; g.textAlign = 'right'; shadowText(g, '8:59 AM', W - 14, ty + 31); g.textAlign = 'left';

    // the balloon: "Join the search and save Packa at WhereisFrank.help", pointing at the tray
    const bw = 344, bh = 186, bxx = W - bw - 22, by = ty - bh - 30;
    g.save(); g.shadowColor = 'rgba(0,0,0,.35)'; g.shadowBlur = 14; g.shadowOffsetY = 4;
    rrect(g, bxx, by, bw, bh, 12); g.fillStyle = '#ffffe1'; g.fill(); g.restore();
    g.beginPath(); g.moveTo(bxx + bw - 120, by + bh - 1); g.lineTo(bxx + bw - 70, by + bh + 28); g.lineTo(bxx + bw - 92, by + bh - 1); g.closePath(); g.fillStyle = '#ffffe1'; g.fill();
    rrect(g, bxx, by, bw, bh, 12); g.strokeStyle = '#000'; g.lineWidth = 1.2; g.stroke();
    g.beginPath(); g.moveTo(bxx + bw - 120, by + bh); g.lineTo(bxx + bw - 70, by + bh + 28); g.lineTo(bxx + bw - 92, by + bh); g.stroke();
    g.fillStyle = '#ffffe1'; g.fillRect(bxx + bw - 119, by + bh - 2, 26, 3);
    // (i) icon + bold title, then the call
    g.beginPath(); g.arc(bxx + 30, by + 30, 13, 0, Math.PI * 2); g.fillStyle = grad(g, by + 17, by + 43, [[0, '#5aa0ff'], [1, '#1c5bd6']]); g.fill();
    g.fillStyle = '#fff'; g.font = `bold 17px Georgia, serif`; g.textAlign = 'center'; g.fillText('i', bxx + 30, by + 36); g.textAlign = 'left';
    g.fillStyle = '#000'; g.font = `bold 16px ${UI}`; g.fillText('Frank is still missing.', bxx + 52, by + 36);
    g.font = `bold 25px ${TITLE}`; g.fillStyle = PINK; g.fillText('Join the search', bxx + 22, by + 82);
    const js = g.measureText('Join the search ').width; g.fillStyle = '#1b1b1b'; g.fillText('and', bxx + 22 + js, by + 82);
    g.fillText('save Packa at', bxx + 22, by + 114);
    g.fillStyle = '#0b3fd6'; fit(g, SITE, 'bold', 32, TITLE, bw - 44, 20); g.fillText(SITE, bxx + 22, by + 156);
    const uw = g.measureText(SITE).width; g.fillRect(bxx + 22, by + 162, uw, 2.5);
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

  FR.share = { draw, mount, text, tier, url: shareUrl };
})();
