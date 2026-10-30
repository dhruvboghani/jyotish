/* Relocation ("best city for you"): the same birth moment cast for another place.
   The planets stay in the same signs, but the lagna and so every house change with the place, which changes
   how each life area reads. Scores reuse the life-area model (lib/personal.js). */
const J = require('./engine.js');
const { analyze } = require('./analysis.js');
const V = require('./varga.js');
const PS = require('./personal.js');

// [key, name, lat, lon, region]  region: in = India, ab = abroad
const CITIES = [
  ['delhi', 'Delhi', 28.6139, 77.2090, 'in'], ['mumbai', 'Mumbai', 19.0760, 72.8777, 'in'], ['bengaluru', 'Bengaluru', 12.9716, 77.5946, 'in'],
  ['chennai', 'Chennai', 13.0827, 80.2707, 'in'], ['kolkata', 'Kolkata', 22.5726, 88.3639, 'in'], ['hyderabad', 'Hyderabad', 17.3850, 78.4867, 'in'],
  ['ahmedabad', 'Ahmedabad', 23.0225, 72.5714, 'in'], ['pune', 'Pune', 18.5204, 73.8567, 'in'], ['jaipur', 'Jaipur', 26.9124, 75.7873, 'in'],
  ['lucknow', 'Lucknow', 26.8467, 80.9462, 'in'], ['surat', 'Surat', 21.1702, 72.8311, 'in'], ['chandigarh', 'Chandigarh', 30.7333, 76.7794, 'in'],
  ['kochi', 'Kochi', 9.9312, 76.2673, 'in'], ['indore', 'Indore', 22.7196, 75.8577, 'in'], ['bhopal', 'Bhopal', 23.2599, 77.4126, 'in'],
  ['patna', 'Patna', 25.5941, 85.1376, 'in'], ['bhubaneswar', 'Bhubaneswar', 20.2961, 85.8245, 'in'], ['guwahati', 'Guwahati', 26.1445, 91.7362, 'in'],
  ['varanasi', 'Varanasi', 25.3176, 82.9739, 'in'], ['nagpur', 'Nagpur', 21.1458, 79.0882, 'in'], ['coimbatore', 'Coimbatore', 11.0168, 76.9558, 'in'],
  ['visakhapatnam', 'Visakhapatnam', 17.6868, 83.2185, 'in'], ['rajkot', 'Rajkot', 22.3039, 70.8022, 'in'], ['vadodara', 'Vadodara', 22.3072, 73.1812, 'in'],
  ['dubai', 'Dubai', 25.2048, 55.2708, 'ab'], ['singapore', 'Singapore', 1.3521, 103.8198, 'ab'], ['london', 'London', 51.5074, -0.1278, 'ab'],
  ['newyork', 'New York', 40.7128, -74.0060, 'ab'], ['sanfrancisco', 'San Francisco', 37.7749, -122.4194, 'ab'], ['toronto', 'Toronto', 43.6532, -79.3832, 'ab'],
  ['sydney', 'Sydney', -33.8688, 151.2093, 'ab'], ['melbourne', 'Melbourne', -37.8136, 144.9631, 'ab'], ['auckland', 'Auckland', -36.8485, 174.7633, 'ab'],
  ['frankfurt', 'Frankfurt', 50.1109, 8.6821, 'ab'], ['paris', 'Paris', 48.8566, 2.3522, 'ab'], ['amsterdam', 'Amsterdam', 52.3676, 4.9041, 'ab'],
  ['tokyo', 'Tokyo', 35.6762, 139.6503, 'ab'], ['hongkong', 'Hong Kong', 22.3193, 114.1694, 'ab'], ['kualalumpur', 'Kuala Lumpur', 3.1390, 101.6869, 'ab'],
  ['doha', 'Doha', 25.2854, 51.5310, 'ab'], ['nairobi', 'Nairobi', -1.2921, 36.8219, 'ab'], ['chicago', 'Chicago', 41.8781, -87.6298, 'ab'],
  ['houston', 'Houston', 29.7604, -95.3698, 'ab'], ['vancouver', 'Vancouver', 49.2827, -123.1207, 'ab'], ['bangkok', 'Bangkok', 13.7563, 100.5018, 'ab'],
  ['dallas', 'Dallas', 32.7767, -96.7970, 'ab'], ['muscat', 'Muscat', 23.5880, 58.3829, 'ab'], ['berlin', 'Berlin', 52.5200, 13.4050, 'ab']
];
const AREAS = ['career', 'finance', 'marriage', 'health'];

// Life-area scores for the birth moment (utMs) seen from lat/lon
function at(utMs, lat, lon) {
  const d = new Date(utMs);
  const r = J.compute({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), lat, lon, tzMinutes: 0 });
  const an = analyze(r), areas = PS.lifeAreas(r, an, V.vargas(r));
  const s = Object.fromEntries(AREAS.map(a => [a, areas[a].score]));
  // Where the strong and weak planets land matters most: benefics in kendras/trikonas, malefics in 3/6/11
  const ben = ['Jupiter', 'Venus', 'Mercury', 'Moon'], mal = ['Saturn', 'Mars', 'Rahu', 'Ketu', 'Sun'];
  let ang = 0;
  for (const p of r.planets) {
    if (ben.includes(p.name) && [1, 4, 5, 7, 9, 10].includes(p.house)) ang += 1;
    if (mal.includes(p.name) && [3, 6, 11].includes(p.house)) ang += 1;
    if (mal.includes(p.name) && [1, 7, 8, 12].includes(p.house)) ang -= 0.7;
  }
  const overall = Math.round(AREAS.reduce((t, a) => t + s[a], 0) / AREAS.length + ang * 1.5);
  return { lagna: r.lagna.sign, scores: s, overall, ll: J.SIGN_LORD[r.lagna.sign], llHouse: r.P[J.SIGN_LORD[r.lagna.sign]].house };
}

function relocation(r, input) {
  const home = at(r.utMs, input.lat, input.lon);
  const cities = CITIES.map(([k, name, lat, lon, region]) => ({ k, name, region, lat, lon, ...at(r.utMs, lat, lon) }));
  cities.sort((a, b) => b.overall - a.overall);
  return { home, cities };
}

module.exports = { relocation, at, CITIES };
