const a = require('./te-a.js'), b = require('./te-b.js');
const { translit } = require('../../lib/translit.js');
const mantras = require('../en.json').seo.ru.mantras.map(s => translit('te', s));
module.exports = { seo: { ...a.seo, ...b.seo, ru: { ...b.seo.ru, mantras } } };
