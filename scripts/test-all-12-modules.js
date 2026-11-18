/**
 * Automated test runner for all 12 modules.
 * Simulates browser environment, loads each bundle, fills form inputs,
 * triggers calculate/submit, and verifies execution and result HTML generation.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const engineCode = fs.readFileSync(path.join(ROOT, 'lib', 'engine.js'), 'utf8');
const enI18n = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales', 'en.json'), 'utf8'));

// Test suite for all 12 modules
const MODULES = [
  {
    name: 'gochar',
    page: 'gochar',
    setupHtml: `
      <select id="gc-sign"></select>
      <input id="gc-date" type="date" value="1998-10-26" />
      <button id="gc-btn" type="button">Calculate</button>
      <div id="gc-res"></div>
    `,
    trigger: (dom) => {
      dom.window.$('#gc-date').value = '1998-10-26';
      dom.window.$('#gc-sign').value = '0';
      dom.window.$('#gc-btn').dispatchEvent(new dom.window.Event('click'));
    },
    resSelector: '#gc-res'
  },
  {
    name: 'mangal',
    page: 'mangal-dosha',
    setupHtml: `
      <form id="mg-form">
        <select id="mg-saved"></select>
        <input id="mg-name" value="Test User" />
        <input id="mg-date" type="date" value="1998-10-26" />
        <input id="mg-time" type="time" value="03:00" />
        <input id="city-in" value="Ahmedabad" />
        <div id="city-suggest"></div>
        <button id="city-gps"></button>
        <div id="city-meta"></div>
        <button type="submit">Submit</button>
      </form>
      <div id="mg-res"></div>
    `,
    trigger: (dom) => {
      dom.window.$('#mg-date').value = '1998-10-26';
      dom.window.$('#mg-time').value = '03:00';
      dom.window.$('#mg-form').dispatchEvent(new dom.window.Event('submit'));
    },
    resSelector: '#mg-res'
  },
  {
    name: 'lagna',
    page: 'lagna-calculator',
    setupHtml: `
      <form id="lg-form">
        <select id="lg-saved"></select>
        <input id="lg-name" value="Test User" />
        <input id="lg-date" type="date" value="1998-10-26" />
        <input id="lg-time" type="time" value="03:00" />
        <input id="city-in" value="Ahmedabad" />
        <div id="city-suggest"></div>
        <button id="city-gps"></button>
        <div id="city-meta"></div>
        <button type="submit">Submit</button>
      </form>
      <div id="lg-res"></div>
    `,
    trigger: (dom) => {
      dom.window.$('#lg-date').value = '1998-10-26';
      dom.window.$('#lg-time').value = '03:00';
      dom.window.$('#lg-form').dispatchEvent(new dom.window.Event('submit'));
    },
    resSelector: '#lg-res'
  },
  {
    name: 'love',
    page: 'love-calculator',
    setupHtml: `
      <form id="lv-form">
        <select class="pick-saved" data-p="b"></select>
        <input id="b-name" value="Boy" />
        <input id="b-date" type="date" value="1995-05-15" />
        <input id="b-time" type="time" value="10:30" />
        <input id="b-place" value="Mumbai" />
        <input id="b-lat" value="19.076" />
        <input id="b-lon" value="72.877" />
        <input id="b-off" value="+05:30" />
        <div id="b-suggest"></div>
        <div id="b-meta"></div>
        <button id="b-online"></button>

        <select class="pick-saved" data-p="g"></select>
        <input id="g-name" value="Girl" />
        <input id="g-date" type="date" value="1997-08-20" />
        <input id="g-time" type="time" value="14:15" />
        <input id="g-place" value="Delhi" />
        <input id="g-lat" value="28.613" />
        <input id="g-lon" value="77.209" />
        <input id="g-off" value="+05:30" />
        <div id="g-suggest"></div>
        <div id="g-meta"></div>
        <button id="g-online"></button>

        <div id="lv-err"></div>
        <button type="submit">Submit</button>
      </form>
      <div id="lv-res"></div>
    `,
    trigger: (dom) => {
      dom.window.$('#b-date').value = '1995-05-15';
      dom.window.$('#b-time').value = '10:30';
      dom.window.$('#b-lat').value = '19.076';
      dom.window.$('#b-lon').value = '72.877';
      dom.window.$('#b-off').value = '+05:30';

      dom.window.$('#g-date').value = '1997-08-20';
      dom.window.$('#g-time').value = '14:15';
      dom.window.$('#g-lat').value = '28.613';
      dom.window.$('#g-lon').value = '77.209';
      dom.window.$('#g-off').value = '+05:30';

      dom.window.$('#lv-form').dispatchEvent(new dom.window.Event('submit'));
    },
    resSelector: '#lv-res'
  },
  {
    name: 'dasha',
    page: 'dasha-calculator',
    setupHtml: `
      <form id="ds-form">
        <select id="ds-saved"></select>
        <input id="ds-name" value="Test User" />
        <input id="ds-date" type="date" value="1998-10-26" />
        <input id="ds-time" type="time" value="03:00" />
        <input id="city-in" value="Ahmedabad" />
        <div id="city-suggest"></div>
        <button id="city-gps"></button>
        <div id="city-meta"></div>
        <button type="submit">Submit</button>
      </form>
      <div id="ds-res"></div>
    `,
    trigger: (dom) => {
      dom.window.$('#ds-date').value = '1998-10-26';
      dom.window.$('#ds-time').value = '03:00';
      dom.window.$('#ds-form').dispatchEvent(new dom.window.Event('submit'));
    },
    resSelector: '#ds-res'
  },
  {
    name: 'yogas',
    page: 'yogas-calculator',
    setupHtml: `
      <form id="yg-form">
        <select id="yg-saved"></select>
        <input id="yg-name" value="Test User" />
        <input id="yg-date" type="date" value="1998-10-26" />
        <input id="yg-time" type="time" value="03:00" />
        <input id="city-in" value="Ahmedabad" />
        <div id="city-suggest"></div>
        <button id="city-gps"></button>
        <div id="city-meta"></div>
        <button type="submit">Submit</button>
      </form>
      <div id="yg-res"></div>
    `,
    trigger: (dom) => {
      dom.window.$('#yg-date').value = '1998-10-26';
      dom.window.$('#yg-time').value = '03:00';
      dom.window.$('#yg-form').dispatchEvent(new dom.window.Event('submit'));
    },
    resSelector: '#yg-res'
  },
  {
    name: 'navamsha',
    page: 'navamsha-chart',
    setupHtml: `
      <form id="nv-form">
        <select id="nv-saved"></select>
        <input id="nv-name" value="Test User" />
        <input id="nv-date" type="date" value="1998-10-26" />
        <input id="nv-time" type="time" value="03:00" />
        <input id="city-in" value="Ahmedabad" />
        <div id="city-suggest"></div>
        <button id="city-gps"></button>
        <div id="city-meta"></div>
        <button type="submit">Submit</button>
      </form>
      <div id="nv-res"></div>
    `,
    trigger: (dom) => {
      dom.window.$('#nv-date').value = '1998-10-26';
      dom.window.$('#nv-time').value = '03:00';
      dom.window.$('#nv-form').dispatchEvent(new dom.window.Event('submit'));
    },
    resSelector: '#nv-res'
  },
  {
    name: 'ashtakavarga',
    page: 'ashtakavarga-calculator',
    setupHtml: `
      <form id="ak-form">
        <select id="ak-saved"></select>
        <input id="ak-name" value="Test User" />
        <input id="ak-date" type="date" value="1998-10-26" />
        <input id="ak-time" type="time" value="03:00" />
        <input id="city-in" value="Ahmedabad" />
        <div id="city-suggest"></div>
        <button id="city-gps"></button>
        <div id="city-meta"></div>
        <button type="submit">Submit</button>
      </form>
      <div id="ak-res"></div>
    `,
    trigger: (dom) => {
      dom.window.$('#ak-date').value = '1998-10-26';
      dom.window.$('#ak-time').value = '03:00';
      dom.window.$('#ak-form').dispatchEvent(new dom.window.Event('submit'));
    },
    resSelector: '#ak-res'
  },
  {
    name: 'varshphal',
    page: 'varshphal-calculator',
    setupHtml: `
      <form id="vp-form">
        <select id="vp-saved"></select>
        <select id="vp-year"><option value="2026" selected>2026</option></select>
        <input id="vp-name" value="Test User" />
        <input id="vp-date" type="date" value="1998-10-26" />
        <input id="vp-time" type="time" value="03:00" />
        <input id="city-in" value="Ahmedabad" />
        <div id="city-suggest"></div>
        <button id="city-gps"></button>
        <div id="city-meta"></div>
        <button type="submit">Submit</button>
      </form>
      <div id="vp-res"></div>
    `,
    trigger: (dom) => {
      dom.window.$('#vp-date').value = '1998-10-26';
      dom.window.$('#vp-time').value = '03:00';
      dom.window.$('#vp-year').value = '2026';
      dom.window.$('#vp-form').dispatchEvent(new dom.window.Event('submit'));
    },
    resSelector: '#vp-res'
  },
  {
    name: 'ratna',
    page: 'gemstone-ratna',
    setupHtml: `
      <form id="rt-form">
        <select id="rt-saved"></select>
        <input id="rt-name" value="Test User" />
        <input id="rt-date" type="date" value="1998-10-26" />
        <input id="rt-time" type="time" value="03:00" />
        <input id="city-in" value="Ahmedabad" />
        <div id="city-suggest"></div>
        <button id="city-gps"></button>
        <div id="city-meta"></div>
        <button type="submit">Submit</button>
      </form>
      <div id="rt-res"></div>
    `,
    trigger: (dom) => {
      dom.window.$('#rt-date').value = '1998-10-26';
      dom.window.$('#rt-time').value = '03:00';
      dom.window.$('#rt-form').dispatchEvent(new dom.window.Event('submit'));
    },
    resSelector: '#rt-res'
  },
  {
    name: 'sarpa',
    page: 'kaal-sarp-dosha',
    setupHtml: `
      <form id="sp-form">
        <select id="sp-saved"></select>
        <input id="sp-name" value="Test User" />
        <input id="sp-date" type="date" value="1998-10-26" />
        <input id="sp-time" type="time" value="03:00" />
        <input id="city-in" value="Ahmedabad" />
        <div id="city-suggest"></div>
        <button id="city-gps"></button>
        <div id="city-meta"></div>
        <button type="submit">Submit</button>
      </form>
      <div id="sp-res"></div>
    `,
    trigger: (dom) => {
      dom.window.$('#sp-date').value = '1998-10-26';
      dom.window.$('#sp-time').value = '03:00';
      dom.window.$('#sp-form').dispatchEvent(new dom.window.Event('submit'));
    },
    resSelector: '#sp-res'
  },
  {
    name: 'hora',
    page: 'hora-calculator',
    setupHtml: `
      <input id="hr-date" type="date" value="1998-10-26" />
      <button id="hr-btn" type="button">Calculate</button>
      <input id="city-in" value="Ahmedabad" />
      <div id="city-suggest"></div>
      <button id="city-gps"></button>
      <div id="city-meta"></div>
      <div id="hr-res"></div>
    `,
    trigger: (dom) => {
      dom.window.$('#hr-date').value = '1998-10-26';
      dom.window.$('#hr-btn').dispatchEvent(new dom.window.Event('click'));
    },
    resSelector: '#hr-res'
  }
];

// Minimal DOM implementation for Node
function createDomEnvironment(htmlContent) {
  const elements = new Map();
  const listeners = new Map();

  class Event {
    constructor(type) {
      this.type = type;
      this.defaultPrevented = false;
    }
    preventDefault() {
      this.defaultPrevented = true;
    }
  }

  class Element {
    constructor(tag, id = '', className = '') {
      this.tagName = tag.toUpperCase();
      this.id = id;
      this.className = className;
      this.classList = {
        add: (c) => { if (!this.className.includes(c)) this.className += ' ' + c; },
        remove: (c) => { this.className = this.className.replace(c, '').trim(); },
        contains: (c) => this.className.includes(c)
      };
      this.value = '';
      this._innerHTML = '';
      this.children = [];
      this.hidden = false;
      this.dataset = {};
      this.style = {};
      this.attributes = {};
    }
    get innerHTML() { return this._innerHTML; }
    set innerHTML(val) {
      this._innerHTML = val;
    }
    scrollIntoView() {}
    focus() {}
    addEventListener(evt, fn) {
      const key = `${this.id || this.tagName}:${evt}`;
      if (!listeners.has(key)) listeners.set(key, []);
      listeners.get(key).push(fn);
    }
    dispatchEvent(evt) {
      const key = `${this.id || this.tagName}:${evt.type}`;
      const fns = listeners.get(key) || [];
      fns.forEach(fn => fn(evt));
    }
    querySelector(sel) { return findSelector(this, sel); }
    querySelectorAll(sel) { return findAllSelector(this, sel); }
  }

  // Parse setup HTML to register elements
  const tagRegex = /<([a-z0-9]+)([^>]*?)(\/?>)/gi;
  let match;
  while ((match = tagRegex.exec(htmlContent)) !== null) {
    const [, tag, attrStr] = match;
    const idMatch = /id=["']([^"']+)["']/i.exec(attrStr);
    const classMatch = /class=["']([^"']+)["']/i.exec(attrStr);
    const valueMatch = /value=["']([^"']+)["']/i.exec(attrStr);
    const dataPMatch = /data-p=["']([^"']+)["']/i.exec(attrStr);

    const id = idMatch ? idMatch[1] : '';
    const cls = classMatch ? classMatch[1] : '';
    const el = new Element(tag, id, cls);
    if (valueMatch) el.value = valueMatch[1];
    if (dataPMatch) el.dataset.p = dataPMatch[1];

    if (id) elements.set('#' + id, el);
    elements.set(tag.toLowerCase(), el);
    if (cls) cls.split(/\s+/).forEach(c => {
      elements.set('.' + c, el);
      if (!elements.has('.' + c + '_all')) elements.set('.' + c + '_all', []);
      elements.get('.' + c + '_all').push(el);
    });
  }

  function findSelector(root, sel) {
    if (elements.has(sel)) return elements.get(sel);
    return new Element('div', sel.replace(/^[#.web-]/, ''));
  }
  function findAllSelector(root, sel) {
    if (elements.has(sel + '_all')) return elements.get(sel + '_all');
    if (elements.has(sel)) return [elements.get(sel)];
    return [];
  }

  const windowObj = {
    I18N: enI18n,
    L: enI18n,
    crypto: require('crypto'),
    URLSearchParams,
    innerWidth: 1200,
    innerHeight: 800,
    LANG: 'en',
    LOCALE: 'en-IN',
    BUILD: 'test-build',
    KG_CONFIG: {},
    DEFAULT_PLACE: { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714, tz: 'Asia/Kolkata' },
    Event,
    alert: (msg) => console.log('   [window.alert]:', msg),
    console,
    Math,
    Date,
    Intl,
    setTimeout: (fn, ms) => { fn(); },
    clearTimeout: () => {},
    sessionStorage: { getItem: () => null, setItem: () => {} },
    localStorage: { getItem: () => null, setItem: () => {} },
    location: { href: 'http://localhost/test', protocol: 'http:', pathname: '/test/', search: '', hash: '' },
    navigator: { language: 'en-US', serviceWorker: { register: () => Promise.resolve() } },
    document: {
      title: 'Grahavani Test',
      body: new Element('body'),
      documentElement: new Element('html'),
      querySelector: (sel) => findSelector(null, sel),
      querySelectorAll: (sel) => findAllSelector(null, sel),
      getElementById: (id) => findSelector(null, '#' + id),
      addEventListener: () => {}
    },
    addEventListener: () => {}
  };
  windowObj.window = windowObj;
  windowObj.$ = (sel) => windowObj.document.querySelector(sel);
  windowObj.$$ = (sel) => windowObj.document.querySelectorAll(sel);

  return { window: windowObj, elements };
}

// Run test on each module
console.log('====================================================');
console.log('VERIFYING ALL 12 MODULES LOCALLY');
console.log('====================================================\n');

let allPassed = true;

for (const mod of MODULES) {
  process.stdout.write(`Testing [${mod.name}] (${mod.page})... `);
  try {
    const bundlePath = path.join(ROOT, 'public', 'assets', `${mod.name}.js`);
    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle file not found: ${bundlePath}`);
    }
    const bundleCode = fs.readFileSync(bundlePath, 'utf8');

    const dom = createDomEnvironment(mod.setupHtml);
    const sandbox = vm.createContext(dom.window);

    // 1. Evaluate engine.js (window.Jyotish)
    vm.runInContext(engineCode, sandbox);

    // 2. Evaluate module bundle
    vm.runInContext(bundleCode, sandbox);

    // 3. Trigger calculation
    mod.trigger(dom);

    // 4. Verify result container has content
    const resEl = dom.window.$(mod.resSelector);
    if (!resEl || !resEl.innerHTML || resEl.innerHTML.trim().length === 0) {
      throw new Error(`Result container ${mod.resSelector} is empty after calculation!`);
    }

    console.log(`PASSED! (Generated ${resEl.innerHTML.length} chars of HTML)`);
  } catch (err) {
    console.log(`FAILED!`);
    console.error(`   Error in ${mod.name}:`, err.message);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 4).join('\n'));
    allPassed = false;
  }
}

console.log('\n====================================================');
if (allPassed) {
  console.log('ALL 12 MODULES PASSED LOCAL VERIFICATION SUCCESSFULLY!');
} else {
  console.error('SOME MODULES FAILED VERIFICATION.');
  process.exit(1);
}
console.log('====================================================');
