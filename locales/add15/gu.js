const a = require('./gu-a.js'), b = require('./gu-b.js');
const { translit } = require('../../lib/translit.js');
const mantras = require('../en.json').seo.ru.mantras.map(s => translit('gu', s));
module.exports = { seo: { ...a.seo, ...b.seo, ru: { ...b.seo.ru, mantras } } };
