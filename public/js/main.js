/* =========================================================
   GLOBAL STATE & STORAGE
========================================================= */
const LS_HISTORY = "dc_history_v2";

const state = {
  page: "home",
  detail: null, // { bookId, title, cover }
  episodes: [],
  player: {
    bookId: null,
    chapterIndex: 0,
    title: "",
    cover: "",
    playUrl: "",
    lastSave: 0,
    duration: 0
  }
};

/* =========================================================
   API RESPONSE HELPERS
========================================================= */
function pickList(r) {
  return r?.data?.list || [];
}

function normalizeItem(x) {
  return {
    bookId: x?.bookId,
    title: x?.bookName,
    cover: x?.cover,
    intro: x?.introduction,
    playCount: x?.playCount,
    chapterCount: x?.chapterCount
  };
}

/* =========================================================
   UI HELPERS
========================================================= */
function posterCard(x, withProgress = false) {
  const it = normalizeItem(x);
  if (!it.bookId) return "";

  let progressBar = "";
  if (withProgress) {
    const h = getResume(it.bookId);
    if (h && h.progress > 0) {
      progressBar = `
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div class="h-1 bg-red-500" style="width:${Math.min(100, h.progress * 100)}%"></div>
        </div>`;
    }
  }

  return `
  <button class="poster relative text-left"
    data-bookid="${it.bookId}"
    data-title="${encodeURIComponent(it.title || "")}"
    data-cover="${encodeURIComponent(it.cover || "")}">
    <img class="lazyimg" data-src="${it.cover || ""}">
    ${progressBar}
    <div class="meta">
      <div class="t line-clamp-2">${it.title || "Untitled"}</div>
      <div class="s">
        ${it.playCount ? `▶ ${it.playCount}` : ""}
        ${it.chapterCount ? ` • ${it.chapterCount} eps` : ""}
      </div>
    </div>
  </button>`;
}

function skeleton(count = 12) {
  return Array.from({ length: count }).map(() => `
    <div class="poster animate-pulse">
      <div style="height:170px;background:rgba(255,255,255,.08)"></div>
      <div class="meta">
        <div style="height:12px;width:80%;background:rgba(255,255,255,.08)"></div>
        <div style="height:10px;width:60%;margin-top:8px;background:rgba(255,255,255,.06)"></div>
      </div>
    </div>
  `).join("");
}

function lazyLoad(root) {
  if (!root) return;
  const imgs = root.querySelectorAll("img.lazyimg[data-src]");
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.src = e.target.dataset.src;
      e.target.removeAttribute("data-src");
      io.unobserve(e.target);
    });
  }, { rootMargin: "200px" });
  imgs.forEach(img => io.observe(img));
}

/* =========================================================
   HISTORY & RESUME
========================================================= */
function getHistory() {
  try { return JSON.parse(localStorage.getItem(LS_HISTORY) || "[]"); }
  catch { return []; }
}

function saveHistory(item) {
  const list = getHistory().filter(x => x.bookId !== item.bookId);
  list.unshift(item);
  localStorage.setItem(LS_HISTORY, JSON.stringify(list.slice(0, 50)));
}

function getResume(bookId) {
  return getHistory().find(x => x.bookId === bookId);
}

/* =========================================================
   SPA LOADER
========================================================= */
function loadPage(page) {
  state.page = page;
  $("#app").html(`<div class="p-6 text-center text-white/70">Loading...</div>`);

  $("#app").load(`/partial/${page}`, () => {
    if (page === "home") bootHome();
    if (page === "popular") bootPopular();
    if (page === "new") bootNew();
    if (page === "search") bootSearch();
    if (page === "history") bootHistory();
  });
}

/* =========================================================
   HOME
========================================================= */
function bootHome() {
  $("#gridForyou").html(skeleton(12));
  $("#gridNew").html(skeleton(12));

  $.get("/api/foryou/1?lang=in", r => {
    const list = pickList(r);
    $("#gridForyou").html(list.map(x => posterCard(x)).join(""));
    lazyLoad(document.getElementById("gridForyou"));
  });

  $.get("/api/new/1?lang=in&pageSize=10", r => {
    const list = pickList(r);
    $("#gridNew").html(list.map(x => posterCard(x)).join(""));
    lazyLoad(document.getElementById("gridNew"));
  });

  renderContinue();
}

function renderContinue() {
  const hist = getHistory();
  if (!hist.length) return;

  $("#continueList").html(hist.slice(0, 10).map(x =>
    posterCard({
      bookId: x.bookId,
      bookName: x.title,
      cover: x.cover,
      chapterCount: x.chapterCount
    }, true)
  ).join(""));

  $("#continueRow").removeClass("hidden");
}

/* =========================================================
   POPULAR / NEW
========================================================= */
function bootPopular() {
  $("#gridPopular").html(skeleton(18));
  $.get("/api/rank/1?lang=in", r => {
    const list = pickList(r);
    $("#gridPopular").html(list.map(x => posterCard(x)).join(""));
    lazyLoad(document.getElementById("gridPopular"));
  });
}

function bootNew() {
  $("#gridNewPage").html(skeleton(18));
  $.get("/api/new/1?lang=in&pageSize=18", r => {
    const list = pickList(r);
    $("#gridNewPage").html(list.map(x => posterCard(x)).join(""));
    lazyLoad(document.getElementById("gridNewPage"));
  });
}

/* =========================================================
   SEARCH
========================================================= */
function bootSearch() {
  $("#searchInput").off().on("keydown", function (e) {
    if (e.key === "Enter") runSearch(this.value);
  });
}

function runSearch(q) {
  if (!q) return;
  $("#gridSearch").html(skeleton(18));
  $.get(`/api/search/${encodeURIComponent(q)}/1?lang=in`, r => {
    const list = pickList(r);
    $("#gridSearch").html(list.map(x => posterCard(x)).join(""));
    lazyLoad(document.getElementById("gridSearch"));
  });
}

/* =========================================================
   HISTORY PAGE
========================================================= */
function bootHistory() {
  const hist = getHistory();
  if (!hist.length) {
    $("#historyList").html(`<div class="text-white/60">Belum ada history</div>`);
    return;
  }

  $("#historyList").html(hist.map(x => `
    <div class="poster relative">
      <img src="${x.cover}">
      <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
        <div class="h-1 bg-red-500" style="width:${Math.min(100, x.progress * 100)}%"></div>
      </div>
      <div class="meta">
        <div class="t">${x.title}</div>
        <div class="s">Ep ${x.chapterIndex}</div>
        <button class="btn-primary mt-2" data-resume="1" data-bookid="${x.bookId}">Resume</button>
      </div>
    </div>
  `).join(""));
}

/* =========================================================
   DETAIL & EPISODES
========================================================= */
function openDetail(bookId, title, cover) {
  state.detail = { bookId, title, cover };
  $("#app").load("/partial/detail", () => bootDetail());
}

function bootDetail() {
  const { bookId, title, cover } = state.detail;
  $("#detailCover").attr("src", cover || "");
  $("#detailTitle").text(title || "");

  $.get(`/api/chapters/${bookId}?lang=in`, r => {
    state.episodes = r?.data || [];
    renderEpisodes();
  });

  $("#btnPlayResume").off().on("click", () => {
    const r = getResume(bookId);
    playEpisode(bookId, r ? r.chapterIndex : 0);
  });
}

function renderEpisodes() {
  $("#episodeGrid").html(state.episodes.map((_, i) =>
    `<button class="epBtn" data-ep="${i}">${i}</button>`
  ).join(""));
}

/* =========================================================
   PLAYER (NETFLIX STYLE)
========================================================= */
function playEpisode(bookId, chapterIndex) {
  $.ajax({
    url: "/api/watch/player",
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ bookId, chapterIndex, lang: "in" }),
    success: r => {
      const url = r?.playUrl || r?.data?.playUrl;
      if (!url) return alert("Stream URL tidak ditemukan");

      state.player = {
        bookId,
        chapterIndex,
        title: state.detail.title,
        cover: state.detail.cover,
        playUrl: url,
        lastSave: 0,
        duration: 0
      };

      $("#playerMount").html(`
        <div class="playerOverlay">
          <video id="video" src="${url}" autoplay></video>
          <div class="playerControls">
            <button id="btnPlay">⏯</button>
            <input id="seek" type="range" min="0" max="100" value="0">
            <button id="btnSpeed">1x</button>
            <button id="btnFs">⛶</button>
            <button id="btnClose">✕</button>
          </div>
        </div>
      `);

      const v = document.getElementById("video");

      // Resume time
      const resume = getResume(bookId);
      v.addEventListener("loadedmetadata", () => {
        state.player.duration = v.duration || 0;
        if (resume && resume.currentTime) v.currentTime = resume.currentTime;
      });

      // Save progress every 5s
      v.addEventListener("timeupdate", () => {
        const now = Date.now();
        if (now - state.player.lastSave > 5000 && v.duration) {
          state.player.lastSave = now;
          saveHistory({
            bookId,
            title: state.player.title,
            cover: state.player.cover,
            chapterIndex,
            currentTime: v.currentTime,
            progress: v.currentTime / v.duration,
            duration: v.duration
          });
        }
        $("#seek").val((v.currentTime / v.duration) * 100 || 0);
      });

      // Autoplay next
      v.addEventListener("ended", () => {
        playEpisode(bookId, chapterIndex + 1);
      });

      $("#seek").on("input", function () {
        v.currentTime = (this.value / 100) * v.duration;
      });

      $("#btnPlay").on("click", () => v.paused ? v.play() : v.pause());
      $("#btnSpeed").on("click", () => {
        const rates = [1, 1.25, 1.5, 2];
        v.playbackRate = rates[(rates.indexOf(v.playbackRate) + 1) % rates.length];
        $("#btnSpeed").text(v.playbackRate + "x");
      });
      $("#btnFs").on("click", () => document.fullscreenElement ? document.exitFullscreen() : v.requestFullscreen());
      $("#btnClose").on("click", () => $("#playerMount").html(""));
    }
  });
}

/* =========================================================
   GLOBAL EVENTS
========================================================= */
$(document).on("click", ".poster", function () {
  const bookId = $(this).data("bookid");
  if (!bookId) return;
  openDetail(
    bookId,
    decodeURIComponent($(this).data("title") || ""),
    decodeURIComponent($(this).data("cover") || "")
  );
});

$(document).on("click", "[data-resume='1']", function () {
  const r = getResume($(this).data("bookid"));
  if (!r) return;
  openDetail(r.bookId, r.title, r.cover);
  setTimeout(() => playEpisode(r.bookId, r.chapterIndex), 400);
});

$(document).on("click", ".nav-btn, .topnav-btn", function () {
  loadPage($(this).data("page"));
});

/* =========================================================
   BOOT
========================================================= */
loadPage("home");
