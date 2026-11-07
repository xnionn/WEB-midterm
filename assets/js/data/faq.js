/* About page FAQ: ten questions.
 * Question: { id, question, answer, topic, popular } */
'use strict';

(function (OFFLINE) {
  OFFLINE.faq = [
    { id: 'experience', topic: 'First time', popular: true, question: 'Do I need any experience?', answer: 'No. Each prompt starts with a small, approachable action. Come curious; you can learn the rest at the table.' },
    { id: 'screen-free', topic: 'Phones', popular: true, question: 'What does “screen-free” mean?', answer: 'We invite you to keep your phone tucked away while making. If you need it for accessibility, an urgent message, or another practical reason, use it. It’s an invitation to focus, not a strict rule.' },
    { id: 'alone', topic: 'First time', popular: true, question: 'Can I come on my own?', answer: 'Absolutely. The activities work individually or side by side. You can join a conversation, or enjoy a quiet hour with your own project.' },
    { id: 'materials', topic: 'Materials', popular: false, question: 'What should I bring?', answer: 'Check the materials note on your chosen gathering. A notebook and a favourite pen are useful, but the activities are designed around ordinary, inexpensive supplies.' },
    { id: 'cost', topic: 'Visiting', popular: true, question: 'Does it cost anything?', answer: 'No. Every sample evening is free and all materials are included. Nothing on this website asks for payment.' },
    { id: 'late', topic: 'Visiting', popular: false, question: 'What if I arrive late?', answer: 'Come in anyway. The first fifteen minutes are for settling in, and the host will catch you up in a sentence.' },
    { id: 'friends', topic: 'Visiting', popular: false, question: 'Can I bring a friend?', answer: 'Yes, up to three. When you make a plan, choose how many people are coming so we can count the places.' },
    { id: 'access', topic: 'Access', popular: false, question: 'What if I need something to take part?', answer: 'Tell us in the “Ask the club” form below. Seating, noise, light and pace can all be adjusted, and keeping your phone nearby for access reasons is always fine.' },
    { id: 'shy', topic: 'First time', popular: false, question: 'What if I’m shy?', answer: 'You’re in good company. Every evening starts with a hello and a task for your hands, so nobody has to perform. Talking is optional.' },
    { id: 'photos', topic: 'Phones', popular: false, question: 'Will there be photos of me?', answer: 'Not without asking. If anyone wants to photograph the table, they ask first, and you can always say no.' },
  ];

  // Topic names in the order they appear on the filter buttons.
  OFFLINE.faqTopics = [...new Set(OFFLINE.faq.map((item) => item.topic))];
}(window.OFFLINE));

