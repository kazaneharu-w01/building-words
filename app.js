"use strict";

/* ---------- 定数 ---------- */

const DEFAULT_POPULAR = ["養生", "墨出し", "サン", "荷揚げ", "足場", "アンカー", "開口", "逃げ", "納まり", "取り合い"];
const SITE_NAME = "現場作業者のための建築用語辞典";

const RECENT_KEY = "bw_recent_terms"; // 端末内に保存する閲覧履歴
const RECENT_MAX = 12;                // 保存する最大件数
const RECENT_SHOW = 8;                // トップに表示する最大件数

const CATEGORY_ICONS = {
  common: '<path d="M4 15a8 8 0 0 1 16 0"/><path d="M2.5 15h19"/><path d="M12 7V4.5"/>',
  "temporary-scaffold": '<path d="M5 3v18M19 3v18M5 7h14M5 17h14"/><path d="m5 17 14-10"/>',
  "earth-foundation": '<path d="M3 21h18"/><path d="M12 3v12m0 0 4-4m-4 4-4-4"/>',
  "rebar-form-concrete": '<path d="M8 3v18M16 3v18M3 8h18M3 16h18"/>',
  "steel-wood": '<path d="M5 4h14M5 20h14M12 4v16"/>',
  "interior-lgs-board": '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M9 4v16M15 4v16"/>',
  finish: '<rect x="3" y="4" width="12" height="6" rx="1"/><path d="M15 7h4v5h-8v4"/><path d="M11 16v4"/>',
  "waterproof-roof-exterior": '<path d="M12 3s6 7.2 6 11.2a6 6 0 0 1-12 0C6 10.2 12 3 12 3z"/>',
  "openings-glass": '<rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="14.5" cy="12" r="1"/><path d="M3 21h18"/>',
  "electric-mep-hvac": '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  demolition: '<path d="m14 4 6 6-3 3-6-6z"/><path d="M12.5 8.5 4 17v3h3l8.5-8.5"/>',
  "lifting-carrying": '<path d="M6 21V4M3 4h18M17 4v6"/><path d="M17 16a2.4 2.4 0 1 1-2.4-2.4"/><path d="M3 21h6"/>',
  "drawings-dimensions": '<path d="M4 20V4l16 16z"/><path d="M9 16v-4.5L13.5 16z"/>',
  safety: '<path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>'
};

const FALLBACK_ICON = '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 3"/>';

// カテゴリID → アイコン画像ファイル名(image/ 配下)
const CATEGORY_IMAGES = {
  common: "現場共通.png",
  "temporary-scaffold": "仮設・足場工事.png",
  "earth-foundation": "土工事・基礎工事.png",
  "rebar-form-concrete": "鉄筋・型枠・コンクリート工事.png",
  "steel-wood": "鉄骨・木工事.png",
  "interior-lgs-board": "内装・軽天・ボード工事.png",
  finish: "クロス・床・左官・タイル・塗装.png",
  "waterproof-roof-exterior": "防水・シーリング・屋根・外装.png",
  "openings-glass": "建具・ガラス工事.png",
  "electric-mep-hvac": "電気・設備・空調工事.png",
  demolition: "解体工事.png",
  "lifting-carrying": "荷揚げ・搬入・揚重.png",
  "drawings-dimensions": "図面・寸法.png",
  safety: "安全衛生.png"
};

const SECTION_ICONS = {
  meaning: '<path d="M12 21V8M12 8c0-2.5 2-4.5 4.5-4.5H21V16h-4.5C14 16 12 18 12 21M12 8c0-2.5-2-4.5-4.5-4.5H3V16h4.5C10 16 12 18 12 21"/>',
  scene: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  caution: '<path d="M12 3 2.5 20h19z"/><path d="M12 9.5V14M12 16.8v.2"/>',
  related: '<path d="M9 12h6"/><path d="M9.5 7H7a5 5 0 0 0 0 10h2.5M14.5 7H17a5 5 0 0 1 0 10h-2.5"/>'
};

const KANA_ROWS = [
  ["あ", "あいうえお"],
  ["か", "かきくけこがぎぐげご"],
  ["さ", "さしすせそざじずぜぞ"],
  ["た", "たちつてとだぢづでど"],
  ["な", "なにぬねの"],
  ["は", "はひふへほばびぶべぼぱぴぷぺぽ"],
  ["ま", "まみむめも"],
  ["や", "やゆよ"],
  ["ら", "らりるれろ"],
  ["わ", "わをん"]
];

/* ---------- 状態 ---------- */

let siteData = null;
let allTerms = [];

const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);

/* ---------- Supabase (REST) ---------- */

const SUPABASE_URL = "https://twfpmluoxjginzonjfxk.supabase.co";
const SUPABASE_KEY = "sb_publishable_Kd4N4-_odb8iYx5TH-j4mw_Iq9Rnt2B";

function sbHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}

// 検索回数を加算（人気検索ワード用）
async function bumpSearch(keyword) {
  const kw = String(keyword || "").trim();
  if (!kw) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/bump_search`, {
      method: "POST",
      headers: sbHeaders(),
      body: JSON.stringify({ kw }),
      keepalive: true
    });
  } catch {
    /* 計測の失敗は無視 */
  }
}

// 検索回数の上位キーワードを取得
async function fetchTopKeywords(limit = 10) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/search_counts?select=keyword&order=count.desc&limit=${limit}`,
      { headers: sbHeaders() }
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.map((r) => r.keyword).filter(Boolean);
  } catch {
    return [];
  }
}

// 承認済みの投稿を取得
async function fetchApprovedPosts(limit = 100) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/submissions?select=type,term,body,created_at&status=eq.approved&order=created_at.desc&limit=${limit}`,
    { headers: sbHeaders() }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// 投稿を送信（status は pending 固定 = サーバー側の既定値）
async function submitPost({ type, term, body }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/submissions`, {
    method: "POST",
    headers: sbHeaders({ Prefer: "return=minimal" }),
    body: JSON.stringify({ type, term: term || null, body })
  });
  return res.ok;
}

/* ---------- 初期化 ---------- */

document.addEventListener("DOMContentLoaded", async () => {
  bindNavToggle();

  try {
    const response = await fetch("terms_data.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    siteData = await response.json();
  } catch (error) {
    showStatus("用語データを読み込めませんでした。時間を置いて再読み込みしてください。");
    return;
  }

  allTerms = siteData.categories.flatMap((category) =>
    category.terms.map((term) => ({
      ...term,
      categoryId: category.id,
      categoryName: category.name
    }))
  );

  const page = document.body.dataset.page;
  if (page === "home") renderHome();
  if (page === "search") renderSearchPage();
  if (page === "term") renderTermPage();
  if (page === "board") renderBoard();
});

function bindNavToggle() {
  const toggle = $(".nav-toggle");
  const nav = $("#globalNav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
  });
}

/* ---------- トップページ ---------- */

function renderHome() {
  renderPopularKeywords();
  renderCategoryGrid();
  renderRecentTerms();
  bindHomeSearch();
}

async function renderPopularKeywords() {
  const container = $("#popularKeywords");
  if (!container) return;

  const fallback = siteData.site?.popular_keywords?.length
    ? siteData.site.popular_keywords
    : DEFAULT_POPULAR;

  // 実際の検索回数の上位を優先しつつ、件数が少ないうちは固定リストで補う
  const top = await fetchTopKeywords(10);
  const keywords = [...top];
  for (const kw of fallback) {
    if (keywords.length >= 10) break;
    if (!keywords.includes(kw)) keywords.push(kw);
  }

  container.innerHTML = "";
  keywords.forEach((keyword) => {
    const button = document.createElement("button");
    button.className = "tag";
    button.type = "button";
    button.textContent = keyword;
    button.setAttribute("aria-label", `${keyword}で検索`);
    button.addEventListener("click", () => {
      location.href = `search.html?q=${encodeURIComponent(keyword)}`;
    });
    container.appendChild(button);
  });
}

function renderCategoryGrid() {
  const container = $("#categoryGrid");
  if (!container) return;

  container.innerHTML = siteData.categories.map((category) => `
    <a class="category-card" href="search.html?cat=${encodeURIComponent(category.id)}">
      <span class="category-icon" aria-hidden="true">${categoryIconMarkup(category.id)}</span>
      <span>
        <h3>${escapeHtml(category.name)}</h3>
        <span class="category-count">${category.terms.length}語</span>
        <p>${escapeHtml(category.description || "")}</p>
      </span>
    </a>
  `).join("");
}

// 閲覧履歴（localStorage）
function getRecentEntries() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function pushRecentTerm(name, categoryId) {
  try {
    const list = getRecentEntries().filter((e) => !(e.t === name && e.c === categoryId));
    list.unshift({ t: name, c: categoryId });
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    /* プライベートモード等で localStorage が使えない場合は無視 */
  }
}

function clearRecentTerms() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* noop */
  }
}

// 「最近表示した用語」を表示（履歴が無ければ空状態のメッセージ）
function renderRecentTerms() {
  const container = $("#pickupTerms");
  if (!container) return;

  const recent = getRecentEntries()
    .map((e) => allTerms.find((term) => term.term === e.t && term.categoryId === e.c))
    .filter(Boolean)
    .slice(0, RECENT_SHOW);

  const clearBtn = $("#clearRecent");

  if (recent.length) {
    container.innerHTML = recent.map((term) => termCardTemplate(term)).join("");
    if (clearBtn) {
      clearBtn.hidden = false;
      clearBtn.onclick = () => {
        clearRecentTerms();
        renderRecentTerms();
      };
    }
  } else {
    container.innerHTML = `<p class="recent-empty">用語ページをひらくと、最近見た用語がここに並びます。</p>`;
    if (clearBtn) clearBtn.hidden = true;
  }
}

/* ---------- 検索サジェスト（トップ） ---------- */

function bindHomeSearch() {
  const form = $("#searchForm");
  const input = $("#searchInput");
  const listbox = $("#searchSuggest");
  if (!form || !input) return;

  let activeIndex = -1;
  let suggestions = [];

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      location.href = termUrl(suggestions[activeIndex]);
      return;
    }
    const query = input.value.trim();
    if (query) bumpSearch(query);
    location.href = query ? `search.html?q=${encodeURIComponent(query)}` : "search.html";
  });

  if (!listbox) return;

  const closeSuggest = () => {
    listbox.hidden = true;
    input.setAttribute("aria-expanded", "false");
    activeIndex = -1;
  };

  const renderSuggest = () => {
    const query = input.value.trim();
    suggestions = query ? searchTerms(query).slice(0, 8) : [];

    if (!suggestions.length) {
      closeSuggest();
      return;
    }

    listbox.innerHTML = suggestions.map((term, index) => `
      <li id="suggest-${index}" role="option" aria-selected="false" data-index="${index}">
        <strong>${highlight(term.term, query)}</strong>
        <span class="suggest-reading">${escapeHtml(term.reading || "")}</span>
        <span class="suggest-cat">${escapeHtml(term.categoryName)}</span>
      </li>
    `).join("");
    listbox.hidden = false;
    input.setAttribute("aria-expanded", "true");
    activeIndex = -1;

    listbox.querySelectorAll("li").forEach((item) => {
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        location.href = termUrl(suggestions[Number(item.dataset.index)]);
      });
    });
  };

  const setActive = (index) => {
    activeIndex = index;
    listbox.querySelectorAll("li").forEach((item, i) => {
      item.setAttribute("aria-selected", String(i === index));
    });
    input.setAttribute("aria-activedescendant", index >= 0 ? `suggest-${index}` : "");
  };

  input.addEventListener("input", debounce(renderSuggest, 120));

  input.addEventListener("keydown", (event) => {
    if (listbox.hidden) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((activeIndex + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((activeIndex - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === "Escape") {
      closeSuggest();
    }
  });

  input.addEventListener("blur", () => setTimeout(closeSuggest, 120));
}

/* ---------- 用語一覧・検索ページ ---------- */

function renderSearchPage() {
  const input = $("#searchInput");
  const form = $("#searchForm");

  let query = params.get("q") || "";
  let activeCat = params.get("cat") || "";
  let activeKana = params.get("kana") || "";

  if (input) input.value = query;

  const update = () => {
    syncUrl(query, activeCat, activeKana);
    renderCategoryFilters(activeCat, (catId) => {
      activeCat = catId;
      update();
    });
    renderKanaFilters(activeKana, (kana) => {
      activeKana = kana;
      update();
    });
    renderResults(query, activeCat, activeKana);
  };

  if (form && input) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      query = input.value.trim();
      if (query) bumpSearch(query);
      update();
    });
    input.addEventListener("input", debounce(() => {
      query = input.value.trim();
      update();
    }, 160));
  }

  update();
}

function syncUrl(query, catId, kana) {
  const next = new URLSearchParams();
  if (query) next.set("q", query);
  if (catId) next.set("cat", catId);
  if (kana) next.set("kana", kana);
  const search = next.toString();
  history.replaceState(null, "", search ? `?${search}` : location.pathname);
}

function renderCategoryFilters(activeCat, onSelect) {
  const container = $("#categoryFilters");
  if (!container) return;

  const chips = [{ id: "", name: "すべて", count: allTerms.length }]
    .concat(siteData.categories.map((category) => ({
      id: category.id,
      name: category.name,
      count: category.terms.length
    })));

  container.innerHTML = "";
  chips.forEach((chip) => {
    const button = document.createElement("button");
    button.className = "filter-chip";
    button.type = "button";
    button.textContent = chip.name;
    button.setAttribute("aria-pressed", String(chip.id === activeCat));
    button.addEventListener("click", () => onSelect(chip.id === activeCat ? "" : chip.id));
    container.appendChild(button);
  });
}

function renderKanaFilters(activeKana, onSelect) {
  const container = $("#kanaFilters");
  if (!container) return;

  const counts = {};
  allTerms.forEach((term) => {
    const row = kanaRowOf(term.reading);
    if (row) counts[row] = (counts[row] || 0) + 1;
  });

  container.innerHTML = "";

  const allChip = document.createElement("button");
  allChip.className = "filter-chip kana-chip kana-chip-all";
  allChip.type = "button";
  allChip.textContent = "すべて";
  allChip.setAttribute("aria-pressed", String(activeKana === ""));
  allChip.addEventListener("click", () => onSelect(""));
  container.appendChild(allChip);

  KANA_ROWS.forEach(([row]) => {
    const chip = document.createElement("button");
    chip.className = "filter-chip kana-chip";
    chip.type = "button";
    chip.textContent = row;
    chip.setAttribute("aria-label", `${row}行で絞り込み`);
    chip.setAttribute("aria-pressed", String(row === activeKana));
    if (!counts[row]) chip.disabled = true;
    chip.addEventListener("click", () => onSelect(row === activeKana ? "" : row));
    container.appendChild(chip);
  });
}

function renderResults(query, catId, kana = "") {
  const results = $("#results");
  if (!results) return;

  const category = siteData.categories.find((item) => item.id === catId);
  let terms = catId ? allTerms.filter((term) => term.categoryId === catId) : allTerms;
  if (kana) {
    terms = terms
      .filter((term) => kanaRowOf(term.reading) === kana)
      .sort((a, b) => String(a.reading).localeCompare(String(b.reading), "ja"));
  }
  if (query) terms = searchTerms(query, terms);

  const labels = [];
  if (category) labels.push(category.name);
  if (kana) labels.push(`${kana}行`);
  let title;
  if (query) title = `${labels.length ? `${labels.join("・")}の` : ""}「${query}」検索結果`;
  else if (labels.length) title = `${labels.join("・")}の用語`;
  else title = "用語一覧";

  $("#resultsTitle").textContent = title;
  $("#resultsSub").textContent = query
    ? `${terms.length}件の用語が見つかりました。`
    : `${terms.length}件の用語を表示しています。`;
  document.title = `${title} | ${SITE_NAME}`;

  const lead = $("#pageLead");
  if (lead && category) lead.textContent = category.description || lead.textContent;

  if (!terms.length) {
    results.innerHTML = "";
    showStatus("該当する用語が見つかりませんでした。");
    return;
  }

  hideStatus();
  results.innerHTML = terms.map((term) => termCardTemplate(term, query)).join("");
}

/* ---------- 用語詳細ページ ---------- */

function renderTermPage() {
  const termName = params.get("term") || "";
  const catId = params.get("cat") || "";

  const term =
    allTerms.find((item) => item.term === termName && (!catId || item.categoryId === catId)) ||
    allTerms.find((item) => item.term === termName);

  if (!term) {
    showStatus("用語が見つかりませんでした。");
    return;
  }

  pushRecentTerm(term.term, term.categoryId);

  document.title = `${term.term}（${term.reading || "読み方未登録"}） | ${SITE_NAME}`;
  const crumb = $("#breadcrumbTerm");
  if (crumb) crumb.textContent = term.term;

  const report = $("#reportLink");
  if (report) report.href = `board.html?type=typo&term=${encodeURIComponent(term.term)}`;

  const related = Array.isArray(term.related) ? term.related.filter(Boolean) : [];

  const detail = $("#termDetail");
  detail.hidden = false;
  detail.innerHTML = `
    <header class="detail-header">
      <a class="badge" href="search.html?cat=${encodeURIComponent(term.categoryId)}">${escapeHtml(term.categoryName)}</a>
      <h1>${escapeHtml(term.term)}</h1>
      <p class="reading">${escapeHtml(term.reading || "読み方未登録")}</p>
    </header>
    <div class="detail-body">
      <section class="detail-section detail-meaning">
        <h2>${sectionIconSvg("meaning")}意味</h2>
        <p>${escapeHtml(term.meaning || "未登録")}</p>
      </section>
      <section class="detail-section">
        <h2>${sectionIconSvg("scene")}よく使う場面</h2>
        <p>${escapeHtml(term.scene || "未登録")}</p>
      </section>
      <section class="detail-section detail-caution">
        <h2>${sectionIconSvg("caution")}注意点</h2>
        <p>${escapeHtml(term.caution || "未登録")}</p>
      </section>
      <section class="detail-section">
        <h2>${sectionIconSvg("related")}関連用語</h2>
        ${related.length ? `<div class="related-list">${related.map(relatedChipHtml).join("")}</div>` : "<p>未登録</p>"}
      </section>
    </div>
  `;

  detail.focus({ preventScroll: true });
}

function relatedChipHtml(name) {
  const target = allTerms.find((item) => item.term === name);
  const href = target ? termUrl(target) : `search.html?q=${encodeURIComponent(name)}`;
  return `
    <a class="related-chip" href="${href}">
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
      ${escapeHtml(name)}
    </a>
  `;
}

/* ---------- 投稿板 ---------- */

const POST_COOLDOWN_MS = 30 * 1000; // 連投制限（30秒）
const POST_MIN_FILL_MS = 3 * 1000;  // フォーム表示から送信までの最短時間（bot対策）
const POST_TYPE_LABEL = { typo: "誤字・誤釈の指摘", request: "用語の追加依頼" };
const POST_TERM_LABEL = { typo: "対象の用語", request: "追加依頼をしたい用語" };

function renderBoard() {
  bindBoardForm();
  loadBoardPosts();
}

function bindBoardForm() {
  const form = $("#postForm");
  if (!form) return;

  const status = $("#postStatus");
  const body = $("#postBody");
  const counter = $("#postCounter");
  const mountedAt = Date.now();

  // 用語ページの「誤りを指摘」からの遷移時、種類と対象用語を事前入力
  const presetType = params.get("type");
  const presetTerm = params.get("term");
  if (presetType === "typo" || presetType === "request") {
    const radio = form.querySelector(`input[name="type"][value="${presetType}"]`);
    if (radio) radio.checked = true;
  }
  if (presetTerm) {
    const termInput = $("#postTerm");
    if (termInput) termInput.value = presetTerm;
  }
  if (presetType || presetTerm) {
    requestAnimationFrame(() => body?.focus({ preventScroll: false }));
  }

  // 種類に応じて「対象の用語」ラベルを切り替え
  const termLabel = $("#postTermLabel");
  const updateTermLabel = () => {
    const t = form.elements.type.value;
    if (termLabel) termLabel.textContent = POST_TERM_LABEL[t] || "対象の用語";
  };
  form.querySelectorAll('input[name="type"]').forEach((radio) =>
    radio.addEventListener("change", updateTermLabel)
  );
  updateTermLabel();

  if (body && counter) {
    const updateCount = () => {
      counter.textContent = `${body.value.length} / 1000`;
    };
    body.addEventListener("input", updateCount);
    updateCount();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // honeypot（人間には見えない項目。埋まっていれば bot とみなし黙って終了）
    if (form.elements.website && form.elements.website.value) {
      setPostStatus(status, "ok", "投稿ありがとうございます。確認のうえ掲載します。");
      form.reset();
      return;
    }
    // 表示直後の即送信は bot とみなす
    if (Date.now() - mountedAt < POST_MIN_FILL_MS) {
      setPostStatus(status, "error", "送信が早すぎます。もう一度お試しください。");
      return;
    }
    // 連投制限
    const last = Number(localStorage.getItem("bw_last_post") || 0);
    if (Date.now() - last < POST_COOLDOWN_MS) {
      setPostStatus(status, "error", "短時間に投稿しすぎです。少し時間をおいてください。");
      return;
    }

    const type = form.elements.type.value;
    const term = $("#postTerm").value.trim();
    const text = body.value.trim();

    if (!POST_TYPE_LABEL[type]) {
      setPostStatus(status, "error", "投稿の種類を選んでください。");
      return;
    }
    if (!text) {
      setPostStatus(status, "error", "内容を入力してください。");
      return;
    }
    if (text.length > 1000) {
      setPostStatus(status, "error", "内容は1000文字以内で入力してください。");
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    setPostStatus(status, "", "送信中…");

    const ok = await submitPost({ type, term, body: text });

    if (button) button.disabled = false;
    if (ok) {
      try { localStorage.setItem("bw_last_post", String(Date.now())); } catch { /* noop */ }
      form.reset();
      if (counter) counter.textContent = "0 / 1000";
      setPostStatus(status, "ok", "投稿ありがとうございます。内容を確認・承認のうえ掲載します。");
    } else {
      setPostStatus(status, "error", "送信に失敗しました。時間を置いて再度お試しください。");
    }
  });
}

function setPostStatus(el, kind, message) {
  if (!el) return;
  el.textContent = message;
  el.className = "post-status" + (kind ? ` post-status-${kind}` : "");
  el.hidden = false;
}

async function loadBoardPosts() {
  const list = $("#postList");
  const empty = $("#postEmpty");
  if (!list) return;

  let posts = [];
  try {
    posts = await fetchApprovedPosts();
  } catch {
    list.innerHTML = "";
    if (empty) {
      empty.hidden = false;
      empty.textContent = "投稿を読み込めませんでした。時間を置いて再読み込みしてください。";
    }
    return;
  }

  if (!posts.length) {
    list.innerHTML = "";
    if (empty) {
      empty.hidden = false;
      empty.textContent = "まだ公開されている投稿はありません。";
    }
    return;
  }

  if (empty) empty.hidden = true;
  list.innerHTML = posts.map(postCardTemplate).join("");
}

function postCardTemplate(post) {
  const label = POST_TYPE_LABEL[post.type] || "投稿";
  const date = formatPostDate(post.created_at);
  const term = post.term
    ? `<p class="post-term">対象：${escapeHtml(post.term)}</p>`
    : "";
  return `
    <article class="post-card">
      <div class="post-head">
        <span class="post-type post-type-${escapeHtml(post.type)}">${escapeHtml(label)}</span>
        <time datetime="${escapeHtml(post.created_at)}">${date}</time>
      </div>
      ${term}
      <p class="post-body">${escapeHtml(post.body || "").replace(/\n/g, "<br>")}</p>
    </article>
  `;
}

function formatPostDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
}

/* ---------- 共通テンプレート ---------- */

function termCardTemplate(term, query = "") {
  return `
    <a class="term-card" href="${termUrl(term)}">
      <h3>${highlight(term.term, query)}</h3>
      <p class="reading">${highlight(term.reading || "読み方未登録", query)}</p>
      <p class="meaning">${highlight(term.meaning || "", query)}</p>
      <span class="badge">${escapeHtml(term.categoryName)}</span>
    </a>
  `;
}

function termUrl(term) {
  return `term.html?term=${encodeURIComponent(term.term)}&cat=${encodeURIComponent(term.categoryId)}`;
}

function categoryIconSvg(categoryId) {
  const paths = CATEGORY_ICONS[categoryId] || FALLBACK_ICON;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

// アイコン画像があれば <img>、なければ線画SVGにフォールバック
function categoryIconMarkup(categoryId) {
  const file = CATEGORY_IMAGES[categoryId];
  if (!file) return categoryIconSvg(categoryId);
  return `<img class="category-img" src="image/${encodeURIComponent(file)}" alt="" loading="lazy" decoding="async">`;
}

function sectionIconSvg(key) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SECTION_ICONS[key]}</svg>`;
}

/* ---------- 検索 ---------- */

function searchTerms(keyword, scope = allTerms) {
  const query = normalize(keyword);
  if (!query) return scope;

  const matched = scope.filter((term) => {
    const targets = [
      term.term,
      term.reading,
      term.meaning,
      term.scene,
      term.caution,
      ...(Array.isArray(term.related) ? term.related : [])
    ];
    return targets.some((value) => normalize(value).includes(query));
  });

  // 用語名・読み方の一致を先頭に出す
  const rank = (term) => {
    if (normalize(term.term).startsWith(query) || normalize(term.reading).startsWith(query)) return 0;
    if (normalize(term.term).includes(query) || normalize(term.reading).includes(query)) return 1;
    return 2;
  };
  return matched.sort((a, b) => rank(a) - rank(b));
}

/* ---------- ユーティリティ ---------- */

function showStatus(message) {
  const status = $("#statusMessage");
  if (!status) return;
  status.textContent = message;
  status.hidden = false;
}

function hideStatus() {
  const status = $("#statusMessage");
  if (status) status.hidden = true;
}

function normalize(value) {
  return String(value || "").toLocaleLowerCase("ja-JP").trim();
}

function toHiragana(value) {
  return String(value || "").replace(/[ァ-ヶ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60)
  );
}

const SMALL_KANA = { ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お", ゃ: "や", ゅ: "ゆ", ょ: "よ", っ: "つ" };

function kanaRowOf(reading) {
  let first = toHiragana(String(reading || "").trim().charAt(0));
  first = SMALL_KANA[first] || first;
  const row = KANA_ROWS.find(([, chars]) => chars.includes(first));
  return row ? row[0] : "";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function highlight(value, query) {
  const text = String(value ?? "");
  const target = normalize(query);
  if (!target) return escapeHtml(text);

  const lower = text.toLocaleLowerCase("ja-JP");
  let result = "";
  let cursor = 0;

  while (cursor < text.length) {
    const index = lower.indexOf(target, cursor);
    if (index === -1) {
      result += escapeHtml(text.slice(cursor));
      break;
    }
    result += escapeHtml(text.slice(cursor, index));
    result += `<mark>${escapeHtml(text.slice(index, index + target.length))}</mark>`;
    cursor = index + target.length;
  }

  return result;
}

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
