// Show the admin's saved location, or the default location for other visitors.
const locationAddress = document.getElementById("location-address");
const locationLink = document.getElementById("location-link");

const originalAddress = locationAddress.textContent.trim();
const originalLink = locationLink.getAttribute("href");

function showLocation() {
    const user = getCurrentUser();

    if (user !== null && user.role === "admin" && user.location) {
        locationAddress.textContent = user.location;
        locationLink.setAttribute("href", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(user.location)}`);
    } else {
        locationAddress.textContent = originalAddress;
        locationLink.setAttribute("href", originalLink);
    }
}

showLocation();

window.addEventListener("pageshow", showLocation);
window.addEventListener("storage", showLocation);