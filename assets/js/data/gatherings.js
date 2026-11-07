/* The gatherings data: the single source of truth for Home, Gatherings and Make a plan.
 *
 * Each event has:
 *   id, title, category ('make' | 'play' | 'slow'), level, weekday + weeksAhead (used to compute `date`),
 *   start / end ('HH:MM', Astana time), place, seats (capacity), booked (taken places), blurb, tags.
 *
 * Dates are generated from today so the sample evenings are always upcoming: `weekday` is 0 (Sunday) to 6,
 * `weeksAhead` is how many weeks away the first matching day is. Nothing here is a real booking. */
'use strict';

(function (OFFLINE) {
  const BOOKINGS_KEY = 'offline-bookings-v1';

  // The first `weekday` that is at least `weeksAhead` weeks from tomorrow.
  const upcomingDate = (weekday, weeksAhead) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + 1 + (weeksAhead - 1) * 7);
    while (date.getDay() !== weekday) date.setDate(date.getDate() + 1);
    return OFFLINE.toIso(date);
  };

  const SOURCE = [
    { id: 'print', title: 'Happy accidents print club', category: 'make', level: 'Beginner', weekday: 5, weeksAhead: 1, start: '18:30', end: '20:00', place: 'Studio table', seats: 12, booked: 7, tags: ['printmaking', 'ink', 'take-home'], blurb: 'Make a foam-block print you can take home. Ink, paper and a little room to experiment.' },
    { id: 'games', title: 'Your move. No loading screen.', category: 'play', level: 'Beginner', weekday: 5, weeksAhead: 2, start: '18:30', end: '20:00', place: 'Common room', seats: 16, booked: 9, tags: ['board games', 'new people'], blurb: 'Quick tabletop games with people you haven’t met yet. We explain every rule before we play.' },
    { id: 'sketch', title: 'Tea, pencils and no rush.', category: 'slow', level: 'Beginner', weekday: 5, weeksAhead: 3, start: '18:30', end: '20:00', place: 'Quiet corner', seats: 10, booked: 4, tags: ['drawing', 'tea'], blurb: 'A quiet drawing hour. Notice ordinary objects, trade a few observations, and let your tea go cold.' },
    { id: 'zine', title: 'Fold, staple, share: pocket zine night', category: 'make', level: 'Beginner', weekday: 3, weeksAhead: 1, start: '18:00', end: '19:30', place: 'Studio table', seats: 14, booked: 14, tags: ['paper', 'zines'], blurb: 'Turn one sheet of paper into a tiny eight-page zine about anything you like, then swap it with a stranger.' },
    { id: 'cards', title: 'Cards on the table', category: 'play', level: 'Easy', weekday: 4, weeksAhead: 1, start: '19:00', end: '20:30', place: 'Common room', seats: 12, booked: 5, tags: ['card games', 'conversation'], blurb: 'Three short card games, one rotating table. You will talk more than you expect.' },
    { id: 'clay', title: 'Clay hands: a pinch-pot evening', category: 'make', level: 'Some practice', weekday: 6, weeksAhead: 2, start: '15:00', end: '17:00', place: 'Workshop room', seats: 8, booked: 6, tags: ['ceramics', 'hands-on'], blurb: 'Shape a small pot from air-dry clay. Slightly lopsided is exactly right, and you take it home.' },
    { id: 'walk', title: 'The slow loop: a walk without a map', category: 'slow', level: 'Easy', weekday: 0, weeksAhead: 2, start: '16:00', end: '17:30', place: 'Meet at the main entrance', seats: 20, booked: 8, tags: ['walking', 'outdoors', 'phone away'], blurb: 'A gentle ninety-minute loop with phones in pockets. We stop whenever something looks interesting.' },
    { id: 'letters', title: 'A letter to next year’s you', category: 'slow', level: 'Beginner', weekday: 2, weeksAhead: 2, start: '18:30', end: '20:00', place: 'Quiet corner', seats: 10, booked: 3, tags: ['writing', 'reflection'], blurb: 'Write a real paper letter to yourself. We keep it sealed and hand it back in twelve months.' },
    { id: 'quiz', title: 'Pen-and-paper quiz night', category: 'play', level: 'Easy', weekday: 5, weeksAhead: 4, start: '18:30', end: '20:30', place: 'Common room', seats: 24, booked: 10, tags: ['quiz', 'teams'], blurb: 'Teams of four, one pencil each, no search engines. The prize is bragging rights and the good biscuits.' },
    { id: 'knit', title: 'Knit and natter', category: 'make', level: 'Beginner', weekday: 1, weeksAhead: 2, start: '18:00', end: '19:30', place: 'Studio table', seats: 10, booked: 2, tags: ['knitting', 'crafts'], blurb: 'Learn the first stitch, or bring a project you abandoned. Needles and wool are provided.' },
  ];

  // Seats booked on this device through the Gatherings page: { gatheringId: extraSeats }.
  // Kept in memory too, so booking still works for this visit when browser storage is blocked.
  const stored = OFFLINE.storage.get(BOOKINGS_KEY, {});
  const bookings = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};

  OFFLINE.gatherings = SOURCE.map((event) => ({
    ...event,
    date: upcomingDate(event.weekday, event.weeksAhead),
  })).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  OFFLINE.getGathering = (id) => OFFLINE.gatherings.find((event) => event.id === id) || null;

  // Places still free, counting seats booked on this device.
  OFFLINE.seatsLeft = (event) => {
    const extra = Number(bookings[event.id]) || 0;
    return Math.max(0, event.seats - event.booked - extra);
  };

  OFFLINE.bookSeats = (id, count) => {
    const event = OFFLINE.getGathering(id);
    if (!event || !Number.isInteger(count) || count < 1 || count > OFFLINE.seatsLeft(event)) return false;
    bookings[id] = (Number(bookings[id]) || 0) + count;
    OFFLINE.storage.set(BOOKINGS_KEY, bookings);
    return true;
  };

  OFFLINE.durationMinutes = (event) => OFFLINE.minutesBetween(event.start, event.end);

  OFFLINE.gatheringWhen = (event) => `${OFFLINE.formatDate(event.date)} · ${event.start}–${event.end}`;
}(window.OFFLINE));
