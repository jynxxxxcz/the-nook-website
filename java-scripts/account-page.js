// HELPERS: format values, validate input, and find accounts.
const DEFAULT_USERNAME = "Username1234";

const STAGE_SECONDS = 10;

const STAGES = {
    toPay:     { label: "To Pay",     next: "toShip" },
    toShip:    { label: "To Ship",    next: "toReceive" },
    toReceive: { label: "To Receive", next: "toRate" },
    toRate:    { label: "To Rate",    next: "done" },
    done:      { label: "History",    next: null }
};

const STAGE_TOAST = {
    toShip: "Your order is prepared successfully!",
    toReceive: "Your order is on its way!",
    toRate: "Your order has arrived! Please rate your items.",
    done: "Thank you for rating!"
};

const STAGE_IDS = {
    toPay: "to-pay",
    toShip: "to-ship",
    toReceive: "to-receive"
};

const reviewDrafts = {};

// Format prices, dates, and text used across the page.
const formatPeso = amount => `₱${amount.toLocaleString("en-PH")}`;

const escapeHtml = (text) => {
    const box = document.createElement("div");
    box.textContent = String(text);
    return box.innerHTML.split('"').join("&quot;");
};

// Use the last six ID characters for a compact order label.
const shortId = order => String(order.id).slice(-6);

// Display stored ISO dates in the page's localized date and time format.
const formatDate = isoDate => new Date(isoDate).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

const showToast = (message) => {
    // Replace any visible toast so notifications do not stack on top of each other.
    document.querySelectorAll(".toast").forEach(oldToast => {
        oldToast.remove();
    });

    const toast = document.createElement("div");
    toast.classList.add("toast");
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2500);
};

const isValidEmail = (text) => {
    // Require a non-empty local part, a domain separator, and text after the final dot.
    const at = text.indexOf("@");
    const dot = text.lastIndexOf(".");

    if (text.indexOf(" ") !== -1) {
        return false;
    }
    if (at < 1) {
        return false;
    }
    if (dot < at + 2) {
        return false;
    }
    if (dot === text.length - 1) {
        return false;
    }
    return true;
};

const findAccount = (username) => {
    const accounts = getAccounts();
    for (let i = 0; i < accounts.length; i++) {
        if (accounts[i].username === username) {
            return accounts[i];
        }
    }
    return null;
};

const findAccountIgnoreCase = (username) => {
    // Treat username capitalization as equivalent when checking for an existing account.
    const accounts = getAccounts();
    for (let i = 0; i < accounts.length; i++) {
        if (accounts[i].username.toLowerCase() === username.toLowerCase()) {
            return accounts[i];
        }
    }
    return null;
};

const addAccount = (account) => {
    // Append the new account while keeping the existing saved accounts.
    saveAccounts([...getAccounts(), account]);
};


// HEADER: render profile details and manage the account menu.
const renderHeader = (user) => {
    const usernameText = document.getElementById("username-text");
    const badge = document.getElementById("account-status-badge");
    const locationText = document.getElementById("user-location-text");
    const contactText = document.getElementById("user-contact-text");
    const locationLink = document.getElementById("user-location-link");

    if (user === null) {
        // Show placeholder profile details and a default map link when no one is signed in.
        usernameText.textContent = DEFAULT_USERNAME;
        badge.textContent = "";
        locationText.textContent = "Address";
        contactText.textContent = "Contact";
        locationLink.setAttribute("href", "https://maps.app.goo.gl/ZwQFkVCBekW1GPjD7");
    } else {
        usernameText.textContent = user.username;

        // Combine the admin role and privacy state into the profile badge.
        let badgeText = "";
        if (user.role === "admin") {
            badgeText = "Admin · ";
        }
        if (user.isPrivate) {
            badgeText = badgeText + "🔒 Private";
        } else {
            badgeText = badgeText + "🌐 Public";
        }
        const badgeLabel = document.createElement("span");
        badgeLabel.textContent = badgeText;
        badge.textContent = "";
        badge.appendChild(badgeLabel);
        badge.dataset.statusIcon = user.isPrivate ? "🔒" : "🌐";

        locationText.textContent = user.location;
        contactText.textContent = user.contact;
        // Encode the address so spaces and punctuation are safe in the map search URL.
        locationLink.setAttribute("href", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(user.location)}`);
    }

    document.getElementById("login-hint").hidden = true;

    if (user === null) {
        document.getElementById("logout-link").hidden = true;
    } else {
        document.getElementById("logout-link").hidden = false;
    }

    const notifToggle = document.getElementById("notifications-checkbox");
    const privateToggle = document.getElementById("private-account-checkbox");

    // Keep settings controls in sync with the signed-in user's saved preferences.
    if (user !== null && user.notifications) {
        notifToggle.checked = true;
    } else {
        notifToggle.checked = false;
    }

    if (user !== null && user.isPrivate) {
        privateToggle.checked = true;
    } else {
        privateToggle.checked = false;
    }

    // Admin accounts cannot change their privacy setting.
    if (user !== null && user.role === "admin") {
        privateToggle.disabled = true;
    } else {
        privateToggle.disabled = false;
    }
};

const logOut = () => {
    if (!confirm("Are you sure you want to log out?")) {
        return;
    }

    // Clear the session, return to the page top, and redraw the signed-out account view.
    logOutUser();
    window.location.hash = "#page-top";
    renderAll();
};

document.getElementById("username-text").addEventListener("click", () => {
    if (getCurrentUser() === null) {
        logIn();
    }
});

document.getElementById("logout-link").addEventListener("click", event => {
    event.preventDefault();
    logOut();
});

document.getElementById("account-status-badge").addEventListener("click", () => {
    const user = getCurrentUser();
    if (user === null) {
        return;
    }

    if (user.role === "admin") {
        showToast("The admin account is always private.");
        return;
    }

    // Toggle privacy in the saved profile and refresh the badge to reflect the new state.
    updateCurrentUser({ isPrivate: !user.isPrivate });
    renderHeader(getCurrentUser());
    if (user.isPrivate) {
        showToast("Your account is now public.");
    } else {
        showToast("Your account is now private.");
    }
});

const burger = document.querySelector(".burger-menu-container");
const burgerBtn = document.getElementById("burger-button");
const burgerMenu = document.getElementById("account-menu");

const setBurger = (open) => {
    // Keep the menu's visual state and accessibility state in sync.
    if (open) {
        burgerMenu.classList.add("is-open");
        burgerBtn.setAttribute("aria-expanded", "true");
    } else {
        burgerMenu.classList.remove("is-open");
        burgerBtn.setAttribute("aria-expanded", "false");
    }
};

burgerBtn.addEventListener("click", () => {
    if (burgerMenu.classList.contains("is-open")) {
        setBurger(false);
    } else {
        setBurger(true);
    }
});

burgerMenu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", event => {
        setBurger(false);

        if (link.getAttribute("id") === "logout-link") {
            return;
        }

        if (getCurrentUser() === null) {
            // Prevent account-only destinations from opening while signed out.
            event.preventDefault();
            alert("Please log in first. Click the username at the top to log in or sign up.");
            return;
        }

        if (link.getAttribute("data-action") === "edit-profile") {
            event.preventDefault();
            editProfile();
        } else if (link.getAttribute("href") === "#account-security-modal") {
            renderSecurity(getCurrentUser());
        } else if (link.getAttribute("href") === "#my-addresses-modal") {
            renderMyAddresses(getCurrentUser());
        }
    });
});

document.addEventListener("click", event => {
    // Close the menu when the click happens outside its container.
    if (!burger.contains(event.target)) {
        setBurger(false);
    }
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        // Escape dismisses open dialogs and the navigation menu.
        closeLoginModal();
        closeEditProfileModal();
        setBurger(false);
    }
});


// ORDERS: render order stages, payment controls, reviews, and history.
const findOrder = (orders, orderId) => {
    for (let i = 0; i < orders.length; i++) {
        if (orders[i].id === orderId) {
            return orders[i];
        }
    }
    return null;
};

const visibleOrders = (user) => {
    if (user.role === "admin") {
        return getOrders();
    }
    return getOrders().filter(order => order.customer === user.username);
};

const ordersWithStatus = (orders, status) => orders.filter(order => order.status === status);

// Sum item prices before delivery.
const orderSubtotal = (order) => {
    let subtotal = 0;
    order.items.forEach(item => {
        subtotal += item.price * item.quantity;
    });
    return subtotal;
};

const orderTotal = order => orderSubtotal(order) + order.deliveryFee;

const itemRow = (item) => {
    let optionTag = "";
    // Older order items may not include a flavor or size option.
    if (item.option) {
        optionTag = `<span class="item-option-tag">${escapeHtml(item.option)}</span>`;
    }

    return `
    <div class="order-item">
        <img src="${item.image}" alt="${escapeHtml(item.name)}">
        <div class="order-item-text">
            <b>${escapeHtml(item.name)}</b>
            ${optionTag}
            <p>${formatPeso(item.price)} x ${item.quantity} = ${formatPeso(item.price * item.quantity)}</p>
        </div>
    </div>`;
};

const payBox = (order) => {
    const { method } = order.payment;
    const name = order.payment.name || "";
    const number = order.payment.number || "";
    const options = ["Cash on Delivery", "GCash", "PayPal"];

    // Give each order its own radio group so selecting payment cannot affect another order.
    const optionsHtml = options.map(option => {
        let checked = "";
        if (option === method) {
            checked = "checked";
        }
        return `
            <label class="payment-option">
                <input type="radio" class="payment-method-radio" name="pay-${order.id}" value="${option}" ${checked}>
                ${option}
            </label>`;
    }).join("");

    let detailsHidden = "hidden";
    if (method === "GCash" || method === "PayPal") {
        detailsHidden = "";
    }

    let buttonText = "Pay Now";
    if (method === "Cash on Delivery") {
        buttonText = "Confirm Order";
    }

    return `
        <div class="payment-box">
            <p><b>Payment option</b></p>
            ${optionsHtml}

            <div class="payment-details" ${detailsHidden}>
                <input type="text" class="payment-account-name" placeholder="Account name" value="${escapeHtml(name)}">
                <input type="text" class="payment-account-number" maxlength="11" placeholder="Account number (e.g. 09123456789)" value="${escapeHtml(number)}">
            </div>

            <button type="button" class="account-button pay-now-button">${buttonText}</button>
        </div>`;
};

const orderActions = (order, user) => {
    // Available actions depend on both the order stage and whether the viewer is an admin.
    if (order.status === "toPay") {
        if (user.role === "admin") {
            return `<p class="order-wait-note">Waiting for the customer to pay.</p>`;
        }
        return payBox(order);
    }

    if (order.status === "toShip" || order.status === "toReceive") {
        if (user.role === "admin") {
            let label = "Confirm Delivery";
            if (order.status === "toShip") {
                label = "Confirm Shipment";
            }
            return `<button type="button" class="account-button confirm-step-button">${label}</button>`;
        }

        let message = "Your order is on its way.";
        if (order.status === "toShip") {
            message = "Your order is being prepared.";
        }
        // Show customers the next stage and remaining time while admins confirm each step.
        const nextLabel = STAGES[STAGES[order.status].next].label;
        const endTime = order.stageAt + STAGE_SECONDS * 1000;
        return `<p class="order-wait-note">${message} Moving to <b>${nextLabel}</b> in <span class="stage-countdown" data-end="${endTime}"></span></p>`;
    }

    return `<p class="order-wait-note">Waiting for the customer to rate the items.</p>`;
};

const isCOD = (order) => {
    return order.payment.method === "Cash on Delivery";
};

const inPayTab = (order) => {
    if (order.status === "toPay") {
        return true;
    }
    // Keep COD orders in the Pay tab until delivery, when payment is due.
    if (isCOD(order) && (order.status === "toShip" || order.status === "toReceive")) {
        return true;
    }
    return false;
};

const codNote = (order) => {
    return `<p class="order-wait-note">Cash on Delivery: please pay <b>${formatPeso(orderTotal(order))}</b> when the order arrives. Current step: <b>${STAGES[order.status].label}</b>.</p>`;
};

const orderCard = (order, user, payTab = false) => {
    let customerLine = "";
    if (user.role === "admin") {
        customerLine = `<p class="order-info">Customer: <b>${escapeHtml(order.customer)}</b></p>`;
    }

    const itemsHtml = order.items.map(itemRow).join("");

    let actionsHtml = orderActions(order, user);
    // In the Pay tab, COD orders show payment instructions instead of another action.
    if (payTab && order.status !== "toPay") {
        actionsHtml = codNote(order);
    }

    return `
    <div class="order-card" data-order="${order.id}">
        <div class="order-card-header">
            <b>Order #${shortId(order)}</b>
            <span>${formatDate(order.orderedAt)}</span>
        </div>
        ${customerLine}
        ${itemsHtml}
        <p class="order-info">Deliver to: <b>${escapeHtml(order.address)}</b> (${escapeHtml(order.contact)})</p>
        <p class="order-info">Payment: <b>${order.payment.method}</b></p>
        <p class="order-total">Subtotal ${formatPeso(orderSubtotal(order))} + Delivery ${formatPeso(order.deliveryFee)} = <b>${formatPeso(orderTotal(order))}</b></p>
        ${actionsHtml}
    </div>`;
};

const itemsToReview = (orders) => {
    const list = [];

    // Create one review entry per unrated item in orders that have reached the rating stage.
    orders.forEach(order => {
        if (order.status === "toRate") {
            for (let index = 0; index < order.items.length; index++) {
                if (order.items[index].review === null) {
                    list.push({ order: order, item: order.items[index], index: index });
                }
            }
        }
    });

    return list;
};

const reviewCard = ({ order, item, index }) => {
    const key = `${order.id}-${index}`;
    const { rating, text } = reviewDrafts[key] || { rating: 0, text: "" };

    const starsHtml = [1, 2, 3, 4, 5].map(star => {
        let filled = "";
        if (star <= rating) {
            filled = "star-filled";
        }
        return `<button type="button" class="star-button ${filled}" data-star="${star}">★</button>`;
    }).join("");

    return `
        <div class="order-card review-card" data-key="${key}" data-order="${order.id}" data-index="${index}">
            <div class="order-card-header">
                <b>Order #${shortId(order)}</b>
                <span>${formatDate(order.orderedAt)}</span>
            </div>
            ${itemRow(item)}
            <div class="star-picker">${starsHtml}</div>
            <textarea class="review-textarea" data-key="${key}" rows="3" maxlength="150" placeholder="Write your review here...">${escapeHtml(text)}</textarea>
            <small class="review-char-count">${text.length}/150</small>
            <button type="button" class="account-button submit-review-button">Submit Review</button>
        </div>`;
};

const historyRows = (orders) => {
    const rows = [];

    // Flatten reviewed order items into rows, excluding items the customer removed from history.
    orders.forEach(order => {
        for (let index = 0; index < order.items.length; index++) {
            const item = order.items[index];
            if (item.review !== null && !item.historyDeleted) {
                rows.push({ order: order, item: item, index: index });
            }
        }
    });

    rows.sort((first, second) => second.order.orderedAt.localeCompare(first.order.orderedAt));

    return rows;
};

const historyTable = (orders, user) => {
    const rows = historyRows(orders);
    const isAdmin = (user.role === "admin");

    if (rows.length === 0) {
        return `<p class="empty-message">Nothing here yet. Rated items will show up here.</p>`;
    }

    let lastHeader = "<th>Delete</th>";
    if (isAdmin) {
        lastHeader = "<th>Customer</th>";
    }

    const rowsHtml = rows.map(({ order, item, index }) => {

        let optionText = "—";
        if (item.option) {
            optionText = escapeHtml(item.option);
        }

        let lastCell = `<td><button type="button" class="account-button delete-history-button" data-order="${order.id}" data-index="${index}">Delete</button></td>`;
        if (isAdmin) {
            lastCell = `<td>${escapeHtml(order.customer)}</td>`;
        }

        return `
            <tr>
                <td><img class="history-product-image" src="${item.image}" alt="${escapeHtml(item.name)}"></td>
                <td>${escapeHtml(item.name)}</td>
                <td>${optionText}</td>
                <td>${formatPeso(item.price)}</td>
                <td>${item.quantity}</td>
                <td>${formatPeso(item.price * item.quantity)}</td>
                <td>${formatDate(order.orderedAt)}</td>
                <td>${escapeHtml(order.address)}<br><small>${escapeHtml(order.contact)}</small></td>
                ${lastCell}
            </tr>`;
    }).join("");

    return `
        <div class="history-table-wrapper">
            <table class="history-table">
                <thead>
                    <tr>
                        <th>Picture</th>
                        <th>Product</th>
                        <th>Flavor / Size</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Total</th>
                        <th>Time Ordered</th>
                        <th>Delivered To</th>
                        ${lastHeader}
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>`;
};

const setCount = (id, number) => {
    const badge = document.getElementById(id);
    if (number === 0) {
        badge.textContent = "";
    } else {
        badge.textContent = number;
    }
};

const showOrders = (listBox, ordersOfStep, user, payTab, countId) => {
    if (ordersOfStep.length === 0) {
        listBox.innerHTML = `<p class="empty-message">Nothing here yet.</p>`;
    } else {
        listBox.innerHTML = ordersOfStep.map(order => orderCard(order, user, payTab)).join("");
    }
    setCount(countId, ordersOfStep.length);
};

const renderLists = (user) => {
    const toPayList = document.getElementById("to-pay-list");
    const toShipList = document.getElementById("to-ship-list");
    const toReceiveList = document.getElementById("to-receive-list");
    const toRateList = document.getElementById("to-rate-list");
    const historyList = document.getElementById("history-list");

    if (user === null) {
        toPayList.innerHTML = "";
        toShipList.innerHTML = "";
        toReceiveList.innerHTML = "";
        toRateList.innerHTML = "";
        historyList.innerHTML = "";
        document.querySelectorAll(".order-count-badge").forEach(count => {
            count.textContent = "";
        });
        return;
    }

    const orders = visibleOrders(user);

    const payOrders = orders.filter(inPayTab);
    showOrders(toPayList, payOrders, user, true, `${STAGE_IDS.toPay}-count`);

    showOrders(toShipList, ordersWithStatus(orders, "toShip"), user, false, `${STAGE_IDS.toShip}-count`);
    showOrders(toReceiveList, ordersWithStatus(orders, "toReceive"), user, false, `${STAGE_IDS.toReceive}-count`);

    if (user.role === "admin") {
        showOrders(toRateList, ordersWithStatus(orders, "toRate"), user, false, "to-rate-count");
    } else {
        const toReview = itemsToReview(orders);

        if (toReview.length === 0) {
            toRateList.innerHTML = `<p class="empty-message">Nothing here yet.</p>`;
        } else {
            toRateList.innerHTML = toReview.map(reviewCard).join("");
        }
        setCount("to-rate-count", toReview.length);
    }

    historyList.innerHTML = historyTable(orders, user);

    const historyCount = historyRows(orders).length;
    // Store how many completed orders the user has seen.
    const seenKey = `nookHistorySeen-${user.username}`;
    let seen = Number(localStorage.getItem(seenKey)) || 0;

    // Mark history as seen when opened, and reset the count if entries were deleted.
    if (window.location.hash === "#history-modal" || historyCount < seen) {
        localStorage.setItem(seenKey, historyCount);
        seen = historyCount;
    }

    const historyBadge = document.getElementById("history-count");
    if (historyCount > seen) {
        historyBadge.textContent = "!";
    } else {
        historyBadge.textContent = "";
    }
};

const connectButtons = () => {
    // Reattach handlers after order cards are rebuilt by renderAll().
    document.querySelectorAll(".order-card").forEach(card => {
        const payButton = card.querySelector(".pay-now-button");
        if (payButton !== null) {
            payButton.addEventListener("click", () => {
                payOrder(card);
            });
        }

        const confirmButton = card.querySelector(".confirm-step-button");
        if (confirmButton !== null) {
            confirmButton.addEventListener("click", () => {
                confirmStep(card);
            });
        }

        card.querySelectorAll(".payment-method-radio").forEach(radio => {
            radio.addEventListener("change", () => {
                const details = card.querySelector(".payment-details");
                const button = card.querySelector(".pay-now-button");

                // Match the required account fields and button label to the selected method.
                if (radio.value === "Cash on Delivery") {
                    details.hidden = true;
                    button.textContent = "Confirm Order";
                } else {
                    details.hidden = false;
                    button.textContent = "Pay Now";
                }
            });
        });
    });

    document.querySelectorAll(".review-card").forEach(card => {
        const key = card.getAttribute("data-key");

        // Keep the draft in memory so rating and text survive page redraws before submission.
        card.querySelectorAll(".star-button").forEach(starButton => {
            starButton.addEventListener("click", () => {
                const rating = Number(starButton.getAttribute("data-star"));

                if (reviewDrafts[key] === undefined) {
                    reviewDrafts[key] = { rating: 0, text: "" };
                }
                reviewDrafts[key].rating = rating;

                card.querySelectorAll(".star-button").forEach(star => {
                    if (Number(star.getAttribute("data-star")) <= rating) {
                        star.classList.add("star-filled");
                    } else {
                        star.classList.remove("star-filled");
                    }
                });
            });
        });

        const textarea = card.querySelector(".review-textarea");
        textarea.addEventListener("input", () => {
            if (reviewDrafts[key] === undefined) {
                reviewDrafts[key] = { rating: 0, text: "" };
            }
            reviewDrafts[key].text = textarea.value;
            card.querySelector(".review-char-count").textContent = `${textarea.value.length}/150`;
        });

        card.querySelector(".submit-review-button").addEventListener("click", () => {
            submitReview(card);
        });
    });

    document.querySelectorAll(".delete-history-button").forEach(button => {
        button.addEventListener("click", () => {
            deleteHistory(button);
        });
    });

    document.querySelectorAll(".favorite-card").forEach(card => {
        const heart = card.querySelector(".favorite-heart");

        heart.addEventListener("click", event => {
            // The favorite card is inside a product link; remove the favorite without navigating.
            event.preventDefault();

            const user = getCurrentUser();
            if (user !== null) {
                removeFavorite(user.username, card.getAttribute("data-id"));
            }

            const link = card.parentElement;
            card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            card.style.opacity = "0";
            card.style.transform = "scale(0.9)";

            setTimeout(() => {
                link.remove();
                showNoFavoritesIfEmpty();
            }, 300);
        });
    });
};

// Refresh the account page from the latest saved data.
const renderAll = () => {
    let typingKey = null;
    // Remember the active review field so a redraw does not interrupt typing.
    if (document.activeElement.classList.contains("review-textarea")) {
        typingKey = document.activeElement.getAttribute("data-key");
    }

    const user = getCurrentUser();
    renderHeader(user);
    renderFavoritesArea(user);
    renderLists(user);
    connectButtons();
    updateCountdowns();

    if (typingKey !== null) {
        const box = document.querySelector('.review-textarea[data-key="' + typingKey + '"]');
        if (box !== null) {
            box.focus();
            box.setSelectionRange(box.value.length, box.value.length);
        }
    }
};

const moveOrder = (orderId, newStatus, payment = null) => {
    const orders = getOrders();
    const order = findOrder(orders, orderId);

    // Update payment details only when supplied, then restart the timer for the new stage.
    if (payment !== null) {
        order.payment = payment;
    }
    order.status = newStatus;
    order.stageAt = Date.now();

    saveOrders(orders);
    renderAll();
};

const payOrder = (card) => {
    const orderId = Number(card.getAttribute("data-order"));
    const method = card.querySelector(".payment-method-radio:checked").value;

    let payName = "";
    let payNumber = "";

    // Online payments require account details; cash on delivery does not.
    if (method !== "Cash on Delivery") {
        payName = card.querySelector(".payment-account-name").value.trim();
        payNumber = card.querySelector(".payment-account-number").value.trim();

        if (payName === "") {
            alert(`Please enter your ${method} account name.`);
            return;
        }

        if (!isValidContact(payNumber)) {
            alert(`Please enter a valid ${method} number (11 digits, e.g. 09123456789).`);
            return;
        }
    }

    // Show the customer the full order total before asking them to confirm payment.
    const order = findOrder(getOrders(), orderId);
    const total = formatPeso(orderTotal(order));

    let question = `Pay ${total} with ${method}?`;
    if (method === "Cash on Delivery") {
        question = `Confirm this order? You will pay ${total} when it arrives.`;
    }

    if (!confirm(question)) {
        return;
    }

    // Only advance the order after the customer confirms the selected payment method.
    moveOrder(orderId, "toShip", { method: method, name: payName, number: payNumber });

    if (method === "Cash on Delivery") {
        alert("Order confirmed! Please pay when it arrives.");
    } else {
        alert("Payment successful!");
    }
    showToast(STAGE_TOAST.toShip);
};

const confirmStep = (card) => {
    const orderId = Number(card.getAttribute("data-order"));
    const order = findOrder(getOrders(), orderId);
    const next = STAGES[order.status].next;

    moveOrder(orderId, next);
    showToast(`Order #${shortId(order)}: ${STAGE_TOAST[next]}`);
};

const tick = () => {
    const user = getCurrentUser();

    if (user !== null && user.role === "customer") {
        const now = Date.now();
        const orders = getOrders();
        let movedOrder = null;
        let movedTo = "";

        orders.forEach(order => {
            const isWaiting = (order.status === "toShip" || order.status === "toReceive");
            const timeIsUp = (now - order.stageAt >= STAGE_SECONDS * 1000);

            // Advance this customer's waiting orders when their stage timer expires.
            if (isWaiting && order.customer === user.username && timeIsUp) {
                movedTo = STAGES[order.status].next;
                movedOrder = order;
                order.status = movedTo;
                order.stageAt = now;
            }
        });

        if (movedOrder !== null) {
            saveOrders(orders);
            renderAll();

            if (user.notifications) {
                showToast(`${STAGE_TOAST[movedTo]} (Order #${shortId(movedOrder)})`);
            }
        }
    }

    updateCountdowns();
};

const updateCountdowns = () => {
    document.querySelectorAll(".stage-countdown").forEach(span => {
        // Convert the stored end time into a non-negative whole-second countdown.
        const endTime = Number(span.getAttribute("data-end"));
        const secondsLeft = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        span.textContent = `${secondsLeft}s`;
    });
};

const submitReview = (card) => {
    const key = card.getAttribute("data-key");
    const orderId = Number(card.getAttribute("data-order"));
    const index = Number(card.getAttribute("data-index"));
    const draft = reviewDrafts[key];
    const text = card.querySelector(".review-textarea").value.trim();

    if (draft === undefined || !draft.rating) {
        alert("Please choose a star rating first.");
        return;
    }

    if (text === "") {
        alert("Please write your review.");
        return;
    }

    const user = getCurrentUser();
    const orders = getOrders();
    const order = findOrder(orders, orderId);
    const item = order.items[index];

    // Save a product review and a copy on the order item for account history.
    const review = {
        id: Date.now(),
        productId: item.productId,
        productName: item.name,
        image: item.image,
        option: item.option || "",
        username: user.username,
        rating: draft.rating,
        text: text,
        date: new Date().toISOString()
    };
    const reviews = getReviews();
    reviews.push(review);
    saveReviews(reviews);

    item.review = { rating: review.rating, text: text };

    let allRated = true;
    order.items.forEach(orderItem => {
        if (orderItem.review === null) {
            allRated = false;
        }
    });
    if (allRated) {
        // Move the order to history only after every item has a review.
        order.status = "done";
    }
    saveOrders(orders);

    delete reviewDrafts[key];
    renderAll();
    showToast("Thank you! Your review is now on the product page.");
};

const deleteHistory = (button) => {
    if (!confirm("Delete this from your history?")) {
        return;
    }

    const orderId = Number(button.getAttribute("data-order"));
    const index = Number(button.getAttribute("data-index"));

    const orders = getOrders();
    const order = findOrder(orders, orderId);
    order.items[index].historyDeleted = true;
    saveOrders(orders);

    renderAll();
};

window.addEventListener("hashchange", () => {
    if (window.location.hash === "#history-modal") {
        renderAll();
    }
});


// FAVORITES: show the signed-in user's saved products.
const renderFavoritesArea = (user) => {
    const cards = document.getElementById("favorites-list");
    const notice = document.getElementById("favorites-notice");

    if (user === null) {
        cards.hidden = true;
        notice.hidden = false;
        notice.textContent = "You need to sign in or log in first to add favorites.";
    } else if (user.role === "admin") {
        cards.hidden = true;
        notice.hidden = false;
        notice.textContent = "You are logged in as Admin. Admins don't have favorites. Use the To Ship and To Receive tabs on the left to confirm customers' orders.";
    } else {
        cards.innerHTML = getFavorites(user.username).map(favoriteCard).join("");
        cards.hidden = false;
        notice.hidden = true;
        showNoFavoritesIfEmpty();
    }
};

const favoriteCard = ({ id, name, image }) => {
    // Use the saved product ID to open that item's modal or section on the products page.
    return `
    <a href="products-page.html#${encodeURIComponent(id)}">
        <div class="favorite-card" data-id="${escapeHtml(id)}">
            <div class="favorite-card-image-box">
                <img src="${escapeHtml(image)}" class="favorite-card-image" alt="${escapeHtml(name)}">

                <div class="favorite-heart">
                    <img src="images/like.png" class="favorite-heart-icon">
                </div>
            </div>
            <div class="favorite-card-details">
                <hr class="card-divider"/>
                <p class="favorite-card-name">${escapeHtml(name)}</p>
            </div>
        </div>
    </a>`;
};

const showNoFavoritesIfEmpty = () => {
    const cards = document.getElementById("favorites-list");
    const notice = document.getElementById("favorites-notice");

    if (cards.hidden || cards.querySelector(".favorite-card") !== null) {
        return;
    }

    cards.hidden = true;
    notice.hidden = false;
    notice.textContent = "You don't have any favorites yet.";
};


// ACCOUNT SETTINGS: render saved account details and update preferences.

const renderSecurity = (user) => {
    let accountType = "Customer";
    if (user.role === "admin") {
        accountType = "Admin";
    }

    let privacy = "Public";
    if (user.isPrivate) {
        privacy = "Private (reviews show as Anonymous)";
    }

    document.getElementById("account-security-info").innerHTML = `
        <p class="order-info">Username: <b>${escapeHtml(user.username)}</b></p>
        <p class="order-info">Account type: <b>${accountType}</b></p>
        <p class="order-info">Signed in with: <b>${escapeHtml(user.provider)}</b></p>
        <p class="order-info">Privacy: <b>${privacy}</b></p>`;
};

// Read this account's saved delivery addresses from localStorage JSON.
const renderMyAddresses = (user) => {
    const saved = JSON.parse(localStorage.getItem(addressesKey())) || [];

    let rows = saved.map(({ address, contact }) => `<div class="order-card"><p class="order-info">${escapeHtml(address)}</p><p class="order-info">${escapeHtml(contact)}</p></div>`).join("");

    let deliveryPart = "";
    if (user.role !== "admin") {
        if (rows === "") {
            rows = `<p class="empty-message">No saved delivery address yet. You can add one when placing an order.</p>`;
        }
        deliveryPart = "<h3>Delivery addresses</h3>" + rows;
    }

    document.getElementById("my-addresses-info").innerHTML = `
        <div class="order-card"><b>Profile address</b><p class="order-info">${escapeHtml(user.location)}</p><p class="order-info">${escapeHtml(user.contact)}</p></div>
        ${deliveryPart}`;
};

document.getElementById("notifications-checkbox").addEventListener("change", () => {
    const checkbox = document.getElementById("notifications-checkbox");

    updateCurrentUser({ notifications: checkbox.checked });
    if (checkbox.checked) {
        showToast("Notifications are ON.");
    } else {
        showToast("Notifications are OFF.");
    }
});

document.getElementById("private-account-checkbox").addEventListener("change", () => {
    const checkbox = document.getElementById("private-account-checkbox");
    const user = getCurrentUser();

    if (user !== null && user.role === "admin") {
        checkbox.checked = true;
        showToast("The admin account is always private.");
        return;
    }

    updateCurrentUser({ isPrivate: checkbox.checked });
    renderHeader(getCurrentUser());
    if (checkbox.checked) {
        showToast("Your account is now private.");
    } else {
        showToast("Your account is now public.");
    }
});


// LOG IN / SIGN UP: validate forms and save account changes.
const loginModal = document.getElementById("login-modal");
let loginProvider = "";

// Hold provider details until the new customer's profile form is completed.
let loginPending = null;

let loginCredsMode = "customer";

const loginShowError = (message = "") => {
    const box = document.getElementById("login-error-message");
    box.textContent = message;
    box.hidden = (message === "");
};

const loginShowFieldError = (kind, message = "") => {
    const box = document.getElementById(`credentials-${kind}-error`);
    const input = document.getElementById(`credentials-${kind}`);

    box.textContent = message;
    box.hidden = (message === "");

    // Keep visual error styling and screen-reader validation state in sync.
    if (message === "") {
        input.classList.remove("invalid");
        input.removeAttribute("aria-invalid");
    } else {
        input.classList.add("invalid");
        input.setAttribute("aria-invalid", "true");
    }
};

const loginClearFieldErrors = () => {
    loginShowFieldError("username");
    loginShowFieldError("password");
};

const loginShowView = (name) => {
    // Display one modal screen at a time, then clear stale errors and focus its first field.
    document.querySelectorAll(".login-screen").forEach(screen => {
        if (screen.getAttribute("data-view") === name) {
            screen.hidden = false;
        } else {
            screen.hidden = true;
        }
    });
    loginShowError("");
    loginClearFieldErrors();

    const firstInput = document.querySelector('.login-screen[data-view="' + name + '"] input, .login-screen[data-view="' + name + '"] textarea');
    if (firstInput !== null) {
        firstInput.focus();
    }
};

const loginSetRole = (role) => {
    // Highlight the currently selected login role in the modal.
    document.querySelectorAll(".login-role-button").forEach(button => {
        if (button.getAttribute("data-role") === role) {
            button.classList.add("selected");
        } else {
            button.classList.remove("selected");
        }
    });
};

const logIn = () => {
    // Start a fresh login flow by clearing any unfinished provider sign-in and form entries.
    loginPending = null;

    document.querySelectorAll(".login-form").forEach(form => {
        form.reset();
    });

    document.getElementById("password-match-hint").textContent = "";
    loginSetRole("");
    loginModal.hidden = false;
    loginShowView("main");
};

const closeLoginModal = () => {
    loginModal.hidden = true;
};

// Save the signed-in user and refresh account data.
const loginDone = (username, message) => {
    const account = findAccount(username);
    if (account !== null && account.role === "customer" && localStorage.getItem(`nookAddresses-${username}`) === null) {
        saveDefaultAddress(username, account.location, account.contact);
    }

    setCurrentUser(username);
    closeLoginModal();
    renderAll();
    showToast(message);
};

// Store the default delivery address as JSON for this account.
const saveDefaultAddress = (username, address, contact) => {
    const key = `nookAddresses-${username}`;
    const saved = JSON.parse(localStorage.getItem(key)) || [];
    // Replace a matching default instead of storing duplicate copies.
    const others = saved.filter(item => !(item.address === address && item.contact === contact));

    localStorage.setItem(key, JSON.stringify([{ id: Date.now(), address: address, contact: contact }, ...others]));
};

const loginStartProvider = (provider) => {
    loginProvider = provider;
    document.getElementById("social-login-form").reset();
    document.getElementById("social-login-title").textContent = `Continue with ${provider}`;

    if (provider === "Google") {
        document.getElementById("social-login-label").textContent = "Gmail address";
        document.getElementById("social-login-input").setAttribute("placeholder", "user@gmail.com");
    } else {
        document.getElementById("social-login-label").textContent = "Facebook name";
        document.getElementById("social-login-input").setAttribute("placeholder", "Your Facebook name");
    }

    loginShowView("provider");
};

const loginSubmitProvider = () => {
    const username = document.getElementById("social-login-input").value.trim();

    // Validate all required fields before creating and saving the customer account.
    if (username === "") {
        if (loginProvider === "Google") {
            loginShowError("Please enter your Gmail address.");
        } else {
            loginShowError("Please enter your Facebook name.");
        }
        return;
    }

    if (loginProvider === "Google" && !isValidEmail(username)) {
        loginShowError("Please enter a valid Gmail address (e.g. user@gmail.com).");
        return;
    }

    if (username.toLowerCase() === ADMIN_USERNAME) {
        loginShowError("That username is reserved. Please choose another one.");
        return;
    }

    // Match usernames without case differences so provider sign-ins reuse existing accounts.
    const existing = findAccountIgnoreCase(username);
    if (existing !== null) {
        if (existing.provider === "New account") {
            loginShowError("That username is already taken. Please use another one.");
            return;
        }

        if (existing.role !== "customer") {
            loginShowError(`That account is registered as ${existing.role}.`);
            return;
        }

        loginDone(existing.username, `Welcome back, ${existing.username}!`);
        return;
    }

    // Keep provider details temporarily while the new user completes their profile.
    loginPending = { username: username, provider: loginProvider };
    document.getElementById("complete-profile-form").reset();
    document.getElementById("complete-profile-message").innerHTML = `You are signed in as <b>${escapeHtml(username)}</b>. Fill up your address and contact number to complete your profile.`;
    loginShowView("profile");
};

const loginSubmitProfile = () => {
    if (loginPending === null) {
        return;
    }

    // Provider sign-in collects delivery details before saving a new customer profile.
    const place = document.getElementById("complete-profile-address").value.trim();
    const contact = document.getElementById("complete-profile-contact").value.trim();

    if (place === "") {
        loginShowError("The location can't be empty.");
        return;
    }

    if (!isValidContact(contact)) {
        loginShowError("Please enter a valid contact number (11 digits, e.g. 09123456789).");
        return;
    }

    const { username, provider } = loginPending;

    addAccount({
        username: username,
        role: "customer",
        provider: provider,
        location: place,
        contact: contact,
        isPrivate: false,
        notifications: true
    });
    saveDefaultAddress(username, place, contact);
    loginDone(username, `Welcome, ${username}! You are logged in as customer.`);
};

const loginCheckMatch = () => {
    const password = document.getElementById("new-account-password").value;
    const confirmation = document.getElementById("new-account-confirm-password").value;
    const hint = document.getElementById("password-match-hint");

    // Show password-match feedback only after the user starts entering a confirmation.
    if (confirmation === "") {
        hint.textContent = "";
        hint.classList.remove("is-mismatch");
    } else if (password !== confirmation) {
        hint.textContent = "✖ Passwords do not match";
        hint.classList.add("is-mismatch");
    } else {
        hint.textContent = "✔ Passwords match";
        hint.classList.remove("is-mismatch");
    }
};

const loginSubmitNew = () => {
    const username = document.getElementById("new-account-username").value.trim();
    const password = document.getElementById("new-account-password").value;
    const confirmation = document.getElementById("new-account-confirm-password").value;
    const place = document.getElementById("new-account-address").value.trim();
    const contact = document.getElementById("new-account-contact").value.trim();

    if (username === "") {
        loginShowError("The username can't be empty.");
        return;
    }

    if (username.toLowerCase() === ADMIN_USERNAME) {
        loginShowError("That username is reserved. Please choose another one.");
        return;
    }

    if (findAccountIgnoreCase(username) !== null) {
        loginShowError("That username is already taken. Please choose another one.");
        return;
    }

    if (password.length < 6) {
        loginShowError("The password must be at least 6 characters.");
        return;
    }

    if (password !== confirmation) {
        loginShowError("The passwords do not match. Please type the same password again.");
        return;
    }

    if (place === "") {
        loginShowError("The location can't be empty.");
        return;
    }

    if (!isValidContact(contact)) {
        loginShowError("Please enter a valid contact number (11 digits, e.g. 09123456789).");
        return;
    }

    addAccount({
        username: username,
        password: password,
        role: "customer",
        provider: "New account",
        location: place,
        contact: contact,
        isPrivate: false,
        notifications: true
    });
    saveDefaultAddress(username, place, contact);
    loginDone(username, `Welcome, ${username}! You are logged in as customer.`);
};

const loginOpenCreds = (mode) => {
    loginCredsMode = mode;
    document.getElementById("credentials-form").reset();

    // Show the matching instructions because customer and admin credentials use separate checks.
    if (mode === "admin") {
        document.getElementById("credentials-title").textContent = "Admin Log In";
        document.getElementById("credentials-note").textContent = "Enter the admin username and password.";
    } else {
        document.getElementById("credentials-title").textContent = "Log In";
        document.getElementById("credentials-note").textContent = "Enter the username and password of your account.";
    }

    loginShowView("creds");
};

const loginSubmitCreds = () => {
    const username = document.getElementById("credentials-username").value.trim();
    const password = document.getElementById("credentials-password").value;

    loginShowError("");
    loginClearFieldErrors();

    if (loginCredsMode === "admin") {
        // Admin credentials use a separate check from customer accounts.
        logInAdmin(username, password);
        return;
    }

    // Customer usernames are case-insensitive, while passwords must match exactly.
    const matches = getAccounts().filter(item => item.role === "customer" && item.username.toLowerCase() === username.toLowerCase() && item.password !== undefined && item.password === password);

    if (matches.length === 0) {
        loginShowError("Wrong username or password.");
        return;
    }

    loginDone(matches[0].username, `Welcome back, ${matches[0].username}!`);
};

const logInAdmin = (username, password) => {
    if (!isAdminLogin(username, password)) {
        if (username === "") {
            loginShowFieldError("username", "Please enter the admin username.");
        } else if (username !== ADMIN_USERNAME) {
            loginShowFieldError("username", "Incorrect username.");
        }

        if (password === "") {
            loginShowFieldError("password", "Please enter the admin password.");
        } else if (password !== ADMIN_PASSWORD) {
            loginShowFieldError("password", "Incorrect password.");
        }
        return;
    }

    if (findAccount(ADMIN_USERNAME) === null) {
        // Create the local admin profile the first time valid admin credentials are used.
        addAccount({
            username: ADMIN_USERNAME,
            role: "admin",
            provider: "Admin login",
            location: "Barangay San Joseph, Santa Rosa Nueva Ecija",
            contact: "09123456789",
            isPrivate: true,
            notifications: true
        });
    }

    setCurrentUser(ADMIN_USERNAME);
    updateCurrentUser({ isPrivate: true });
    closeLoginModal();
    renderAll();
    showToast("Welcome, Admin!");
};

loginModal.addEventListener("click", event => {
    if (event.target === loginModal) {
        closeLoginModal();
    }
});

document.getElementById("login-close-button").addEventListener("click", closeLoginModal);

document.querySelectorAll("[data-provider]").forEach(button => {
    button.addEventListener("click", () => {
        loginStartProvider(button.getAttribute("data-provider"));
    });
});

document.querySelectorAll(".login-role-button").forEach(button => {
    button.addEventListener("click", () => {
        const role = button.getAttribute("data-role");

        if (role === "admin") {
            // Admins sign in with the separate admin username and password.
            loginSetRole("admin");
            loginOpenCreds("admin");
        } else if (role === "viewer") {
            // Viewers can browse without signing in but cannot use account features.
            closeLoginModal();
            showToast("You are just viewing. Click the username anytime to log in or sign up.");
        } else {
            // Customers can sign in or create an account through the customer flow.
            loginSetRole("customer");
            loginShowView("main");
        }
    });
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => {
        const target = button.getAttribute("data-go");

        if (target === "creds") {
            loginOpenCreds("customer");
        } else {
            loginSetRole("");
            loginShowView(target);
        }
    });
});

// Handle login forms in-page so validation can control when they are submitted.
document.getElementById("social-login-form").addEventListener("submit", event => {
    event.preventDefault();
    loginSubmitProvider();
});

document.getElementById("complete-profile-form").addEventListener("submit", event => {
    event.preventDefault();
    loginSubmitProfile();
});

document.getElementById("new-account-form").addEventListener("submit", event => {
    event.preventDefault();
    loginSubmitNew();
});

document.getElementById("credentials-form").addEventListener("submit", event => {
    event.preventDefault();
    loginSubmitCreds();
});

document.getElementById("credentials-username").addEventListener("input", () => {
    // Clear the field's error as the user edits it.
    loginShowFieldError("username");
});
document.getElementById("credentials-password").addEventListener("input", () => {
    loginShowFieldError("password");
});

// Keep the password confirmation hint current while either password field changes.
document.getElementById("new-account-password").addEventListener("input", loginCheckMatch);
document.getElementById("new-account-confirm-password").addEventListener("input", loginCheckMatch);


// EDIT PROFILE: validate changes and update saved account data.

const editProfileModal = document.getElementById("edit-profile-modal");

const editProfileShowError = (message = "") => {
    const box = document.getElementById("edit-profile-error-message");
    box.textContent = message;
    box.hidden = (message === "");
};

const editProfile = () => {
    const user = getCurrentUser();
    const usernameBox = document.getElementById("edit-profile-username");

    usernameBox.value = user.username;
    if (user.role === "admin") {
        usernameBox.readOnly = true;
    } else {
        usernameBox.readOnly = false;
    }
    document.getElementById("edit-profile-address").value = user.location;
    document.getElementById("edit-profile-contact").value = user.contact;

    editProfileShowError("");
    editProfileModal.hidden = false;
    usernameBox.focus();
};

const closeEditProfileModal = () => {
    editProfileModal.hidden = true;
};

const saveProfile = () => {
    const user = getCurrentUser();

    const oldUsername = user.username;
    const oldLocation = user.location;
    const oldContact = user.contact;
    const oldRole = user.role;

    const username = document.getElementById("edit-profile-username").value.trim();
    const place = document.getElementById("edit-profile-address").value.trim();
    const contact = document.getElementById("edit-profile-contact").value.trim();

    if (username === "" || place === "") {
        editProfileShowError("The username and location can't be empty.");
        return;
    }

    if (!isValidContact(contact)) {
        editProfileShowError("Please enter a valid contact number (11 digits, e.g. 09123456789).");
        return;
    }

    if (oldRole === "admin" && username !== ADMIN_USERNAME) {
        editProfileShowError("The admin username can't be changed.");
        return;
    }

    if (oldRole !== "admin" && username.toLowerCase() === ADMIN_USERNAME) {
        editProfileShowError("That username is reserved. Please choose another one.");
        return;
    }

    const sameName = getAccounts().filter(account => account.username.toLowerCase() === username.toLowerCase() && account.username !== oldUsername);
    if (sameName.length > 0) {
        editProfileShowError("That username is already taken. Please choose another one.");
        return;
    }

    if (username !== oldUsername) {
        // Keep order history and reviews attached to the account after a username change.
        const orders = getOrders();
        orders.forEach(order => {
            if (order.customer === oldUsername) {
                order.customer = username;
            }
        });
        saveOrders(orders);

        const reviews = getReviews();
        reviews.forEach(review => {
            if (review.username === oldUsername) {
                review.username = username;
            }
        });
        saveReviews(reviews);

        // Move data keyed by username to the new storage key, then remove the old address key.
        const oldAddressesKey = `nookAddresses-${oldUsername}`;
        const savedAddresses = localStorage.getItem(oldAddressesKey);
        if (savedAddresses !== null) {
            localStorage.setItem(`nookAddresses-${username}`, savedAddresses);
            localStorage.removeItem(oldAddressesKey);
        }

        // Transfer this user's favorites without disturbing other users' favorites.
        const allFavorites = getAllFavorites();
        const movedFavorites = allFavorites[oldUsername] || [];
        delete allFavorites[oldUsername];
        allFavorites[username] = movedFavorites;
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavorites));
    }

    const accounts = getAccounts();
    accounts.forEach(account => {
        if (account.username === oldUsername) {
            account.username = username;
            account.location = place;
            account.contact = contact;
        }
    });
    saveAccounts(accounts);
    setCurrentUser(username);

    if (place !== oldLocation || contact !== oldContact) {
        // Update the default saved delivery address when the profile address changes.
        saveDefaultAddress(username, place, contact);
    }

    closeEditProfileModal();
    renderAll();
    showToast("Profile updated.");
};

editProfileModal.addEventListener("click", event => {
    if (event.target === editProfileModal) {
        closeEditProfileModal();
    }
});

document.getElementById("edit-profile-close-button").addEventListener("click", closeEditProfileModal);
document.getElementById("edit-profile-cancel-button").addEventListener("click", closeEditProfileModal);

document.getElementById("edit-profile-form").addEventListener("submit", event => {
    event.preventDefault();
    saveProfile();
});


// START: render the account page and update order timers.

renderAll();

setInterval(tick, 1000);