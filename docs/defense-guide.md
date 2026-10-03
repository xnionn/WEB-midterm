# OFFLINE defense practice

Sixty of the hundred available points belong to the individual defense. A working website and a polished report do not replace the student's ability to explain and change their own code. Use this guide for practice, then close it while doing the change exercises.

The assigned team is **Alimzhan Almukhambetov, Azamat Bukharbaev, Dias Shamel and Tamerlan Aitpayev**. Follow the page ownership in `docs/team-responsibilities.md`. Prepare to present your own completed changes, explain the source and demonstrate a small edit independently.

## Individual preparation

| Student | Pages to present | Main code evidence |
| --- | --- | --- |
| Alimzhan Almukhambetov | Home and About | `content/index.html`, `content/about.html`, shared wrapper in `tools/build_site.py`, home/shared selectors in `assets/css/style.css`, About rules in `content/secondary.css`. |
| Azamat Bukharbaev | Gatherings | `content/gatherings.html`, gathering/table selectors in `assets/css/style.css`, filter logic at the beginning of `assets/js/script.js`. |
| Dias Shamel | Field notes and Toolkit | `content/fieldnotes.html`, `content/toolkit.html`, journal/toolkit/print rules in `content/secondary.css`, `assets/print-guide.txt`, `[data-print-guide]` handler in `assets/js/script.js`. |
| Tamerlan Aitpayev | Make a plan | `content/join.html`, planner/form selectors in `assets/css/style.css`, planner block in `assets/js/script.js`. |

### Alimzhan: the introduction and club identity

Show how the Home noticeboard attracts a student visitor and how About explains the same idea in a different layout. Point to `.home-hero`, `.hero-board`, `.manifesto-list` and `.about-faq`; identify a custom breakpoint that changes their arrangement. Explain the paper/ink/orange palette, both font families and why artwork is labelled rather than used as an inaccessible image of essential text.

On About, explain the Bootstrap `row`, `col-lg-5` and `col-lg-7` process layout. Trace one accordion button to its panel ID, including `data-bs-toggle`, `data-bs-target`, `aria-controls` and `data-bs-parent`. Identify the custom CSS that changes the Bootstrap accordion's appearance. Explain how the shared navbar/footer are generated and why changing a fragment requires rebuilding the root page.

Practice change prompts, without following a prepared solution:

1. Add a fifth FAQ with its own working collapse panel; prove the new IDs and targets do not interfere with an existing question.
2. Change the Home poster wording while preserving legibility and layout at all three required widths.
3. Change the mobile spacing of the manifesto and explain why the desktop layout is unaffected.

Teammate check: explain how Azamat's gathering link selects Tamerlan's planner option, and why the visible event details must agree between the two pages.

### Azamat: choosing an evening

Present the three gathering illustrations, their category controls and the timetable. Explain why `.session-grid` is a CSS Grid layout but the timetable is a semantic `table`. Point to its `caption`, `thead`, `tbody`, `th scope="col"` and `th scope="row"`. Show how `.rhythm-table` changes Bootstrap's `.table` colours and spacing.

Trace a filter click from the button's `data-filter` to each entry's `data-category`. Explain the `all` condition, `hidden`, visible count and `aria-pressed`. Filtering examines each card once, and updates each filter button once: its work is O(C + F) for C cards and F filter buttons. The three event links use known session keys rather than a real booking service.

Practice change prompts:

1. Add a sensible timetable row and preserve the correct column and row headers.
2. Rename a visible category button without breaking the category matching or pressed state.
3. Adjust the tablet spacing between gatherings while preserving a readable phone layout and visible count.

Teammate check: compare Alimzhan's Bootstrap FAQ with Dias's native `details` notes. Explain which script or browser behaviour changes each disclosure's state.

### Dias: reading, then making

Present the editorial feature, paper illustration and three expandable notes. Explain the `article` structure, `.journal-feature` grid, `.journal-art` positioning, and `details`/`summary`. Show how the `[open]` selector changes the plus sign without an extra script. Keyboard activation and native disclosure behaviour should still work when JavaScript is disabled.

On Toolkit, show the checklist's Bootstrap `.form-check`, `.form-check-input` and `.form-check-label` structure and the scoped `.material-list` styling. Explain how linked labels activate their inputs and how checked state and visible keyboard focus are styled. Trace the actual `assets/print-guide.txt` download and the `[data-print-guide]` handler. Show print preview and identify the `@media print` rules that remove navigation/decorative sections and keep the worksheet readable. The checklist is a preparation aid; it is not submitted to a server or stored across reloads.

Practice change prompts:

1. Add one expandable note in the established editorial style and keep its summary keyboard-accessible.
2. Revise one activity instruction consistently in the on-page guide and downloaded text file.
3. Add a fifth labelled checklist item with a working checkbox and matching checked/focus styling.

Teammate check: explain what Tamerlan saves in local storage, why the name is displayed with `textContent`, and why a calendar reminder is not a reserved place.

### Tamerlan: a local personal planner

Present the form and its saved summary. Identify labels, input types, `required`, `maxlength`, numeric bounds, radio grouping and the sample-event acknowledgement. Show the Bootstrap `row`, `col-md-8`, `col-md-4`, `.form-control`, `.form-select` and `.form-check` elements and the project's custom overrides.

Trace submission through `preventDefault`, trimming, custom validity, `reportValidity`, the plan object and storage. Then explain `readPlan`, `fillForm`, `showPlan`, edit and delete. Demonstrate a reload, invalid input and the honest message shown when storage is unavailable. Explain why client-side validation helps this prototype but would not enforce real booking rules on a server.

Trace a query-selected session and one calendar download. Explain the fixed sample session data, UTC `Z` times, `Blob`, temporary object URL, tentative status and URL cleanup. The session lookup has fixed small size here; the form and saved summary contain a fixed number of fields. Calendar construction works over a fixed set of lines, not all website visitors.

Practice change prompts:

1. Display the already stored first-time preference in the saved-plan summary and preserve correct editing/reloading behaviour.
2. Reduce the maximum party size from four to three consistently, including validation, restored-data checks and visitor copy.
3. Change the saved-plan status wording and show that it still announces the correct save, download or storage-failure state.

Teammate check: explain how Alimzhan's wrapper keeps every page's navigation consistent, and how Dias's print stylesheet changes only paper output.

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
