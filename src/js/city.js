/* City picker shared by the Panchang and Calendar pages. Remembers the last city. */
function cityPicker(onChange) {
  let city = store.get('kg-city') || DEFAULT_PLACE;
  if (!city || !isFinite(city.lat)) city = DEFAULT_PLACE;
  const pk = placePicker({ input: 'c-place', suggest: 'c-suggest', meta: 'c-meta', err: 'c-err', online: 'c-online' }, p => {
    city = { name: p.name, region: p.region, lat: p.lat, lon: p.lon, tz: p.tz || 'Asia/Kolkata' };
    store.set('kg-city', city); onChange(city);
  });
  pk.set(city);
  return {
    get city() { return city; },
    // UTC offset (minutes) of the city on a given civil date (DST-aware where the zone has it)
    offset(y, m, d) { try { return tzOffsetMinutes(city.tz || 'Asia/Kolkata', y, m, d, 12, 0); } catch (e) { return 330; } }
  };
}
const tithiLabel = idx => idx === 14 ? L.names.tithi[14] : idx === 29 ? L.names.tithi[15] : L.names.tithi[idx % 15];
const pakshaOf = idx => L.names.paksha[idx < 15 ? 'Shukla' : 'Krishna'];
