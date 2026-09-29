/* FRANK'S COMPUTER — the Blue Screen of Death. Four wrong answers in a row (checklist answers, Excel and zip
   passwords; never the Windows log-on riddle) and Windows "shuts down to prevent damage to your Board Pack" for five
   seconds, then everything is exactly where it was. Purely cosmetic: the wrong answers already cost their points.
   The streak (FR.state.missStreak, counted by FR.puzzle.miss in core.js) survives a reload; any solved item or correct
   password ends it. While the screen is up every tap, click and key is swallowed.  Prefix: .bs- */
(() => {
  const STREAK = 4, SECS = 5;
  let up = null;

  // a correct password that doesn't solve an item by itself (the zip, a password typed too early) ends the streak too
  FR.bus.on('flag', d => { if (d && d.v && ['bankzipOpen', 'xlBoardPw', 'xlForBoardPw'].includes(d.k)) FR.puzzle.hit(); });
  FR.bus.on('miss', n => { if (n >= STREAK) { FR.state.missStreak = 0; FR.save(); setTimeout(show, 350); } });

  // one paragraph per line: the browser wraps them at ~78 columns on a monitor and at the screen width on a phone
  const TEXT = n => [
    'A problem has been detected and Windows has been shut down to prevent damage to your Board Pack.',
    'TOO_MANY_WRONG_ANSWERS',
    `<span class="bs-why">This screen appeared because you gave ${n} wrong answers in a row.</span>`,
    "If this is the first time you've seen this Stop error screen, take a breath. Frank saw it weekly. If this screen appears again, follow these steps:",
    'Check to make sure every number is footed and cross-footed. If this is a new answer, ask your Datarails FinanceOS trial for a hint. Do not plug.',
    '<span class="bs-long">If problems continue, disable or remove any recently installed guesswork. Disable BIOS memory options such as "it looked about right". If you need to use Safe Mode to remove or disable components, restart your computer, press F8 to select Advanced Startup Options, and then select Read The E-mail Again.</span>',
    'Technical information:',
    '*** STOP: 0x00000004 (TOO_MANY_WRONG_ANSWERS, 0x0000BOARD, 0xDEADLINE, 0x00000900)',
    '***  PACKA_SEDALIA.SYS - Address F7A30212 base at F7A30000, DateStamp 10162026',
    'Beginning dump of physical memory\nPhysical memory dump complete: 47 versions of the model.\n' + `<span class="bs-cd">Windows will return to normal in <b>${SECS}</b> seconds...</span>`,
  ].map(p => `<p>${p}</p>`).join('');

  function show() {
    if (up) return;
    const el = FR.$(`<div class="bs-screen" role="alertdialog" aria-label="Blue screen: too many wrong answers" tabindex="-1"><div class="bs-txt"></div></div>`);
    el.querySelector('.bs-txt').innerHTML = TEXT(STREAK);
    document.body.appendChild(el);
    const was = document.activeElement;
    if (was && was.blur) was.blur();          // nothing keeps the keyboard while Windows is "down"
    el.focus({ preventScroll: true });
    document.querySelectorAll('.fr-balloon, .nv-win-tip').forEach(b => b.remove());
    FR.sound.play('critical');
    const b = el.querySelector('.bs-cd b');
    let left = SECS;
    const tick = setInterval(() => {
      left--; b.textContent = String(Math.max(0, left));
      if (left <= 0) { clearInterval(tick); setTimeout(hide, 700); }
    }, 1000);
    up = { el, tick, was };
    FR.bus.emit('bsod', true);
  }
  function hide() {
    if (!up) return;
    const { el, was } = up; up = null;
    el.remove();
    // back exactly where it was: the field the player was in gets its focus back
    if (was && was.isConnected && was.focus) { try { was.focus({ preventScroll: true }); } catch (e) {} }
    FR.bus.emit('bsod', false);
  }

  // input is blocked while it shows (capture phase on window: runs before anything in the page)
  const EV = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'touchstart', 'touchend', 'touchmove', 'wheel', 'keydown', 'keypress', 'keyup', 'input', 'beforeinput', 'focusin'];
  EV.forEach(t => window.addEventListener(t, e => {
    if (!up) return;
    if (t === 'focusin') { if (e.target !== up.el) { try { e.target.blur && e.target.blur(); } catch (err) {} } return; }
    if (e.cancelable) e.preventDefault();
    e.stopImmediatePropagation();
  }, { capture: true, passive: false }));

  FR.bsod = { show, hide, active: () => !!up, STREAK, SECS };
})();
