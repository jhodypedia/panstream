// ==========================
// Helpers
// ==========================
const LS_KEY = "dc_history_v1";

const state = {
  currentPage: "home",
  currentDetail: null, // {bookId, title, cover}
  episodes: [],        // array of chapters
  epOrder: "asc",
  player: {
    bookId: null,
    chapterIndex: 0,
    title: "",
    chapterTitle: "",
    playUrl: "",
    lastSavedAt: 0
  }
};

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function safeText(s) { return String(s ?? ""); }

function readHistory() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); }
  catch { return []; }
}

function writeHistory(arr) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, 80)));
}

function upsertHistory(item) {
  // item: {bookId, title, cover, chapterIndex, chapterTitle, updatedAt, progress, currentTime, duration}
  const arr = readHistory();
  const idx = arr.findIndex(x => x.bookId === item.bookId);
  if (idx >= 0) arr.splice(idx, 1);
  arr.unshift(item);
  writeHistory(arr);
}

function getResume(bookId) {
  const arr = readHistory();
  return arr.find(x => x.bookId === bookId) || null;
}

function skeletonCards(n=12) {
  let html = "";
  for (let i=0;i<n;i++){
    html += `
      <div class="poster animate-pulse">
        <div style="height:168px;background:rgba(255,255,255,.08)"></div>
        <div class="meta">
          <div style="height:12px;width:85%;background:rgba(255,255,255,.08);border-radius:8px"></div>
          <div style="height:10px;width:55%;margin-top:8px;background:rgba(255,255,255,.06);border-radius:8px"></div>
        </div>
      </div>
    `;
  }
  return html;
}

function posterCard(item) {
  const bookId = item.bookId ?? item.id ?? item.book_id;
  const title = item.title ?? item.name ?? "Untitled";
  const cover = item.cover ?? item.pic ?? item.coverUrl ?? item.img ?? "";
  const sub = item.desc ?? item.description ?? item.tag ?? item.author ?? "";

  return `
    <button class="poster text-left" data-bookid="${safeText(bookId)}" data-title="${encodeURIComponent(title)}" data-cover="${encodeURIComponent(cover)}">
      <img data-src="${safeText(cover)}" alt="${safeText(title)}" class="lazyimg">
      <div class="meta">
        <div class="t line-clamp-2">${safeText(title)}</div>
        <div class="s line-clamp-1">${safeText(sub)}</div>
      </div>
    </button>
  `;
}

// Lazy image (simple)
function initLazyImages(root = document) {
  const imgs = root.querySelectorAll("img.lazyimg[data-src]");
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const img = e.target;
      img.src = img.getAttribute("data-src");
      img.removeAttribute("data-src");
      io.unobserve(img);
    });
  }, { rootMargin: "200px" });

  imgs.forEach(img => io.observe(img));
}

// ==========================
// SPA Loader
// ==========================
function loadPage(page) {
  state.currentPage = page;

  $("#app").html(`
    <div class="max-w-6xl mx-auto px-4 md:px-5 pt-6">
      <div class="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div class="animate-pulse">
          <div style="height:14px;width:160px;background:rgba(255,255,255,.08);border-radius:8px"></div>
          <div style="height:12px;width:240px;margin-top:10px;background:rgba(255,255,255,.06);border-radius:8px"></div>
        </div>
      </div>
    </div>
  `);

  $("#app").load(`/partial/${page}`, () => {
    if (page === "home") bootHome();
    if (page === "popular") bootPopular();
    if (page === "new") bootNewPage();
    if (page === "search") bootSearch();
    if (page === "history") bootHistory();
  });
}

// ==========================
// Home
// ==========================
function bootHome() {
  // Continue row
  renderContinueRow();

  $("#gridForyou").html(skeletonCards(12));
  $("#gridNew").html(skeletonCards(12));
  $("#gridCurated").html(skeletonCards(12));

  $.get("/api/foryou/1?lang=in", (r) => {
    const list = r?.data || r?.list || r || [];
    $("#gridForyou").html(list.map(posterCard).join(""));
    initLazyImages(document.getElementById("gridForyou"));
  });

  $.get("/api/new/1?lang=in&pageSize=18", (r) => {
    const list = r?.data || r?.list || r || [];
    $("#gridNew").html(list.map(posterCard).join(""));
    initLazyImages(document.getElementById("gridNew"));
  });

  // curated via classify (default romance)
  loadCurated(1357, 1);

  $("#btnMoreCurated").on("click", () => loadCurated(1357, 1));

  $(".pill").on("click", function(){
    const genre = $(this).data("genre");
    const sort = $(this).data("sort");
    loadCurated(genre, sort);
  });
}

function loadCurated(genre, sort) {
  $("#gridCurated").html(skeletonCards(12));
  $.get(`/api/classify?lang=in&pageNo=1&genre=${genre}&sort=${sort}`, (r) => {
    const list = r?.data || r?.list || r || [];
    $("#gridCurated").html(list.map(posterCard).join(""));
    initLazyImages(document.getElementById("gridCurated"));
  });
}

function renderContinueRow() {
  const arr = readHistory();
  if (!arr.length) {
    $("#continueRow").addClass("hidden");
    return;
  }
  $("#continueRow").removeClass("hidden");
  const html = arr.slice(0, 10).map(x => {
    const pct = Math.min(100, Math.max(0, Math.round((x.progress || 0) * 100)));
    return `
      <button class="contCard text-left" data-resume="1" data-bookid="${safeText(x.bookId)}">
        <img src="${safeText(x.cover || "")}" alt="${safeText(x.title)}">
        <div class="p"><div style="width:${pct}%"></div></div>
        <div class="m">
          <div class="t line-clamp-2">${safeText(x.title)}</div>
          <div class="s">Ep ${x.chapterIndex ?? 0} • ${safeText(x.chapterTitle || "Resume")}</div>
        </div>
      </button>
    `;
  }).join("");

  $("#continueList").html(html);
}

// ==========================
// Popular
// ==========================
function bootPopular() {
  $("#gridPopular").html(skeletonCards(18));
  $.get("/api/rank/1?lang=in", (r) => {
    const list = r?.data || r?.list || r || [];
    $("#gridPopular").html(list.map(posterCard).join(""));
    initLazyImages(document.getElementById("gridPopular"));
  });
}

// ==========================
// New page
// ==========================
function bootNewPage() {
  $("#gridNewPage").html(skeletonCards(24));
  $.get("/api/new/1?lang=in&pageSize=24", (r) => {
    const list = r?.data || r?.list || r || [];
    $("#gridNewPage").html(list.map(posterCard).join(""));
    initLazyImages(document.getElementById("gridNewPage"));
  });
}

// ==========================
// Search + suggest (debounced)
// ==========================
let searchT = null;
function bootSearch() {
  $("#gridSearch").html("");

  const $inp = $("#searchInput");
  const $box = $("#suggestBox");

  function hideSuggest(){ $box.addClass("hidden").html(""); }
  function showSuggest(items){
    if (!items.length) return hideSuggest();
    $box.removeClass("hidden").html(items.slice(0,8).map(s => {
      const t = (s.keyword || s.title || s || "").toString();
      return `<button class="suggestItem" data-q="${encodeURIComponent(t)}">${safeText(t)}</button>`;
    }).join(""));
  }

  $inp.on("input", function(){
    const q = $(this).val().trim();
    clearTimeout(searchT);
    if (!q) { hideSuggest(); $("#gridSearch").html(""); return; }

    searchT = setTimeout(() => {
      $.get(`/api/suggest/${encodeURIComponent(q)}?lang=in`, (r) => {
        const items = r?.data || r?.list || r || [];
        showSuggest(items);
      });
    }, 250);
  });

  $(document).on("click", ".suggestItem", function(){
    const q = decodeURIComponent($(this).data("q"));
    $inp.val(q);
    hideSuggest();
    runSearch(q);
  });

  $inp.on("keydown", function(e){
    if (e.key === "Enter") {
      e.preventDefault();
      hideSuggest();
      runSearch($inp.val().trim());
    }
  });

  $(document).on("click", function(e){
    if (!$(e.target).closest("#suggestBox, #searchInput").length) hideSuggest();
  });
}

function runSearch(q) {
  if (!q) return;
  $("#gridSearch").html(skeletonCards(18));
  $.get(`/api/search/${encodeURIComponent(q)}/1?lang=in`, (r) => {
    const list = r?.data || r?.list || r || [];
    $("#gridSearch").html(list.map(posterCard).join(""));
    initLazyImages(document.getElementById("gridSearch"));
  });
}

// ==========================
// Detail + episodes
// ==========================
function openDetail(bookId, title="", cover="") {
  state.currentDetail = { bookId, title, cover };
  $("#app").load(`/partial/detail`, () => bootDetail(bookId, title, cover));
}

function bootDetail(bookId, title, cover) {
  // fetch detail episodes list
  $.get(`/api/chapters/${encodeURIComponent(bookId)}?lang=in`, (r) => {
    const chapters = r?.data || r?.list || r?.chapters || r || [];
    state.episodes = Array.isArray(chapters) ? chapters : [];
    state.epOrder = "asc";

    // fetch detail meta (if available)
    $.get(`/api/chapters/detail/${encodeURIComponent(bookId)}?lang=in`, (d) => {
      const t = d?.title || title || "Untitled";
      const c = d?.cover || d?.pic || cover || "";
      $("#detailCover").attr("src", c);
      $("#detailTitle").text(t);
      $("#detailSub").text(d?.desc || d?.description || d?.tag || "Drama China");

      // Resume button
      const resume = getResume(bookId);
      $("#btnPlayResume").off("click").on("click", () => {
        const idx = resume?.chapterIndex ?? 0;
        playEpisode(bookId, idx, t, c);
      });

      // episode grid
      renderEpisodes(bookId, t, c);

      $("#epSortAsc").off("click").on("click", () => { state.epOrder="asc"; renderEpisodes(bookId,t,c); });
      $("#epSortDesc").off("click").on("click", () => { state.epOrder="desc"; renderEpisodes(bookId,t,c); });

      // show
      $("#detailShell").addClass("hidden");
      $("#detailReal").removeClass("hidden");
    }).fail(() => {
      // fallback minimal
      $("#detailCover").attr("src", cover || "");
      $("#detailTitle").text(title || "Untitled");
      $("#detailSub").text("Drama China");
      renderEpisodes(bookId, title, cover);
      $("#detailShell").addClass("hidden");
      $("#detailReal").removeClass("hidden");
    });
  });

  // more like this (use foryou)
  $("#gridMore").html(skeletonCards(12));
  $.get("/api/foryou/1?lang=in", (r) => {
    const list = r?.data || r?.list || r || [];
    $("#gridMore").html(list.slice(0,12).map(posterCard).join(""));
    initLazyImages(document.getElementById("gridMore"));
  });
}

function renderEpisodes(bookId, title, cover) {
  const resume = getResume(bookId);
  let eps = state.episodes.map((x, i) => ({
    i,
    name: x?.title || x?.name || x?.chapterName || `Episode ${i+1}`
  }));

  if (state.epOrder === "desc") eps = eps.reverse();

  const html = eps.map(ep => {
    const isActive = (resume && resume.chapterIndex === ep.i);
    return `
      <button class="epBtn ${isActive ? "epActive" : ""}" data-ep="${ep.i}">
        ${ep.i}
      </button>
    `;
  }).join("");

  $("#episodeGrid").html(html);

  // inject css for ep buttons (quick)
  if (!document.getElementById("epStyle")) {
    const st = document.createElement("style");
    st.id = "epStyle";
    st.innerHTML = `
      .epBtn{padding:10px 0;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);font-weight:900}
      .epBtn:hover{background:rgba(255,255,255,.10)}
      .epActive{border-color: rgba(239,68,68,.55); background: rgba(239,68,68,.14)}
    `;
    document.head.appendChild(st);
  }

  // click handlers
  $(".epBtn").off("click").on("click", function(){
    const idx = parseInt($(this).data("ep"), 10);
    playEpisode(bookId, idx, title, cover);
  });
}

// ==========================
// History page
// ==========================
function bootHistory() {
  renderHistoryPage();

  $("#clearHistory").off("click").on("click", () => {
    localStorage.removeItem(LS_KEY);
    renderHistoryPage();
  });
}

function renderHistoryPage() {
  const arr = readHistory();
  if (!arr.length) {
    $("#historyEmpty").show();
    $("#historyList").html("");
    return;
  }
  $("#historyEmpty").hide();

  const html = arr.map(x => {
    const pct = Math.min(100, Math.max(0, Math.round((x.progress || 0) * 100)));
    return `
      <div class="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div class="flex gap-3 p-3">
          <img src="${safeText(x.cover || "")}" class="w-24 h-24 rounded-xl object-cover" alt="${safeText(x.title)}">
          <div class="flex-1 min-w-0">
            <div class="font-extrabold text-sm line-clamp-2">${safeText(x.title)}</div>
            <div class="text-white/60 text-xs mt-1">Ep ${x.chapterIndex ?? 0} • ${safeText(x.chapterTitle || "")}</div>
            <div class="text-white/50 text-xs mt-1">${new Date(x.updatedAt || Date.now()).toLocaleString()}</div>

            <div class="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
              <div class="h-2" style="width:${pct}%;background:linear-gradient(90deg,#ef4444,#ec4899)"></div>
            </div>

            <div class="mt-3 flex gap-2">
              <button class="btn-ghost text-xs px-3 py-2" data-open-detail="${safeText(x.bookId)}" data-title="${encodeURIComponent(x.title||"")}" data-cover="${encodeURIComponent(x.cover||"")}">Detail</button>
              <button class="btn-primary text-xs px-3 py-2" data-resume-play="${safeText(x.bookId)}">Resume</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  $("#historyList").html(html);

  $("[data-resume-play]").off("click").on("click", function(){
    const bookId = $(this).data("resume-play");
    const r = getResume(bookId);
    if (!r) return;
    playEpisode(bookId, r.chapterIndex ?? 0, r.title, r.cover);
  });

  $("[data-open-detail]").off("click").on("click", function(){
    const bookId = $(this).data("open-detail");
    const title = decodeURIComponent($(this).data("title") || "");
    const cover = decodeURIComponent($(this).data("cover") || "");
    openDetail(bookId, title, cover);
  });
}

// ==========================
// Player (custom overlay)
// ==========================
function openPlayerOverlay() {
  $("#playerMount").load("/partial/player", () => {
    bindPlayerControls();
  });
}

function closePlayerOverlay() {
  const v = document.getElementById("plVideo");
  try { v && v.pause(); } catch {}
  $("#playerMount").html("");
}

function bindPlayerControls() {
  const v = document.getElementById("plVideo");
  const $pp = $("#btnPlayPause");
  const $seek = $("#plSeek");

  // tap to show/hide controls
  let ctrlTimer = null;
  function showControls() {
    $("#plControls").removeClass("hidden");
    clearTimeout(ctrlTimer);
    ctrlTimer = setTimeout(() => $("#plControls").addClass("hidden"), 2800);
  }

  $(".playerVideoWrap").on("mousemove click", showControls);

  $("#btnClosePlayer").on("click", closePlayerOverlay);

  $("#btnBack10").on("click", () => { v.currentTime = Math.max(0, v.currentTime - 10); showControls(); });
  $("#btnFwd10").on("click", () => { v.currentTime = Math.min(v.duration || 0, v.currentTime + 10); showControls(); });

  $("#btnSpeed").on("click", () => {
    const speeds = [1, 1.25, 1.5, 1.75, 2];
    const cur = v.playbackRate || 1;
    const next = speeds[(speeds.indexOf(cur) + 1) % speeds.length] || 1;
    v.playbackRate = next;
    $("#btnSpeed").text(`${next}x`);
    showControls();
  });

  $("#btnFullscreen").on("click", () => {
    const wrap = document.querySelector(".playerOverlay");
    if (!document.fullscreenElement) wrap.requestFullscreen?.();
    else document.exitFullscreen?.();
    showControls();
  });

  $pp.on("click", () => {
    if (v.paused) v.play();
    else v.pause();
    showControls();
  });

  v.addEventListener("play", () => $pp.text("❚❚"));
  v.addEventListener("pause", () => $pp.text("▶"));

  // seek sync
  v.addEventListener("timeupdate", () => {
    const dur = v.duration || 0;
    const cur = v.currentTime || 0;
    const val = dur ? Math.round((cur / dur) * 1000) : 0;
    $seek.val(val);
    $("#plTime").text(fmtTime(cur));
    $("#plDur").text(fmtTime(dur));

    // autosave history every ~5s
    const now = Date.now();
    if (now - state.player.lastSavedAt > 5000 && dur > 1) {
      state.player.lastSavedAt = now;
      saveProgress(cur, dur);
    }
  });

  $seek.on("input", function(){
    const dur = v.duration || 0;
    if (!dur) return;
    const pct = parseInt(this.value, 10) / 1000;
    v.currentTime = pct * dur;
    showControls();
  });

  // Next / Prev
  $("#btnNextEp").on("click", () => playEpisode(state.player.bookId, state.player.chapterIndex + 1, state.player.title, state.currentDetail?.cover));
  $("#btnPrevEp").on("click", () => playEpisode(state.player.bookId, Math.max(0, state.player.chapterIndex - 1), state.player.title, state.currentDetail?.cover));

  // Auto-next when ended
  v.addEventListener("ended", () => {
    saveProgress(v.currentTime || 0, v.duration || 0, true);
    playEpisode(state.player.bookId, state.player.chapterIndex + 1, state.player.title, state.currentDetail?.cover);
  });

  showControls();
}

function saveProgress(currentTime, duration, ended=false) {
  const progress = duration ? (currentTime / duration) : 0;

  const item = {
    bookId: state.player.bookId,
    title: state.player.title,
    cover: state.currentDetail?.cover || "",
    chapterIndex: state.player.chapterIndex,
    chapterTitle: state.player.chapterTitle || `Episode ${state.player.chapterIndex}`,
    updatedAt: Date.now(),
    progress: ended ? 1 : progress,
    currentTime: ended ? 0 : currentTime,
    duration: duration || 0
  };
  upsertHistory(item);
}

// Fetch stream URL then play
function playEpisode(bookId, chapterIndex, title="", cover="") {
  // guard
  if (chapterIndex < 0) chapterIndex = 0;

  state.currentDetail = state.currentDetail || { bookId, title, cover };
  state.currentDetail.bookId = bookId;
  state.currentDetail.title = title || state.currentDetail.title;
  state.currentDetail.cover = cover || state.currentDetail.cover;

  // Open overlay if not exists
  if (!$("#playerMount").children().length) openPlayerOverlay();

  // Fill header
  $("#plTitle").text(title || "Playing");
  $("#plMeta").text(`Episode ${chapterIndex}`);

  // Request player url
  const payload = { bookId, chapterIndex, lang: "in" };

  // Show loading screen inside overlay (simple)
  const mount = $("#playerMount");
  mount.find("#plControls").removeClass("hidden");

  $.ajax({
    url: "/api/watch/player",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify(payload),
    success: (r) => {
      const playUrl = r?.playUrl || r?.url || r?.data?.playUrl;
      if (!playUrl) {
        alert("Gagal load stream URL.");
        return;
      }

      // Update state player
      state.player.bookId = bookId;
      state.player.chapterIndex = chapterIndex;
      state.player.title = title || "";
      state.player.chapterTitle = `Episode ${chapterIndex}`;
      state.player.playUrl = playUrl;
      state.player.lastSavedAt = 0;

      const v = document.getElementById("plVideo");
      v.src = playUrl;
      v.play().catch(()=>{});

      // Resume time if exists
      const resume = getResume(bookId);
      if (resume && resume.chapterIndex === chapterIndex && resume.currentTime && resume.duration) {
        // wait metadata
        v.addEventListener("loadedmetadata", function once() {
          v.removeEventListener("loadedmetadata", once);
          // if duration similar, seek
          if (v.duration && resume.currentTime < v.duration - 3) {
            v.currentTime = Math.max(0, resume.currentTime);
          }
        });
      }

      // update history now (start)
      upsertHistory({
        bookId,
        title: title || "",
        cover: state.currentDetail?.cover || "",
        chapterIndex,
        chapterTitle: `Episode ${chapterIndex}`,
        updatedAt: Date.now(),
        progress: 0,
        currentTime: 0,
        duration: 0
      });
    },
    error: () => {
      alert("Gagal memutar video (proxy/player error).");
    }
  });
}

// ==========================
// Global click handlers
// ==========================
$(document).on("click", ".nav-btn, .topnav-btn", function(){
  const page = $(this).data("page");
  if (!page) return;
  loadPage(page);
});

$(document).on("click", ".poster", function(){
  const bookId = $(this).data("bookid");
  const title = decodeURIComponent($(this).data("title") || "");
  const cover = decodeURIComponent($(this).data("cover") || "");
  openDetail(bookId, title, cover);
});

$(document).on("click", "[data-resume='1']", function(){
  const bookId = $(this).data("bookid");
  const r = getResume(bookId);
  if (!r) return;
  openDetail(bookId, r.title || "", r.cover || "");
  // slight delay to ensure detail loaded then play
  setTimeout(() => playEpisode(bookId, r.chapterIndex ?? 0, r.title, r.cover), 450);
});

// ==========================
// Boot
// ==========================
loadPage("home");
