/* globals dnr, whois */
'use strict';
document.body.dataset.top = window.top === window && location.href.indexOf('pwa') === -1;

const resize = () => {
  if (window.top !== window) {
    requestAnimationFrame(() => {
      const height = document.body.getBoundingClientRect().height;
      window.top.document.getElementById('app').style.height = (30 + height) + 'px';
    });
  }
};

const build = link => dnr.guess(link).catch(e => {
  console.warn('dnr.js failed', e);
  return whois.guess(link, e.message).catch(() => {
    throw e;
  });
}).then(dnr => {
  if (document.body.dataset.ready === 'true') {
    return;
  }
  document.getElementById('name').textContent = dnr.name();
  document.getElementById('id').textContent = dnr.id();
  for (const {msg, href} of dnr.status()) {
    const a = document.createElement('a');
    a.textContent = msg;
    a.href = href;
    a.rel = 'noopener';
    a.target = '_blank';
    const li = document.createElement('li');
    li.appendChild(a);
    document.getElementById('status').appendChild(li);
  }
  for (const nameserver of dnr.nameservers()) {
    const li = document.createElement('li');
    li.textContent = nameserver;
    document.getElementById('nameservers').appendChild(li);
  }
  const {expiration, registration} = dnr.dates();
  document.getElementById('expiration').textContent = expiration;
  document.getElementById('registration').textContent = registration;

  for (const [name, obj] of Object.entries(dnr.contact())) {
    for (const [key, value] of Object.entries(obj)) {
      const parent = document.getElementById(name + '-' + key);
      if (parent) {
        parent.querySelector('span').textContent = value;
        parent.dataset.visible = true;
      }
    }
  }
  document.getElementById('delegation-signed').textContent = dnr.dns()['delegation-signed'] ? 'Signed' : 'Unsigned';

  document.body.dataset.ready = true;
  resize();
}).catch(e => {
  document.body.dataset.ready = true;
  console.error(e);
  alert(e.message);
});

{
  const search = document.querySelector('#search [type=search]');
  document.addEventListener('submit', e => {
    e.preventDefault();
    top.history.pushState({}, '', '?query=' + encodeURIComponent(search.value));
    location.reload();
  });
  search.addEventListener('search', () => {
    if (search.value === '') {
      document.body.dataset.ready = true;
    }
  });

  const args = new URLSearchParams(top.location.search);
  if (args.has('query')) {
    search.value = args.get('query');
    build(args.get('query'));
  }
  else if (chrome && chrome.tabs && chrome.tabs.query) {
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, tabs => {
      if (tabs && tabs.length) {
        search.value = tabs[0].url;
        build(tabs[0].url);
      }
      else {
        document.body.dataset.ready = true;
        resize();
      }
    });
  }
  else {
    document.body.dataset.ready = true;
    resize();
  }
}
resize();
