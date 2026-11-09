// ACCOUNT DATA
const USER_KEY = "nookUser";
const ACCOUNTS_KEY = "nookAccounts";

// Read and write account records as JSON in localStorage.
const getAccounts = () => JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || [];

const saveAccounts = accounts => localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));

// Find the signed-in account using its saved username.
const getCurrentUser = () => {
    const username = localStorage.getItem(USER_KEY);
    const matches = getAccounts().filter(account => account.username === username);

    if (matches.length === 0) {
        return null;
    }
    return matches[0];
};

// Keep the signed-in username as a plain localStorage value.
const setCurrentUser = username => localStorage.setItem(USER_KEY, username);

const logOutUser = () => localStorage.removeItem(USER_KEY);

// Merge profile changes into the saved account record.
const updateCurrentUser = changes => {
    const user = getCurrentUser();
    if (user === null) {
        return;
    }

    saveAccounts(getAccounts().map(account => {
        if (account.username === user.username) {
            return { ...account, ...changes };
        }
        return account;
    }));
};

// Check for an 11-digit mobile number starting with 09.
const isValidContact = number => {
    const text = String(number);

    if (text.length !== 11 || text.slice(0, 2) !== "09") {
        return false;
    }

    for (let i = 0; i < text.length; i++) {
        if (text[i] < "0" || text[i] > "9") {
            return false;
        }
    }
    return true;
};


// ADMIN LOGIN
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin1234";

// Match the entered credentials against the admin account.
const isAdminLogin = (username, password) => username === ADMIN_USERNAME && password === ADMIN_PASSWORD;


// ORDER DATA
const ORDERS_KEY = "nookOrders";

// Read and write orders as a JSON array.
const getOrders = () => JSON.parse(localStorage.getItem(ORDERS_KEY)) || [];

const saveOrders = orders => localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));


// REVIEW DATA
const REVIEWS_KEY = "nookReviews";

// Read and write reviews as a JSON array.
const getReviews = () => JSON.parse(localStorage.getItem(REVIEWS_KEY)) || [];

const saveReviews = reviews => localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));


// ANNOUNCEMENT DATA
const ANNOUNCEMENTS_KEY = "nookAnnouncements";

// Remove legacy entries before returning saved announcements.
const getAnnouncements = () => {
    const saved = JSON.parse(localStorage.getItem(ANNOUNCEMENTS_KEY)) || [];
    const real = saved.filter(item => item.id > 3);

    if (real.length !== saved.length) {
        saveAnnouncements(real);
    }
    return real;
};

const saveAnnouncements = list => localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(list));


// SAVED ADDRESSES
// Use a separate storage key for each account.
const addressesKey = () => {
    const user = getCurrentUser();

    if (user === null) {
        return "nookAddresses";
    }
    return `nookAddresses-${user.username}`;
};


// FAVORITES
const FAVORITES_KEY = "nookFavorites";

// Favorites are stored as a username-to-list JSON object.
const getAllFavorites = () => JSON.parse(localStorage.getItem(FAVORITES_KEY)) || {};

const getFavorites = username => getAllFavorites()[username] || [];

// Update one user's list while keeping other favorites intact.
const saveFavorites = (username, list) => {
    const allFavorites = getAllFavorites();
    allFavorites[username] = list;
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(allFavorites));
};

const isFavorite = (username, id) => getFavorites(username).filter(item => item.id === id).length > 0;

const removeFavorite = (username, id) => saveFavorites(username, getFavorites(username).filter(item => item.id !== id));

// Add or remove one product from the user's favorites.
const toggleFavorite = (username, product) => {
    if (isFavorite(username, product.id)) {
        removeFavorite(username, product.id);
        return false;
    }

    saveFavorites(username, [...getFavorites(username), product]);
    return true;
};


// CART SETTINGS: fee and storage key.
const SHIPPING_FEE = 50;
const CART_KEY = "nookCartItems";


// CART HELPERS: format prices and update saved items.
// Format prices using the Philippine peso locale.
const peso = amount => `₱${amount.toLocaleString("en-PH")}`;

// Build option labels for cart and product cards.
const optionBadges = option => {
    if (!option) {
        return "";
    }

    const badges = option.split(", ").map(choice => `<span class="option-tag">${choice}</span>`).join("");
    return `<div class="option-tags">${badges}</div>`;
};

// Read saved cart JSON and normalize older item options.
const getCart = () => {
    const saved = JSON.parse(localStorage.getItem(CART_KEY)) || [];

    return saved.map(item => {
        let option = "";
        if (item.option !== undefined && item.option !== null) {
            option = item.option;
        } else if (item.size !== undefined && item.size !== null) {
            option = item.size;
        }
        return { ...item, option: option };
    });
};

// Save the cart as JSON and refresh its header count.
const saveCart = cart => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
};

// Sum item quantities for the cart badge.
const updateCartCount = () => {
    const badge = document.querySelector(".cart-count");
    if (badge === null) {
        return;
    }

    let count = 0;
    getCart().forEach(item => count += item.quantity);

    badge.innerText = count;
    if (count > 0) {
        badge.style.display = "flex";
    } else {
        badge.style.display = "none";
    }
};

// Add an item or increase the quantity of a matching one.
const addToCart = ({ id, name, price, image }, option = "") => {
    const cart = getCart();
    const sameItems = cart.filter(item => item.id === id && item.option === option);

    if (sameItems.length > 0) {
        sameItems[0].quantity += 1;
        saveCart(cart);
    } else {
        saveCart([...cart, { id: id, name: name, price: price, image: image, option: option, quantity: 1 }]);
    }
};


// PRODUCT POPUP: read selections and update modal prices.
const OPTION_GROUPS = ".size-selection, .flavor-selection";
const OPTION_BUTTONS = ".size-option, .flavor-option";

// Cache the original modal price before adding option costs.
const getBasePrice = modal => {
    const priceText = modal.querySelector(".modal-price");

    if (priceText.getAttribute("data-base") === null) {
        const written = priceText.textContent;
        let digits = "";
        for (let i = 0; i < written.length; i++) {
            if ((written[i] >= "0" && written[i] <= "9") || written[i] === ".") {
                digits += written[i];
            }
        }
        priceText.setAttribute("data-base", digits);
    }
    return Number(priceText.getAttribute("data-base"));
};

// Update the displayed price from the selected options.
const updateModalPrice = modal => {
    let extra = 0;
    modal.querySelectorAll(".size-option.selected, .flavor-option.selected").forEach(button => {
        extra += Number(button.getAttribute("data-extra")) || 0;
    });

    const total = getBasePrice(modal) + extra;
    modal.querySelector(".modal-price").textContent = `₱${total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Read product details from its modal.
const getProductFromModal = modal => ({
    id: modal.getAttribute("id"),
    name: modal.querySelector("h2, h3").textContent.trim(),
    price: getBasePrice(modal),
    image: modal.querySelector(".modal-image").getAttribute("src")
});

// Validate the required selections and return their names and extra cost.
const getSelectedOptions = modal => {
    const group = modal.querySelector(OPTION_GROUPS);
    if (group === null) {
        return { ok: true, option: "", extra: 0 };
    }

    const picked = group.querySelectorAll(".size-option.selected, .flavor-option.selected");
    const needed = Number(group.getAttribute("data-pick")) || 1;

    if (picked.length !== needed) {
        const what = group.getAttribute("data-name") || "option";
        let plural = "";
        if (needed > 1) {
            plural = "s";
        }
        return { ok: false, message: `Please select ${needed} ${what}${plural}.` };
    }

    const names = [];
    let extra = 0;
    picked.forEach(button => {
        names.push(button.textContent.trim());
        extra += Number(button.getAttribute("data-extra")) || 0;
    });

    return { ok: true, option: names.join(", "), extra: extra };
};

// Show a short status message.
const showMessage = message => {
    const toast = document.createElement("div");
    toast.classList.add("toast");
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 1500);
};


// PRODUCT BUTTONS: connect option selection and cart actions.
const selectOption = (modal, group, optionButton) => {
    const needed = Number(group.getAttribute("data-pick")) || 1;

    if (needed === 1) {
        group.querySelectorAll(OPTION_BUTTONS).forEach(button => button.classList.remove("selected"));
        optionButton.classList.add("selected");
    } else if (optionButton.classList.contains("selected")) {
        optionButton.classList.remove("selected");
    } else {
        const selected = group.querySelectorAll(".flavor-option.selected");
        if (selected.length >= needed) {
            selected[0].classList.remove("selected");
        }
        optionButton.classList.add("selected");
    }

    updateModalPrice(modal);
};

// Add the configured product to cart or continue to checkout.
const addFromModal = (modal, goToCart) => {
    const choice = getSelectedOptions(modal);
    if (!choice.ok) {
        showMessage(choice.message);
        return;
    }

    const product = getProductFromModal(modal);
    product.price += choice.extra;
    addToCart(product, choice.option);

    if (goToCart) {
        window.location.href = "cart-page.html";
    } else {
        showMessage("Added to cart!");
    }
};

const connectProductButtons = () => {
    document.querySelectorAll(".modal").forEach(modal => {
        // Connect each option group so the selected product choices update its modal.
        modal.querySelectorAll(OPTION_GROUPS).forEach(group => {
            group.querySelectorAll(OPTION_BUTTONS).forEach(optionButton => {
                optionButton.addEventListener("click", () => {
                    selectOption(modal, group, optionButton);
                });
            });
        });

        // Handle both purchase actions through the same cart logic; order-now redirects afterward.
        modal.querySelectorAll(".add-to-cart-button, .order-now-button").forEach(button => {
            button.addEventListener("click", event => {
                event.preventDefault();
                addFromModal(modal, button.classList.contains("order-now-button"));
            });
        });
    });
};


// CART PAGE: render items, quantities, and totals.
const cartBody = document.getElementById("cart-body");

// Render the cart table and totals.
const renderCart = () => {
    if (cartBody === null) {
        return;
    }

    const cart = getCart();

    if (cart.length === 0) {
        cartBody.innerHTML = `<tr class="empty-cart"><td colspan="5">Your cart is empty.</td></tr>`;
    } else {
        cartBody.innerHTML = cart.map(({ name, price, image, option, quantity }, index) => {
            return `
                <tr class="cart-item" data-index="${index}">
                    <td class="product-cell">
                        <div class="product-info">
                            <img src="${image}" alt="${name}">
                            <div class="product-text">
                                <span class="product-name">${name}</span>
                                ${optionBadges(option)}
                            </div>
                        </div>
                    </td>
                    <td class="product-price">${peso(price)}</td>
                    <td class="quantity-cell"><input type="number" value="${quantity}" min="1"></td>
                    <td class="item-total-price">${peso(price * quantity)}</td>
                    <td class="remove-cell"><i class="ri-delete-bin-line"></i></td>
                </tr>`;
        }).join("");
    }

    connectCartRows();
    updateSummary();
};

const connectCartRows = () => {
    cartBody.querySelectorAll(".cart-item").forEach(row => {
        const quantityBox = row.querySelector(".quantity-cell input");
        const removeIndex = Number(row.getAttribute("data-index"));

        quantityBox.addEventListener("input", () => {
            setQuantity(quantityBox, row);
        });

        quantityBox.addEventListener("change", () => {
            // Restore a valid minimum quantity when the user leaves the field.
            if (isNaN(parseInt(quantityBox.value)) || quantityBox.value < 1) {
                quantityBox.value = 1;
            }
            setQuantity(quantityBox, row);
        });

        row.querySelector(".remove-cell").addEventListener("click", () => {
            // Filter by the row's saved cart index, then redraw totals and remaining rows.
            saveCart(getCart().filter((item, index) => index !== removeIndex));
            renderCart();
        });
    });
};

// Recalculate subtotal, delivery fee, and grand total.
const updateSummary = () => {
    const subtotalText = document.querySelector(".subtotal");
    if (subtotalText === null) {
        return;
    }

    const cart = getCart();

    let subtotal = 0;
    cart.forEach(item => subtotal += item.price * item.quantity);

    let deliveryFee = 0;
    // Charge shipping only when there is at least one item in the cart.
    if (cart.length > 0) {
        deliveryFee = SHIPPING_FEE;
    }

    const grandTotal = subtotal + deliveryFee;

    subtotalText.innerText = peso(subtotal);
    if (deliveryFee === 0) {
        document.querySelector(".delivery-fee").innerText = "₱0";
    } else {
        document.querySelector(".delivery-fee").innerText = peso(deliveryFee);
    }
    document.querySelector(".grand-total").innerText = peso(grandTotal);
};

const setQuantity = (input, row) => {
    const index = Number(row.getAttribute("data-index"));
    const quantity = parseInt(input.value);

    if (isNaN(quantity) || quantity < 1) {
        return;
    }

    const cart = getCart();
    // Persist the updated quantity, then refresh both the row total and cart summary.
    cart[index].quantity = quantity;
    saveCart(cart);

    row.querySelector(".item-total-price").innerText = peso(cart[index].price * quantity);
    updateSummary();
};

const checkoutButton = document.querySelector(".cart-total .checkout-button");

if (checkoutButton !== null) {
    checkoutButton.addEventListener("click", () => {
        // Prevent checkout navigation when there is nothing to order.
        if (getCart().length === 0) {
            alert("Your cart is empty.");
            return;
        }
        window.location.href = "place-order-page.html";
    });
}


// START: refresh the cart and connect product modals.
renderCart();
updateCartCount();
connectProductButtons();