/* ============================================================
   JAMARIS GAME — Kiosk Mode (shared across all games)
   - Fullscreen toggle
   - Child lock (prevents accidental exits)
   - Old-device compatibility helpers
   Include this on EVERY page with: <script src="js/kiosk.js"></script>
   (use ../js/kiosk.js inside the games/ folder)
   ============================================================ */
(function () {
  'use strict';

  /* ---------- OLD DEVICE: fix viewport height (100dvh fallback) ---------- */
  // Older iOS Safari doesn't support 100dvh. Set a CSS var with the real height.
  function setRealHeight() {
    document.documentElement.style.setProperty('--real-vh', window.innerHeight + 'px');
  }
  setRealHeight();
  window.addEventListener('resize', setRealHeight);
  window.addEventListener('orientationchange', () => setTimeout(setRealHeight, 250));

  /* ---------- PREVENT ACCIDENTAL EXITS ---------- */
  // Stop pull-to-refresh, overscroll bounce, pinch zoom, double-tap zoom
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd < 300) e.preventDefault(); // block double-tap zoom
    lastTouchEnd = now;
  }, { passive: false });

  // Block context menu (long-press menu that pops up and confuses kids)
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ---------- FULLSCREEN ---------- */
  function isFullscreen() {
    return document.fullscreenElement || document.webkitFullscreenElement;
  }
  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  }
  function exitFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  }
  window.toggleFullscreen = function () {
    if (isFullscreen()) exitFullscreen();
    else enterFullscreen();
  };

  /* ---------- CHILD LOCK ---------- */
  // When locked, an invisible shield covers the screen and swallows all taps
  // EXCEPT a hidden "unlock zone". To unlock, the grown-up presses & HOLDS
  // the unlock button for 2 seconds.
  let isLocked = false;

  function buildLockUI() {
    // The lock/unlock floating button
    const lockBtn = document.createElement('button');
    lockBtn.id = 'kioskLockBtn';
    lockBtn.className = 'kiosk-lock-btn';
    lockBtn.setAttribute('aria-label', 'Lock screen');
    lockBtn.innerHTML = '🔓';
    document.body.appendChild(lockBtn);

    // The shield that blocks taps when locked
    const shield = document.createElement('div');
    shield.id = 'kioskShield';
    shield.className = 'kiosk-shield';
    document.body.appendChild(shield);

    // Hold-to-unlock indicator (a ring that fills up)
    const holdHint = document.createElement('div');
    holdHint.id = 'kioskHoldHint';
    holdHint.className = 'kiosk-hold-hint';
    holdHint.innerHTML = '<div class="kiosk-hold-ring"></div><div class="kiosk-hold-text">Hold to unlock 🔒</div>';
    document.body.appendChild(holdHint);

    let holdTimer = null;
    let holdStart = 0;

    function lock() {
      isLocked = true;
      shield.classList.add('active');
      lockBtn.innerHTML = '🔒';
      lockBtn.classList.add('locked');
    }
    function unlock() {
      isLocked = false;
      shield.classList.remove('active');
      lockBtn.innerHTML = '🔓';
      lockBtn.classList.remove('locked');
      holdHint.classList.remove('active');
    }

    // Tapping the lock button when UNLOCKED → lock immediately
    lockBtn.addEventListener('click', (e) => {
      if (!isLocked) {
        lock();
      }
    });

    // When LOCKED: hold the lock button for 2 sec to unlock
    function startHold(e) {
      if (!isLocked) return;
      e.preventDefault();
      e.stopPropagation();
      holdStart = Date.now();
      holdHint.classList.add('active');
      const ring = holdHint.querySelector('.kiosk-hold-ring');
      ring.style.animation = 'none';
      void ring.offsetWidth;
      ring.style.animation = 'kioskHoldFill 2s linear forwards';
      holdTimer = setTimeout(() => {
        unlock();
      }, 2000);
    }
    function cancelHold(e) {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      holdHint.classList.remove('active');
    }

    lockBtn.addEventListener('touchstart', startHold, { passive: false });
    lockBtn.addEventListener('mousedown', startHold);
    lockBtn.addEventListener('touchend', cancelHold);
    lockBtn.addEventListener('mouseup', cancelHold);
    lockBtn.addEventListener('mouseleave', cancelHold);
    lockBtn.addEventListener('touchcancel', cancelHold);

    // The shield itself swallows all taps (so the game can't be touched while locked)
    // But still lets the lock button work (it's above the shield in z-index)
    shield.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); });
    shield.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); }, { passive: false });
  }

  /* ---------- FULLSCREEN BUTTON ---------- */
  function buildFullscreenButton() {
    const fsBtn = document.createElement('button');
    fsBtn.id = 'kioskFullscreenBtn';
    fsBtn.className = 'kiosk-fs-btn';
    fsBtn.setAttribute('aria-label', 'Fullscreen');
    fsBtn.innerHTML = '⛶';
    fsBtn.addEventListener('click', () => {
      window.toggleFullscreen();
    });
    document.body.appendChild(fsBtn);

    // Update icon when fullscreen state changes
    function updateIcon() {
      fsBtn.innerHTML = isFullscreen() ? '🗗' : '⛶';
    }
    document.addEventListener('fullscreenchange', updateIcon);
    document.addEventListener('webkitfullscreenchange', updateIcon);
  }

  /* ---------- INIT after DOM ready ---------- */
  function init() {
    buildFullscreenButton();
    buildLockUI();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
