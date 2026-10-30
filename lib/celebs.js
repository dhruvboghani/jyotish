// Famous charts: well-known historical figures whose birth time is on record. Each entry keeps its source and
// Rodden reliability rating (AA birth record, A from memory/autobiography, B biography, C rough/rectified).
// tz: minutes from UTC as used at the time (LMT = longitude × 4 before standard time).
module.exports = [
  { slug: 'mahatma-gandhi', birth: { year: 1869, month: 10, day: 2, hour: 7, minute: 8, lat: 21.6417, lon: 69.6293, tzMinutes: 279, lmt: true }, place: 'porbandar', rating: 'C', src: 'rect',
    events: [['1888-09-04', 'london'], ['1893-06-07', 'pmb'], ['1915-01-09', 'return'], ['1920-08-01', 'noncoop'], ['1930-03-12', 'salt'], ['1942-08-08', 'quit'], ['1947-08-15', 'indep'], ['1948-01-30', 'death']] },
  { slug: 'jawaharlal-nehru', birth: { year: 1889, month: 11, day: 14, hour: 23, minute: 30, lat: 25.4358, lon: 81.8463, tzMinutes: 327, lmt: true }, place: 'allahabad', rating: 'A', src: 'memory',
    events: [['1916-02-08', 'marriage'], ['1929-12-29', 'cpres'], ['1942-08-08', 'quitArrest'], ['1947-08-15', 'pm'], ['1962-10-20', 'war62'], ['1964-05-27', 'death']] },
  { slug: 'indira-gandhi', birth: { year: 1917, month: 11, day: 19, hour: 23, minute: 11, lat: 25.4358, lon: 81.8463, tzMinutes: 330 }, place: 'allahabad', rating: 'A', src: 'memory',
    events: [['1942-03-26', 'marriage'], ['1966-01-24', 'pm'], ['1971-12-03', 'war71'], ['1975-06-25', 'emergency'], ['1977-03-22', 'lost'], ['1980-01-14', 'pmAgain'], ['1984-10-31', 'death']] },
  { slug: 'swami-vivekananda', birth: { year: 1863, month: 1, day: 12, hour: 6, minute: 33, lat: 22.5726, lon: 88.3639, tzMinutes: 353, lmt: true }, place: 'calcutta', rating: 'B', src: 'bio',
    events: [['1881-11-15', 'meetRK'], ['1886-08-16', 'rkDies'], ['1893-09-11', 'chicago'], ['1897-05-01', 'mission'], ['1902-07-04', 'death']] }
];
