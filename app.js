"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.getElementById("menuButton");
  const siteNav = document.getElementById("siteNav");

  if (!menuButton || !siteNav) {
    return;
  }

  const closeMenu = () => {
    siteNav.classList.remove("is-open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Navigation öffnen");
  };

  const toggleMenu = () => {
    const isOpen = siteNav.classList.toggle("is-open");

    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute(
      "aria-label",
      isOpen ? "Navigation schließen" : "Navigation öffnen"
    );
  };

  menuButton.addEventListener("click", toggleMenu);

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", (event) => {
    const clickedInsideNavigation = siteNav.contains(event.target);
    const clickedMenuButton = menuButton.contains(event.target);

    if (!clickedInsideNavigation && !clickedMenuButton) {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 680) {
      closeMenu();
    }
  });
});
