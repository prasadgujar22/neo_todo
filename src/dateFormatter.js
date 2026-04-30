export function formatDayAndDate(date = new Date(), locale = undefined, timeZone = undefined) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone
  }).format(date)
}
