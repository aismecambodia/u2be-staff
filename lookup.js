// Phone ↔ name lookup for the staff forms (Client Record, Backfill), and prefill from appointment links.
// Works only on links that carry the staff key (#k=…, from the Softr apps
// or the pinned staff link). Without it, the form works as before.
(function () {
  var API = 'https://u2be-skin-scan.netlify.app/api/client';
  var LS = 'u2be_staffkey';
  var key = '';
  var m = (location.hash + '&' + location.search).match(/[#?&]k=([A-Za-z0-9_-]+)/);
  try {
    if (m) {
      localStorage.setItem(LS, m[1]);
      if (localStorage.getItem(LS) !== m[1]) throw new Error('not saved'); // keep the code in the address if it cannot be saved
      var qs = location.search.replace(/([?&])k=[^&]*&?/, '$1').replace(/[?&]$/, '');
      history.replaceState(null, '', location.pathname + qs);
    }
    key = localStorage.getItem(LS) || '';
  } catch (e) { key = m ? m[1] : ''; }
  // Keep the code in the page too: on some tablets / in-app browsers the saved copy is lost,
  // and the form then sent without it (every entry flagged "no staff code").
  window.u2beStaffKey = key || (m ? m[1] : '');

  var phone = document.getElementById('phone'), name = document.getElementById('name');
  if (!phone || !name) return;
  // Prefill from an appointment link: ?phone=…&name=…&date=YYYY-MM-DD
  var P = new URLSearchParams(location.search), prefilled = false;
  if (P.get('phone') && !phone.value) { phone.value = P.get('phone'); prefilled = true; }
  if (P.get('name') && !name.value) { name.value = P.get('name'); name.dataset.auto = '1'; }
  var dateEl = document.getElementById('date');
  if (dateEl && /^\d{4}-\d{2}-\d{2}$/.test(P.get('date') || '')) dateEl.value = P.get('date');
  var out = document.createElement('p');
  out.className = 'hint';
  out.id = 'lookup';
  phone.insertAdjacentElement('afterend', out);
  if (!key) {
    out.innerHTML = 'Name lookup: type the staff code once on this device · វាយលេខកូដបុគ្គលិកម្តង<br>' +
      '<input id="lkCode" type="text" autocapitalize="off" autocomplete="off" placeholder="staff code" style="width:140px;margin-top:6px"> ' +
      '<button type="button" id="lkSave" class="btn" style="padding:6px 12px">Save · រក្សាទុក</button>';
    document.getElementById('lkSave').onclick = function () {
      var c = (document.getElementById('lkCode').value || '').trim().toLowerCase();
      if (!c) return;
      try { localStorage.setItem(LS, c); } catch (e) {}
      window.u2beStaffKey = c;
      try { location.reload(); } catch (e) {}
    };
    return;
  }
  out.dataset.key = '1';

  name.addEventListener('input', function () { name.dataset.auto = ''; });

  var timer = null, last = '';
  function show(t, color) { out.innerHTML = t; out.style.color = color || ''; }
  function digits(v) {
    var d = String(v || '').replace(/[^0-9]/g, '');
    if (d.indexOf('855') === 0) d = '0' + d.slice(3); else if (d && d[0] !== '0') d = '0' + d;
    return d;
  }
  function look() {
    var d = digits(phone.value);
    if (d.length < 9 || d.length > 11) { if (!d) show(''); return; }
    if (d === last) return;
    last = d;
    show('Checking… · កំពុងពិនិត្យ…');
    fetch(API + '?phone=' + encodeURIComponent(d), { headers: { 'X-Staff-Key': key } })
      .then(function (r) { if (r.status === 403) throw new Error('403'); return r.json(); })
      .then(function (j) {
        if (digits(phone.value) !== d) return;
        try { document.dispatchEvent(new CustomEvent('u2be:client', { detail: j.found === 1 ? j : null })); } catch (x) {}
        if (j.found === 1) {
          if (!name.value.trim() || name.dataset.auto === '1') { name.value = j.name; name.dataset.auto = '1'; }
          var sh = j.master ? '<br>👥 Uses shared package of <b>' + String(j.master).replace(/</g, '&lt;') + '</b> · ' + (j.sharedLeft || 0) + ' left · ប្រើកញ្ចប់រួមរបស់អ្នកបង់' + ((j.sharedLeft || 0) <= 0 ? ' <span style="color:#C0392B">⚠ 0 left — sell a package</span>' : '') : '';
          var cr = (j.credit != null) ? '<br>💳 Homecare credit <b>$' + Number(j.credit).toFixed(2) + '</b>' + (j.creditDate ? ' (POS ' + j.creditDate + ')' : '') + ' · ក្រេឌីតនៅសល់' + (j.creditCheck === 'mismatch' ? ' <span style="color:#C0392B">⚠ check with Arifin</span>' : '') : '';
          show('✓ Found in CRM: <b>' + j.name.replace(/</g, '&lt;') + '</b> · ' + j.left + ' sessions left · វគ្គព្យាបាលនៅសល់ ' + j.left + sh + cr, '#2e7d4f');
        } else if (j.found > 1) {
          show('More than one client has this phone — type the name. Arifin will check. · មានអតិថិជនច្រើននាក់ប្រើលេខនេះ — សូមវាយឈ្មោះ', '#C0392B');
        } else if (j.found === 0) {
          if (name.dataset.auto === '1') { name.value = ''; name.dataset.auto = ''; }
          show('Not in the CRM — new client? Type the name. · មិនមានក្នុង CRM — អតិថិជនថ្មី? សូមវាយឈ្មោះ', '#9a6a00');
        } else {
          show('Lookup error (C) — type the name. · សូមវាយឈ្មោះ');
        }
      })
      .catch(function (e) { last = ''; if (e && e.message === '403') { try { localStorage.removeItem(LS); } catch (x) {} } show(e && e.message === '403' ? 'Staff code not accepted (A) — reload the page and type the code again. · លេខកូដមិនត្រឹមត្រូវ' : 'Lookup not reachable (B) — check internet. Type the name. · សូមវាយឈ្មោះ'); });
  }
  // Name search: type 3+ letters of the name → pick the client from a list.
  var list = document.createElement('div');
  list.id = 'nameList';
  list.style.cssText = 'margin-top:6px;display:none';
  name.insertAdjacentElement('afterend', list);
  var ntimer = null, nlast = '';
  function hideList() { list.style.display = 'none'; list.innerHTML = ''; }
  function nameSearch() {
    var q = name.value.toLowerCase().replace(/[^a-z0-9\u1780-\u17ff]/g, '');
    if (q.length < 3 || q === nlast) { if (q.length < 3) hideList(); return; }
    nlast = q;
    fetch(API + '?name=' + encodeURIComponent(q), { headers: { 'X-Staff-Key': key } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (name.value.toLowerCase().replace(/[^a-z0-9\u1780-\u17ff]/g, '') !== q) return;
        var items = (j && j.list) || [];
        if (!items.length) { list.innerHTML = '<p class="hint">No client found with this name — type the phone. · រកមិនឃើញ — សូមវាយលេខទូរស័ព្ទ</p>'; list.style.display = 'block'; return; }
        list.innerHTML = '<p class="hint" style="margin:0 0 4px">Tap the client · ចុចលើអតិថិជន</p>';
        items.forEach(function (it) {
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'btn';
          b.style.cssText = 'display:block;width:100%;text-align:left;margin:4px 0;padding:8px 10px;font-weight:400';
          b.textContent = it.name + ' · ' + it.phone + ' · ' + it.left + ' left' + (it.master ? ' · 👥 shared: ' + it.master + ' (' + (it.sharedLeft || 0) + ' left)' : '') + (it.credit != null ? ' · 💳 $' + Number(it.credit).toFixed(2) : '');
          b.onclick = function () { phone.value = it.phone; name.value = it.name; name.dataset.auto = '1'; hideList(); last = ''; look(); };
          list.appendChild(b);
        });
        list.style.display = 'block';
      })
      .catch(function () { nlast = ''; });
  }
  name.addEventListener('input', function () { if (name.dataset.auto === '1') return; clearTimeout(ntimer); ntimer = setTimeout(nameSearch, 600); });

  phone.addEventListener('input', function () { hideList(); clearTimeout(timer); timer = setTimeout(look, 600); });
  if (prefilled) look();
  phone.addEventListener('blur', look);
  var again = document.getElementById('again');
  if (again) again.addEventListener('click', function () { last = ''; nlast = ''; show(''); hideList(); name.dataset.auto = ''; history.replaceState(null, '', location.pathname); });
})();
