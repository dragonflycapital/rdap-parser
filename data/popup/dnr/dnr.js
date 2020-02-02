/* globals tld */
'use strict';

const dnr = {
  entries: [],
  progress(name, msg) {
    console.log(name, msg);
  },
  async guess(link) {
    const dns = await fetch('dnr/dns.json').then(r => r.json());
    const suffix = tld.getPublicSuffix(link);
    const service = dns.services.filter(o => o[0].indexOf(suffix) !== -1).shift();
    if (!service) {
      throw Error(`"${suffix}" is not a supported domain suffix`);
    }
    const domain = tld.getDomain(link);
    const primary = service[1] + 'domain/' + domain;
    const one = await fetch(primary).then(r => {
      if (r.ok) {
        return r.json();
      }
      throw Error(`no information is avialbe for "${domain}"`);
    }).catch(() => {
      throw Error(`Primary service is not accessible for "${domain}"`);
    });
    this.progress('primary_resolved', primary);
    this.entries.push(one);
    const alts = one.links.map(o => o.href);
    await Promise.all(alts.map(o => {
      return fetch(o).then(r => {
        if (r.ok) {
          return r.json();
        }
      }).then(a => a && this.entries.push(a)).catch(() => console.warn('Failed to fetch alt ' + o));
    }));
    this.progress('alts_resolves', alts);

    return this;
  },
  clean(a) {
    return a.filter((s, i, l) => s && l.indexOf(s) === i);
  },
  name() {
    return this.clean(this.entries.map(e => {
      if (e.ldhName.labels) {
        return e.ldhName.labels.map(o => o.stringValue).join('.');
      }
      return e.ldhName;
    }).filter(a => a).map(s => s.toLowerCase()));
  },
  id() {
    return this.clean(this.entries.map(e => e.handle));
  },
  status() {
    return this.clean(this.entries.reduce((p, c) => {
      if (c.status) {
        p.push(...c.status);
      }
      return p;
    }, [])).map(msg => ({
      msg,
      href: 'https://icann.org/epp#' + msg.split(' ').map((s, i) => i === 0 ? s : s[0].toUpperCase() + s.substr(1)).join('')
    }));
  },
  nameservers() {
    return this.clean(this.entries.reduce((p, c) => {
      if (c.nameservers) {
        p.push(...c.nameservers.map(e => {
          if (e.ldhName.labels) {
            return e.ldhName.labels.map(o => o.stringValue).join('.');
          }
          return e.ldhName;
        }).filter(a => a).map(s => s.toLowerCase()));
      }
      return p;
    }, []));
  },
  dates() {
    const events = this.entries.reduce((p, c) => {
      if (c.events) {
        p.push(...c.events);
      }
      return p;
    }, []);
    const oe = events.filter(e => e.eventAction === 'expiration').shift();
    const or = events.filter(e => e.eventAction === 'registration').shift();
    return {
      'expiration': oe ? oe.eventDate : 'unknown',
      'registration': or ? or.eventDate : 'unknown'
    };
  },
  contact() {
    const entities = this.entries.reduce((p, c) => {
      if (c.entities) {
        p.push(...c.entities);
        for (const entity of c.entities) {
          if (entity.entities) {
            p.push(...entity.entities);
          }
        }
      }
      return p;
    }, []);
    const contact = {};
    const registrars = entities.filter(e => e.roles.indexOf('registrar') !== -1);
    const append = (arr, parent) => {
      for (const o of arr) {
        if (o.handle) {
          parent.id = o.handle;
        }
        if (o.vcardArray) {
          for (const vcard of o.vcardArray[1]) {
            if (vcard[0] === 'org' || vcard[0] === 'fn') {
              parent.organization = vcard[3];
            }
            if (vcard[0] === 'adr') {
              parent.address = vcard[3].filter(a => a).join(', ');
            }
            if (vcard[0] === 'tel') {
              parent.phone = vcard[3];
            }
            if (vcard[0] === 'email') {
              parent.email = vcard[3];
            }
          }
        }
      }
    };
    if (registrars.length) {
      contact.registrar = {};
      append(registrars, contact.registrar);
    }
    const technicals = entities.filter(e => e.roles.indexOf('technical') !== -1);
    if (technicals.length) {
      contact.technical = {};
      append(technicals, contact.technical);
    }
    const administratives = entities.filter(e => e.roles.indexOf('administrative') !== -1);
    if (administratives.length) {
      contact.administrative = {};
      append(administratives, contact.administrative);
    }
    const abuses = entities.filter(e => e.roles.indexOf('abuse') !== -1);
    if (abuses.length) {
      contact.abuse = {};
      append(abuses, contact.abuse);
    }
    return contact;
  },
  dns() {
    return {
      'delegation-signed': this.entries.map(o => o.secureDNS).filter(o => o).map(o => o.delegationSigned).reduce((p, c) => p || c, false)
    };
  }
};
window.dnr = dnr;
