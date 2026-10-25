const a = require('./kn-a.js'), b = require('./kn-b.js');
const { translit } = require('../../lib/translit.js');
const mantras = require('../en.json').seo.ru.mantras.map(s => translit('kn', s));
module.exports = { seo: { ...a.seo, ...b.seo, ru: { ...b.seo.ru, mantras } } };
