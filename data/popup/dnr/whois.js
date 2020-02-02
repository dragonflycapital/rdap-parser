/* globals tld */
'use strict';

const whois = {
  parse(keyword) {
    const results = [];
    let record = false;
    for (const line of this.content.split('\n')) {
      if (record) {
        if (line.trim()) {
          results.push(line.trim());
        }
        else {
          break;
        }
      }
      if (line.trim().toLowerCase() === keyword.toLowerCase()) {
        record = true;
      }
    }
    return results;
  },
  object(arr) {
    const cache = {
      '': []
    };
    let key = '';
    for (const line of arr) {
      if (/[\w\s]+:\s/.test(line)) {
        const [a, ...bs] = line.split(':');
        key = a;
        cache[key] = cache[key] || [];
        cache[key].push(bs.join('').trim());
      }
      else {
        cache[key].push(line);
      }
    }

    return Object.keys(cache).reduce((p, c) => {
      if (cache[c].length) {
        if (c.toLowerCase() === 'website' || c.toLowerCase() === 'url') {
          p.web = cache[c].join('\n');
        }
        else {
          p[c.toLowerCase()] = cache[c].join('\n');
        }
      }
      return p;
    }, {});
  },
  async guess(link) {
    const domain = tld.getDomain(link);
    const resp = await fetch('https://www.whois.com/whois/' + domain);
    this.content = await resp.text();

    return this;
  },
  name() {
    const m = /domain:\s+([\w.]+)/i.exec(this.content);
    return m ? m[1] : '-';
  },
  id() {
    return '';
  },
  status() {
    const m = /state:\s+([\w, ]+)/i.exec(this.content) ||
              /status:\s+([\w, ]+)/i.exec(this.content);
    if (m) {
      return m[1].split(/\s*,\s*/).map(msg => ({
        msg,
        href: 'https://icann.org/epp#'
      }));
    }
    else {
      return [];
    }
  },
  nameservers() {
    const m = this.content.match(/nserver:\s+([\w -.:]+)/ig);
    const n = this.content.match(/name server:\s+([\w -.:]+)/ig);
    if (m) {
      return m.map(s => /nserver:\s+([\w -.:]+)/i.exec(s)[1]);
    }
    else if (n) {
      return n.map(s => /name server:\s+([\w -.:]+)/i.exec(s)[1]);
    }
    else {
      const o = whois.parse('nameservers');
      if (o.length) {
        return o;
      }
      return whois.parse('Name Servers:');
    }
  },
  dates() {
    const oe = /created:\s*([\w:-]+)/i.exec(this.content) ||
               /Registration Date:\s*([\w:-]+)/i.exec(this.content) ||
               /Registered on:\s*([\w:-]+)/i.exec(this.content) ||
               /Creation Date:\s*([\w:-]+)/i.exec(this.content) ||
               /Changed:\s*([\w:-]+)/i.exec(this.content);
    const or = /paid-till:\s*([\w:-]+)/i.exec(this.content) ||
               /expire[ -]date:\s*([\w:-]+)/i.exec(this.content) ||
               /Renewal Date:\s*([\w:-]+)/i.exec(this.content) ||
               /Registry Expiry Date:\s*([\w:-]+)/i.exec(this.content);
    return {
      'expiration': or ? or[1] : 'unknown',
      'registration': oe ? oe[1] : 'unknown'
    };
  },
  contact() {
    const contact = {};

    const oa = /admin-contact:\s+([ \w-:/.@]+)/i.exec(this.content) ||
               /Admin Name:\s+([ \w-:/.@]+)/i.exec(this.content) ||
               /Admin-c:\s+([ \w-:/.@]+)/i.exec(this.content);
    if (oa && oa[0].indexOf('\n') === -1) {
      contact.administrative = {
        [oa[1].startsWith('http') ? 'web' : 'name']: oa[1]
      };
    }
    else {
      const r = this.parse('Admin Contact');
      if (r.length) {
        contact.administrative = this.object(r);
      }
    }
    const ot = /technical-contacts:\s+([ \w-:/.@]+)/i.exec(this.content) ||
               /Tech Name:\s+([ \w-:/.@]+)/i.exec(this.content) ||
               /Tech-c:\s+([ \w-:/.@]+)/i.exec(this.content);
    if (ot && ot[0].indexOf('\n') === -1) {
      contact.technical = {
        [ot[1].startsWith('http') ? 'web' : 'name']: ot[1]
      };
    }
    else {
      const r = this.parse('Technical Contacts');
      if (r.length) {
        contact.technical = this.object(r);
      }
    }
    const ob = /abuse-contact:\s+([ \w-:/.@]+)/i.exec(this.content) ||
               /Registrar Abuse Contact:\s+([ \w-:/.@]+)/i.exec(this.content);

    if (ob && ob[0].indexOf('\n') === -1) {
      contact.abuse = {
        [ob[1].startsWith('http') ? 'web' : 'name']: ob[1]
      };
    }
    else {
      const r = this.parse('Abuse Contact');
      if (r.length) {
        contact.abuse = this.object(r);
      }
    }
    const or = /registrar:\s+([ \w-:/.@]+)/i.exec(this.content) ||
               /Registrant Name:\s+([ \w-:/.@]+)/i.exec(this.content);
    if (or && or[0].indexOf('\n') === -1) {
      contact.registrar = {
        [or[1].startsWith('http') ? 'web' : 'name']: or[1]
      };
    }
    else {
      const r1 = this.parse('Registrar');
      if (r1.length) {
        contact.registrar = this.object(r1);
      }
      const r2 = this.parse('Registrar:');
      if (r2.length) {
        contact.registrar = this.object(r2);
      }
    }
    return contact;
  },
  dns() {
    return {};
  }
};
