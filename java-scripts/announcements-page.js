// SHARED DATA CHECK: announcements use storage helpers from shared-data-and-cart.js.
if (typeof getCurrentUser !== "function") {
    document.getElementById("announcement-list").innerHTML =
        `<p class="no-announcements-message">shared-data-and-cart.js was not found. Put it in the java-scripts folder (next to announcement-page.js) and refresh.</p>`;
    throw new Error("shared-data-and-cart.js is not loaded");
}

// DATA: suggested titles for announcement icons.
const ANNOUNCEMENT_ICONS = {
    "📢": "New Announcement",
    "🎉": "Special Update",
    "☕": "Product Update",
    "🍰": "New Treat",
    "🍗": "Menu Update",
    "🎁": "Promo",
    "⭐": "Featured",
    "⚠️": "Important Notice"
};

let chosenIcon = "📢";
let editingId = null;


// HELPERS: check admin access and update the text counter.
function isAdminLoggedIn() {
    const user = getCurrentUser();
    return user !== null && user.role === "admin";
}

function updateCharacterCount() {
    const textInput = document.getElementById("announcement-text-input");
    document.getElementById("announcement-character-count").textContent = `${textInput.value.length} / 300`;
}


// ANNOUNCEMENTS: build cards and render the saved list.
// User-provided text is assigned with textContent.
function createAnnouncementCard(announcement, admin) {
    const { id, icon, title, heading, text, postedAt } = announcement;
    const date = new Date(postedAt);

    const card = document.createElement("article");
    card.classList.add("announcement-card");

    // Create only the fixed structure here; insert announcement values as text below.
    card.innerHTML = `
        <div class="announcement-card-header">
            <div class="announcement-icon"></div>
            <div class="announcement-title-area"><h2 class="card-title"></h2><p>The Nook</p></div>
            <div class="announcement-date-area">
                <p class="card-date"></p>
                <p class="card-time"></p>
            </div>
        </div>
        <div class="announcement-body">
            <h2 class="card-heading"></h2>
            <p class="card-text"></p>
        </div>`;

    card.querySelector(".announcement-icon").textContent = icon;
    card.querySelector(".card-title").textContent = title;
    card.querySelector(".card-date").textContent = date.toLocaleDateString("en-US", { dateStyle: "long" });
    card.querySelector(".card-time").textContent = date.toLocaleTimeString("en-US", { timeStyle: "short" });
    card.querySelector(".card-text").textContent = text;

    // Older announcements may not have a heading, so remove its empty element.
    const headingElement = card.querySelector(".card-heading");
    if (heading) {
        headingElement.textContent = heading;
    } else {
        headingElement.remove();
    }

    if (admin) {
        // Show management actions only to admins.
        const body = card.querySelector(".announcement-body");

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.classList.add("announcement-button");
        editButton.classList.add("edit-announcement-button");
        editButton.addEventListener("click", function () {
            openAnnouncementModal(announcement);
        });

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.classList.add("announcement-button");
        deleteButton.classList.add("delete-announcement-button");
        deleteButton.addEventListener("click", function () {
            deleteAnnouncement(id);
        });

        body.appendChild(editButton);
        body.appendChild(deleteButton);
    }

    return card;
}

function showAnnouncements() {
    const admin = isAdminLoggedIn();
    document.getElementById("add-announcement-button").hidden = !admin;

    const announcementList = document.getElementById("announcement-list");
    announcementList.innerHTML = "";

    // Sort a copy so display order changes without mutating the saved list.
    const newestFirst = [...getAnnouncements()].sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));

    if (newestFirst.length === 0) {
        announcementList.innerHTML = `<p class="no-announcements-message">No announcements here.</p>`;
        return;
    }

    newestFirst.forEach(announcement => {
        announcementList.appendChild(createAnnouncementCard(announcement, admin));
    });
}

function deleteAnnouncement(id) {
    if (!isAdminLoggedIn()) {
        return;
    }

    if (confirm("Delete this announcement?")) {
        const remaining = getAnnouncements().filter(item => item.id !== id);
        saveAnnouncements(remaining);
        showAnnouncements();
    }
}


// ANNOUNCEMENT EDITOR: manage the add and edit form.
function showIconPicker() {
    const iconPicker = document.getElementById("icon-picker");
    iconPicker.innerHTML = "";

    const icons = Object.keys(ANNOUNCEMENT_ICONS);

    icons.forEach(icon => {
        const iconButton = document.createElement("button");
        iconButton.textContent = icon;
        iconButton.setAttribute("title", ANNOUNCEMENT_ICONS[icon]);
        iconButton.classList.add("icon-option");

        if (icon === chosenIcon) {
            iconButton.classList.add("selected");
        }

        iconButton.addEventListener("click", function () {
            chooseIcon(icon);
        });

        iconPicker.appendChild(iconButton);
    });
}

function chooseIcon(icon) {
    const titleInput = document.getElementById("announcement-title-input");
    // Update the title only if it is blank or still matches the previous icon's suggestion.
    const titleWasSuggested = titleInput.value.trim() === "" || titleInput.value === ANNOUNCEMENT_ICONS[chosenIcon];

    chosenIcon = icon;

    if (titleWasSuggested) {
        titleInput.value = ANNOUNCEMENT_ICONS[chosenIcon];
    }

    showIconPicker();
}

function openAnnouncementModal(existing = null) {
    if (!isAdminLoggedIn()) {
        return;
    }

    const modalTitle = document.getElementById("announcement-modal-title");
    const postButton = document.getElementById("post-announcement-button");
    const titleInput = document.getElementById("announcement-title-input");
    const textInput = document.getElementById("announcement-text-input");

    if (existing === null) {
        editingId = null;
        chosenIcon = "📢";
        modalTitle.textContent = "New Announcement";
        postButton.textContent = "Post";
        titleInput.value = ANNOUNCEMENT_ICONS[chosenIcon];
        textInput.value = "";
    } else {
        editingId = existing.id;
        chosenIcon = existing.icon;
        modalTitle.textContent = "Edit Announcement";
        postButton.textContent = "Save";
        titleInput.value = existing.title;
        textInput.value = existing.text;
    }

    updateCharacterCount();
    showIconPicker();
    document.getElementById("announcement-modal").hidden = false;
    textInput.focus();
}

function closeAnnouncementModal() {
    document.getElementById("announcement-modal").hidden = true;
}

function postAnnouncement() {
    if (!isAdminLoggedIn()) {
        return;
    }

    const text = document.getElementById("announcement-text-input").value.trim();
    if (text === "") {
        alert("Please type the announcement first.");
        return;
    }

    let title = document.getElementById("announcement-title-input").value.trim();
    if (title === "") {
        title = ANNOUNCEMENT_ICONS[chosenIcon];
    }

    const allAnnouncements = getAnnouncements();

    if (editingId === null) {
        const newAnnouncement = {
            id: Date.now(),
            icon: chosenIcon,
            title: title,
            heading: "",
            text: text,
            postedAt: new Date().toISOString()
        };
        saveAnnouncements([...allAnnouncements, newAnnouncement]);
    } else {
        // Spread the existing record to preserve its ID and original posting date.
        const updatedList = allAnnouncements.map(item => {
            if (item.id === editingId) {
                return { ...item, icon: chosenIcon, title: title, heading: "", text: text };
            }
            return item;
        });
        saveAnnouncements(updatedList);
    }

    closeAnnouncementModal();
    showAnnouncements();
}


// EVENTS: connect announcement form controls.
const announcementModal = document.getElementById("announcement-modal");

document.getElementById("add-announcement-button").addEventListener("click", function () {
    openAnnouncementModal();
});

document.getElementById("announcement-modal-close-button").addEventListener("click", closeAnnouncementModal);
document.getElementById("announcement-cancel-button").addEventListener("click", closeAnnouncementModal);
document.getElementById("post-announcement-button").addEventListener("click", postAnnouncement);

announcementModal.addEventListener("click", function (event) {
    if (event.target === announcementModal) {
        closeAnnouncementModal();
    }
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeAnnouncementModal();
    }
});

document.getElementById("announcement-text-input").addEventListener("input", updateCharacterCount);


// START: render announcements and refresh on return.
showAnnouncements();

// Refresh announcement visibility after returning to the page.
window.addEventListener("pageshow", showAnnouncements);
