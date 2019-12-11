/* globals dnr */

'use strict';

const build = link => dnr.guess(link).then(() => {
  if (document.body.dataset.ready === 'true') {
    return;
  }
  document.getElementById('name').textContent = dnr.name();
  document.getElementById('id').textContent = dnr.id();
  for (const {msg, href} of dnr.status()) {
    const a = document.createElement('a');
    a.textContent = msg;
    a.href = href;
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
}).catch(e => {
  document.body.dataset.ready = true;
  console.error(e);
  alert(e.message);
});

{
  const search = document.querySelector('#search [type=search]');
  document.addEventListener('submit', e => {
    e.preventDefault();
    location.replace('?query=' + encodeURIComponent(search.value));
  });
  search.addEventListener('search', () => {
    if (search.value === '') {
      document.body.dataset.ready = true;
    }
  });

  const args = new URLSearchParams(location.search);
  if (args.has('query')) {
    search.value = args.get('query');
    build(args.get('query'));
  }
  else if (chrome && chrome.tabs) {
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
      }
    })
  }
  else {
    document.body.dataset.ready = true;
  }
}
