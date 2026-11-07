/* Toolkit supplies: 8 simple items for a screen-free session at your desk.
 * Item: { id, name, category, minutes, required, hint } */
'use strict';

(function (OFFLINE) {
  OFFLINE.supplies = [
    {
      id: 'blank-paper',
      name: 'One sheet of clean paper',
      category: 'Make',
      minutes: 1,
      required: true,
      hint: 'Scrap, printer paper or notebook page. A4 or letter size is plenty.',
    },
    {
      id: 'favourite-pen',
      name: 'A favourite pen or pencil',
      category: 'Draw',
      minutes: 1,
      required: true,
      hint: 'Anything you like the feel of. No special art markers needed.',
    },
    {
      id: 'hard-surface',
      name: 'A flat, clear tabletop',
      category: 'Comfort',
      minutes: 2,
      required: true,
      hint: 'Push the keyboard and cables aside for twenty minutes.',
    },
    {
      id: 'warm-drink',
      name: 'A warm cup of tea or water',
      category: 'Comfort',
      minutes: 3,
      required: false,
      hint: 'Something warm anchors you to the table and gives your hands a break.',
    },
    {
      id: 'ordinary-object',
      name: 'One ordinary object near you',
      category: 'Draw',
      minutes: 1,
      required: false,
      hint: 'Keys, a mug, an apple, or an empty tape roll to observe.',
    },
    {
      id: 'pocket-knife-or-scissors',
      name: 'Scissors or clean fold-and-tear edges',
      category: 'Make',
      minutes: 2,
      required: false,
      hint: 'Useful if you want to make clean cuts for a pocket booklet.',
    },
    {
      id: 'phone-drawer',
      name: 'A pocket or drawer for your phone',
      category: 'Comfort',
      minutes: 1,
      required: true,
      hint: 'Out of arm’s reach makes putting your screen away effortless.',
    },
    {
      id: 'scrap-strip',
      name: 'A strip of paper for small thoughts',
      category: 'Write',
      minutes: 1,
      required: false,
      hint: 'Jot down stray to-dos without opening your calendar or device.',
    },
  ];
}(window.OFFLINE));

