/* Psykids site script: WhatsApp links, form, measurement events, motion. Config comes from window.PSY (written by build.js). */
(function(){
  var d = document, root = d.documentElement, C = window.PSY || {};

  /* ---------- measurement: events for Google Tag Manager ---------- */
  window.dataLayer = window.dataLayer || [];
  function track(ev, extra){
    var o = {event: ev, page_name: C.page || ""};
    if (extra) for (var k in extra) o[k] = extra[k];
    window.dataLayer.push(o);
  }

  /* campaign parameters are kept while the visitor moves between pages */
  var utm = {};
  ["utm_source", "utm_medium", "utm_campaign", "gclid"].forEach(function(k){
    var v = null;
    try { v = new URLSearchParams(location.search).get(k); } catch (e) {}
    try { if (v) sessionStorage.setItem("psy_" + k, v); else v = sessionStorage.getItem("psy_" + k); } catch (e) {}
    if (v) utm[k] = v;
  });

  /* ---------- WhatsApp and phone links ---------- */
  var base = "https://wa.me/" + C.wa + "?text=";
  [].forEach.call(d.querySelectorAll("a[data-wa]"), function(a){
    a.href = base + encodeURIComponent(a.getAttribute("data-wa") || C.msg);
    a.addEventListener("click", function(){ track("whatsapp_click", {link_place: a.getAttribute("data-place") || ""}); });
  });
  [].forEach.call(d.querySelectorAll('a[href^="tel:"]'), function(a){
    a.addEventListener("click", function(){ track("phone_click"); });
  });
  if (C.view) track(C.view);

  /* ---------- trial lesson form ---------- */
  var form = d.getElementById("lead"), send = d.getElementById("lead-send");
  if (form && send){
    var err = d.getElementById("lead-err");
    var values = function(){
      var yas = form.querySelector('input[name="yas"]:checked');
      var gun = [].map.call(form.querySelectorAll('input[name="gunler"]:checked'), function(i){ return i.value; });
      return {
        ad: form.ad.value.trim(), telefon: form.telefon.value.trim(), yas: yas ? yas.value : "",
        gunler: gun.join(", "), izin: form.izin.checked ? "evet" : "hayır", bot: form.website.value
      };
    };
    var message = function(v){
      var l = [C.msg];
      if (v.ad) l.push("Ad soyad: " + v.ad);
      if (v.telefon) l.push("Telefon: " + v.telefon);
      if (v.yas) l.push("Çocuğumun yaşı: " + v.yas);
      if (v.gunler) l.push("Uygun günler: " + v.gunler);
      return l.join("\n");
    };
    var build = function(){
      var v = values();
      if (!C.endpoint) send.href = base + encodeURIComponent(message(v));
      return v;
    };
    var problem = function(v){
      if (v.ad.length < 3) return ["ad", "Lütfen adınızı ve soyadınızı yazın."];
      if (v.telefon.replace(/\D/g, "").length < 10) return ["telefon", "Lütfen telefon numaranızı eksiksiz yazın."];
      if (!v.yas) return ["yas", "Lütfen çocuğunuzun yaşını seçin."];
      return null;
    };
    form.addEventListener("input", build);
    form.addEventListener("change", build);
    form.addEventListener("submit", function(e){ e.preventDefault(); send.click(); });
    send.addEventListener("click", function(e){
      var v = build(), bad = problem(v);
      if (bad){
        e.preventDefault();
        var el = form.querySelector('[name="' + bad[0] + '"]'), box = el && el.closest('.field, fieldset');
        if (box) box.appendChild(err);                      /* show the message right under the field it is about */
        err.textContent = bad[1]; err.hidden = false;
        if (el){ try { el.focus({preventScroll: true}); } catch (x) { el.focus(); } }
        if (box) box.scrollIntoView({block: 'center', behavior: 'smooth'});
        return;
      }
      err.hidden = true;
      if (v.bot){ e.preventDefault(); return; }
      if (!C.endpoint){ track("whatsapp_click", {link_place: "form"}); return; }   /* the link itself opens WhatsApp */
      e.preventDefault();
      var body = new URLSearchParams();
      ["ad", "telefon", "yas", "gunler", "izin"].forEach(function(k){ body.append(k, v[k]); });
      body.append("sayfa", C.page || "");
      for (var k in utm) body.append(k, utm[k]);
      var go = function(){ location.href = C.thanks; };
      try { fetch(C.endpoint, {method: "POST", mode: "no-cors", body: body}).then(go, go); } catch (x) { go(); }
    });
    build();
  }

  /* ---------- motion (skipped entirely for reduced-motion visitors) ---------- */
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  root.classList.add("fx");

  function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
  function smooth(t){ return t * t * (3 - 2 * t); }
  function docTop(el){ var y = 0; while (el){ y += el.offsetTop; el = el.offsetParent; } return y; }

  var vw = innerWidth, vh = innerHeight, sy = -1, dirty = true;
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  var hero = d.querySelector(".hero"), scene = d.getElementById("scene"), heroH = 0;
  var rises = [].map.call(d.querySelectorAll("[data-rise]"), function(el){ return {el: el, i: +el.getAttribute("data-rise") || 0, top: 0, last: -1}; });
  var deps = [].map.call(d.querySelectorAll("[data-depth]"), function(el){ return {el: el, k: +el.getAttribute("data-depth"), mid: 0}; });

  /* pinned 3D scene (home page only) */
  var J = d.querySelector(".journey"), jTrack, stage, cards = [], dots = [], N = 0, D = 950;
  var jOn = false, jTop = 0, jLen = 1, jActive = -1, parts = [];
  if (J){
    jTrack = J.querySelector(".j-track"); stage = J.querySelector(".j-stage");
    cards = [].slice.call(J.querySelectorAll(".j-card")); dots = [].slice.call(J.querySelectorAll(".j-steps li"));
    N = cards.length;
    (function(){
      var s = 11, kinds = ["d-star", "d-heart", "d-cloud", "d-plane", "d-star", "d-squig"], cls = ["c-su", "c-co", "k k-km", "k k-co", "c-sg", "k k-ld"];
      function rnd(){ s = (s * 16807) % 2147483647; return s / 2147483647; }
      for (var i = 0; i < 28; i++){
        var e = d.createElement("i"), sz = 26 + rnd() * 78, x = (rnd() - .5) * 1.1;
        if (i % 2){ var q = (i >> 1) % 6; e.className = "j-p j-d"; e.innerHTML = '<svg class="' + cls[q] + '"><use href="#' + kinds[q] + '"/></svg>'; sz = 30 + rnd() * 46; }
        else { e.className = "j-p bub"; e.style.setProperty("--rot", (rnd() * 360).toFixed(0) + "deg"); }
        e.style.width = e.style.height = sz.toFixed(0) + "px";
        stage.insertBefore(e, stage.firstChild);
        parts.push({el: e, x: x + (x < 0 ? -.22 : .22), y: (rnd() - .5) * .9, z: 250 - rnd() * ((N - 1) * D + 1100)});
      }
    })();
  }

  function measure(){
    vw = innerWidth; vh = innerHeight;
    if (J){
      var on = vh >= 540;
      if (on !== jOn){
        jOn = on; J.classList.toggle("is-3d", on);
        if (!on) cards.forEach(function(c){ c.removeAttribute("style"); });
      }
      if (jOn){ jTop = docTop(jTrack); jLen = Math.max(1, jTrack.offsetHeight - stage.offsetHeight); }
    }
    heroH = hero ? hero.offsetHeight : 0;
    rises.forEach(function(r){ r.top = docTop(r.el); r.last = -1; });
    deps.forEach(function(p){ p.mid = docTop(p.el) + p.el.offsetHeight / 2; });
    dirty = true;
  }

  function updRise(){
    for (var i = 0; i < rises.length; i++){
      var r = rises[i], p = clamp((sy + vh - r.top - r.i * 46) / (vh * .46), 0, 1);
      if (p === r.last) continue; r.last = p;
      var e = 1 - Math.pow(1 - p, 3), q = 1 - e;
      r.el.style.transform = q < .001 ? "" :
        "perspective(1100px) translate3d(0," + (q * 70).toFixed(1) + "px,0) rotateX(" + (q * 30).toFixed(2) + "deg) scale(" + (.9 + .1 * e).toFixed(3) + ")";
    }
  }

  function updDepth(){
    for (var i = 0; i < deps.length; i++){
      var p = deps[i], off = p.mid - (sy + vh / 2);
      if (off < -vh * 1.2 || off > vh * 1.2) continue;
      p.el.style.transform = "translate3d(" + (mx * p.k * 16).toFixed(1) + "px," + (off * p.k * .16 + my * p.k * 12).toFixed(1) + "px,0)";
    }
  }

  function updJourney(){
    if (!J || !jOn || N < 2) return;
    var p = clamp((sy - jTop) / jLen, 0, 1);
    var t = p * (N - 1), i = Math.min(Math.floor(t), N - 2), f = t - i;
    var c = i + smooth(clamp((f - .2) / .6, 0, 1));
    var xoff = Math.min(vw * .34, 420);
    for (var k = 0; k < N; k++){
      var dd = k - c, z, x = 0, ry = 0, op, side = k % 2 ? 1 : -1;
      if (dd >= 0){ var m = Math.min(dd, 1); z = -dd * D; x = side * m * xoff; ry = -side * m * 30; op = clamp(1.12 - dd * .7, 0, 1); }
      else { z = -dd * 560; op = clamp(1 + dd * 2.3, 0, 1); }
      var st = cards[k].style;
      st.transform = "translate(-50%,-50%) translate3d(" + x.toFixed(1) + "px,0," + z.toFixed(1) + "px) rotateY(" + ry.toFixed(2) + "deg)";
      st.opacity = op.toFixed(3);
      st.visibility = op < .01 ? "hidden" : "visible";
      st.zIndex = dd < 0 ? 200 : 100 - Math.round(dd * 20);
      st.pointerEvents = Math.abs(dd) < .3 ? "auto" : "none";
    }
    for (var j = 0; j < parts.length; j++){
      var pt = parts[j], pz = pt.z + c * D;
      pt.el.style.transform = "translate3d(" + (pt.x * vw).toFixed(0) + "px," + (pt.y * vh).toFixed(0) + "px," + pz.toFixed(0) + "px)";
      pt.el.style.opacity = pz > 300 ? 0 : clamp(1 + pz / (D * 2.2), 0, .95).toFixed(2);
    }
    var a = Math.round(c);
    if (a !== jActive){
      jActive = a; stage.setAttribute("data-s", a);
      dots.forEach(function(el, n){ el.className = n === a ? "on" : ""; });
    }
  }

  /* the guide butterfly: flies to the newest flower on screen, hovers beside the page when its flower scrolls away */
  var fab = d.querySelector(".fab"), fabOn = null, foot = d.querySelector("footer");
  var bar = d.querySelector(".wabar"), barOff = null;
  var g = d.getElementById("guide"), perches = [].slice.call(d.querySelectorAll("[data-perch]"));
  var gx = 0, gy = 0, ga = 0, gInit = false, perched = false, cur = null, wasFly = null;
  function updGuide(now){
    if (!g || !perches.length) return;
    var act = perches[0], r;
    for (var i = 0; i < perches.length; i++){ r = perches[i].getBoundingClientRect(); if (r.top < vh * .72 && r.width) act = perches[i]; }
    r = act.getBoundingClientRect();
    var hover = r.bottom < 6, tx, ty;
    g.style.opacity = hover && vw < 1340 ? 0 : 1;   /* on narrow screens the hovering butterfly would sit over text */
    if (hover){
      tx = Math.min(vw - 62, (vw + 1240) / 2 + 6) + Math.cos(now / 1300) * 9;
      ty = vh * .24 + Math.sin(now / 900) * 14;
    } else { tx = r.left + r.width / 2 - 25; ty = r.top - 24; }
    if (!gInit){ gx = tx; gy = ty; gInit = true; }
    var dx = tx - gx, dy = ty - gy, dist = Math.sqrt(dx * dx + dy * dy), ta = 0;
    if (perched && !hover && act === cur){ gx = tx; gy = ty; }
    else {
      perched = false;
      if (dist > .01){
        var step = Math.min(dist, Math.max(dist * .07, 2.4));
        gx += dx / dist * step; gy += dy / dist * step;
      }
      if (!hover && dist < 1.6){ perched = true; cur = act; gx = tx; gy = ty; }
      if (dist > 14) ta = Math.atan2(dy, dx) * 57.3 + 90;
    }
    var da = ((ta - ga + 540) % 360) - 180; ga += da * .14;
    var fly = !perched;
    if (fly !== wasFly){ wasFly = fly; g.className = fly ? "guide fly" : "guide"; }
    var wob = fly && dist > 14 ? Math.sin(now / 80) * 2.5 : 0;
    g.style.transform = "translate3d(" + gx.toFixed(1) + "px," + (gy + wob).toFixed(1) + "px,0) rotate(" + ga.toFixed(1) + "deg)" + (vw <= 620 ? " scale(.82)" : "");
  }

  function frame(now){
    var y = window.pageYOffset || root.scrollTop || 0;
    mx += (tmx - mx) * .08; my += (tmy - my) * .08;
    if (y !== sy || dirty){
      sy = y; dirty = false; updRise(); updJourney();
      if (fab){
        var sr = send ? send.getBoundingClientRect() : null, fr = foot ? foot.getBoundingClientRect() : null;
        var formOn = !!(sr && sr.top < vh && sr.bottom > 0);
        var show = sy > heroH * .55 && !formOn && !(fr && fr.top < vh);   /* never cover the form button or the footer links */
        if (show !== fabOn){ fabOn = show; fab.classList.toggle("show", show); }
      }
      if (bar){
        var sb = send ? send.getBoundingClientRect() : null, off = !!(sb && sb.top < vh && sb.bottom > 0);
        if (off !== barOff){ barOff = off; bar.classList.toggle("off", off); }
      }
    }
    updDepth();
    if (scene && sy < heroH)
      scene.style.transform = "translateY(" + (-Math.min(sy * .12, 60)).toFixed(1) + "px) rotateX(" + (-my * 6 + Math.min(sy * .035, 16)).toFixed(2) + "deg) rotateY(" + (mx * 9).toFixed(2) + "deg)";
    updGuide(now);
    requestAnimationFrame(frame);
  }

  addEventListener("resize", measure);
  addEventListener("load", measure);
  addEventListener("pointermove", function(e){ if (e.pointerType === "touch") return; tmx = e.clientX / vw * 2 - 1; tmy = e.clientY / vh * 2 - 1; }, {passive: true});
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(measure);
  if (window.ResizeObserver) new ResizeObserver(measure).observe(d.body);
  measure();
  requestAnimationFrame(frame);
})();
