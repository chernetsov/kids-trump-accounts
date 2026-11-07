(function () {
  "use strict";

  var CFG = window.SITE_CONFIG;
  var DICT = window.I18N;
  var root = document.documentElement;
  var lang = DICT[root.lang] ? root.lang : "en";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DAY = 86400000;
  // Child pages (/vera/, /alisa/) set data-kid and data-root="../" on <html>.
  var ROOT = root.dataset.root || "";
  var FOCUS = CFG.kids.filter(function (k) { return k.id === root.dataset.kid; })[0] || null;
  var KIDS = FOCUS ? [FOCUS] : CFG.kids;
  var SIBLING = FOCUS ? CFG.kids.filter(function (k) { return k !== FOCUS; })[0] : null;

  /* ───────────── helpers ───────────── */
  function t(key, vars) {
    var s = (DICT[lang] && DICT[lang][key]) || DICT.en[key] || key;
    if (FOCUS) vars = Object.assign(focusVars(), vars || {});
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function locale() { return lang === "ru" ? "ru-RU" : "en-US"; }
  function money(v) {
    return new Intl.NumberFormat(locale(), { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.round(v));
  }
  function moneyShort(v, limit) {
    if (Math.abs(v) < (limit || 10000)) return money(v);
    return new Intl.NumberFormat(locale(), { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);
  }
  function num(v) { return new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(v); }
  function kidName(k) { return k.name[lang] || k.name.en; }
  function kidNameGen(k) { return (lang === "ru" && k.name.ruGenitive) || kidName(k); }
  function kidNameDat(k) { return (lang === "ru" && k.name.ruDative) || kidName(k); }
  function kidNameAcc(k) { return (lang === "ru" && k.name.ruAccusative) || kidName(k); }
  function nameVars(k) { return { name: kidName(k), nameGen: kidNameGen(k), nameDat: kidNameDat(k), nameAcc: kidNameAcc(k) }; }
  function focusVars() {
    var v = nameVars(FOCUS);
    v.date = monthDay(FOCUS);
    if (SIBLING) { v.sibling = kidName(SIBLING); v.siblingGen = kidNameGen(SIBLING); v.siblingAcc = kidNameAcc(SIBLING); }
    return v;
  }
  function asset(path) { return !path || /^(https?:|data:|\/)/.test(path) ? path : ROOT + path; }
  function monthDay(k) {
    return new Intl.DateTimeFormat(locale(), { month: "long", day: "numeric", timeZone: "UTC" })
      .format(new Date(Date.UTC(2000, k.birthday.month - 1, k.birthday.day)));
  }
  function birthDate(k) { return new Date(k.birthday.year, k.birthday.month - 1, k.birthday.day); }
  function ageYears(k, now) { return (now - birthDate(k)) / (365.2425 * DAY); }
  function ageWhole(k, now) {
    var b = k.birthday, a = now.getFullYear() - b.year;
    if (now.getMonth() + 1 < b.month || (now.getMonth() + 1 === b.month && now.getDate() < b.day)) a--;
    return a;
  }
  function daysToBirthday(k, now) {
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var next = new Date(today.getFullYear(), k.birthday.month - 1, k.birthday.day);
    if (next < today) next.setFullYear(next.getFullYear() + 1);
    return Math.round((next - today) / DAY);
  }
  function photoHTML(k, cls) {
    var p = k.photo || {};
    var alt = esc(t("kids.photoAlt", { name: kidName(k) }));
    var pos = p.focus ? ' style="object-position:' + esc(p.focus) + '"' : "";
    if (p.jpg || p.webp) {
      return '<picture>' +
        (p.webp ? '<source srcset="' + esc(asset(p.webp)) + '" type="image/webp">' : "") +
        '<img class="' + (cls || "") + '" src="' + esc(asset(p.jpg || p.webp)) + '" alt="' + alt + '" width="960" height="1200" loading="lazy" decoding="async"' + pos + ">" +
        "</picture>";
    }
    if (p.placeholder) {
      return '<img class="' + (cls || "") + '" src="' + esc(asset(p.placeholder)) + '" alt="' + alt + '" loading="lazy">';
    }
    return '<div class="ph" role="img" aria-label="' + esc(t("kids.photoSoon")) + '"><div><div class="ph__initial">' +
      esc(kidName(k).charAt(0)) + '</div><div class="ph__text">' + esc(t("kids.photoSoon")) + "</div></div></div>";
  }
  var kidsByAge = CFG.kids.slice().sort(function (a, b) { return birthDate(b) - birthDate(a); });

  /* ───────────── growth model ───────────── */
  // Gifts are made at the start of each year from today; yearly gifts stop after
  // Dec 31 of the year the child turns 17 (when Trump Account contributions close).
  function giftCount(k, freq, now) {
    var lastYear = k.birthday.year + 17;
    var remaining = lastYear - now.getFullYear() + 1;
    if (remaining <= 0) return 0;
    return freq === "yearly" ? remaining : 1;
  }
  function project(k, s, now) {
    var r = s.rate / 100;
    if (s.real) r = (1 + r) / (1 + CFG.calculator.inflation / 100) - 1;
    var a0 = ageYears(k, now);
    var n = giftCount(k, s.freq, now);
    function valueAt(age) {
      var T = age - a0, v = 0;
      for (var i = 0; i < n; i++) if (i <= T) v += s.amount * Math.pow(1 + r, T - i);
      return v;
    }
    return { n: n, given: s.amount * n, v18: valueAt(18), v30: valueAt(30), v60: valueAt(60) };
  }

  /* ───────────── i18n application ───────────── */
  function applyStatic() {
    root.lang = lang;
    document.title = t(FOCUS ? "kid.meta.title" : "meta.title");
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", t(FOCUS ? "kid.meta.description" : "meta.description"));
    function key(el, base) { return (FOCUS && el.dataset.i18nKid) || base; }
    document.querySelectorAll("[data-i18n]").forEach(function (el) { el.textContent = t(key(el, el.dataset.i18n)); });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) { el.innerHTML = t(key(el, el.dataset.i18nHtml)); });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.dataset.i18nAria)); });
    document.querySelectorAll(".lang__btn").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.lang === lang));
    });
    document.getElementById("real-hint").textContent = t("calc.realHint", { rate: num(CFG.calculator.inflation) });
  }
  function setLang(next) {
    if (!DICT[next] || next === lang) return;
    lang = next;
    try { localStorage.setItem("lang", lang); } catch (e) {}
    renderAll(false);
  }
  document.querySelectorAll(".lang__btn").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.dataset.lang); });
  });

  /* ───────────── hero art ───────────── */
  function renderHero() {
    var el = document.getElementById("hero-art");
    var now = new Date();
    var a = CFG.kids[0], b = CFG.kids[1] || CFG.kids[0];
    var young = FOCUS || kidsByAge[0];
    var p = project(young, { amount: 100, freq: "once", rate: CFG.calculator.defaultReturn, real: false }, now);
    var cta = document.getElementById("hero-cta");
    if (FOCUS && FOCUS.contributeUrl) { cta.href = FOCUS.contributeUrl; cta.target = "_blank"; cta.rel = "noopener"; }
    function card(k, cls) {
      return '<figure class="polaroid ' + cls + '"><div class="polaroid__img">' + photoHTML(k) + "</div>" +
        '<figcaption class="polaroid__cap"><span class="polaroid__name">' + esc(kidName(k)) + "</span>" +
        '<span class="polaroid__date">' + esc(monthDay(k)) + "</span></figcaption></figure>";
    }
    el.classList.toggle("hero__art--single", !!FOCUS);
    var d = FOCUS ? daysToBirthday(FOCUS, now) : 0;
    var cards = FOCUS
      ? card(FOCUS, "polaroid--solo") + '<div class="bday-chip"><svg class="bday-chip__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="9" width="18" height="4" rx="1"/><path d="M5 13v7h14v-7M12 9v11M12 9c-1.5-3-5-4-5-1.5S10 9 12 9zm0 0c1.5-3 5-4 5-1.5S14 9 12 9z"/></svg>' +
        esc(d === 0 ? t("kids.today") : d === 1 ? t("kids.next1") : t("kid.hero.countdown", { n: d })) + "</div>"
      : card(a, "polaroid--a") + card(b, "polaroid--b");
    el.innerHTML = cards +
      '<div class="growth-chip">' +
      '<svg class="growth-chip__spark" viewBox="0 0 64 40"><defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d4b06a" stop-opacity=".45"/><stop offset="1" stop-color="#d4b06a" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="M2 36 C 20 34, 34 28, 44 18 S 58 6, 62 3 L62 40 L2 40 Z" fill="url(#sg)"/>' +
      '<path d="M2 36 C 20 34, 34 28, 44 18 S 58 6, 62 3" fill="none" stroke="#b88a3e" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="62" cy="3" r="2.6" fill="#1f2a44"/></svg>' +
      "<div><div class=\"growth-chip__today\">" + esc(t("hero.chipToday", { amount: money(100) })) + "</div>" +
      '<div class="growth-chip__later">' + esc(t("hero.chipLater", Object.assign(nameVars(young), { amount: money(p.v30) }))) + "</div>" +
      '<div class="growth-chip__note">' + esc(t("hero.chipNote", { rate: num(CFG.calculator.defaultReturn) })) + "</div></div></div>";
  }

  /* ───────────── calculator ───────────── */
  var form = document.getElementById("calc-form");
  var amountEl = document.getElementById("amount");
  var rateEl = document.getElementById("rate");
  var realEl = document.getElementById("real");
  var chartEl = document.getElementById("chart");
  var shown = null;
  var anim = null;

  amountEl.value = CFG.calculator.defaultAmount;
  amountEl.max = CFG.calculator.annualLimit;
  rateEl.value = CFG.calculator.defaultReturn;

  function readState() {
    var amt = Math.max(0, Math.min(CFG.calculator.annualLimit, parseFloat(amountEl.value) || 0));
    return {
      amount: amt,
      freq: form.querySelector('input[name="freq"]:checked').value,
      rate: parseFloat(rateEl.value),
      real: realEl.checked,
    };
  }

  function niceMax(v) {
    if (v <= 0) return 100;
    var exp = Math.pow(10, Math.floor(Math.log10(v)));
    var steps = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10];
    for (var i = 0; i < steps.length; i++) if (steps[i] * exp >= v) return steps[i] * exp;
    return 10 * exp;
  }

  function drawChart(data, yMax) {
    var W = Math.max(280, chartEl.clientWidth || 640);
    var compact = W < 520;
    var H = compact ? 300 : 340;
    var padL = compact ? 44 : 56, padR = 6, padT = 26, padB = compact ? 64 : 70;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var groups = data.length;
    var gGap = compact ? 18 : 40;
    var gW = (plotW - gGap * (groups - 1)) / groups;
    var bars = 4, bGap = compact ? 8 : 12;
    var bW = Math.min(groups === 1 ? 96 : 64, (gW - bGap * (bars - 1)) / bars);
    var inner = bW * bars + bGap * (bars - 1);
    var y = function (v) { return padT + plotH - (Math.max(0, v) / yMax) * plotH; };
    var out = [];

    out.push('<g class="grid">');
    for (var i = 0; i <= 4; i++) {
      var tv = (yMax / 4) * i, ty = y(tv);
      out.push('<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + ty + '" y2="' + ty + '"/>');
      out.push('<text x="' + (padL - 10) + '" y="' + (ty + 4) + '" text-anchor="end">' + esc(moneyShort(tv, compact ? 1000 : 10000)) + "</text>");
    }
    out.push("</g>");

    data.forEach(function (d, gi) {
      var gx = padL + gi * (gW + gGap) + (gW - inner) / 2;
      var vals = [d.given, d.v18, d.v30, d.v60];
      var labels = [t(compact ? "calc.givenShort" : "calc.given"), "18", "30", "60"];
      vals.forEach(function (v, bi) {
        var x = gx + bi * (bW + bGap), top = y(v), h = padT + plotH - top;
        var r = Math.min(10, bW / 3, h);
        var fill = bi === 0 ? "#c9cdd8" : "url(#barGrad" + bi + ")";
        out.push('<path class="bar" d="M' + x + "," + (padT + plotH) + "V" + (top + r) + "Q" + x + "," + top + " " + (x + r) + "," + top +
          "H" + (x + bW - r) + "Q" + (x + bW) + "," + top + " " + (x + bW) + "," + (top + r) + "V" + (padT + plotH) + 'Z" fill="' + fill + '"/>');
        out.push('<text class="bar-value" x="' + (x + bW / 2) + '" y="' + (top - 8) + '" text-anchor="middle"' +
          (compact ? ' style="font-size:11px"' : "") + ">" + esc(moneyShort(v, compact ? 1000 : 10000)) + "</text>");
        out.push('<g class="axis"><text x="' + (x + bW / 2) + '" y="' + (padT + plotH + 20) + '" text-anchor="middle"' +
          (bi === 0 && compact ? ' style="font-size:10.5px"' : "") + ">" + esc(labels[bi]) + "</text></g>");
      });
      out.push('<text class="group-label" x="' + (gx + inner / 2) + '" y="' + (H - 10) + '" text-anchor="middle"' +
        (compact ? ' style="font-size:22px"' : "") + ">" + esc(d.name) + "</text>");
    });

    var defs = "<defs>" + [1, 2, 3].map(function (i) {
      var o = 0.55 + i * 0.15;
      return '<linearGradient id="barGrad' + i + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e2c385" stop-opacity="' + o +
        '"/><stop offset="1" stop-color="#b88a3e" stop-opacity="' + o + '"/></linearGradient>';
    }).join("") + "</defs>";

    chartEl.innerHTML = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' + defs +
      '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + (padT + plotH) + '" y2="' + (padT + plotH) + '" stroke="rgba(19,26,43,.25)"/>' +
      out.join("") + "</svg>";
  }

  function lerp(a, b, k) { return a + (b - a) * k; }
  function tweenTo(target) {
    if (anim) cancelAnimationFrame(anim);
    var from = shown || target.map(function (d) { return { name: d.name, given: 0, v18: 0, v30: 0, v60: 0, yMax: d.yMax }; });
    if (reduceMotion) { shown = target; drawChart(target, target[0].yMax); return; }
    var start = performance.now(), dur = shown ? 650 : 1300;
    function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      var frame = target.map(function (d, i) {
        var f = from[i] || from[0];
        return { name: d.name, given: lerp(f.given, d.given, e), v18: lerp(f.v18, d.v18, e), v30: lerp(f.v30, d.v30, e), v60: lerp(f.v60, d.v60, e) };
      });
      var yMax = lerp(from[0].yMax || target[0].yMax, target[0].yMax, e);
      drawChart(frame, yMax);
      shown = frame.map(function (f) { f.yMax = yMax; return f; });
      if (p < 1) anim = requestAnimationFrame(step);
    }
    anim = requestAnimationFrame(step);
  }

  var chartStarted = false;
  function updateCalc(animate) {
    var s = readState();
    var now = new Date();
    document.getElementById("rate-out").textContent = num(s.rate) + "%";
    rateEl.style.setProperty("--p", (s.rate / parseFloat(rateEl.max)) * 100 + "%");
    rateEl.setAttribute("aria-valuetext", num(s.rate) + "%");
    document.getElementById("yearly-hint").hidden = s.freq !== "yearly";
    document.querySelectorAll(".chip").forEach(function (c) {
      c.setAttribute("aria-pressed", String(parseFloat(c.dataset.amount) === s.amount));
    });

    var results = KIDS.map(function (k) {
      var p = project(k, s, now);
      p.kid = k; p.name = kidName(k);
      return p;
    });
    var yMax = niceMax(Math.max.apply(null, results.map(function (r) { return r.v60; })) * 1.04);
    var target = results.map(function (r) { return { name: r.name, given: r.given, v18: r.v18, v30: r.v30, v60: r.v60, yMax: yMax }; });

    var young = results.filter(function (r) { return r.kid === (FOCUS || kidsByAge[0]); })[0];
    document.getElementById("calc-summary").innerHTML = t("calc.summary", {
      amount: esc(money(s.amount)),
      freq: esc(t(s.freq === "yearly" ? "calc.freqYearly" : "calc.freqOnce")),
      name: esc(young.name),
      nameGen: esc(kidNameGen(young.kid)),
      v18: esc(money(young.v18)),
      v60: esc(money(young.v60)),
    });

    chartEl.setAttribute("aria-label", t("calc.chartLabel") + ". " + results.map(function (r) {
      return r.name + ": " + t("calc.given") + " " + money(r.given) + ", " + t("calc.at", { age: 18 }) + " " + money(r.v18) +
        ", " + t("calc.at", { age: 30 }) + " " + money(r.v30) + ", " + t("calc.at", { age: 60 }) + " " + money(r.v60);
    }).join("; "));

    var stats = document.getElementById("kid-stats");
    stats.classList.toggle("kid-stats--single", results.length === 1);
    stats.innerHTML = results.map(function (r) {
      var gifts = r.n === 1 ? t("calc.payment1") : t("calc.payments", { n: r.n });
      return '<div class="kid-stat"><div class="kid-stat__avatar">' + photoHTML(r.kid) + "</div>" +
        '<div class="kid-stat__name">' + esc(r.name) + " · " + esc(t("calc.given").toLowerCase()) + " " + esc(money(r.given)) + "</div>" +
        '<div class="kid-stat__meta">' + esc(t("calc.now", { age: ageWhole(r.kid, now) })) + " · " + esc(gifts) + "</div></div>";
    }).join("");

    if (!chartStarted) return;
    if (animate === false) { if (anim) cancelAnimationFrame(anim); shown = target; drawChart(target, yMax); }
    else tweenTo(target);
  }

  form.addEventListener("input", function () { updateCalc(true); });
  form.addEventListener("change", function () { updateCalc(true); });
  amountEl.addEventListener("blur", function () { amountEl.value = readState().amount; });
  document.querySelectorAll(".chip").forEach(function (c) {
    c.addEventListener("click", function () { amountEl.value = c.dataset.amount; updateCalc(true); });
  });
  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () { if (chartStarted && shown) drawChart(shown, shown[0].yMax); }, 120);
  });

  /* ───────────── kids ───────────── */
  function renderKids() {
    var now = new Date();
    var list = document.getElementById("kids-list");
    list.classList.toggle("kids--single", !!FOCUS);
    list.innerHTML = KIDS.map(function (k) {
      var name = kidName(k);
      var d = daysToBirthday(k, now);
      var count = d === 0 ? t("kids.today") : d === 1 ? t("kids.next1") : t("kids.next", { n: d });
      var btn = k.contributeUrl
        ? '<a class="btn btn--primary btn--lg" href="' + esc(k.contributeUrl) + '" target="_blank" rel="noopener" aria-describedby="official-' + k.id + '">' +
          esc(t("kids.contribute", nameVars(k))) +
          ' <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 13L13 7M8 7h5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></a>' +
          '<p class="kid__note" id="official-' + k.id + '">' + esc(t("kids.official")) + "</p>"
        : '<span class="btn btn--lg" role="link" aria-disabled="true">' + esc(t("kids.soon")) + "</span>" +
          '<p class="kid__note">' + esc(t("kids.soonNote")) + "</p>";
      var qr = k.qrImage
        ? '<div class="qr__box"><img src="' + esc(asset(k.qrImage)) + '" alt="QR: ' + esc(name) + '" width="76" height="76" loading="lazy"></div>' +
          '<div class="qr__text"><strong>' + esc(t("kids.qr")) + "</strong>" + esc(t("kids.official")) + "</div>"
        : '<div class="qr__box qr__box--empty"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h3v-3"/></svg></div>' +
          '<div class="qr__text"><strong>' + esc(t("kids.qr")) + "</strong>" + esc(t("kids.qrSoon")) + "</div>";
      return '<article class="kid reveal is-in" id="kid-' + k.id + '">' +
        '<div class="kid__photo">' + photoHTML(k) +
        '<div class="kid__overlay"><h3 class="kid__name">' + esc(name) + "</h3>" +
        '<div class="kid__bday"><span class="kid__bday-label">' + esc(t("kids.birthday")) + '</span><span class="kid__bday-date">' + esc(monthDay(k)) + "</span></div></div></div>" +
        '<div class="kid__body">' +
        '<span class="kid__countdown">' + esc(count) + "</span>" +
        (FOCUS ? '<h3 class="h3 kid__title">' + esc(t("kid.card.title")) + '</h3><p class="kid__text">' + esc(t("kid.card.note")) + "</p>" : "") +
        '<div class="kid__actions">' + btn + '<div class="qr">' + qr + "</div>" +
        '<div class="kid__links">' +
        (FOCUS ? "" : '<a href="' + esc(ROOT + k.id + "/") + '">' + esc(t("kids.page", nameVars(k))) + " →</a>") +
        '<a href="#give">' + esc(t("kids.abroad")) + "</a></div></div>" +
        "</div></article>";
    }).join("") + (SIBLING
      ? '<a class="sibling reveal is-in" href="' + esc(ROOT + SIBLING.id + "/") + '">' +
        '<span class="sibling__photo">' + photoHTML(SIBLING) + "</span>" +
        '<span class="sibling__text"><span>' + esc(t("kid.sibling")) + "</span><strong>" + esc(t("kid.siblingLink")) + " →</strong></span></a>"
      : "");
  }

  /* ───────────── payment methods ───────────── */
  function renderPay() {
    var methods = [
      { key: "wise", label: "Wise", mark: "W", data: CFG.abroad.wise || {} },
      { key: "paypal", label: "PayPal", mark: "P", data: CFG.abroad.paypal || {} },
    ];
    document.getElementById("pay-methods").innerHTML = methods.map(function (m) {
      var handle = m.data.handle || "";
      var url = m.data.url || "";
      var shownHandle = handle || url.replace(/^https?:\/\//, "");
      var btns = "";
      if (handle) btns += '<button type="button" class="btn btn--ghost" data-copy="' + esc(handle) + '">' + esc(t("give.ab.copy")) + "</button>";
      if (url) btns += '<a class="btn btn--primary" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(m.label) + " ↗</a>";
      return '<div class="pay__item"><span class="pay__logo pay__logo--' + m.key + '" aria-hidden="true">' + m.mark + "</span>" +
        '<div class="pay__info"><div class="pay__name">' + m.label + "</div>" +
        (shownHandle
          ? '<div class="pay__handle">' + esc(shownHandle) + "</div>"
          : '<div class="pay__handle pay__handle--soon">' + esc(t("give.ab.soon")) + "</div>") +
        "</div>" + (btns ? '<div class="pay__btns">' + btns + "</div>" : "") + "</div>";
    }).join("");

    var contact = document.getElementById("contact-link");
    if (CFG.contactUrl) {
      contact.href = CFG.contactUrl;
      contact.hidden = false;
      if (/^https?:/.test(CFG.contactUrl)) { contact.target = "_blank"; contact.rel = "noopener"; }
    }
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]");
    if (!b) return;
    var text = b.dataset.copy;
    var done = function () {
      b.textContent = t("give.ab.copied");
      setTimeout(function () { b.textContent = t("give.ab.copy"); }, 1600);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
    else {
      var ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (err) {}
      ta.remove();
    }
  });

  /* ───────────── motion & nav ───────────── */
  var nav = document.querySelector(".nav");
  function onScroll() { nav.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function observeReveal() {
    var els = document.querySelectorAll(".reveal:not(.is-in)");
    if (!("IntersectionObserver" in window) || reduceMotion) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  }

  function startChartWhenVisible() {
    if (!("IntersectionObserver" in window)) { chartStarted = true; updateCalc(true); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        io.disconnect();
        chartStarted = true;
        updateCalc(true);
      }
    }, { threshold: 0.2 });
    io.observe(chartEl);
  }

  function renderAll(first) {
    applyStatic();
    renderHero();
    renderKids();
    renderPay();
    updateCalc(false);
    if (first) { observeReveal(); startChartWhenVisible(); }
  }

  renderAll(true);
})();
