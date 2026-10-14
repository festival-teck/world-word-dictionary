(function () {
  "use strict";
  var ROOT = document.body.getAttribute("data-root") || "./";
  var INDEX = window.KW_INDEX || [];
  var REQUEST_URL = window.KW_REQUEST_URL || "";           // Google フォーム（旧方式・予備）
  var REQUEST_API = window.KW_REQUEST_ENDPOINT || "";      // リクエスト受付（Google Apps Script）
  var REQUEST_DEMO = !!window.KW_REQUEST_DEMO;             // プレビュー用：送信せずに動きだけ見せる
  var SPA = !!window.KW_SPA;

  // ---------- 計測（Google アナリティクスが設定されているときだけ送る） ----------
  function track(name, params) {
    try { if (typeof window.gtag === "function") window.gtag("event", name, params || {}); } catch (e) {}
  }
  // ページ移動の直前に送るイベント：送信完了を待ってから移動（最大 300ms）。計測が無ければすぐ移動
  function trackThenGo(name, params, url) {
    if (typeof window.gtag !== "function") { location.href = url; return; }
    var done = false;
    function next() { if (!done) { done = true; location.href = url; } }
    params = params || {};
    params.event_callback = next;
    params.event_timeout = 300;
    try { window.gtag("event", name, params); } catch (e) { next(); return; }
    setTimeout(next, 350);
  }

  // ---------- 画面の文言 ----------
  var MSG = {
    ja: {
      notListed: function (q) { return "<b>「" + q + "」はまだ収録されていません。</b>リクエストの多い語から順に追加しています。"; },
      request: function (q) { return "「" + q + "」の収録をリクエストする"; },
      requestSoon: "リクエスト受付は準備中です",
      requestBtn: function (q) { return "「" + q + "」をリクエストする"; },
      requested: function (q) { return "「" + q + "」をリクエストしました"; },
      requestedLabel: "リクエスト済み",
      requestFail: "送信できませんでした。時間をおいて試してください",
      reqLoading: "読み込み中…", reqEmpty: "まだリクエストはありません。", reqSoon: "リクエストの受付は準備中です。",
      reqPending: "リクエスト中", reqAdded: "収録済み", reqCount: function (n) { return n + "回リクエスト"; },
      reqDemo: "（プレビュー用の見本です）", reqTitle: "リクエスト中の言葉", reqMine: "あなたのリクエスト",
      seeAll: "収録語一覧を見る",
      noTts: "このブラウザは読み上げに対応していません",
      noVoice: function (l) { return "この端末には" + l + "の音声がありません"; },
      copied: function (t) { return "「" + t + "」をコピーしました"; },
      copyFail: "コピーできませんでした",
      langs: { en: "英語", fr: "フランス語", it: "イタリア語", es: "スペイン語", de: "ドイツ語", ko: "韓国語", zh: "中国語", ja: "日本語" },
    },
    en: {
      notListed: function (q) { return "<b>“" + q + "” isn’t listed yet.</b> We add the most requested words first."; },
      request: function (q) { return "Request “" + q + "”"; },
      requestSoon: "Requests open soon",
      requestBtn: function (q) { return "Request “" + q + "”"; },
      requested: function (q) { return "Requested “" + q + "”"; },
      requestedLabel: "Requested",
      requestFail: "Couldn’t send. Please try again later.",
      reqLoading: "Loading…", reqEmpty: "No requests yet.", reqSoon: "Requests open soon.",
      reqPending: "Requested", reqAdded: "Added", reqCount: function (n) { return n === 1 ? "requested once" : "requested " + n + " times"; },
      reqDemo: "(Sample data for the preview)", reqTitle: "Requested words", reqMine: "your request",
      seeAll: "See all words",
      noTts: "This browser can’t play speech",
      noVoice: function (l) { return "This device has no " + l + " voice"; },
      copied: function (t) { return "Copied “" + t + "”"; },
      copyFail: "Couldn’t copy",
      langs: { en: "English", fr: "French", it: "Italian", es: "Spanish", de: "German", ko: "Korean", zh: "Chinese", ja: "Japanese" },
    },
    ko: {
      notListed: function (q) { return "<b>‘" + q + "’은(는) 아직 수록되지 않았습니다.</b> 요청이 많은 단어부터 추가하고 있습니다."; },
      request: function (q) { return "‘" + q + "’ 수록 요청하기"; },
      requestSoon: "요청 접수 준비 중입니다",
      requestBtn: function (q) { return "‘" + q + "’ 수록 요청하기"; },
      requested: function (q) { return "‘" + q + "’ 수록을 요청했습니다"; },
      requestedLabel: "요청 완료",
      requestFail: "보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
      reqLoading: "불러오는 중…", reqEmpty: "아직 요청이 없습니다.", reqSoon: "요청 접수 준비 중입니다.",
      reqPending: "요청 중", reqAdded: "수록 완료", reqCount: function (n) { return n + "회 요청"; },
      reqDemo: "(미리보기용 예시입니다)", reqTitle: "요청된 단어", reqMine: "내 요청",
      seeAll: "단어 목록 보기",
      noTts: "이 브라우저는 음성 읽기를 지원하지 않습니다",
      noVoice: function (l) { return "이 기기에는 " + l + " 음성이 없습니다"; },
      copied: function (t) { return "‘" + t + "’ 복사됨"; },
      copyFail: "복사하지 못했습니다",
      langs: { en: "영어", fr: "프랑스어", it: "이탈리아어", es: "스페인어", de: "독일어", ko: "한국어", zh: "중국어", ja: "일본어" },
    },
    zh: {
      notListed: function (q) { return "<b>“" + q + "”尚未收录。</b>我们会优先添加请求较多的词。"; },
      request: function (q) { return "请求收录“" + q + "”"; },
      requestSoon: "请求功能即将开放",
      requestBtn: function (q) { return "请求收录“" + q + "”"; },
      requested: function (q) { return "已请求收录“" + q + "”"; },
      requestedLabel: "已请求",
      requestFail: "发送失败，请稍后再试。",
      reqLoading: "加载中…", reqEmpty: "还没有请求。", reqSoon: "请求功能即将开放。",
      reqPending: "请求中", reqAdded: "已收录", reqCount: function (n) { return "请求" + n + "次"; },
      reqDemo: "（预览用示例）", reqTitle: "请求中的词语", reqMine: "你的请求",
      seeAll: "查看全部词语",
      noTts: "此浏览器不支持朗读",
      noVoice: function (l) { return "此设备没有" + l + "语音"; },
      copied: function (t) { return "已复制“" + t + "”"; },
      copyFail: "复制失败",
      langs: { en: "英语", fr: "法语", it: "意大利语", es: "西班牙语", de: "德语", ko: "韩语", zh: "中文", ja: "日语" },
    },
  };
  // フランス語・イタリア語・スペイン語・ドイツ語版は、今は文章が英語
  MSG.fr = MSG.it = MSG.es = MSG.de = MSG.en;
  var EU = ["fr", "it", "es", "de"];
  // 要素が属するページの表示言語（1ファイル版でもセクションごとに判定できるよう data-ui を見る）
  function uiOf(el) {
    var host = el && el.closest ? el.closest("[data-ui]") : null;
    if (host) return host.getAttribute("data-ui");
    var l = (document.documentElement.lang || "ja").slice(0, 2);
    return MSG[l] ? l : "ja";
  }

  // ---------- 正規化 ----------
  function norm(s) {
    s = String(s || "").normalize("NFKC").toLowerCase();
    s = s.replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x60); }); // カタカナ→ひらがな
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // アクセント・声調記号を除去
    return s.replace(/[\s\-・'’.()]/g, "");
  }
  function prep(list) { return (list || []).map(function (k) { return { raw: k, n: norm(k) }; }); }
  var LANG_KEYS = { ja: "k", en: "ke", ko: "kk", zh: "kz" };
  var PREP = INDEX.map(function (e) {
    var keys = {};
    for (var l in LANG_KEYS) keys[l] = prep(e[LANG_KEYS[l]]);
    EU.forEach(function (l) { keys[l] = prep(e.keu && e.keu[l]); });
    return { e: e, keys: keys };
  });

  function score(keys, nq) {
    var best = 0, hit = null;
    keys.forEach(function (k) {
      var sc = 0;
      if (k.n === nq) sc = 3;
      else if (k.n.indexOf(nq) === 0) sc = 2;
      else if (nq.length >= 2 && k.n.indexOf(nq) > 0) sc = 1;
      if (sc > best) { best = sc; hit = k.raw; }
    });
    return { s: best, hit: hit };
  }

  // 一番よく当たった言語の版へ。同点なら、ラテン文字の入力は 英語→日本語（ローマ字）→西→仏→伊→独→韓国語→中国語、
  // それ以外は 日本語→中国語→韓国語→英語→欧州語 の順で優先（猫・海 のように日本語と中国語で同じ字の語は日本語版になる）
  // さらに、同点のときは今いるページの言語を最優先（中国語版で「猫」→中国語版、イタリア語版で「luna」→イタリア語版）
  // ただしラテン文字の入力で今いるページが日本語・韓国語・中国語版のときは、上の順のまま
  var LATIN_LANGS = ["en", "fr", "it", "es", "de"];
  function search(q, ui) {
    var nq = norm(q);
    if (!nq) return [];
    var latin = /^[a-z\u00c0-\u024f\s'’-]+$/i.test(q.trim());
    var order = latin ? ["en", "ja", "es", "fr", "it", "de", "ko", "zh"] : ["ja", "zh", "ko", "en", "es", "fr", "it", "de"];
    if (ui && !(latin && LATIN_LANGS.indexOf(ui) < 0)) order = [ui].concat(order.filter(function (l) { return l !== ui; }));
    var out = [];
    PREP.forEach(function (p, i) {
      var hits = [];
      order.forEach(function (l, rank) {
        var r = score(p.keys[l], nq);
        if (r.s) hits.push({ e: p.e, score: r.s, hit: r.hit, lang: l, rank: rank, i: i });
      });
      if (!hits.length) return;
      var top = Math.max.apply(null, hits.map(function (h) { return h.score; }));
      hits = hits.filter(function (h) { return h.score === top; });
      // 完全一致が複数の言語にあるとき（luna＝イタリア語・スペイン語 など）はそれぞれ候補に出す。それ以外は一番優先の言語だけ
      if (top === 3) hits.forEach(function (h) { out.push(h); }); else out.push(hits[0]);
    });
    // 同点なら、見出しそのものに一致した語を先に（bonjour → 「こんにちは」を「bonjour (le matin)」より先に）
    out.forEach(function (r) { r.exactHead = norm(headOf(r)) === nq ? 0 : 1; });
    out.sort(function (a, b) { return b.score - a.score || a.exactHead - b.exactHead || a.rank - b.rank || a.i - b.i; });
    return out.slice(0, 8);
  }

  function headOf(r) { return { ja: r.e.ja, en: r.e.en, ko: r.e.ko, zh: r.e.zh }[r.lang] || (r.e.eu && r.e.eu[r.lang]); }
  var ROUTE = { ja: "w", en: "e", ko: "k", zh: "z", fr: "f", it: "i", es: "s", de: "d" };
  function wordUrl(r) {
    var seg = r.lang === "en" ? r.e.es : r.e.s;
    if (SPA) return "#" + ROUTE[r.lang] + "-" + seg;
    return ROOT + (r.lang === "ja" ? "" : r.lang + "/") + "word/" + seg + "/";
  }
  function listUrl(ui) { return SPA ? (ui === "ja" ? "#words" : "#" + ui + "-words") : ROOT + (ui === "ja" ? "" : ui + "/") + "words/"; }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // ---------- 数字（21 など）で検索したときは、開いたページの見出しも数字で出す ----------
  var digitsNext = null;
  function markDigits(q) {
    digitsNext = /^[0-9]+$/.test(norm(q)) ? "1" : null;
    try { if (digitsNext) sessionStorage.setItem("kw-digits", "1"); else sessionStorage.removeItem("kw-digits"); } catch (e) {}
  }
  function applyDigits(root) {
    var flag = digitsNext;
    try { flag = flag || sessionStorage.getItem("kw-digits"); sessionStorage.removeItem("kw-digits"); } catch (e) {}
    digitsNext = null;
    if (!flag) return;
    var h = root.querySelector("h1 [data-digits]");
    if (h) h.textContent = h.getAttribute("data-digits");
  }

  // ---------- 未収録語のリクエスト ----------
  // 同じ端末から同じ語を何度も送らないよう、送った語を覚えておく（保存できない環境では毎回送れる）
  // 保存できない環境（プライベートモードなど）でも、ページを開いている間は覚えておく
  var sessionRequests = [];
  function requestedList() {
    var saved = [];
    try { saved = JSON.parse(localStorage.getItem("kw-requested") || "[]"); } catch (e) {}
    var all = saved.concat(sessionRequests).map(function (x) { return typeof x === "string" ? { n: x, w: x } : x; });
    var seen = {};
    return all.filter(function (x) { if (!x || !x.n || seen[x.n]) return false; seen[x.n] = 1; return true; });
  }
  function wasRequested(q) { var n = norm(q); return requestedList().some(function (x) { return x.n === n; }); }
  function rememberRequest(q) {
    var item = { n: norm(q), w: q };
    sessionRequests.push(item);
    try { var l = requestedList(); localStorage.setItem("kw-requested", JSON.stringify(l.slice(-200))); } catch (e) {}
  }
  function sendRequest(q, ui) {
    if (!REQUEST_API) return new Promise(function (ok) { setTimeout(ok, 300); }); // プレビュー：送らない
    // Apps Script は別ドメインなので no-cors で送る（返事は読めないが、送信の成否は分かる）
    return fetch(REQUEST_API, { method: "POST", mode: "no-cors", body: new URLSearchParams({ word: q, lang: ui }) });
  }
  function requestsUrl(ui) {
    var eu = EU.indexOf(ui) >= 0 ? "en" : ui;
    return SPA ? (eu === "ja" ? "#requests" : "#" + eu + "-requests") : ROOT + (eu === "ja" ? "" : eu + "/") + "requests/";
  }
  // 「リクエスト中の言葉」ページ：受付から公開OKの語を読み込み、収録済みかどうかを検索で判定して表示
  var DEMO_ITEMS = [{ word: "虹色", count: 5 }, { word: "流れ星", count: 3 }, { word: "unicorn", count: 2 }, { word: "星", count: 4 }, { word: "こんにちは", count: 2 }];
  function renderRequests(root) {
    var box = root.querySelector("[data-requests]");
    if (!box) return;
    var ui = uiOf(box), m = MSG[ui];
    if (!REQUEST_API && !REQUEST_DEMO) { box.innerHTML = "<p>" + m.reqSoon + "</p>"; return; }
    box.innerHTML = "<p>" + m.reqLoading + "</p>";
    var load = REQUEST_API
      ? fetch(REQUEST_API).then(function (r) { return r.json(); }).then(function (d) { return d.items || []; })
      : Promise.resolve(DEMO_ITEMS);
    load.then(function (items) {
      // この端末から送った語は、一覧に公開される前でも「あなたのリクエスト」としてすぐ表示する
      var known = {};
      items = items.map(function (it) { known[norm(it.word)] = it; return { word: it.word, count: it.count }; });
      requestedList().forEach(function (x) {
        var hit = known[x.n];
        if (hit) { items.forEach(function (it) { if (norm(it.word) === x.n) it.mine = true; }); }
        else items.push({ word: x.w, count: 1, mine: true, onlyMine: true });
      });
      if (!items.length) { box.innerHTML = "<p>" + m.reqEmpty + "</p>"; return; }
      var pending = [], added = [];
      items.forEach(function (it) {
        var hit = search(it.word, ui)[0];
        if (hit && hit.score === 3) added.push({ it: it, r: hit }); else pending.push({ it: it });
      });
      pending.sort(function (a, b) { return (b.it.onlyMine ? 1 : 0) - (a.it.onlyMine ? 1 : 0) || b.it.count - a.it.count; });
      function chip(x) {
        var sub = x.it.onlyMine ? m.reqMine : m.reqCount(x.it.count) + (x.it.mine ? " · " + m.reqMine : "");
        var inner = escapeHtml(x.it.word) + "<small>" + sub + "</small>";
        return x.r ? '<a class="chip' + (x.it.mine ? " mine" : "") + '" href="' + wordUrl(x.r) + '">' + inner + "</a>" : '<span class="chip req-pending' + (x.it.mine ? " mine" : "") + '">' + inner + "</span>";
      }
      box.innerHTML = (REQUEST_API ? "" : '<p class="fine">' + m.reqDemo + "</p>") +
        '<section class="cat"><h2>' + m.reqPending + ' <span class="req-n">' + pending.length + "</span></h2>" +
        (pending.length ? '<div class="chips">' + pending.map(chip).join("") + "</div>" : "<p>" + m.reqEmpty + "</p>") + "</section>" +
        (added.length ? '<section class="cat"><h2>' + m.reqAdded + ' <span class="req-n">' + added.length + '</span></h2><div class="chips">' + added.map(chip).join("") + "</div></section>" : "");
    }, function () { box.innerHTML = "<p>" + m.requestFail + "</p>"; });
  }

  // ---------- トースト ----------
  var toastEl = document.getElementById("toast"), toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2400);
  }

  // ---------- 検索フォーム ----------
  function setupForm(form) {
    var input = form.querySelector("input");
    var list = form.querySelector(".suggest");
    var nf = form.querySelector(".notfound");
    var results = [], active = -1, composing = false;

    function close() { list.hidden = true; input.setAttribute("aria-expanded", "false"); active = -1; }
    function render() {
      nf.hidden = true;
      var q = input.value.trim();
      results = search(q, uiOf(form));
      if (!q || !results.length) { list.innerHTML = ""; close(); return; }
      list.innerHTML = results.map(function (r, i) {
        var head = headOf(r);
        var sub = r.lang === "ja" ? r.e.y : "";
        var small = { ja: r.e.p, en: r.e.pe, ko: r.e.pk, zh: r.e.pz }[r.lang] || r.e.pz;
        var via = (r.hit !== head && r.hit !== sub) ? '<span class="via">' + escapeHtml(r.hit) + " →</span>" : "";
        var tag = r.lang === "ja" ? "" : '<span class="tag">' + { en: "EN", ko: "KO", zh: "中", fr: "FR", it: "IT", es: "ES", de: "DE" }[r.lang] + "</span>";
        return '<li role="option" id="' + list.id + "-" + i + '" data-i="' + i + '"><a href="' + wordUrl(r) + '">' + via +
          "<b>" + escapeHtml(head) + "</b>" + (sub ? '<span class="y">' + escapeHtml(sub) + "</span>" : "") + tag +
          "<small>" + escapeHtml(small) + "</small></a></li>";
      }).join("");
      list.hidden = false;
      input.setAttribute("aria-expanded", "true");
      active = -1;
    }
    // 検索してページを移動するときは入力欄を空にする（戻る・1ファイル版の再表示で前の語が残らないように）
    function reset() { input.value = ""; list.innerHTML = ""; nf.hidden = true; close(); }
    function go(url, r, how) {
      var params = { search_term: input.value.trim(), result_lang: r ? r.lang : "", result_word: r ? r.e.s : "", method: how, page_lang: uiOf(form) };
      markDigits(input.value); reset(); trackThenGo("search", params, url);
    }
    list.addEventListener("click", function (e) {
      var a = e.target.closest("a"), li = e.target.closest("li");
      if (!a) return;
      var r = li ? results[+li.getAttribute("data-i")] : null;
      var params = { search_term: input.value.trim(), result_lang: r ? r.lang : "", result_word: r ? r.e.s : "", method: "suggestion", page_lang: uiOf(form) };
      var url = a.getAttribute("href");
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) { track("search", params); return; } // 新しいタブで開く操作はそのまま
      e.preventDefault(); markDigits(input.value); reset(); trackThenGo("search", params, url);
    });
    function highlight(n) {
      var items = list.querySelectorAll("li");
      if (!items.length) return;
      active = (n + items.length) % items.length;
      items.forEach(function (li, i) { li.classList.toggle("on", i === active); li.setAttribute("aria-selected", i === active ? "true" : "false"); });
      input.setAttribute("aria-activedescendant", items[active].id);
    }
    function showNotFound(q) {
      close();
      var ui = uiOf(form), m = MSG[ui], eq = escapeHtml(q);
      var btn = REQUEST_API || REQUEST_DEMO
        ? (wasRequested(q) ? '<button type="button" class="btn done" disabled>' + m.requestedLabel + "</button>"
          : '<button type="button" class="btn" data-request>' + m.requestBtn(eq) + "</button>")
        : REQUEST_URL
          ? '<a class="btn" href="' + REQUEST_URL + encodeURIComponent(q) + '" target="_blank" rel="noopener">' + m.request(eq) + "</a>"
          : '<span class="btn disabled">' + m.requestSoon + "</span>";
      nf.innerHTML = "<p>" + m.notListed(eq) + "</p>" + btn + '<p class="nf-sub"><a href="' + listUrl(ui) + '">' + m.seeAll + "</a>" +
        (REQUEST_API || REQUEST_DEMO ? ' ・ <a href="' + requestsUrl(ui) + '">' + m.reqTitle + "</a>" : "") + "</p>";
      nf.hidden = false;
      var link = nf.querySelector("a.btn");
      if (link) link.addEventListener("click", function () { track("request_word", { search_term: q, page_lang: uiOf(form) }); });
      var b = nf.querySelector("[data-request]");
      if (b) b.addEventListener("click", function () {
        b.disabled = true;
        track("request_word", { search_term: q, page_lang: ui });
        sendRequest(q, ui).then(function () {
          rememberRequest(q);
          b.textContent = m.requestedLabel; b.classList.add("done");
          toast(m.requested(q));
        }, function () { b.disabled = false; toast(m.requestFail); });
      });
    }

    input.addEventListener("compositionstart", function () { composing = true; });
    input.addEventListener("compositionend", function () { composing = false; render(); });
    input.addEventListener("input", render);
    input.addEventListener("focus", function () { if (input.value.trim()) render(); });
    input.addEventListener("keydown", function (e) {
      if (e.isComposing || composing) return;
      if (list.hidden) return;
      if (e.key === "ArrowDown") { e.preventDefault(); highlight(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); highlight(active - 1); }
      else if (e.key === "Escape") { close(); }
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = input.value.trim();
      if (!q) { input.focus(); return; }
      if (active >= 0 && results[active]) { go(wordUrl(results[active]), results[active], "keyboard"); return; }
      results = search(q, uiOf(form));
      if (results.length && (results[0].score === 3 || results.length === 1)) { go(wordUrl(results[0]), results[0], "enter"); return; }
      if (results.length) { render(); highlight(0); return; }
      track("search_not_found", { search_term: q, page_lang: uiOf(form) }); // 未収録語＝次に追加する語の候補
      showNotFound(q);
    });
    document.addEventListener("click", function (e) { if (form.isConnected && !form.contains(e.target)) close(); });
    input.value = ""; // ブラウザが前回の入力を復元した場合も空から始める
    return { input: input, reset: reset, submit: function () { form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true })); } };
  }
  var forms = Array.prototype.map.call(document.querySelectorAll("[data-search]"), setupForm);
  if (!SPA) { applyDigits(document); renderRequests(document); }

  // ?q= や 404 からの引き継ぎ
  (function () {
    var q = null;
    try { q = new URLSearchParams(location.search).get("q"); } catch (e) {}
    if (!q && window.KW_404) {
      var seg = location.pathname.replace(/\/+$/, "").split("/").pop();
      try { q = decodeURIComponent(seg || ""); } catch (e) { q = seg; }
      if (q === "404.html") q = "";
    }
    if (q && forms[0]) { forms[0].input.value = q; forms[0].submit(); }
  })();

  // 「戻る」でページがキャッシュから復元されたときも入力欄を空にする
  window.addEventListener("pageshow", function (e) { if (e.persisted) forms.forEach(function (f) { f.reset(); }); });

  // ---------- 1ファイル版のページ切り替え ----------
  // ページは window.KW_PAGES（{id: HTML}）に入っていて、開いたページだけ描画する
  if (SPA) {
    var app = document.getElementById("app");
    var route = function () {
      var parts = (location.hash || "#top").slice(1).split("--"), id = parts[0], anchor = parts[1];
      if (!window.KW_PAGES[id]) id = "top";
      app.innerHTML = '<section class="route" data-route="' + id + '">' + window.KW_PAGES[id] + "</section>";
      forms = Array.prototype.map.call(app.querySelectorAll("[data-search]"), setupForm);
      var main = app.querySelector("[data-ui]");
      var ui = main ? main.getAttribute("data-ui") : "ja";
      document.documentElement.lang = ui === "zh" ? "zh-Hans" : EU.indexOf(ui) >= 0 ? "en" : ui;
      applyDigits(app); renderRequests(app);
      var dest = anchor ? app.querySelector("#" + anchor) : null;
      if (dest) dest.scrollIntoView(); else window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", route);
    route();
  }

  // ---------- 発音 ----------
  var synth = window.speechSynthesis;
  function speak(text, lang, ui) {
    var m = MSG[ui];
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") { toast(m.noTts); return; }
    var voices = synth.getVoices();
    var base = lang.split("-")[0];
    var voice = voices.filter(function (v) { return v.lang.replace("_", "-") === lang; })[0] ||
      voices.filter(function (v) { return v.lang.toLowerCase().indexOf(base) === 0; })[0];
    if (voices.length && !voice) { track("tts_voice_missing", { word_lang: lang }); toast(m.noVoice(m.langs[base] || lang)); return; }
    synth.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    if (voice) u.voice = voice;
    u.rate = 0.85;
    synth.speak(u);
  }
  if (synth && synth.getVoices) synth.getVoices(); // 音声リストの読み込みを促す

  // 音声ファイルがあれば再生し、無い・再生できない場合は端末の読み上げに切り替える
  var currentAudio = null;
  function play(btn) {
    var text = btn.getAttribute("data-speak"), lang = btn.getAttribute("data-lang"), src = btn.getAttribute("data-audio"), ui = uiOf(btn);
    track("play_pronunciation", { word_lang: lang, word: text, source: src ? "audio_file" : "device_tts", page_lang: ui });
    if (!src || typeof Audio === "undefined") { speak(text, lang, ui); return; }
    if (currentAudio) { currentAudio.pause(); }
    if (synth) synth.cancel();
    var a = new Audio(src);
    currentAudio = a;
    var fellBack = false;
    function fallback() { if (fellBack) return; fellBack = true; speak(text, lang, ui); }
    a.addEventListener("error", fallback);
    var p = a.play();
    if (p && p.catch) p.catch(fallback);
  }

  // ---------- コピー ----------
  function copy(text, ui) {
    var m = MSG[ui];
    function done() { toast(m.copied(text)); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { toast(m.copyFail); }
      document.body.removeChild(ta);
    }
  }

  document.addEventListener("click", function (e) {
    var sp = e.target.closest("[data-speak]");
    if (sp) { play(sp); return; }
    var cp = e.target.closest("[data-copy]");
    if (cp) { track("copy_word", { word: cp.getAttribute("data-copy"), page_lang: uiOf(cp) }); copy(cp.getAttribute("data-copy"), uiOf(cp)); return; }
    var sw = e.target.closest(".lang-switch");
    if (sw) track("switch_language", { from: uiOf(sw), to: sw.getAttribute("hreflang") || "" });
  });
})();
