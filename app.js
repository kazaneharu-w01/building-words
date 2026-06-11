"use strict";

/* ---------- 定数 ---------- */

const PICKUP_TERMS = ["養生", "墨出し", "サン", "荷揚げ"];
const DEFAULT_POPULAR = ["養生", "墨出し", "サン", "荷揚げ", "足場", "アンカー", "開口", "逃げ", "納まり", "取り合い"];
const SITE_NAME = "現場作業者のための建築用語辞典";

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

const SECTION_ICONS = {
  meaning: '<path d="M12 21V8M12 8c0-2.5 2-4.5 4.5-4.5H21V16h-4.5C14 16 12 18 12 21M12 8c0-2.5-2-4.5-4.5-4.5H3V16h4.5C10 16 12 18 12 21"/>',
  scene: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  caution: '<path d="M12 3 2.5 20h19z"/><path d="M12 9.5V14M12 16.8v.2"/>',
  related: '<path d="M9 12h6"/><path d="M9.5 7H7a5 5 0 0 0 0 10h2.5M14.5 7H17a5 5 0 0 1 0 10h-2.5"/>'
};

/* ---------- 状態 ---------- */

let siteData = null;
let allTerms = [];

const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(location.search);

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
  const count = $("#heroTermCount");
  if (count) count.textContent = String(allTerms.length);

  renderPopularKeywords();
  renderCategoryGrid();
  renderPickupTerms();
  bindHomeSearch();
}

function renderPopularKeywords() {
  const container = $("#popularKeywords");
  if (!container) return;

  const keywords = siteData.site?.popular_keywords?.length
    ? siteData.site.popular_keywords
    : DEFAULT_POPULAR;

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
      <span class="category-icon" aria-hidden="true">${categoryIconSvg(category.id)}</span>
      <span>
        <h3>${escapeHtml(category.name)}</h3>
        <span class="category-count">${category.terms.length}語</span>
        <p>${escapeHtml(category.description || "")}</p>
      </span>
    </a>
  `).join("");
}

function renderPickupTerms() {
  const container = $("#pickupTerms");
  if (!container) return;

  const terms = PICKUP_TERMS
    .map((name) => allTerms.find((term) => term.term === name))
    .filter(Boolean);

  container.innerHTML = terms.map((term) => termCardTemplate(term)).join("");
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

  if (input) input.value = query;

  const update = () => {
    syncUrl(query, activeCat);
    renderCategoryFilters(activeCat, (catId) => {
      activeCat = catId;
      update();
    });
    renderResults(query, activeCat);
  };

  if (form && input) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      query = input.value.trim();
      update();
    });
    input.addEventListener("input", debounce(() => {
      query = input.value.trim();
      update();
    }, 160));
  }

  update();
}

function syncUrl(query, catId) {
  const next = new URLSearchParams();
  if (query) next.set("q", query);
  if (catId) next.set("cat", catId);
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

function renderResults(query, catId) {
  const results = $("#results");
  if (!results) return;

  const category = siteData.categories.find((item) => item.id === catId);
  let terms = catId ? allTerms.filter((term) => term.categoryId === catId) : allTerms;
  if (query) terms = searchTerms(query, terms);

  let title = "用語一覧";
  if (query && category) title = `${category.name}で「${query}」を検索`;
  else if (query) title = `「${query}」の検索結果`;
  else if (category) title = category.name;

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

  document.title = `${term.term}（${term.reading || "読み方未登録"}） | ${SITE_NAME}`;
  const crumb = $("#breadcrumbTerm");
  if (crumb) crumb.textContent = term.term;

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
