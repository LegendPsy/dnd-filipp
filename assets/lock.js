/* Открывает зашифрованную страницу паролем.
   Шифр: PBKDF2-SHA256 -> AES-GCM 256. В коде страницы лежит только шифр, без открытого текста. */
{
  const KEY = 'filipp-pass:' + location.pathname.replace(/index\.html$/, '');
  const norm = s => s.normalize('NFC').trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
  const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

  const decrypt = async (pass, d) => {
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(norm(pass)), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      {name: 'PBKDF2', salt: bytes(d.salt), iterations: d.iter, hash: 'SHA-256'},
      km, {name: 'AES-GCM', length: 256}, false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: bytes(d.iv)}, key, bytes(d.ct));
    return new TextDecoder().decode(plain);
  };

  const show = html => { document.open(); document.write(html); document.close(); };

  const data = JSON.parse(document.getElementById('payload').textContent);
  const form = document.getElementById('gate');
  const input = document.getElementById('pass');
  const keep = document.getElementById('keep');
  const btn = form.querySelector('button');
  const msg = document.getElementById('msg');
  const label = btn.textContent;

  const tryOpen = async (pass, remember) => {
    btn.disabled = true;
    btn.textContent = 'Открываю…';
    msg.textContent = '';
    try {
      const html = await decrypt(pass, data);
      try { if (remember) localStorage.setItem(KEY, pass); } catch (e) {}
      show(html);
      return true;
    } catch (e) {
      btn.disabled = false;
      btn.textContent = label;
      return false;
    }
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!input.value.trim()) { msg.textContent = 'Сначала введите пароль.'; input.focus(); return; }
    const ok = await tryOpen(input.value, keep.checked);
    if (!ok) {
      msg.textContent = 'Не тот пароль. Мысли расплываются.';
      form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
      input.select();
    }
  });

  if (!window.crypto || !crypto.subtle) {
    msg.textContent = 'Этот браузер не умеет открывать зашифрованные страницы. Попробуйте другой.';
    btn.disabled = true;
  } else {
    let saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved) tryOpen(saved, true).then(ok => { if (!ok) { try { localStorage.removeItem(KEY); } catch (e) {} } });
  }
}
