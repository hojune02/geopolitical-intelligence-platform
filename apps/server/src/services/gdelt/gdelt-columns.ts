export const GDELT_COLUMNS = {
  globalEventId: 0,
  sqlDate: 1,

  actor1Code: 5,
  actor1Name: 6,
  actor1CountryCode: 7,

  actor2Code: 15,
  actor2Name: 16,
  actor2CountryCode: 17,

  isRootEvent: 25,

  eventCode: 26,
  eventBaseCode: 27,
  eventRootCode: 28,
  quadClass: 29,
  goldsteinScale: 30,

  numMentions: 31,
  numSources: 32,
  numArticles: 33,
  avgTone: 34,

  actionGeoFullName: 52,
  actionGeoCountryCode: 53,
  actionGeoLat: 56,
  actionGeoLong: 57,

  dateAdded: 59,
  sourceUrl: 60,
} as const;

export const GDELT_EXPECTED_COLUMN_COUNT = 61;
