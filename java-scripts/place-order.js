// STATE: track the selected and edited address.
let selectedAddressId = null;
let editingAddressId = null;


// HELPERS: read saved data, validate input, and format values.
// Parse the JSON address list saved for the current user, using an empty list when none exists.
const getAddresses = () => JSON.parse(localStorage.getItem(addressesKey())) || [];

// Serialize the updated address list before saving it for the current user.
const saveAddresses = addresses => localStorage.setItem(addressesKey(), JSON.stringify(addresses));

const isValidNumber = number => {
    if (number.length !== 11 || number.slice(0, 2) !== "09") {
        return false;
    }

    for (let i = 0; i < number.length; i++) {
        if (number[i] < "0" || number[i] > "9") {
            return false;
        }
    }

    return true;
};

// Escape user-entered text before inserting it into HTML.
const escapeHtml = text => {
    const box = document.createElement("div");
    box.textContent = text;
    return box.innerHTML;
};

// Extract digits and a decimal point from a price string.
const onlyNumberCharacters = text => {
    let result = "";

    for (let i = 0; i < text.length; i++) {
        const character = text[i];
        if ((character >= "0" && character <= "9") || character === ".") {
            result += character;
        }
    }

    return result;
};


// ORDER ITEMS: render cart items and update totals.
// Build one order summary card.
const orderItemCard = item => {
    const { name, price, image, quantity } = item;

    return `
        <div class="order-item-card">
            <img src="${image}" class="order-item-image">
            <div class="order-item-details">
                <h3>${name}</h3>
                ${optionBadges(item.option)}
                <div class="order-item-numbers">
                    <p>Price: <b>${peso(price)}</b></p>
                    <p>Quantity: <b>${quantity}</b></p>
                    <p>Total: <b>${peso(price * quantity)}</b></p>
                </div>
            </div>
        </div>`;
};

function showOrderItems() {
    const cart = getCart();
    const itemsBox = document.getElementById("order-items-list");

    if (cart.length === 0) {
        itemsBox.innerHTML = `<p>No items to order. <a href="products-page.html#snacks">Browse products</a></p>`;
    } else {
        itemsBox.innerHTML = cart.map(orderItemCard).join("");
    }

    updateSummary();
}


// ADDRESSES: render and manage saved delivery details.
// Build one selectable saved-address row.
const addressCard = item => {
    let checked = "";
    if (item.id === selectedAddressId) {
        checked = "checked";
    }

    return `
        <div class="saved-address-card">
            <label>
                <input type="radio" name="address" value="${item.id}" ${checked}>
                <span>${escapeHtml(item.address)}<br>${item.contact}</span>
            </label>
            <span class="saved-address-buttons">
                <button type="button" class="edit-address-button action-button" data-id="${item.id}">Edit</button>
                <button type="button" class="delete-address-button action-button" data-id="${item.id}">Delete</button>
            </span>
        </div>`;
};

// Reconnect controls after the address list is redrawn.
function connectAddressButtons() {
    const box = document.getElementById("saved-addresses-list");

    box.querySelectorAll(".edit-address-button").forEach(button => {
        button.addEventListener("click", () => {
            editAddress(Number(button.getAttribute("data-id")));
        });
    });

    box.querySelectorAll(".delete-address-button").forEach(button => {
        button.addEventListener("click", () => {
            deleteAddress(Number(button.getAttribute("data-id")));
        });
    });

    box.querySelectorAll('input[name="address"]').forEach(radio => {
        radio.addEventListener("change", () => {
            selectedAddressId = Number(radio.value);
        });
    });
}

function showAddresses() {
    const addresses = getAddresses();
    const box = document.getElementById("saved-addresses-list");

    if (addresses.length === 0) {
        // Remove stale address controls when the last saved address has been deleted.
        box.innerHTML = "<p>No saved address yet. Fill in the details above, then press Save Address.</p>";
        return;
    }

    // Keep the current selection when possible; otherwise select the first saved address.
    const stillThere = addresses.filter(item => item.id === selectedAddressId);
    if (stillThere.length === 0) {
        selectedAddressId = addresses[0].id;
    }

    // Rebuild the rows, then attach handlers to the newly created controls.
    box.innerHTML = addresses.map(addressCard).join("");
    connectAddressButtons();
}

function clearAddressForm() {
    // Reset both the fields and edit mode so the next save creates a new address.
    document.getElementById("address-input").value = "";
    document.getElementById("contact-number-input").value = "";
    document.getElementById("save-address-button").innerText = "Save Address";
    editingAddressId = null;
}

function editAddress(id) {
    // Load the selected saved address into the form and switch its button to update mode.
    const address = getAddresses().filter(item => item.id === id)[0];

    document.getElementById("address-input").value = address.address;
    document.getElementById("contact-number-input").value = address.contact;
    document.getElementById("save-address-button").innerText = "Update Address";
    editingAddressId = id;
}

function deleteAddress(id) {
    if (!confirm("Delete this saved address and contact number?")) {
        return;
    }

    saveAddresses(getAddresses().filter(item => item.id !== id));

    if (editingAddressId === id) {
        clearAddressForm();
    }

    if (selectedAddressId === id) {
        selectedAddressId = null;
    }

    showAddresses();
}

// Validate the form and return its address and contact values.
function readAddressForm() {
    const address = document.getElementById("address-input").value.trim();
    const contact = document.getElementById("contact-number-input").value.trim();

    if (address === "") {
        alert("Please enter your complete address.");
        return null;
    }

    if (!isValidNumber(contact)) {
        alert("Please enter a valid contact number (11 digits, e.g. 09123456789).");
        return null;
    }

    return { address: address, contact: contact };
}

function saveAddress() {
    const form = readAddressForm();
    if (form === null) {
        return;
    }

    const addresses = getAddresses();

    if (editingAddressId === null) {
        const newAddress = { id: Date.now(), ...form };
        saveAddresses([...addresses, newAddress]);
        selectedAddressId = newAddress.id;
    } else {
        // Replace only the matching address so its existing ID and list position remain unchanged.
        const updated = addresses.map(item => {
            if (item.id === editingAddressId) {
                return { ...item, ...form };
            }
            return item;
        });
        saveAddresses(updated);
        selectedAddressId = editingAddressId;
    }

    clearAddressForm();
    showAddresses();
}

// Save entered details as a new address, or reset an empty form.
function addNewAddress() {
    const addressText = document.getElementById("address-input").value.trim();
    const contactText = document.getElementById("contact-number-input").value.trim();
    const isEmpty = addressText === "" && contactText === "";

    if (isEmpty) {
        clearAddressForm();
        document.getElementById("address-input").focus();
        return;
    }

    const form = readAddressForm();
    if (form === null) {
        return;
    }

    const newAddress = { id: Date.now(), ...form };
    saveAddresses([...getAddresses(), newAddress]);
    selectedAddressId = newAddress.id;

    clearAddressForm();
    showAddresses();
}


// PAYMENT: read the selected method and show its required fields.
function getPaymentMethod() {
    const checked = document.querySelector('input[name="payment"]:checked');
    if (checked === null) {
        return null;
    }
    return checked.value;
}

function showPaymentDetails() {
    const method = getPaymentMethod();
    const detailsBox = document.getElementById("payment-details");

    if (method === "GCash" || method === "PayPal") {
        document.getElementById("payment-account-number-label").innerText = `${method} Number`;
        detailsBox.hidden = false;
    } else {
        detailsBox.hidden = true;
    }
}


// ORDER SUBMISSION: validate checkout and save the order.
function checkoutProblem() {
    const user = getCurrentUser();
    if (user === null) {
        return "You need an account to check out. Please log in or sign up first on your Account page.";
    }
    if (user.role === "admin") {
        return "Admin accounts can't place orders. Please log in as a customer.";
    }
    return null;
}

function makeOrderItem(cartItem) {
    // Accept older cart records that stored the product ID as `id` instead of `productId`.
    let productId = cartItem.productId;
    if (productId === undefined || productId === null) {
        productId = cartItem.id;
    }
    if (productId === undefined || productId === null) {
        productId = null;
    }

    let option = cartItem.option;
    if (option === undefined) {
        option = "";
    }

    return {
        productId: productId,
        name: cartItem.name,
        image: cartItem.image,
        option: option,
        price: cartItem.price,
        quantity: cartItem.quantity,
        review: null,
        historyDeleted: false
    };
}

function placeOrder() {
    // Send signed-out users and admins to the account page before validating checkout.
    const problem = checkoutProblem();
    if (problem !== null) {
        alert(problem);
        window.location.href = "account-page.html";
        return;
    }

    if (getCart().length === 0) {
        alert("Your cart is empty.");
        return;
    }

    // Resolve the selected ID against saved data so the order stores the full address.
    const address = getAddresses().filter(item => item.id === selectedAddressId)[0];
    if (address === undefined) {
        alert("Please save or select a delivery address.");
        return;
    }

    const method = getPaymentMethod();
    if (method === null) {
        alert("Please choose a mode of payment.");
        return;
    }

    const online = method === "GCash" || method === "PayPal";

    // Only online payments require account details; cash orders keep these fields empty.
    if (online) {
        const payName = document.getElementById("payment-account-name").value.trim();
        const payNumber = document.getElementById("payment-account-number").value.trim();

        if (payName === "") {
            alert(`Please enter your ${method} account name.`);
            return;
        }

        if (!isValidNumber(payNumber)) {
            alert(`Please enter a valid ${method} number (11 digits, e.g. 09123456789).`);
            return;
        }
    }

    let accountName = "";
    let accountNumber = "";
    // Store account details only for online payments; cash-on-delivery leaves them blank.
    if (online) {
        accountName = document.getElementById("payment-account-name").value.trim();
        accountNumber = document.getElementById("payment-account-number").value.trim();
    }

    // Convert the displayed fee, which includes currency formatting, to a number.
    const deliveryText = document.querySelector(".delivery-fee").innerText;

    // Snapshot checkout and cart data into the order before clearing the cart.
    const order = {
        id: Date.now(),
        customer: getCurrentUser().username,
        items: getCart().map(makeOrderItem),
        address: address.address,
        contact: address.contact,
        payment: {
            method: method,
            name: accountName,
            number: accountNumber
        },
        deliveryFee: Number(onlyNumberCharacters(deliveryText)) || 0,
        orderedAt: new Date().toISOString(),
        status: "toShip",
        stageAt: Date.now()
    };
    // Append the new order so existing order history is preserved.
    saveOrders([...getOrders(), order]);

    const total = document.querySelector(".grand-total").innerText;
    alert(`Your order has been placed! Total: ${total}`);

    // Clear the cart only after the order has been saved successfully.
    saveCart([]);

    let ordersLink = "account-page.html#to-ship-modal";
    if (method === "Cash on Delivery") {
        ordersLink = "account-page.html#to-pay-modal";
    }

    document.getElementById("order-done-details").innerText = `Paying with ${method}. Delivering to: ${address.address} (${address.contact})`;
    document.getElementById("view-orders-link").setAttribute("href", ordersLink);
    document.getElementById("order-form").hidden = true;
    document.getElementById("order-done-screen").hidden = false;
}


// EVENTS: connect checkout form controls.
document.getElementById("save-address-button").addEventListener("click", saveAddress);
document.getElementById("add-new-address-button").addEventListener("click", addNewAddress);
document.getElementById("place-order-button").addEventListener("click", placeOrder);

document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener("change", showPaymentDetails);
});


// START: show checkout only to an eligible customer.
const startProblem = checkoutProblem();

if (startProblem !== null) {
    document.getElementById("order-form").hidden = true;
    document.getElementById("login-needed-message").innerText = startProblem;
    document.getElementById("login-needed-screen").hidden = false;
} else {
    showOrderItems();
    showAddresses();
}
