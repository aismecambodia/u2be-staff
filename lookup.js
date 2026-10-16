// Phone → name lookup for the staff forms (Client Record, Backfill).
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
      var qs = location.search.replace(/([?&])k=[^&]*&?/, '$1').replace(/[?&]$/, '');
      history.replaceState(null, '', location.pathname + qs);
    }
    key = localStorage.getItem(LS) || '';
  } catch (e) { key = m ? m[1] : ''; }

  var phone = document.getElementById('phone'), name = document.getElementById('name');
  if (!phone || !name) return;
  var out = document.createElement('p');
  out.className = 'hint';
  out.id = 'lookup';
  phone.insertAdjacentElement('afterend', out);
  if (!key) { out.textContent = 'Name lookup is off on this device — open the form from the app menu. · សូមបើកពីម៉ឺនុយកម្មវិធី'; return; }

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
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (digits(phone.value) !== d) return;
        if (j.found === 1) {
          if (!name.value.trim() || name.dataset.auto === '1') { name.value = j.name; name.dataset.auto = '1'; }
          show('✓ Found in CRM: <b>' + j.name.replace(/</g, '&lt;') + '</b> · ' + j.left + ' sessions left · វគ្គព្យាបាលនៅសល់ ' + j.left, '#2e7d4f');
        } else if (j.found > 1) {
          show('More than one client has this phone — type the name. Arifin will check. · មានអតិថិជនច្រើននាក់ប្រើលេខនេះ — សូមវាយឈ្មោះ', '#C0392B');
        } else if (j.found === 0) {
          if (name.dataset.auto === '1') { name.value = ''; name.dataset.auto = ''; }
          show('Not in the CRM — new client? Type the name. · មិនមានក្នុង CRM — អតិថិជនថ្មី? សូមវាយឈ្មោះ', '#9a6a00');
        } else {
          show('Lookup not available — type the name. · សូមវាយឈ្មោះ');
        }
      })
      .catch(function () { last = ''; show('Lookup not available — type the name. · សូមវាយឈ្មោះ'); });
  }
  phone.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(look, 600); });
  phone.addEventListener('blur', look);
  var again = document.getElementById('again');
  if (again) again.addEventListener('click', function () { last = ''; show(''); name.dataset.auto = ''; });
})();
