// HEADER: toggle the navigation menu and close it after selection.
function setMenuOpen(burgerButton, navMenu, isOpen) {
    if (isOpen) {
        navMenu.classList.add("open");
        burgerButton.setAttribute("aria-expanded", "true");
        burgerButton.setAttribute("aria-label", "Close menu");
    } else {
        navMenu.classList.remove("open");
        burgerButton.setAttribute("aria-expanded", "false");
        burgerButton.setAttribute("aria-label", "Open menu");
    }
}

function setupBurgerMenu() {
    const burgerButton = document.getElementById("burger-button");
    const navMenu = document.getElementById("nav-menu");

    if (!burgerButton || !navMenu) {
        return;
    }

    // Toggle the menu from the button's current open state.
    burgerButton.addEventListener("click", function () {
        const menuIsOpen = navMenu.classList.contains("open");
        setMenuOpen(burgerButton, navMenu, !menuIsOpen);
    });

    const menuLinks = navMenu.querySelectorAll("a");
    menuLinks.forEach(link => {
        // Close the menu after a navigation link is chosen.
        link.addEventListener("click", function () {
            setMenuOpen(burgerButton, navMenu, false);
        });
    });

    document.addEventListener("click", function (event) {
        // Dismiss the menu when the click is outside both the menu and its button.
        const clickedInsideMenu = navMenu.contains(event.target);
        const clickedBurger = burgerButton.contains(event.target);

        if (!clickedInsideMenu && !clickedBurger) {
            setMenuOpen(burgerButton, navMenu, false);
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && navMenu.classList.contains("open")) {
            setMenuOpen(burgerButton, navMenu, false);
            // Return keyboard focus to the button after closing the menu.
            burgerButton.focus();
        }
    });
}

setupBurgerMenu();


// SEARCH: open the matching product section when Enter is pressed.
function setupSearchBar() {
    const searchBar = document.getElementById("search-bar");

    if (!searchBar) {
        return;
    }

    const sectionLinks = {
        "sandwiches": "products-page.html#sandwiches",
        "appetizers": "products-page.html#appetizers",
        "chicken": "products-page.html#chicken-meals",
        "salted egg": "products-page.html#salted-egg",
        "rice meals": "products-page.html#salted-egg",
        "waffles": "products-page.html#waffles",
        "pasta": "products-page.html#pasta",
        "coffee": "products-page.html#coffee",
        "non-coffee": "products-page.html#non-coffee",
        "refreshers": "products-page.html#refreshers",
        "frappe": "products-page.html#frappe"
    };

    searchBar.addEventListener("keydown", function (event) {
        if (event.key !== "Enter") {
            return;
        }

        const searchTerm = searchBar.value.trim().toLowerCase();

        if (sectionLinks[searchTerm]) {
            window.location.href = sectionLinks[searchTerm];
        }
    });
}

setupSearchBar();
