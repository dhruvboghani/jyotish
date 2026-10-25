/* Sanskrit terms from Devanagari into each site script (shared by build.js and server notifications). */
const BASE = { gu: 0x0A80, te: 0x0C00, kn: 0x0C80 };
const offsetTr = (s, base) => [...s].map(ch => { const c = ch.codePointAt(0); return c >= 0x0900 && c <= 0x097F && c !== 0x0950 ? String.fromCodePoint(c - 0x0900 + base) : ch; }).join('');
const TA_C = { 'क': 'க', 'ख': 'க', 'ग': 'க', 'घ': 'க', 'ङ': 'ங', 'च': 'ச', 'छ': 'ச', 'ज': 'ஜ', 'झ': 'ஜ', 'ञ': 'ஞ', 'ट': 'ட', 'ठ': 'ட', 'ड': 'ட', 'ढ': 'ட', 'ण': 'ண', 'त': 'த', 'थ': 'த', 'द': 'த', 'ध': 'த', 'न': 'ந', 'प': 'ப', 'फ': 'ப', 'ब': 'ப', 'भ': 'ப', 'म': 'ம', 'य': 'ய', 'र': 'ர', 'ल': 'ல', 'व': 'வ', 'श': 'ஷ', 'ष': 'ஷ', 'स': 'ஸ', 'ह': 'ஹ', 'ळ': 'ள' };
const TA_V = { 'अ': 'அ', 'आ': 'ஆ', 'इ': 'இ', 'ई': 'ஈ', 'उ': 'உ', 'ऊ': 'ஊ', 'ऋ': 'ரு', 'ए': 'ஏ', 'ऐ': 'ஐ', 'ओ': 'ஓ', 'औ': 'ஔ' };
const TA_M = { 'ा': 'ா', 'ि': 'ி', 'ी': 'ீ', 'ु': 'ு', 'ू': 'ூ', 'ृ': '்ரு', 'े': 'ே', 'ै': 'ை', 'ो': 'ோ', 'ौ': 'ௌ', '्': '்', 'ं': 'ம்', 'ः': '' };
const taTr = s => [...s].map(ch => TA_C[ch] || TA_V[ch] || (ch in TA_M ? TA_M[ch] : ch)).join('');
const translit = (lang, s) => lang === 'hi' ? s : lang === 'ta' ? taTr(s) : BASE[lang] ? offsetTr(s, BASE[lang]) : s;
module.exports = { translit };
