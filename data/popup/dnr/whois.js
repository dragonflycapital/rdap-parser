/* globals tld */
'use strict';

const whois = {
  async guess(link, msg) {
    const domain = tld.getDomain(link);
    const resp = await fetch('https://api.zone.vision/' + domain);
    this.json = await resp.json();
    this.domain = domain;
    this.msg = msg;

    return this;
  },
  name() {
    return this.json.name;
  },
  id() {
    return 'N/A';
  },
  status() {
    return [{
      msg: 'Unknown Status - Check via DNSLytics.com',
      href: 'https://www.tcpiputils.com/browse/domain/' + this.domain
    }];
  },
  nameservers() {
    try {
      return this.json.parent['name-servers'].map(o => o.name);
    }
    catch (e) {
      return [];
    }
  },
  dates() {
    return {
      'expiration': this.msg,
      'registration': 'N/A'
    };
  },
  contact() {
    const contact = {};
    return contact;
  },
  dns() {
    return {};
  }
};
