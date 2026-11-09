// MOBILE PRODUCT LISTS: add View All controls on small screens.
{
    const VISIBLE_ON_MOBILE = 2;
    const LABEL_OPEN = "View All →";
    const LABEL_CLOSE = "Show Less ↑";

    const mobileQuery = window.matchMedia("(max-width: 640px)");

    // Keep the list's expanded class, button label, and accessibility state consistent.
    const setExpanded = (box, button, open) => {
        if (open) {
            box.classList.add("expanded");
            button.setAttribute("aria-expanded", "true");
            button.textContent = LABEL_CLOSE;
        } else {
            box.classList.remove("expanded");
            button.setAttribute("aria-expanded", "false");
            button.textContent = LABEL_OPEN;
        }
    };

    const revealHashTarget = () => {
        let id = window.location.hash.slice(1);
        if (id === "") {
            return;
        }

        try {
            id = decodeURIComponent(id);
        } catch (error) {
        }

        const target = document.getElementById(id);
        if (target === null) {
            return;
        }

        const box = target.closest(".product-list.collapsible");
        if (box === null) {
            return;
        }

        const button = box.previousElementSibling.querySelector(".view-all-button");
        // Expand the matching list so a product linked by its hash is visible on mobile.
        if (button !== null) {
            setExpanded(box, button, true);
        }
    };

    const enableMobile = () => {
        document.querySelectorAll(".product-list").forEach(box => {
            if (box.classList.contains("collapsible")) {
                return;
            }

            // Count only direct product cards so nested markup is not treated as another item.
            const cards = box.querySelectorAll(":scope > .product-item");
            const title = box.previousElementSibling;

            if (cards.length <= VISIBLE_ON_MOBILE) {
                return;
            }
            if (title === null || !title.classList.contains("subcategory-header")) {
                return;
            }

            const button = document.createElement("button");
            button.setAttribute("type", "button");
            button.classList.add("view-all-button");
            button.textContent = LABEL_OPEN;
            button.setAttribute("aria-expanded", "false");
            title.appendChild(button);

            box.classList.add("collapsible");

            button.addEventListener("click", () => {
                const open = !box.classList.contains("expanded");
                setExpanded(box, button, open);

                if (!open) {
                    title.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }
            });
        });

        revealHashTarget();
    };

    const disableMobile = () => {
        document.querySelectorAll(".view-all-button").forEach(button => {
            button.remove();
        });
        document.querySelectorAll(".product-list").forEach(box => {
            box.classList.remove("collapsible", "expanded");
        });
    };

    const sync = () => {
        if (mobileQuery.matches) {
            enableMobile();
        } else {
            disableMobile();
        }
    };

    const init = () => {
        sync();

        if (mobileQuery.addEventListener) {
            mobileQuery.addEventListener("change", sync);
        } else {
            mobileQuery.addListener(sync);
        }

        window.addEventListener("hashchange", revealHashTarget);
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
}

// PRODUCT REVIEWS: match saved reviews to products and render them.
{
    const CARD_WIDTH = 275;
    const CARD_SPACE = 10;

    // Load review, account, and order records from localStorage JSON.
    const reviews = JSON.parse(localStorage.getItem("nookReviews")) || [];
    const accounts = JSON.parse(localStorage.getItem("nookAccounts")) || [];
    const orders = JSON.parse(localStorage.getItem("nookOrders")) || [];

    const clean = text => {
        // Normalize spacing and capitalization so names from saved data compare consistently.
        const lowered = String(text || "").trim().toLowerCase();
        let result = "";
        let lastWasSpace = false;

        for (let i = 0; i < lowered.length; i++) {
            const character = lowered[i];

            if (character.trim() === "") {
                if (!lastWasSpace) {
                    result += " ";
                }
                lastWasSpace = true;
            } else {
                result += character;
                lastWasSpace = false;
            }
        }

        return result;
    };

    // Compare image names without query strings or encoded characters.
    const fileName = path => {
        const lastPart = String(path || "").split("?")[0].split("/").pop();

        try {
            return decodeURIComponent(lastPart).toLowerCase();
        } catch (error) {
            return lastPart.toLowerCase();
        }
    };

    // Cache product modals once; reviews use this list to locate their matching product.
    const modals = [...document.querySelectorAll(".modal")];

    const nameOf = modal => {
        const title = modal.querySelector("h3");
        if (title === null) {
            return "";
        }
        return clean(title.textContent);
    };

    const imageOf = modal => {
        const picture = modal.querySelector(".modal-image");
        if (picture === null) {
            return "";
        }
        return fileName(picture.getAttribute("src"));
    };

    let orderedItems = [];
    // Flatten order items so older reviews can recover product images and options from orders.
    orders.forEach(order => {
        orderedItems = [...orderedItems, ...order.items];
    });

    // Match a review to its order item using the product name and saved review text.
    const orderOf = review => orderedItems.filter(item => item.name === review.productName && item.review && item.review.text === review.text)[0];

    const pictureOf = review => {
        if (review.image) {
            return review.image;
        }

        const match = orderOf(review);
        if (match) {
            return match.image;
        }
        return "";
    };

    const optionOf = review => {
        if (review.option) {
            return review.option;
        }

        const match = orderOf(review);
        if (match && match.option) {
            return match.option;
        }
        return "";
    };

    const dateOf = review => {
        const date = new Date(review.date);
        if (isNaN(date)) {
            return "";
        }
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    // Match a saved review to its product modal.
    const findModal = review => {
        // Match by stable product ID first, then fall back to image or name for older reviews.
        if (review.productId) {
            const byId = document.getElementById(review.productId);
            if (byId !== null && byId.classList.contains("modal")) {
                return byId;
            }
        }

        const picture = fileName(pictureOf(review));
        if (picture !== "") {
            const byPicture = modals.filter(modal => imageOf(modal) === picture)[0];
            if (byPicture !== undefined) {
                return byPicture;
            }
        }

        const orderedName = clean(review.productName);
        const sameName = modals.filter(modal => nameOf(modal) === orderedName)[0];
        if (sameName !== undefined) {
            return sameName;
        }

        const startsWithName = modals.filter(modal => nameOf(modal) !== "" && orderedName.startsWith(nameOf(modal)))[0];
        if (startsWithName !== undefined) {
            return startsWithName;
        }

        return null;
    };

    const layout = reviewBox => {
        [...reviewBox.children].forEach(card => {
            card.style.width = CARD_WIDTH + "px";
        });
        reviewBox.style.width = Math.max(1100, reviewBox.children.length * (CARD_WIDTH + CARD_SPACE) + CARD_SPACE) + "px";
    };

    const make = (tag, className, text) => {
        const element = document.createElement(tag);
        element.classList.add(className);
        element.textContent = text;
        return element;
    };

    const EMPTY_MESSAGE = "No reviews or feedbacks yet. Order now and be the first to leave one!";

    const updateReviewSection = section => {
        if (section === null) {
            return;
        }

        const reviewBox = section.querySelector(".review-list");
        if (reviewBox === null) {
            return;
        }

        let message = section.querySelector(".reviews-empty-state");
        if (message === null) {
            message = make("p", "reviews-empty-state", EMPTY_MESSAGE);
            section.appendChild(message);
        }

        if (reviewBox.children.length === 0) {
            reviewBox.style.display = "none";
            message.hidden = false;
        } else {
            reviewBox.style.display = "block";
            message.hidden = true;
            layout(reviewBox);
        }
    };

    const isSaltedEgg = modal => modal.closest(".salted-egg-container") !== null;

    const foodOf = review => {
        const fullName = String(review.productName || "");
        let food = fullName;

        if (fullName.toLowerCase().startsWith("salted egg")) {
            food = fullName.slice("salted egg".length);
            if (food.startsWith(":")) {
                food = food.slice(1);
            }
        }

        return food.trim() || review.productName;
    };

    const addReview = (modal, review) => {
        const reviewBox = modal.querySelector(".review-list");
        if (reviewBox === null) {
            return;
        }

        const account = accounts.filter(item => item.username === review.username)[0];
        let shownName = review.username;
        // Hide the reviewer's name when their account is marked private.
        if (account !== undefined && account.isPrivate) {
            shownName = "Anonymous";
        }

        const user = document.createElement("span");
        user.classList.add("review-user");
        user.appendChild(make("span", "review-avatar", ""));
        user.appendChild(make("b", "review-name", shownName));

        const head = document.createElement("div");
        head.classList.add("review-header");
        head.appendChild(user);
        head.appendChild(make("span", "review-date", dateOf(review)));

        let starText = "";
        for (let star = 1; star <= 5; star++) {
            if (star <= review.rating) {
                starText += "\u2605";
            } else {
                starText += "\u2606";
            }
        }

        const sub = document.createElement("div");
        sub.classList.add("review-details");
        sub.appendChild(make("span", "review-stars", starText));

        // Salted-egg reviews include the specific food variant being reviewed.
        if (isSaltedEgg(modal)) {
            sub.appendChild(make("span", "review-food", foodOf(review)));
        }

        const option = optionOf(review);
        // Show the purchased flavor or size when the review has one.
        if (option !== "") {
            sub.appendChild(make("span", "review-option", option));
        }

        const card = document.createElement("div");
        card.classList.add("review-card");
        card.setAttribute("data-review-id", review.id);
        card.setAttribute("data-review-username", review.username);
        card.appendChild(head);
        card.appendChild(sub);
        card.appendChild(make("p", "review-text", review.text));

        const currentUser = getCurrentUser();
        // Let customers delete only their own reviews.
        if (currentUser !== null &&
            currentUser.role === "customer" &&
            currentUser.username === review.username) {
            const button = document.createElement("button");
            button.classList.add("customer-review-delete");
            button.setAttribute("type", "button");
            button.setAttribute("title", "Delete your review");
            button.setAttribute("aria-label", "Delete your review");

            const icon = document.createElement("i");
            icon.classList.add("fa", "fa-trash");
            button.appendChild(icon);
            button.addEventListener("click", event => {
                // Keep the delete click from also triggering the product modal behind the review.
                event.preventDefault();
                event.stopPropagation();
                deleteOwnReview(card);
            });

            card.appendChild(button);
        }

        reviewBox.appendChild(card);
        updateReviewSection(modal.querySelector(".reviews-section"));
    };

    const HIDDEN_KEY = "nookHiddenReviews";

    // Build a repeatable key for built-in reviews, which do not have saved review IDs.
    const defaultKey = card => `${card.closest(".modal").id}|${card.querySelector(".review-name").textContent}|${card.querySelector(".review-text").textContent}`;

    const hiddenKeys = JSON.parse(localStorage.getItem(HIDDEN_KEY)) || [];
    hiddenKeys.forEach(key => {
        document.querySelectorAll(".review-list .review-card").forEach(card => {
            if (card.getAttribute("data-review-id") === null && defaultKey(card) === key) {
                card.remove();
            }
        });
    });

    reviews.forEach(review => {
        const modal = findModal(review);
        if (modal === null) {
            return;
        }

        let targets = [modal];
        if (isSaltedEgg(modal)) {
            // Salted-egg variants share one review list, so show the review on each variant.
            targets = [...modal.closest(".salted-egg-container").querySelectorAll(".modal")];
        }

        targets.forEach(target => addReview(target, review));
    });

    document.querySelectorAll(".reviews-section").forEach(section => {
        updateReviewSection(section);
    });

    const isAdmin = () => {
        const user = getCurrentUser();
        return user !== null && user.role === "admin";
    };

    // Remove a customer's review from localStorage and the page.
    const deleteOwnReview = card => {
        const user = getCurrentUser();
        const id = card.getAttribute("data-review-id");

        if (user === null || user.role !== "customer" || id === null) {
            return;
        }

        const saved = JSON.parse(localStorage.getItem("nookReviews")) || [];
        // Verify ownership before removing the matching saved review.
        const ownedReview = saved.filter(review =>
            String(review.id) === id && review.username === user.username
        );

        if (ownedReview.length === 0 || !confirm("Delete your review?")) {
            return;
        }

        const kept = saved.filter(review =>
            !(String(review.id) === id && review.username === user.username)
        );
        localStorage.setItem("nookReviews", JSON.stringify(kept));

        const affected = [...document.querySelectorAll(".review-card")].filter(item =>
            item.getAttribute("data-review-id") === id &&
            item.getAttribute("data-review-username") === user.username
        );

        affected.forEach(item => {
            const box = item.parentElement;
            const section = box.closest(".reviews-section");
            item.remove();
            layout(box);
            updateReviewSection(section);
        });

        document.dispatchEvent(new Event("reviewsChanged"));
    };

    // Delete a saved or built-in review as admin.
    // Remove a saved review or hide a built-in review.
    const deleteAsAdmin = card => {
        if (!isAdmin() || !confirm("Delete this review?")) {
            return;
        }

        const id = card.getAttribute("data-review-id");
        let affected = [card];

        if (id !== null) {
            const saved = JSON.parse(localStorage.getItem("nookReviews")) || [];
            const kept = saved.filter(review => String(review.id) !== id);
            localStorage.setItem("nookReviews", JSON.stringify(kept));

            affected = [...document.querySelectorAll(".review-card")].filter(item =>
                item.getAttribute("data-review-id") === id
            );
        } else {
            // Built-in reviews are in page markup, so store a key to hide them on later visits.
            const hidden = JSON.parse(localStorage.getItem(HIDDEN_KEY)) || [];
            localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden, defaultKey(card)]));
        }

        affected.forEach(item => {
            const section = item.closest(".reviews-section");
            item.remove();
            updateReviewSection(section);
        });

        document.dispatchEvent(new Event("reviewsChanged"));
    };

    if (isAdmin()) {
        document.querySelectorAll(".review-list .review-card").forEach(card => {
            const date = card.querySelector(".review-date");

            const button = make("button", "review-delete-button", "Delete");
            button.setAttribute("type", "button");
            button.setAttribute("title", "Delete this review");
            button.addEventListener("click", () => {
                deleteAsAdmin(card);
            });

            const right = document.createElement("span");
            right.classList.add("review-header-right");
            date.replaceWith(right);
            right.appendChild(date);
            right.appendChild(button);
        });
    }
}

// FAVORITES AND RATINGS: sync product hearts and review scores.
{
    const LIKED_IMG = "images/like.png";
    const NOT_LIKED_IMG = "images/notLike.png";

    // Find or create a product's favorite button.
    const getHeart = box => {
        let heart = box.querySelector(".heart");

        if (heart === null) {
            const icon = document.createElement("img");
            icon.setAttribute("src", NOT_LIKED_IMG);
            icon.classList.add("heart-icon");

            heart = document.createElement("div");
            heart.classList.add("heart");
            heart.appendChild(icon);
            box.appendChild(heart);
        }

        heart.setAttribute("role", "button");
        return heart;
    };

    // Read each product card's direct link and image to connect it with its modal and favorite.
    const normalProducts = [...document.querySelectorAll(".product-item")].map(card => {
        const link = card.querySelector(":scope > a");
        const box = card.querySelector(".product-image-box");
        const picture = card.querySelector(".product-image-box > img");
        const shortName = card.querySelector(".product-name");

        if (link === null || box === null || picture === null || shortName === null) {
            return null;
        }

        const id = link.getAttribute("href").slice(1);
        const modal = document.getElementById(id);

        let fullName = shortName.textContent;
        if (modal !== null) {
            const popupTitle = modal.querySelector("h3");
            if (popupTitle !== null) {
                fullName = popupTitle.textContent;
            }
        }

        return {
            modal: modal,
            pictureBox: box,
            heart: getHeart(box),
            product: {
                id: id,
                name: fullName.trim(),
                image: picture.getAttribute("src")
            }
        };
    });

    const saltedEggProducts = [...document.querySelectorAll(".salted-egg-container")].map(container => {
        const box = container.querySelector(".salted-egg-image-box");
        const picture = container.querySelector(".salted-egg-image");
        const firstModal = container.querySelector(".modal");

        if (box === null || picture === null || firstModal === null) {
            return null;
        }

        return {
            modal: firstModal,
            pictureBox: box,
            heart: getHeart(box),
            product: { id: "salted-egg", name: "Salted Egg", image: picture.getAttribute("src") }
        };
    });

    // Combine both product layouts and skip cards missing required elements.
    const items = [...normalProducts, ...saltedEggProducts].filter(item => item !== null);

    const favoriteOwner = () => {
        const user = getCurrentUser();
        // Favorites belong to customers; signed-out users and admins have no owner key.
        if (user !== null && user.role !== "admin") {
            return user.username;
        }
        return null;
    };

    // Show each product's current favorite state.
    const paintHearts = () => {
        const owner = favoriteOwner();

        items.forEach(entry => {
            const { heart, product } = entry;
            const liked = owner !== null && isFavorite(owner, product.id);
            const icon = heart.querySelector(".heart-icon");

            if (liked) {
                icon.setAttribute("src", LIKED_IMG);
                heart.setAttribute("aria-label", "Remove from favorites");
                heart.setAttribute("aria-pressed", "true");
            } else {
                icon.setAttribute("src", NOT_LIKED_IMG);
                heart.setAttribute("aria-label", "Add to favorites");
                heart.setAttribute("aria-pressed", "false");
            }
        });
    };

    // Use one delegated listener so clicks work for all product hearts.
    document.addEventListener("click", event => {
        const heart = event.target.closest(".heart");
        if (heart === null) {
            return;
        }

        const item = items.filter(entry => entry.heart === heart)[0];
        if (item === undefined) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const user = getCurrentUser();

        if (user === null) {
            if (confirm("You need an account to add favorites. Go to your Account page to log in or sign up?")) {
                window.location.href = "account-page.html";
            }
            return;
        }

        if (user.role === "admin") {
            alert("Admin accounts don't have favorites. Please log in as a customer.");
            return;
        }

        toggleFavorite(user.username, item.product);
        paintHearts();
    });

    const countFilledStars = text => {
        let count = 0;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === "\u2605") {
                count += 1;
            }
        }
        return count;
    };

    const ratingsOf = modal => {
        if (modal === null) {
            return [];
        }

        // Read only review star elements, excluding the product's displayed average rating.
        const starBoxes = modal.querySelectorAll(".review-list .review-card .review-stars");
        return [...starBoxes].map(starBox => countFilledStars(starBox.textContent));
    };

    const starIcon = (number, rating) => {
        if (number <= rating) {
            return `<span class="fa fa-star checked"></span>`;
        }
        if (number - 0.5 <= rating) {
            return `<span class="fa fa-star-half-o checked"></span>`;
        }
        return `<span class="fa fa-star"></span>`;
    };

    // Render the average rating for a product.
    const showStars = entry => {
        const { modal, pictureBox } = entry;
        const ratings = ratingsOf(modal);

        let total = 0;
        ratings.forEach(rating => {
            total += rating;
        });

        let average = 0;
        if (ratings.length > 0) {
            average = total / ratings.length;
        }

        // Round only the displayed stars to half-star steps; keep the numeric score precise.
        const rounded = Math.round(average * 2) / 2;

        let box = pictureBox.querySelector(".stars");
        if (box === null) {
            box = document.createElement("div");
            box.classList.add("stars");
            pictureBox.appendChild(box);
        }

        let starsHtml = "";
        for (let number = 1; number <= 5; number++) {
            starsHtml += starIcon(number, rounded);
        }

        box.innerHTML = starsHtml + `<span class="score">${average.toFixed(1)}</span>`;

        let hoverText = "No reviews yet";
        if (ratings.length === 1) {
            hoverText = "1 review";
        } else if (ratings.length > 1) {
            hoverText = `${ratings.length} reviews`;
        }
        box.setAttribute("title", hoverText);
    };

    items.forEach(showStars);

    document.addEventListener("reviewsChanged", () => {
        items.forEach(showStars);
    });

    paintHearts();

    window.addEventListener("pageshow", paintHearts);
    window.addEventListener("storage", paintHearts);
}