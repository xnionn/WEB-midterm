/* Home quiz: eight questions. Every answer belongs to one of the three kinds of evening:
 * make (hands-on), play (games and people) or slow (quiet and unhurried).
 *
 * Question: { id, text, hint, options: [{ id, label, category }] }
 * Answer options are deliberately mixed so no category is always first. */
'use strict';

(function (OFFLINE) {
  OFFLINE.quiz = [
    { id: 'start', text: 'Friday, 18:30. What sounds like the best start?', hint: 'Go with your first instinct.', options: [
      { id: 'a', label: 'A quiet corner and something warm to drink.', category: 'slow' },
      { id: 'b', label: 'A table covered in paper, ink and things to cut.', category: 'make' },
      { id: 'c', label: 'A game starting in two minutes with people I haven’t met.', category: 'play' },
    ] },
    { id: 'talk', text: 'How much talking do you want tonight?', hint: 'There is no wrong amount.', options: [
      { id: 'a', label: 'Lots. Banter is half the fun.', category: 'play' },
      { id: 'b', label: 'A little. One good question is enough.', category: 'slow' },
      { id: 'c', label: 'Some, in between making things.', category: 'make' },
    ] },
    { id: 'home', text: 'What would you like to take home?', hint: 'Small things count.', options: [
      { id: 'a', label: 'Something I made, even if it’s a bit wonky.', category: 'make' },
      { id: 'b', label: 'A calmer head.', category: 'slow' },
      { id: 'c', label: 'A story about how I almost won.', category: 'play' },
    ] },
    { id: 'sound', text: 'Pick a soundtrack for the evening.', hint: 'Imagine it playing in the room.', options: [
      { id: 'a', label: 'Rain on a window.', category: 'slow' },
      { id: 'b', label: 'Laughter around a table.', category: 'play' },
      { id: 'c', label: 'The scratch of a pencil and the roll of a roller.', category: 'make' },
    ] },
    { id: 'first-step', text: 'Which first step feels easiest?', hint: 'The smallest one wins.', options: [
      { id: 'a', label: 'Learning the rules in one minute.', category: 'play' },
      { id: 'b', label: 'Cutting out one simple shape.', category: 'make' },
      { id: 'c', label: 'Looking at an ordinary object for a while.', category: 'slow' },
    ] },
    { id: 'focus', text: 'How do you like to spend your attention?', hint: 'Think about your best focus.', options: [
      { id: 'a', label: 'I like to drift. No timers.', category: 'slow' },
      { id: 'b', label: 'An hour on one project feels lovely.', category: 'make' },
      { id: 'c', label: 'Short rounds, then something new.', category: 'play' },
    ] },
    { id: 'energy', text: 'How is your energy after a full day of classes?', hint: 'Be honest, nobody is checking.', options: [
      { id: 'a', label: 'Low. I’d like to soften the day.', category: 'slow' },
      { id: 'b', label: 'Buzzing. Let me use it.', category: 'play' },
      { id: 'c', label: 'Medium. Keep my hands busy.', category: 'make' },
    ] },
    { id: 'word', text: 'Pick a word for the evening.', hint: 'Last one!', options: [
      { id: 'a', label: 'Crafted. Something finished by the end.', category: 'make' },
      { id: 'b', label: 'Playful. Let’s see what happens.', category: 'play' },
      { id: 'c', label: 'Unhurried. Let it take as long as it takes.', category: 'slow' },
    ] },
  ];

  OFFLINE.quizResults = {
    make: { label: 'Make', title: 'You’re a hands-on evening.', text: 'You feel best when your hands are busy. Pick an evening where you leave with something you made.' },
    play: { label: 'Play', title: 'You’re a play evening.', text: 'You like a table full of people and a few simple rules. Pick an evening of games and new faces.' },
    slow: { label: 'Slow down', title: 'You’re a slow evening.', text: 'You want a softer landing after the day. Pick an evening with tea, pencils and no rush.' },
  };
}(window.OFFLINE));

