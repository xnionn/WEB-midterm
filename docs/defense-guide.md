# OFFLINE defense practice

Sixty of the hundred available points belong to the individual defense. A working website and a polished report do not replace the student's ability to explain and change their own code. Use this guide for practice, then close it while doing the change exercises.

## Explain your part in a short presentation

Start with the visitor: a student who wants a low-pressure, screen-free evening. Open the page you actually built, explain its purpose and show its mobile version. Explain one layout decision, one semantic HTML choice and one interaction that belongs to your work. Name the files you changed and explain how your page shares navigation, typography and spacing with the other pages.

The concept is fictional and the listed gatherings are sample events. The planner saves a personal reminder on the visitor's device. It does not reserve a real seat or send data to a club. Say this accurately when demonstrating it.

## Know the source structure

`content/*.html` contains editable page bodies. `tools/build_site.py` wraps those bodies in shared navigation, head metadata and the footer. Running `python tools/build_site.py` updates the root `*.html` files, which are the pages opened by a static server or GitHub Pages. If you change a generated HTML file directly, a later build can overwrite that change.

`assets/css/style.css` holds the shared visual rules. `content/secondary.css` holds additional page styling. `assets/js/script.js` holds website interactions. `assets/vendor/` contains locally bundled Bootstrap; `assets/fonts/` contains the two fonts and their licenses. Explain why a relative path such as `assets/css/style.css` keeps working beneath a GitHub Pages repository URL.

## Questions to answer in your own words

| Question | A useful explanation |
| --- | --- |
| Why use semantic HTML? | Elements such as `header`, `nav`, `main`, `section`, `article` and `footer` describe the content's role. This helps structure, accessibility and maintenance. A `div` only groups content. |
| Why include the viewport meta tag? | It lets the browser use the device width for layout rather than pretending a phone has a desktop-sized viewport. |
| When is Flexbox useful? | It arranges and aligns items along one main axis, such as navigation items or a row of controls. |
| When is Grid useful? | It controls rows and columns together, such as a deliberate hero composition or a collection of cards. |
| What does a media query do? | It applies CSS when conditions are true, such as a viewport narrower than a breakpoint. Identify an actual rule in your page and show what changes. |
| What does Bootstrap contribute? | Its grid classes divide responsive space, and its collapse component supplies the menu interaction. Our custom CSS changes the default visual appearance. |
| Why load custom CSS after Bootstrap? | When selectors have comparable specificity, later rules win. Explain specificity rather than assuming every later rule wins. |
| Why are labels linked to input IDs? | A label names the control for people and assistive technology. Clicking the label also focuses or activates its associated control. |
| How is the planner validated? | The name is required and limited to 40 characters. The number control permits one to four people. The session and sample-event acknowledgment are required. JavaScript trims whitespace, checks the selected session and calls `reportValidity()`. |
| Why is the timetable a table? | Session times and attributes are related rows and columns. Headers identify those relationships; it is not a table used to draw the page layout. |
| What is the box model? | Content, padding, border and margin determine an element's occupied size. `box-sizing: border-box` includes padding and borders in a declared width. |
| What does local storage do? | It stores strings for the current browser origin across reloads. It is not a database shared between devices or people. JSON converts structured data to and from a string. |
| Why use a skip link and visible focus? | Keyboard users can reach the main content quickly and see which control is selected. |
| What does reduced motion mean? | A visitor can prefer less movement through their system settings. CSS can respect that preference. |
| Why have both fonts and licenses locally? | It removes a network dependency and preserves the attribution and license terms for the redistributed font files. |

Read the real source before memorizing an explanation. Find the exact selector, HTML element or JavaScript statement and explain its effect. A defense answer should describe what this project actually does.

## Trace an interaction

For a gathering filter, follow `filterButtons`, `sessionCards` and `button.dataset.filter` in `assets/js/script.js`. Each card's `data-category` is compared with the selected category. Its `hidden` property controls visibility. The button's `aria-pressed` state and the visible count are updated too. This checks every card once per click, so the filtering work grows linearly with the number of cards.

For the planner, find `plannerForm` and the `sessions` object. The permitted keys are `print`, `games` and `sketch`. On submit, `preventDefault()` keeps the browser on the page, the fields are validated and a plan object is created. `JSON.stringify()` turns it into a string for the `offline-plan-v1` storage key. `showPlan()` puts the values into the summary using `textContent`, hides the form and moves focus to the summary. Explain why `textContent` displays a typed name as text instead of HTML.

`readPlan()` uses `JSON.parse()` and validates the version, session, name, people count and boolean value before restoring stored data. A `try/catch` handles malformed data or unavailable storage. `fillForm()` prepares the existing values for editing. The clear button removes the storage item, resets the controls and restores the form. These are browser operations; a real booking would need server-side availability, validation and persistence.

The gathering links include a query such as `join.html?session=print`. `URLSearchParams` reads that value and selects the corresponding control, after checking it belongs to `sessions`. Unknown keys do not become valid sessions.

The calendar button builds an iCalendar `.ics` text file with event start and end values, places it in a `Blob` and downloads it through a temporary link. The `Z` on times such as `20261016T133000Z` means UTC: 13:30 UTC corresponds to the sample event's 18:30 at UTC+5. `URL.revokeObjectURL()` releases the temporary browser URL after the download begins. The calendar reminder says the event is a student concept and does not reserve a seat.

Explain Bootstrap's mobile menu separately: the button has `data-bs-toggle="collapse"`, its target matches the navigation element's ID, and the Bootstrap bundle changes the component state. The button's expanded state must describe whether the menu is open.

The club FAQ uses Bootstrap's accordion and collapse component. Field notes uses native `details` and `summary`, so its expandable notes work without extra JavaScript. The toolkit's print button calls `window.print()`; the page's `@media print` rules remove navigation and decorative sections and format the four-panel worksheet for paper. Explain how each choice fits the page instead of adding an interaction without a purpose.

## Make small changes without assistance

Practice each task from a clean copy and then inspect the result at 375, 768 and 1280 px. Commit or undo your practice changes so they do not accidentally replace the final design.

1. Change the title and supporting copy of your own page. Find the content fragment, rebuild and show the resulting HTML.
2. Adjust one shared palette variable and explain which elements change because they use it.
3. Add one session card using the existing structure. Make its link work and check its filter category.
4. Add a timetable row with correct cells and show that the headings still describe its data.
5. Add a labeled optional form control. Explain why you chose that input type and how its value should enter the planner logic.
6. Change the number of columns at a breakpoint. Explain why the rule helps the available width.
7. Add an accessible hover and focus treatment to a link or button without removing the visible focus indicator.
8. Open a teammate's page and explain how its content fits the shared navigation, style and build process.

## Explain the design

The warm paper background recalls workshop flyers and notebooks. Dark ink keeps body copy readable. Orange distinguishes important actions and expressive details. Space Grotesk supports the large poster-style headings, while DM Sans is used for longer reading and controls. The hero artwork and compositions give the site a recognizable identity. Explain why the arrangement changes for a narrow phone instead of simply making everything smaller.

Use evidence from the page you made. For example, point to a stacked card layout on a phone, a two-column comparison on a tablet or the broader desktop hero. Identify the CSS rule that creates the change.
