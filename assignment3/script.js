// Bootstrap handles the navbar and accordion. This only closes the mobile menu
// after selecting a section, then scrolls after its height has finished changing.
const navigation = document.getElementById("mainNavigation");

navigation.querySelectorAll("a[href^='#']").forEach((link) => {
  link.addEventListener("click", (event) => {
    if (!navigation.classList.contains("show")) return;

    const section = document.querySelector(link.getAttribute("href"));
    event.preventDefault();
    navigation.addEventListener("hidden.bs.collapse", () => {
      section.scrollIntoView();
      history.replaceState(null, "", link.getAttribute("href"));
      section.setAttribute("tabindex", "-1");
      section.focus({ preventScroll: true });
    }, { once: true });
    bootstrap.Collapse.getOrCreateInstance(navigation).hide();
  });
});
