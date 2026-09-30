/* FRANK'S COMPUTER — shared bits for the "extras": the Blue Screen (xp_bsod.js), Norton (xp_norton.js), Frank's
   Easter eggs (xp_eggs.js) and the bonus requests (xp_bonus.js). Loaded after every other app file (build.py sorts
   src/apps/*.js by name) and before boot.js.
   FR.xp.LOCAL      file:// or localhost (test hooks and ?nopopups=1 only work there, like ?dev=1)
   FR.xp.noPopups   ?nopopups=1 on LOCAL: no timed Norton popups and no timed bonus e-mails (scripted tests)
   FR.xp.quiet()    true while something must not be interrupted: no desktop, a message box, the Blue Screen, the
                    screensaver, the ending, the Start menu, a context menu, or the player typing */
(() => {
  const LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname);
  const q = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new URLSearchParams(''); } })();
  const typing = () => {
    const a = document.activeElement;
    return !!a && a !== document.body && ((/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !a.readOnly) || a.isContentEditable) && !!a.closest('#fr-root, .fr-win');
  };
  FR.xp = {
    LOCAL,
    noPopups: LOCAL && q.has('nopopups'),
    typing,
    quiet: () => !document.querySelector('.fr-desktop') || !!document.querySelector('.bs-screen, .fr-saver, .fr-end, .fr-start, .fr-ctx, .sh-pop, .fr-shut, .fr-modal-shade')
      || !!(FR.wm && FR.wm.topDialog()) || typing(),
  };
  // tests (file:// and localhost only): move the active-play clock forward, as if the player had played that long
  if (LOCAL) FR.xp.ff = ms => { FR.state.playMs = (FR.state.playMs || 0) + ms; FR.bus.emit('play-tick', FR.state.playMs); return FR.state.playMs; };
})();
