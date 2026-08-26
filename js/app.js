(function(){

  // ---------- System registry ----------
  // needsBios: systems that typically require a legitimate BIOS file to run.
  const SYSTEMS = {
    nes:         { label: 'NES / Famicom' },
    snes:        { label: 'Super Nintendo' },
    segaMD:      { label: 'Mega Drive / Genesis' },
    gb:          { label: 'Game Boy / Color' },
    gba:         { label: 'Game Boy Advance' },
    n64:         { label: 'Nintendo 64' },
    psx:         { label: 'PlayStation', needsBios: true },
    atari2600:   { label: 'Atari 2600' },
    // "More consoles" (Start menu flyout)
    segaMS:      { label: 'Sega Master System' },
    segaGG:      { label: 'Sega Game Gear' },
    segaCD:      { label: 'Sega CD', needsBios: true },
    sega32x:     { label: 'Sega 32X' },
    segaSaturn:  { label: 'Sega Saturn', needsBios: true },
    arcade:      { label: 'Arcade (MAME 2003)' },
    coleco:      { label: 'ColecoVision' },
    pce:         { label: 'PC Engine / TurboGrafx-16' },
    pcfx:        { label: 'PC-FX', needsBios: true },
    ngp:         { label: 'Neo Geo Pocket' },
    ws:          { label: 'WonderSwan' },
    lynx:        { label: 'Atari Lynx' },
    jaguar:      { label: 'Atari Jaguar' },
    a5200:       { label: 'Atari 5200' },
    atari7800:   { label: 'Atari 7800' },
    c64:         { label: 'Commodore 64' },
    amiga:       { label: 'Commodore Amiga' },
    nds:         { label: 'Nintendo DS' },
    vb:          { label: 'Virtual Boy' },
    '3do':       { label: '3DO', needsBios: true }
  };

  // Icons shown on the desktop. Point these at your own PNG logos whenever you
  // want to swap them — just replace the files in assets/icons/ (same names).
  const ICON_PATHS = {
    nes: 'assets/icons/nes.png',
    snes: 'assets/icons/snes.png',
    segaMD: 'assets/icons/segaMD.png',
    gb: 'assets/icons/gb.png'
  };
  const DESKTOP_SYSTEMS = ['nes','snes','segaMD','gb'];
  const MORE_SYSTEMS = Object.keys(SYSTEMS).filter(id => !DESKTOP_SYSTEMS.includes(id));

  // ---------- Catalog ----------
  // Loaded from data/games.json — { systemId: [{ id, name, cover, url }, ...] }.
  // Same format as data/games.json in your other vaults. Empty arrays for now;
  // add entries there to preload games per system.
  let CATALOG = {};
  fetch('data/games.json')
    .then(r => r.json())
    .then(data => { CATALOG = data || {}; })
    .catch(() => { CATALOG = {}; });

  // ---------- Desktop icons ----------
  const iconGrid = document.getElementById('icon-grid');
  DESKTOP_SYSTEMS.forEach(id => {
    iconGrid.appendChild(buildDesktopIcon(id, SYSTEMS[id].label, ICON_PATHS[id]));
  });

  function buildDesktopIcon(id, label, iconPath){
    const btn = document.createElement('button');
    btn.className = 'desktop-icon';
    btn.innerHTML = '<div class="icon-box"><img src="' + iconPath + '" alt="' + label + '"></div>' +
      '<div class="label">' + label.replace(' / ', '<br>') + '</div>';
    btn.addEventListener('click', function(){ openConsoleWindow(id); });
    return btn;
  }

  // ---------- Taskbar clock ----------
  const taskbarClock = document.getElementById('taskbar-clock');
  function updateClock(){
    const now = new Date();
    const timePart = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const fullDate = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    taskbarClock.textContent = timePart;
    taskbarClock.title = fullDate;
  }
  updateClock();
  setInterval(updateClock, 1000);

  // ---------- Start menu ----------
  const startBtn = document.getElementById('start-btn');
  const startMenu = document.getElementById('start-menu');
  const startSubmenu = document.getElementById('start-submenu');

  MORE_SYSTEMS.forEach(id => {
    const row = document.createElement('div');
    row.className = 'submenu-row';
    row.textContent = SYSTEMS[id].label;
    row.addEventListener('click', function(){
      closeStartMenu();
      openConsoleWindow(id);
    });
    startSubmenu.appendChild(row);
  });

  function openStartMenu(){ startMenu.classList.add('show'); startBtn.classList.add('open'); }
  function closeStartMenu(){ startMenu.classList.remove('show'); startBtn.classList.remove('open'); }

  startBtn.addEventListener('click', function(e){
    e.stopPropagation();
    if (startMenu.classList.contains('show')) closeStartMenu();
    else openStartMenu();
  });
  startMenu.addEventListener('click', function(e){ e.stopPropagation(); });
  document.addEventListener('click', closeStartMenu);

  document.getElementById('refresh-item').addEventListener('click', function(){
    location.reload();
  });

  // ---------- Windows ----------
  const overlay = document.getElementById('overlay');
  const windowEl = document.getElementById('window');
  const windowTitle = document.getElementById('window-title');
  const windowBody = document.getElementById('window-body');
  const closeDot = document.getElementById('close-dot');
  const minBtn = document.getElementById('min-btn');
  const maxBtn = document.getElementById('max-btn');

  closeDot.addEventListener('click', function(){
    // The page reloads on close: EmulatorJS leaves global state (WASM/modules)
    // that isn't safe to hot-reinitialize for another console or ROM.
    location.reload();
  });
  minBtn.addEventListener('click', function(){
    // No taskbar restore slot yet — minimizing just returns to a fresh desktop.
    location.reload();
  });
  maxBtn.addEventListener('click', function(){
    windowEl.classList.toggle('maximized');
  });

  function openWindow(title){
    windowTitle.textContent = title;
    overlay.classList.add('show');
  }

  function openConsoleWindow(systemId){
    const sys = SYSTEMS[systemId];
    windowBody.innerHTML = `
      <div class="sidebar">
        <div class="sidebar-header"><span>Catalog</span><span id="catalog-count"></span></div>
        <div class="catalog-list" id="catalog-list"></div>
      </div>
      <div class="main-area">
        <div class="screen-wrap">
          <div class="screen-box">
            <div class="screen-placeholder" id="screen-placeholder">
              Pick a game from the catalog or load your own ROM below to start playing.
            </div>
            <div id="game" style="display:none;"></div>
          </div>
        </div>
        <div class="controls-row">
          <button id="fullscreen-btn" disabled>⛶ Fullscreen</button>
        </div>
        <div class="bottom-bar">
          <div class="bottom-row">
            <label class="file-pill" id="rom-pill">
              <span>📁</span>
              <span class="fname" id="rom-fname">Choose your ROM (.zip, .nes, .sfc, .bin, .iso...)</span>
              <input type="file" id="rom-input">
            </label>
            <button class="accent" id="play-btn" disabled>▶ Play</button>
          </div>
          <div class="bios-row" id="bios-row">
            <label>BIOS (optional)</label>
            <label class="file-pill" style="flex:1;">
              <span>🔑</span>
              <span class="fname" id="bios-fname">Required by some games on this system</span>
              <input type="file" id="bios-input">
            </label>
          </div>
          <p class="status-msg" id="status-msg"></p>
        </div>
      </div>
    `;

    // ---- Catalog ----
    const catalogList = document.getElementById('catalog-list');
    const games = CATALOG[systemId] || [];
    document.getElementById('catalog-count').textContent = games.length ? games.length + ' games' : '';
    if (!games.length) {
      catalogList.innerHTML = '<div class="catalog-empty">No preloaded games for ' + sys.label +
        ' yet. Upload your own ROM in the bar below, or add entries to <code>data/games.json</code> (same <code>{id, name, cover, url}</code> format used in your other vaults) so they show up here.</div>';
    } else {
      games.forEach(g => {
        const item = document.createElement('div');
        item.className = 'catalog-item';
        item.innerHTML = '<div class="cover">' + (g.cover ? '<img class="halftone" src="' + g.cover + '" alt="">' : '') + '</div>' +
          '<div class="name">' + g.name + '</div>';
        item.addEventListener('click', function(){
          launchEmulator(systemId, g.url, g.name, g.biosUrl || null);
        });
        catalogList.appendChild(item);
      });
    }

    // ---- Optional BIOS ----
    const biosRow = document.getElementById('bios-row');
    if (sys.needsBios) biosRow.classList.add('show');

    // ---- Custom ROM upload ----
    let romFile = null;
    let biosFile = null;
    const romInput = document.getElementById('rom-input');
    const romFname = document.getElementById('rom-fname');
    const biosInput = document.getElementById('bios-input');
    const biosFname = document.getElementById('bios-fname');
    const playBtn = document.getElementById('play-btn');

    romInput.addEventListener('change', function(){
      romFile = romInput.files[0] || null;
      romFname.textContent = romFile ? romFile.name : 'Choose your ROM (.zip, .nes, .sfc, .bin, .iso...)';
      playBtn.disabled = !romFile;
    });
    biosInput.addEventListener('change', function(){
      biosFile = biosInput.files[0] || null;
      biosFname.textContent = biosFile ? biosFile.name : 'Required by some games on this system';
    });
    playBtn.addEventListener('click', function(){
      if (!romFile) return;
      const gameUrl = URL.createObjectURL(romFile);
      const biosUrl = biosFile ? URL.createObjectURL(biosFile) : null;
      launchEmulator(systemId, gameUrl, romFile.name.replace(/\.[^/.]+$/, ''), biosUrl);
    });

    openWindow(sys.label);
  }

  // ---------- Launch EmulatorJS ----------
  const CDN_CHANNELS = ['stable', 'latest'];

  function tryLoadChannel(channelIndex, onAllFailed){
    if (channelIndex >= CDN_CHANNELS.length) { onAllFailed(); return; }
    const base = 'https://cdn.emulatorjs.org/' + CDN_CHANNELS[channelIndex] + '/data/';
    window.EJS_pathtodata = base;
    const script = document.createElement('script');
    script.src = base + 'loader.js';
    script.onerror = function(){
      script.remove();
      tryLoadChannel(channelIndex + 1, onAllFailed);
    };
    document.body.appendChild(script);
  }

  function launchEmulator(systemId, gameUrl, gameName, biosUrl){
    const statusMsg = document.getElementById('status-msg');
    const placeholder = document.getElementById('screen-placeholder');
    const gameDiv = document.getElementById('game');
    const fullscreenBtn = document.getElementById('fullscreen-btn');

    statusMsg.textContent = 'Loading emulator...';
    statusMsg.className = 'status-msg';

    // Disable picking another game in this same window: switching ROM or core
    // on the fly isn't reliable once EmulatorJS has mounted its WASM module.
    // To play something else, close the window (reloads the page).
    document.querySelectorAll('.catalog-item').forEach(el => el.classList.add('disabled'));
    document.getElementById('play-btn').disabled = true;
    document.getElementById('rom-input').disabled = true;

    placeholder.style.display = 'none';
    gameDiv.style.display = 'block';

    window.EJS_player = '#game';
    window.EJS_core = systemId;
    window.EJS_gameUrl = gameUrl;
    window.EJS_gameName = gameName;
    window.EJS_startOnLoaded = true;
    window.EJS_backgroundColor = '#000000';
    if (biosUrl) window.EJS_biosUrl = biosUrl;

    fullscreenBtn.disabled = false;
    fullscreenBtn.onclick = function(){
      if (gameDiv.requestFullscreen) gameDiv.requestFullscreen();
    };

    tryLoadChannel(0, function(){
      statusMsg.textContent = 'Could not load EmulatorJS from cdn.emulatorjs.org (both the "stable" and "latest" channels failed). ' +
        'This is almost always an ad-blocker, antivirus, or network firewall blocking that domain — not a problem with the ROM. ' +
        'Try an incognito window, or check the Network tab in dev tools (F12).';
      statusMsg.className = 'status-msg err';
      placeholder.style.display = 'flex';
      gameDiv.style.display = 'none';
    });

    statusMsg.textContent = '';
  }

})();
