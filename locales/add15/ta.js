const a = require('./ta-a.js'), b = require('./ta-b.js');
const { translit } = require('../../lib/translit.js');
const mantras = require('../en.json').seo.ru.mantras.map(s => translit('ta', s));
module.exports = { seo: { ...a.seo, ...b.seo, ru: { ...b.seo.ru, mantras } } };
