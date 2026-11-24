
// ========================================
// THRIFTLY - WEBSITE NAVIGATION
// ========================================

import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    sendEmailVerification,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import {
    collection,
    addDoc,
    serverTimestamp,
    onSnapshot,
    doc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    updateDoc
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// 1. PRODUCT DATA
// Real products will be loaded from Firebase later.

let products = [];
let wishlistIds = new Set();
let wishlistMeta = new Map();
let selectedProduct = null;
let cartItems = [];

// 2. CATEGORY NAMES

const categories = {
    All: "All listings",
    Books: "Books & Stationery",
    Fashion: "Clothes & Accessories",
    Electronics: "Electronics",
    Hostel: "Hostel Essentials",
    Kitchen: "Kitchen & Utensils",
    Furniture: "Furniture",
    Sports: "Sports Equipment",
    Other: "Other"
};


// 3. GET PAGE ELEMENTS

const homePage = document.getElementById("homePage");
const marketplacePage = document.getElementById("marketplacePage");
const accountPage = document.getElementById("accountPage");
const authPage = document.getElementById("authPage");
const listingPage = document.getElementById("listingPage");

const searchInput = document.getElementById("searchInput");

const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("sidebarBackdrop");

const productGrid = document.getElementById("productGrid");
const emptyState = document.getElementById("emptyState");
const productDetailsPage = document.getElementById("productDetailsPage");
const sellerDashboardPage = document.getElementById("sellerDashboardPage");
const myRequestsPage = document.getElementById("myRequestsPage");
const myListingsPage = document.getElementById("myListingsPage");
const messagesPage = document.getElementById("messagesPage");
const profilePage = document.getElementById("profilePage");

// CART ELEMENTS
const cartDrawer = document.getElementById("cartDrawer");
const cartBackdrop = document.getElementById("cartBackdrop");
const cartButton = document.getElementById("cartButton");
const closeCartButton = document.getElementById("closeCartButton");
const cartCountBadge = document.getElementById("cartCountBadge");
const cartDrawerCount = document.getElementById("cartDrawerCount");
const cartBody = document.getElementById("cartBody");
const cartEmptyState = document.getElementById("cartEmptyState");
const cartItemsList = document.getElementById("cartItemsList");
const cartFooter = document.getElementById("cartFooter");
const cartSubtotal = document.getElementById("cartSubtotal");
const cartTotal = document.getElementById("cartTotal");
const cartStatusMessage = document.getElementById("cartStatusMessage");
const submitCartRequestsButton = document.getElementById("submitCartRequestsButton");
const cartContinueShoppingButton = document.getElementById("cartContinueShoppingButton");
const cartCloseAndContinueButton = document.getElementById("cartCloseAndContinueButton");
const cartRequestBanner = document.getElementById("cartRequestBanner");
const cartRequestBannerText = document.getElementById("cartRequestBannerText");
const cartViewRequestsBtn = document.getElementById("cartViewRequestsBtn");
const cartEmptyViewRequestsBtn = document.getElementById("cartEmptyViewRequestsBtn");
const addToCartButton = document.getElementById("addToCartButton");
const detailsWishlistButton = document.getElementById("detailsWishlistButton");
const messageSellerButton = document.getElementById("messageSellerButton");

// SIDEBAR ACCOUNT NAVIGATION
const sidebarWishlistButton = document.getElementById("sidebarWishlistButton");
const sidebarAccountButton = document.getElementById("sidebarAccountButton");
const sidebarAccountTitle = document.getElementById("sidebarAccountTitle");
const logoutButton = document.getElementById("logoutButton");
const accountLogoutButton = document.getElementById("accountLogoutButton");
const accountHeaderLogoutButton = document.getElementById("accountHeaderLogoutButton");

// WISHLIST ELEMENTS
const wishlistPage = document.getElementById("wishlistPage");
const wishlistGrid = document.getElementById("wishlistGrid");
const wishlistEmptyState = document.getElementById("wishlistEmptyState");
const wishlistCountDescription = document.getElementById("wishlistCountDescription");
const wishlistCountBadge = document.getElementById("wishlistCountBadge");
const navWishlistButton = document.getElementById("wishlistButton");
const wishlistBackButton = document.getElementById("wishlistBackButton") || document.getElementById("wishlistBackToMarketplace");
const wishlistExploreButton = document.getElementById("wishlistExploreButton");

let lastBrowsingPage = marketplacePage;
let currentPage = homePage;
const navigationHistory = [];

// 4. CURRENT MARKETPLACE SETTINGS

let currentCategory = "All";
let currentType = "All";
let searchTerm = "";


// 5. SHOW A PAGE WITH HISTORY SUPPORT

function showPage(page, options = {}) {
    if (!page) return;

    const pushState = options.pushState !== undefined ? options.pushState : true;
    const isPopstate = options.isPopstate || false;

    // Track navigation history stack for in-app Back button
    if (currentPage && currentPage !== page && !options.fromBack && !isPopstate) {
        // Prevent duplicate consecutive entries in navigationHistory
        if (navigationHistory.length === 0 || navigationHistory[navigationHistory.length - 1] !== currentPage) {
            navigationHistory.push(currentPage);
        }
    }

    if (page !== productDetailsPage && page !== authPage) {
        lastBrowsingPage = page;
    }

    homePage.classList.add("hidden");
    marketplacePage.classList.add("hidden");
    if (wishlistPage) wishlistPage.classList.add("hidden");
    accountPage.classList.add("hidden");
    authPage.classList.add("hidden");
    listingPage.classList.add("hidden");
    productDetailsPage.classList.add("hidden");
    sellerDashboardPage.classList.add("hidden");
    myListingsPage.classList.add("hidden");
    myRequestsPage.classList.add("hidden");
    messagesPage.classList.add("hidden");
    profilePage.classList.add("hidden");

    page.classList.remove("hidden");
    currentPage = page;

    // Browser History API synchronization
    if (pushState && !isPopstate && window.history && window.history.pushState) {
        const pageHash = "#" + page.id.replace("Page", "").toLowerCase();
        try {
            history.pushState({ pageId: page.id }, "", pageHash === "#home" ? window.location.pathname : pageHash);
        } catch (e) {
            // Ignore potential history restrictions
        }
    }

    // Update the floating Messages / Home icon
    updateFloatingButton();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// Resolve a sensible fallback page if navigation history is empty (direct access or refresh)
function getPageFallback(page) {
    if (!page) return homePage;
    if (page === productDetailsPage) {
        return (lastBrowsingPage && lastBrowsingPage !== productDetailsPage) ? lastBrowsingPage : marketplacePage;
    }
    if (page === myListingsPage) return sellerDashboardPage;
    if (page === myRequestsPage) return profilePage;
    if (page === listingPage) return marketplacePage;
    if (page === sellerDashboardPage) return homePage;
    if (page === profilePage) return homePage;
    if (page === accountPage) return homePage;
    if (page === authPage) return homePage;
    if (page === messagesPage) return homePage;
    if (page === wishlistPage) return homePage;
    if (page === marketplacePage) return homePage;
    return homePage;
}

// Universal In-App Back Navigation Function
function goBack(fallbackPage = null) {
    // 1. If currently inside Seller Dashboard on a sub-tab (My Listings, Requests, Sales), return to Overview first
    if (currentPage === sellerDashboardPage) {
        const overviewSection = document.getElementById("sellerSectionOverview");
        if (overviewSection && overviewSection.classList.contains("hidden")) {
            switchSellerTab("sellerTabOverview");
            return;
        }
    }

    // 2. Return to the immediately previous internal Thriftly page visited
    while (navigationHistory.length > 0) {
        const prev = navigationHistory.pop();
        if (prev && prev !== currentPage && document.body.contains(prev)) {
            showPage(prev, { pushState: true, fromBack: true });
            return;
        }
    }

    // 3. Fallback if opened directly or refreshed without prior history
    const fallback = fallbackPage || getPageFallback(currentPage);
    if (fallback && fallback !== currentPage) {
        showPage(fallback, { pushState: true, fromBack: true });
    } else {
        showPage(homePage, { pushState: true, fromBack: true });
    }
}

// Universal Page Back Button Listener
document.addEventListener("click", function (event) {
    const backBtn = event.target.closest(".page-back-button");
    if (backBtn) {
        event.preventDefault();
        // If cart drawer is open and back arrow was clicked, close the drawer
        if (typeof cartDrawer !== "undefined" && cartDrawer && cartDrawer.classList.contains("open")) {
            closeCartDrawer();
            return;
        }
        goBack();
    }
});

// Browser Back/Forward navigation listener
window.addEventListener("popstate", function (event) {
    // 1. Close open drawers first if user hits browser back
    if (typeof cartDrawer !== "undefined" && cartDrawer && cartDrawer.classList.contains("open")) {
        closeCartDrawer(true);
        return;
    }
    if (typeof sidebar !== "undefined" && sidebar && sidebar.classList.contains("open")) {
        closeSidebar();
        return;
    }

    // 2. Return from mobile chat view to conversation list
    const messagingLayout = document.querySelector(".messaging-layout");
    if (messagingLayout && messagingLayout.classList.contains("chat-open")) {
        messagingLayout.classList.remove("chat-open");
        return;
    }

    // 3. Resolve target page
    let targetPage = homePage;
    if (event.state && event.state.pageId) {
        const el = document.getElementById(event.state.pageId);
        if (el) targetPage = el;
    } else if (window.location.hash) {
        const hash = window.location.hash.replace("#", "").toLowerCase();
        const map = {
            "home": homePage,
            "marketplace": marketplacePage,
            "wishlist": wishlistPage,
            "productdetails": productDetailsPage,
            "listing": listingPage,
            "sellerdashboard": sellerDashboardPage,
            "account": accountPage,
            "profile": profilePage,
            "auth": authPage,
            "messages": messagesPage,
            "myrequests": myRequestsPage,
            "mylistings": myListingsPage
        };
        if (map[hash]) targetPage = map[hash];
    }

    if (targetPage === profilePage && auth.currentUser) {
        loadAccountDashboard();
    } else if (targetPage === sellerDashboardPage && auth.currentUser) {
        loadSellerDashboard();
    } else if (targetPage === wishlistPage && auth.currentUser) {
        renderWishlistPage();
    }

    showPage(targetPage, { pushState: false, isPopstate: true });
});

// Initialize History State
try {
    if (window.history && window.history.replaceState) {
        const initialHash = window.location.hash.replace("#", "").toLowerCase();
        const initialMap = {
            "marketplace": marketplacePage,
            "wishlist": wishlistPage,
            "productdetails": productDetailsPage,
            "listing": listingPage,
            "sellerdashboard": sellerDashboardPage,
            "account": accountPage,
            "profile": profilePage,
            "auth": authPage,
            "messages": messagesPage,
            "myrequests": myRequestsPage,
            "mylistings": myListingsPage
        };
        const initialPage = initialMap[initialHash] || homePage;
        currentPage = initialPage;
        history.replaceState({ pageId: initialPage.id }, "");
    }
} catch (e) {
    // Ignore error
}

// OPEN MY PROFILE
document.getElementById("navUserProfile")
    .addEventListener("click", function () {

        if (!auth.currentUser) {
            showPage(authPage);
            return;
        }

        showPage(profilePage);
loadAccountDashboard();
    });


// 6. GO TO HOMEPAGE

function goHome() {

    searchInput.value = "";

    currentCategory = "All";
    currentType = "All";
    searchTerm = "";

    updateFilterButtons();
    updateSidebarSelection();
    updateMarketplace();
    updateHomeRecentListings();

    closeSidebar();

    showPage(homePage);

}


// 7. OPEN MARKETPLACE

function openMarketplace() {

    currentCategory = "All";
    currentType = "All";
    searchTerm = "";

    searchInput.value = "";

    updateFilterButtons();
    updateSidebarSelection();
    updateMarketplace();
    updateHomeRecentListings();

    closeSidebar();

    showPage(marketplacePage);

}


// 8. OPEN SELLING PAGE

function openSellingPage() {

    closeSidebar();

    const user = auth.currentUser;

    if (user && user.emailVerified) {
        showPage(listingPage);
    } else {
        showPage(accountPage);
    }

}


// 9. ACCOUNT NAVIGATION


// 9. ACCOUNT NAVIGATION

let authMode = "register";

function setAuthMode(mode) {
    authMode = mode;

    const authEmailErr = document.getElementById("authEmailError");
    if (authEmailErr) authEmailErr.classList.add("hidden");

    const isRegister = mode === "register";

    document.getElementById("authTitle").textContent =
        isRegister ? "Create your account" : "Welcome back";

    document.getElementById("authDescription").textContent =
        isRegister
            ? "Register as a student to start listing items."
            : "Log in to your Thriftly student account.";

    document.getElementById("nameField").hidden = !isRegister;

    document.getElementById("confirmPasswordField").hidden =
        !isRegister;

    document.getElementById("fullNameInput").required = isRegister;

    document.getElementById("confirmPasswordInput").required =
        isRegister;

    document.getElementById("authPasswordInput").placeholder =
        isRegister ? "Create a password" : "Enter your password";

    document.getElementById("authPasswordInput").autocomplete =
        isRegister ? "new-password" : "current-password";

    document.getElementById("authSubmitButton").textContent =
        isRegister ? "Create account" : "Log in";

    document.getElementById("authSwitchButton").textContent =
        isRegister ? "Log in" : "Create an account";

    document.querySelector(".auth-switch").firstChild.textContent =
        isRegister
            ? "Already have an account? "
            : "Don't have an account? ";

    document.getElementById("authMessage").textContent = "";

    document.getElementById("authForm").dataset.mode = mode;
}

document.getElementById("registerButton")
    .addEventListener("click", function () {
        setAuthMode("register");
        showPage(authPage);
    });

function openLoginPage() {
    setAuthMode("login");
    showPage(authPage);
}

document.getElementById("loginButton")
    .addEventListener("click", openLoginPage);

document.getElementById("accountLoginButton")
    .addEventListener("click", openLoginPage);

document.getElementById("authSwitchButton")
    .addEventListener("click", function () {
        setAuthMode(
            authMode === "register" ? "login" : "register"
        );
    });





// 10. CONNECT HOME PAGE BUTTONS

document.getElementById("exploreButton")
    .addEventListener("click", openMarketplace);


document.getElementById("sellButton")
    .addEventListener("click", openSellingPage);

document.getElementById("heroSellButton")
    .addEventListener("click", openSellingPage);

document.getElementById("emptySellButton")
    .addEventListener("click", openSellingPage);

const homeViewAllButton = document.getElementById("homeViewAllButton");
if (homeViewAllButton) {
    homeViewAllButton.addEventListener("click", openMarketplace);
}

const homeRecentSellButton = document.getElementById("homeRecentSellButton");
if (homeRecentSellButton) {
    homeRecentSellButton.addEventListener("click", openSellingPage);
}

// Connect homepage category navigation cards
document.querySelectorAll(".home-category-card").forEach(function(card) {
    card.addEventListener("click", function() {
        const cat = card.dataset.category;
        if (cat) {
            selectCategory(cat);
        }
    });
});

// Connect hero popular search tag pills
document.querySelectorAll(".hero-tag-pill").forEach(function(pill) {
    pill.addEventListener("click", function() {
        const term = pill.dataset.search || pill.textContent.trim();
        searchInput.value = term;
        performSearch();
    });
});


// 11. HEADER HOME LOGO

document.getElementById("homeLink")
    .addEventListener("click", function(event) {

        event.preventDefault();
        goHome();

    });


document.getElementById("footerHomeLink")
    .addEventListener("click", function(event) {

        event.preventDefault();
        goHome();

    });


// 12. SIDEBAR FUNCTIONS

function openSidebar() {

    sidebar.classList.add("open");
    backdrop.classList.add("show");

    document.body.classList.add("no-scroll");

}


function closeSidebar() {

    sidebar.classList.remove("open");
    backdrop.classList.remove("show");

    document.body.classList.remove("no-scroll");

}


document.getElementById("menuButton")
    .addEventListener("click", openSidebar);

document.getElementById("closeSidebar")
    .addEventListener("click", closeSidebar);

backdrop.addEventListener("click", closeSidebar);


document.addEventListener("keydown", function(event) {

    if (event.key === "Escape") {
        closeSidebar();
    }

});


// 13. UPDATE SIDEBAR CATEGORY HIGHLIGHT

function updateSidebarSelection() {

    document.querySelectorAll(".sidebar-category")
        .forEach(function(button) {

            button.classList.toggle(
                "active",
                button.dataset.category === currentCategory
            );

        });

}


// 14. SELECT CATEGORY

function selectCategory(category) {

    currentCategory = category;

    currentType = "All";
    searchTerm = "";

    searchInput.value = "";

    updateSidebarSelection();
    updateFilterButtons();
    updateMarketplace();
    updateHomeRecentListings();

    closeSidebar();

    showPage(marketplacePage);

}


document.querySelectorAll(".sidebar-category")
    .forEach(function(button) {

        button.addEventListener("click", function() {

            selectCategory(button.dataset.category);

        });

    });


// 15. SEARCH FUNCTIONALITY

function performSearch() {

    searchTerm = searchInput.value
        .trim()
        .toLowerCase();

    currentCategory = "All";

    updateSidebarSelection();
    updateMarketplace();
    updateHomeRecentListings();

    showPage(marketplacePage);

}


document.getElementById("searchButton")
    .addEventListener("click", performSearch);


searchInput.addEventListener("keydown", function(event) {

    if (event.key === "Enter") {
        performSearch();
    }

});


// 16. FILTER BY SALE OR RENT

document.querySelectorAll(".filter-button")
    .forEach(function(button) {

        button.addEventListener("click", function() {

            currentType = button.dataset.type;

            updateFilterButtons();
            updateMarketplace();
    updateHomeRecentListings();

        });

    });


function updateFilterButtons() {

    document.querySelectorAll(".filter-button")
        .forEach(function(button) {

            button.classList.toggle(
                "selected",
                button.dataset.type === currentType
            );

        });

}


// 17. FORMAT PRICE

function formatPrice(product) {

    const amount = new Intl.NumberFormat("en-IN")
        .format(Number(product.price));

    if (product.type === "Rent") {
        return `₹${amount} / ${product.rentalUnit || "week"}`;
    }

    return `₹${amount}`;

}


// 18. CREATE PRODUCT CARD

function createProductCard(product) {

    const card = document.createElement("article");
    card.className = "product-card";

    const imageArea = document.createElement("div");
    imageArea.className = "product-image";

    // Only seller-uploaded images will be displayed.

    if (product.imageUrl) {

        const image = document.createElement("img");

        image.src = product.imageUrl;
        image.alt = product.title;
        image.loading = "lazy";

        imageArea.appendChild(image);

    } else {

        const placeholder = document.createElement("div");

        placeholder.className = "product-image-placeholder";

        placeholder.innerHTML = `
            <span>Image</span>
            <small>Seller photo</small>
        `;

        imageArea.appendChild(placeholder);

    }


    const info = document.createElement("div");
    info.className = "product-info";

    const category = document.createElement("div");
    category.className = "product-category";
    category.textContent = categories[product.category] || "Other";

    const title = document.createElement("h3");
    title.textContent = product.title || "Untitled item";

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = formatPrice(product);

    const condition = document.createElement("p");
    condition.className = "product-condition";
    condition.textContent = product.condition || "Condition not specified";

    const tag = document.createElement("span");
    tag.className = "product-tag " + (product.type === "Rent" ? "type-rent" : "type-sale");
    tag.textContent = product.type === "Rent" ? "For rent" : "For sale";

    if (product.status && product.status !== "Available") {
        const statusBadge = document.createElement("span");
        statusBadge.className = "product-tag status-sold";
        statusBadge.style.marginLeft = "6px";
        statusBadge.textContent = product.status;
        info.append(category, title, price, condition, tag, statusBadge);
    } else {
        info.append(category, title, price, condition, tag);
    }

// Wishlist heart button
const wishlistButton = document.createElement("button");

wishlistButton.className = "wishlist-button";
wishlistButton.type = "button";

const isWishlisted = wishlistIds.has(product.id);

wishlistButton.innerHTML = isWishlisted
    ? `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>`
    : `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>`;
wishlistButton.classList.toggle("active", isWishlisted);

wishlistButton.title = isWishlisted
    ? "Remove from wishlist"
    : "Add to wishlist";

wishlistButton.addEventListener("click", function (event) {
    event.stopPropagation();
    toggleWishlist(product);
});

card.append(imageArea, info, wishlistButton);
    card.style.cursor = "pointer";

card.addEventListener("click", function () {
    openProductDetails(product);
});



    return card;

}


// 19. FILTER PRODUCTS

function getFilteredProducts() {

    let filtered = products.filter(function(product) {

        // Exclude sold or non-available items from the marketplace
        const isAvailable = !product.status || product.status === "Available";
        if (!isAvailable) return false;

        const matchesCategory =
            currentCategory === "All" ||
            product.category === currentCategory;

        const matchesType =
            currentType === "All" ||
            product.type === currentType;

        const searchableText = [
            product.title,
            product.description,
            product.category,
            product.condition
        ].join(" ").toLowerCase();

        const matchesSearch =
            searchableText.includes(searchTerm);

        return matchesCategory && matchesType && matchesSearch;

    });


    const sort = document.getElementById("sortSelect").value;

    if (sort === "low") {

        filtered.sort((a, b) => Number(a.price) - Number(b.price));

    } else if (sort === "high") {

        filtered.sort((a, b) => Number(b.price) - Number(a.price));

    } else {

        filtered.sort((a, b) =>
            new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );

    }

    return filtered;

}


// 20. UPDATE MARKETPLACE

function updateMarketplace() {

    const filteredProducts = getFilteredProducts();

    productGrid.innerHTML = "";

    document.getElementById("resultsTitle").textContent =
        currentCategory === "All"
            ? "All listings"
            : categories[currentCategory];

    document.getElementById("resultsDescription").textContent =
        searchTerm
            ? `Results for "${searchInput.value.trim()}"`
            : "Explore items listed by students in your college.";

    document.getElementById("resultsCount").textContent =
        `${filteredProducts.length} listings`;


    if (filteredProducts.length === 0) {

        emptyState.hidden = false;

        if (searchTerm) {

            document.getElementById("emptyTitle").textContent =
                "No matching items found";

            document.getElementById("emptyDescription").textContent =
                "Try another search or choose a different category.";

        } else if (currentCategory !== "All") {

            document.getElementById("emptyTitle").textContent =
                `No ${categories[currentCategory]} listed yet`;

            document.getElementById("emptyDescription").textContent =
                "There are currently no listings in this category.";

        } else {

            document.getElementById("emptyTitle").textContent =
                "No listings yet";

            document.getElementById("emptyDescription").textContent =
                "Be the first to list something on Thriftly.";

        }

        return;

    }


    emptyState.hidden = true;

    filteredProducts.forEach(function(product) {

        productGrid.appendChild(createProductCard(product));

    });

    if (wishlistPage && !wishlistPage.classList.contains("hidden")) {
        renderWishlistPage();
    }

}


// 21. SORTING

document.getElementById("sortSelect")
    .addEventListener("change", updateMarketplace);


// ========================================
// 21B. UPDATE HOMEPAGE RECENT LISTINGS
// ========================================

function updateHomeRecentListings() {
    const homeRecentGrid = document.getElementById("homeRecentGrid");
    const homeRecentEmptyState = document.getElementById("homeRecentEmptyState");
    if (!homeRecentGrid) return;

    homeRecentGrid.innerHTML = "";

    // Filter available products
    const availableProducts = products.filter(function (product) {
        return !product.status || product.status === "Available";
    });

    if (availableProducts.length === 0) {
        if (homeRecentEmptyState) homeRecentEmptyState.classList.remove("hidden");
        return;
    }

    if (homeRecentEmptyState) homeRecentEmptyState.classList.add("hidden");

    // Display up to 4 most recent available listings on the homepage
    const recentProducts = availableProducts.slice(0, 4);
    recentProducts.forEach(function (product) {
        homeRecentGrid.appendChild(createProductCard(product));
    });
}


// 22. INITIAL WEBSITE LOAD

updateSidebarSelection();
updateFilterButtons();
updateMarketplace();
updateHomeRecentListings();
loadCartFromStorage();

console.log("Thriftly is ready.");


// ========================================
// THRIFTLY - FIREBASE AUTHENTICATION
// ========================================

const authForm = document.getElementById("authForm");
const authMessage = document.getElementById("authMessage");
const authEmailInput = document.getElementById("authEmailInput");
const authEmailError = document.getElementById("authEmailError");
const authSubmitButton = document.getElementById("authSubmitButton");

// IGDTUW COLLEGE EMAIL VALIDATION HELPER
function isValidCollegeEmail(email) {
    if (typeof email !== "string") return false;
    const normalized = email.trim().toLowerCase();
    // Strict validation: must match standard email format ending exactly in @igdtuw.ac.in
    const collegeEmailRegex = /^[a-z0-9._%+-]+@igdtuw\.ac\.in$/;
    return collegeEmailRegex.test(normalized);
}

// Real-time helper validation for registration email field
if (authEmailInput) {
    authEmailInput.addEventListener("input", function () {
        if (authMode === "register" && authEmailError && !authEmailError.classList.contains("hidden")) {
            const val = authEmailInput.value.trim().toLowerCase();
            if (val && isValidCollegeEmail(val)) {
                authEmailError.classList.add("hidden");
                if (authMessage && authMessage.textContent.includes("IGDTUW")) {
                    authMessage.textContent = "";
                }
            }
        }
    });

    authEmailInput.addEventListener("blur", function () {
        if (authMode === "register") {
            const val = authEmailInput.value.trim().toLowerCase();
            if (val && !isValidCollegeEmail(val)) {
                if (authEmailError) {
                    authEmailError.textContent = "Please use your official IGDTUW college email address (@igdtuw.ac.in).";
                    authEmailError.classList.remove("hidden");
                }
            } else if (val && isValidCollegeEmail(val)) {
                if (authEmailError) authEmailError.classList.add("hidden");
            }
        }
    });
}

// HANDLE REGISTRATION AND LOGIN

authSubmitButton.addEventListener("click", async function () {

    const rawEmail = document.getElementById("authEmailInput").value;
    const email = (rawEmail || "").trim().toLowerCase();
    const password = document.getElementById("authPasswordInput").value;
    const fullName = document.getElementById("fullNameInput").value.trim();
    const confirmPassword = document.getElementById("confirmPasswordInput").value;

    authMessage.textContent = "";

    // Registration

    if (authMode === "register") {

        if (!fullName) {
            authMessage.className = "auth-message error";
            authMessage.textContent = "Please enter your full name.";
            return;
        }

        if (!email) {
            authMessage.className = "auth-message error";
            authMessage.textContent = "Please use your official IGDTUW college email address (@igdtuw.ac.in).";
            if (authEmailError) {
                authEmailError.textContent = "Please use your official IGDTUW college email address (@igdtuw.ac.in).";
                authEmailError.classList.remove("hidden");
            }
            return;
        }

        if (!isValidCollegeEmail(email)) {
            authMessage.className = "auth-message error";
            authMessage.textContent = "Please use your official IGDTUW college email address (@igdtuw.ac.in).";
            if (authEmailError) {
                authEmailError.textContent = "Please use your official IGDTUW college email address (@igdtuw.ac.in).";
                authEmailError.classList.remove("hidden");
            }
            return;
        } else {
            if (authEmailError) authEmailError.classList.add("hidden");
        }

        if (password.length < 6) {
            authMessage.className = "auth-message error";
            authMessage.textContent = "Password must be at least 6 characters.";
            return;
        }

        if (password !== confirmPassword) {
            authMessage.className = "auth-message error";
            authMessage.textContent = "Passwords do not match.";
            return;
        }

        try {

            authSubmitButton.disabled = true;
            authSubmitButton.textContent = "Creating account...";

            const userCredential = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );

            // Trusted Registration Enforcement: Failsafe post-creation verification
            const createdEmail = (userCredential.user && userCredential.user.email ? userCredential.user.email : "").trim().toLowerCase();
            if (!isValidCollegeEmail(createdEmail)) {
                try {
                    await userCredential.user.delete();
                } catch (delErr) {
                    await signOut(auth);
                }
                throw new Error("Please use your official IGDTUW college email address (@igdtuw.ac.in).");
            }

            await updateProfile(userCredential.user, {
                displayName: fullName
            });

            await sendEmailVerification(userCredential.user);

            await signOut(auth);

            authMessage.className = "auth-message success";
            authMessage.textContent =
                "Account created! Please check your email inbox and verify your email before logging in.";

            authForm.reset();
            if (authEmailError) authEmailError.classList.add("hidden");
            alert("Account created successfully! Please check your email inbox and verify your email before logging in.");
            showPage(homePage);

        } catch (error) {

            authMessage.className = "auth-message error";
            if (error.code === "auth/email-already-in-use") {
                authMessage.textContent = "An account with this email address already exists. Please log in.";
            } else if (error.code === "auth/invalid-email") {
                authMessage.textContent = "Please use your official IGDTUW college email address (@igdtuw.ac.in).";
            } else {
                authMessage.textContent = error.message;
            }

        } finally {

            authSubmitButton.disabled = false;
            authSubmitButton.textContent = "Create account";

        }

    }

    // LOGIN

    else {

        try {

            authSubmitButton.disabled = true;
            authSubmitButton.textContent = "Logging in...";

            const userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            if (!userCredential.user.emailVerified) {

                await signOut(auth);

                authMessage.className = "auth-message error";
                authMessage.textContent =
                    "Please verify your email before logging in. Check your inbox for the verification link.";

                return;

            }

            authMessage.className = "auth-message success";
            authMessage.textContent = "Login successful!";

            authForm.reset();

            // Immediately update navbar profile in DOM
            const navUserProfile = document.getElementById("navUserProfile");
            const navUserName = document.getElementById("navUserName");
            const navUserAvatar = document.getElementById("navUserAvatar");
            const displayName = userCredential.user.displayName || userCredential.user.email;
            if (navUserProfile) navUserProfile.classList.remove("hidden");
            if (navUserName) navUserName.textContent = displayName;
            if (navUserAvatar) navUserAvatar.textContent = displayName.charAt(0).toUpperCase();

            const loginButtonEl = document.getElementById("loginButton");
            if (loginButtonEl) loginButtonEl.style.display = "none";

            const dashboardNavBtn = document.getElementById("dashboardButton");
            if (dashboardNavBtn) dashboardNavBtn.classList.remove("hidden");

            const sidebarSellerBtn = document.getElementById("sidebarSellerButton");
            if (sidebarSellerBtn) sidebarSellerBtn.style.display = "block";

            showPage(homePage);

        } catch (error) {

            authMessage.className = "auth-message error";
            authMessage.textContent =
                "Login failed. Please check your email and password.";

        } finally {

            authSubmitButton.disabled = false;

            authSubmitButton.textContent =
                authMode === "register" ? "Create account" : "Log in";

        }

    }

});

// ==================================
// THRIFTLY - PUBLISH PRODUCT LISTING
// ==================================

const listingForm = document.getElementById("listingForm");

listingForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const user = auth.currentUser;

    if (!user || !user.emailVerified) {
        alert("Please log in with a verified account first.");
        showPage(accountPage);
        return;
    }

    const title = document.getElementById("productTitle").value.trim();
    const description = document.getElementById("productDescription").value.trim();
    const category = document.getElementById("productCategory").value;
    const type = document.getElementById("productType").value;
    const price = Number(document.getElementById("productPrice").value);
    const condition = document.getElementById("productCondition").value;
    const imageFile = document.getElementById("productImage").files[0];
    const rentalUnit = document.getElementById("rentalUnit").value;

    const listingMessage = document.getElementById("listingMessage");
    const publishButton = document.getElementById("publishListingButton");

    if (!imageFile || imageFile.size > 5 * 1024 * 1024) {
        listingMessage.className = "listing-message error";
        listingMessage.textContent = "Please select an image under 5 MB.";
        return;
    }

    if (price <= 0 || !Number.isFinite(price)) {
        listingMessage.className = "listing-message error";
        listingMessage.textContent = "Please enter a valid price.";
        return;
    }

    try {

        publishButton.disabled = true;
        publishButton.textContent = "Publishing...";
        listingMessage.className = "listing-message info";
        listingMessage.textContent = "Uploading your product image...";

        // Get Firebase login token
        const token = await user.getIdToken();

        // Upload image to Supabase
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadResponse = await fetch(
            "https://xnqqrazxqlmfwjsdrncy.supabase.co/functions/v1/upload-product-image",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "apikey": "sb_publishable_-v9LI4cP-r_-err_e86rDg_k07iyq9e"
                },
                body: formData
            }
        );

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
            throw new Error(uploadResult.error || "Image upload failed.");
        }

        listingMessage.className = "listing-message info";
        listingMessage.textContent = "Saving your listing...";

        // Save product details to Firestore
        await addDoc(collection(db, "products"), {
            title: title,
            description: description,
            category: category,
            type: type,
            price: price,
            condition: condition,
            imageUrl: uploadResult.imageUrl,
            sellerId: user.uid,
            sellerName: user.displayName || "Student",
            sellerEmail: user.email,
            rentalUnit: type === "Rent" ? rentalUnit : null,
            status: "Available",
            createdAt: serverTimestamp()
        });

        listingMessage.className = "listing-message success";
        listingMessage.textContent = "Your listing has been published successfully!";

        listingForm.reset();

        setTimeout(() => {
            showPage(marketplacePage);
        }, 1500);

    } catch (error) {

        console.error("Listing error:", error);
        listingMessage.className = "listing-message error";
        listingMessage.textContent = error.message || "Something went wrong. Please try again.";

    } finally {

        publishButton.disabled = false;
        publishButton.textContent = "Publish listing";

    }

});

// Toggle rental unit selector when product type changes
const productTypeSelect = document.getElementById("productType");
const rentalUnitField = document.getElementById("rentalUnitField");

if (productTypeSelect && rentalUnitField) {
    productTypeSelect.addEventListener("change", function () {
        rentalUnitField.hidden = this.value !== "Rent";
    });
}



// ==================================
// LOAD PRODUCTS FROM FIRESTORE
// ==================================

const productsCollection = collection(db, "products");

onSnapshot(productsCollection, function (snapshot) {

    products = snapshot.docs.map(function (doc) {

        return {
            id: doc.id,
            ...doc.data()
        };

    });

    updateMarketplace();
    updateHomeRecentListings();

}, function (error) {

    console.error("Error loading products:", error);

});

// ==================================
// OPEN PRODUCT DETAILS
// ==================================

function openProductDetails(product) {
    selectedProduct = product;

    document.getElementById("detailsTitle").textContent =
        product.title || "Untitled item";

    document.getElementById("detailsCategory").textContent =
        categories[product.category] || "Other";

    document.getElementById("detailsPrice").textContent =
        formatPrice(product);

    document.getElementById("detailsType").textContent =
        product.type === "Rent" ? "For rent" : "For sale";

    document.getElementById("detailsCondition").textContent =
        "Condition: " + (product.condition || "Not specified");

    document.getElementById("detailsDescription").textContent =
        product.description || "No description provided.";

    document.getElementById("detailsSeller").textContent =
        "Listed by " + (product.sellerName || "Student");

    const imageArea = document.getElementById("detailsImage");

    imageArea.innerHTML = "";

    if (product.imageUrl) {

        const image = document.createElement("img");

        image.src = product.imageUrl;
        image.alt = product.title || "Product image";

        imageArea.appendChild(image);

    } else {

        imageArea.textContent = "No image available";

    }

    
    const user = auth.currentUser;

    // Update Add to Cart button state
    if (product.status && product.status !== "Available") {
        addToCartButton.disabled = true;
        addToCartButton.textContent = product.status;
    } else if (user && product.sellerId === user.uid) {
        addToCartButton.disabled = true;
        addToCartButton.textContent = "Your Listing";
    } else if (cartItems.some(item => item.productId === product.id)) {
        addToCartButton.disabled = false;
        addToCartButton.textContent = "In Cart ✓";
    } else {
        addToCartButton.disabled = false;
        addToCartButton.textContent = product.type === "Rent" ? "Add to Cart (Rent)" : "Add to Cart (Buy)";
    }

    // Update Wishlist button on product details
    const isWishlisted = wishlistIds.has(product.id);
    detailsWishlistButton.textContent = isWishlisted ? "♥ In Wishlist" : "♡ Add to wishlist";
    detailsWishlistButton.classList.toggle("active", isWishlisted);

    showPage(productDetailsPage);
}




// ==================================
// THRIFTLY - WISHLIST FUNCTIONALITY
// ==================================

function updateWishlistBadge() {
    if (!wishlistCountBadge) return;
    const count = wishlistIds.size;
    if (count > 0) {
        wishlistCountBadge.textContent = count > 99 ? "99+" : count;
        wishlistCountBadge.classList.remove("hidden");
    } else {
        wishlistCountBadge.textContent = "0";
        wishlistCountBadge.classList.add("hidden");
    }
}

function openWishlistPage() {
    const user = auth.currentUser;
    if (!user) {
        alert("Please log in to view your saved wishlist.");
        showPage(accountPage);
        return;
    }
    showPage(wishlistPage);
    renderWishlistPage();
}

function createFallbackWishlistCard(savedItem) {
    const card = document.createElement("article");
    card.className = "product-card";

    const imageArea = document.createElement("div");
    imageArea.className = "product-image";
    if (savedItem.imageUrl) {
        const image = document.createElement("img");
        image.src = savedItem.imageUrl;
        image.alt = savedItem.title || "Product";
        image.loading = "lazy";
        imageArea.appendChild(image);
    } else {
        const placeholder = document.createElement("div");
        placeholder.className = "product-image-placeholder";
        placeholder.innerHTML = `<span>Image</span><small>Unavailable</small>`;
        imageArea.appendChild(placeholder);
    }

    const info = document.createElement("div");
    info.className = "product-info";

    const category = document.createElement("div");
    category.className = "product-category";
    category.textContent = "Saved item";

    const title = document.createElement("h3");
    title.textContent = savedItem.title || "Unavailable Listing";

    const price = document.createElement("p");
    price.className = "product-price";
    price.textContent = savedItem.price ? `₹${new Intl.NumberFormat("en-IN").format(Number(savedItem.price))}` : "Price unavailable";

    const condition = document.createElement("p");
    condition.className = "product-condition";
    condition.textContent = "This item is no longer listed by the seller.";

    const tag = document.createElement("span");
    tag.className = "product-tag status-sold";
    tag.textContent = "Listing removed";

    info.append(category, title, price, condition, tag);

    const wishlistBtn = document.createElement("button");
    wishlistBtn.className = "wishlist-button active";
    wishlistBtn.type = "button";
    wishlistBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>`;
    wishlistBtn.title = "Remove from wishlist";
    wishlistBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleWishlist({ id: savedItem.id, title: savedItem.title });
    });

    card.append(imageArea, info, wishlistBtn);
    return card;
}

function renderWishlistPage() {
    if (!wishlistGrid) return;
    wishlistGrid.innerHTML = "";

    const count = wishlistIds.size;

    if (wishlistCountDescription) {
        wishlistCountDescription.textContent = count === 0
            ? "You have 0 saved items."
            : `You have ${count} saved item${count === 1 ? "" : "s"}.`;
    }

    if (count === 0) {
        if (wishlistEmptyState) wishlistEmptyState.classList.remove("hidden");
        return;
    }

    if (wishlistEmptyState) wishlistEmptyState.classList.add("hidden");

    wishlistIds.forEach(productId => {
        const liveProduct = products.find(p => p.id === productId);
        if (liveProduct) {
            wishlistGrid.appendChild(createProductCard(liveProduct));
        } else if (wishlistMeta.has(productId)) {
            wishlistGrid.appendChild(createFallbackWishlistCard(wishlistMeta.get(productId)));
        }
    });
}

// Connect Wishlist Event Listeners
if (navWishlistButton) {
    navWishlistButton.addEventListener("click", openWishlistPage);
}



if (wishlistExploreButton) {
    wishlistExploreButton.addEventListener("click", openMarketplace);
}

async function toggleWishlist(product) {

    const user = auth.currentUser;

    // Check whether the student is logged in
    if (!user) {
        alert("Please log in to use your wishlist.");
        showPage(accountPage);
        return;
    }

    const productId = product.id;

    if (!productId) {
        alert("Unable to save this product.");
        return;
    }

    // Reference to this user's wishlist document
    const wishlistRef = doc(
        db,
        "users",
        user.uid,
        "wishlist",
        productId
    );

    try {

        if (wishlistIds.has(productId)) {

            // Remove from wishlist
            await deleteDoc(wishlistRef);
            wishlistIds.delete(productId);
            wishlistMeta.delete(productId);

        } else {

            // Add to wishlist
            const savedData = {
                productId: productId,
                title: product.title || "",
                imageUrl: product.imageUrl || "",
                price: Number(product.price) || 0,
                type: product.type || "Sale",
                addedAt: serverTimestamp()
            };

            await setDoc(wishlistRef, savedData);

            wishlistIds.add(productId);
            wishlistMeta.set(productId, { id: productId, ...savedData });

        }

        // Refresh badges, marketplace and wishlist view
        updateWishlistBadge();
        updateMarketplace();
    updateHomeRecentListings();

        if (wishlistPage && !wishlistPage.classList.contains("hidden")) {
            renderWishlistPage();
        }

    } catch (error) {

        console.error("Wishlist error:", error);
        alert("Could not update your wishlist. Please try again.");

    }

}

// ========================================
// RENTAL DATE HELPERS
// ========================================

function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addDaysToDateString(dateStr, days) {
    const parts = (dateStr || getTodayDateString()).split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2] + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function calculateRentalDuration(startDateStr, endDateStr, unit) {
    if (!startDateStr || !endDateStr) return 1;
    const startParts = startDateStr.split("-").map(Number);
    const endParts = endDateStr.split("-").map(Number);
    const start = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return 0;

    if (unit === "day") {
        return diffDays;
    } else if (unit === "week") {
        return Math.max(1, Math.ceil(diffDays / 7));
    } else if (unit === "month") {
        return Math.max(1, Math.ceil(diffDays / 30));
    }
    return Math.max(1, Math.ceil(diffDays / 7));
}

// Check if two rental date ranges overlap (inclusive)
function hasRentalDateOverlap(startA, endA, startB, endB) {
    if (!startA || !endA || !startB || !endB) return false;
    return (startA <= endB && endA >= startB);
}

// Generate rental details badge element for request and history cards
function createRentalDetailsElement(req) {
    if (!req) return null;
    const isRent = req.productType === "Rent" || req.type === "Rent";
    if (!isRent) return null;

    const container = document.createElement("div");
    container.className = "request-rental-details";

    const start = req.rentalStartDate || "Not set";
    const end = req.rentalEndDate || "Not set";
    const unit = req.rentalUnit || "week";
    const duration = req.rentalDuration || 1;
    const durationLabel = `${duration} ${unit}${duration > 1 ? "s" : ""}`;
    const unitPrice = Number(req.productPrice) || Number(req.price) || 0;
    const total = Number(req.totalPrice) || (unitPrice * duration);

    container.innerHTML = `
        <span><strong>Rental Dates:</strong> ${start} &rarr; ${end}</span>
        <span><strong>Duration:</strong> ${durationLabel}</span>
        <span><strong>Rate:</strong> ₹${unitPrice}/${unit}</span>
        <span><strong>Total:</strong> ₹${new Intl.NumberFormat("en-IN").format(total)}</span>
    `;

    return container;
}

// ========================================
// THRIFTLY - SHOPPING CART
// ========================================

// Storage key scoped to current user or guest
function getCartStorageKey() {
    const user = auth.currentUser;
    return user ? `thriftly_cart_${user.uid}` : "thriftly_cart_guest";
}

// Load cart items from localStorage
function loadCartFromStorage() {
    try {
        const key = getCartStorageKey();
        const stored = localStorage.getItem(key);
        cartItems = stored ? JSON.parse(stored) : [];
        if (!Array.isArray(cartItems)) {
            cartItems = [];
        }

        // Migrate/sanitize rental dates for any existing cart items
        const todayStr = getTodayDateString();
        cartItems.forEach(item => {
            if (item && item.type === "Rent") {
                if (!item.rentalStartDate) {
                    item.rentalStartDate = todayStr;
                }
                const unit = item.rentalUnit || "week";
                const daysPerUnit = unit === "day" ? 1 : (unit === "month" ? 30 : 7);
                if (!item.rentalEndDate) {
                    const dur = Math.max(1, Number(item.rentalDuration) || 1);
                    item.rentalEndDate = addDaysToDateString(item.rentalStartDate, dur * daysPerUnit);
                }
                item.rentalDuration = Math.max(1, calculateRentalDuration(item.rentalStartDate, item.rentalEndDate, unit));
            }
        });
    } catch (e) {
        console.error("Error reading cart from storage:", e);
        cartItems = [];
    }
    renderCart();
}

// Save cart items to localStorage
function saveCartToStorage() {
    try {
        const key = getCartStorageKey();
        localStorage.setItem(key, JSON.stringify(cartItems));
    } catch (e) {
        console.error("Error saving cart to storage:", e);
    }
    renderCart();
}

// Track unread buyer and seller request notifications (Priority 6 & 7)
let unreadBuyerRequestUpdates = [];
let unreadSellerRequests = [];

function updateCartDrawerNotificationBanner(count = null) {
    if (!cartRequestBanner) return;
    const currentCount = count !== null ? count : unreadBuyerRequestUpdates.length;
    if (currentCount > 0) {
        cartRequestBanner.classList.remove("hidden");
        if (cartRequestBannerText) {
            cartRequestBannerText.textContent = `${currentCount} request update${currentCount === 1 ? "" : "s"} from seller${currentCount === 1 ? "" : "s"}`;
        }
    } else {
        cartRequestBanner.classList.add("hidden");
    }
}

// Mark buyer request notifications as read
async function markBuyerNotificationsAsRead() {
    const user = auth.currentUser;
    if (!user || unreadBuyerRequestUpdates.length === 0) return;

    const readKey = `thriftly_buyer_read_requests_${user.uid}`;
    let readMap = {};
    try {
        readMap = JSON.parse(localStorage.getItem(readKey) || "{}");
    } catch (e) {
        readMap = {};
    }

    const toMark = [...unreadBuyerRequestUpdates];
    unreadBuyerRequestUpdates = [];

    if (cartCountBadge) {
        cartCountBadge.classList.add("hidden");
        cartCountBadge.textContent = "0";
    }
    updateCartDrawerNotificationBanner(0);

    toMark.forEach(req => {
        readMap[req.id] = req.status;
    });

    try {
        localStorage.setItem(readKey, JSON.stringify(readMap));
    } catch (e) {}
}

// Open and Close Cart Drawer
function openCartDrawer() {
    cartDrawer.classList.add("open");
    cartBackdrop.classList.add("show");
    document.body.classList.add("no-scroll");
    cartStatusMessage.textContent = "";
    cartStatusMessage.className = "cart-status-message";
    updateCartDrawerNotificationBanner();
    renderCart();

    if (window.history && window.history.pushState) {
        try {
            history.pushState({ isCartOpen: true }, "", "#cart");
        } catch (e) {}
    }
}

function closeCartDrawer(fromPopstate = false) {
    cartDrawer.classList.remove("open");
    cartBackdrop.classList.remove("show");
    document.body.classList.remove("no-scroll");

    if (!fromPopstate && window.location.hash === "#cart") {
        if (window.history && window.history.state && window.history.state.isCartOpen) {
            window.history.back();
        } else {
            const pageHash = (currentPage && currentPage.id) ? "#" + currentPage.id.replace("Page", "").toLowerCase() : "";
            try {
                history.replaceState({ pageId: currentPage ? currentPage.id : "homePage" }, "", pageHash === "#home" || !pageHash ? window.location.pathname : pageHash);
            } catch (e) {}
        }
    }
}

const cartBackButton = document.getElementById("cartBackButton");
if (cartBackButton) {
    cartBackButton.addEventListener("click", function (event) {
        event.preventDefault();
        closeCartDrawer();
    });
}

cartButton.addEventListener("click", openCartDrawer);
closeCartButton.addEventListener("click", function () { closeCartDrawer(); });
cartBackdrop.addEventListener("click", function () { closeCartDrawer(); });
cartContinueShoppingButton.addEventListener("click", function () {
    closeCartDrawer();
    openMarketplace();
});
cartCloseAndContinueButton.addEventListener("click", closeCartDrawer);

if (cartViewRequestsBtn) {
    cartViewRequestsBtn.addEventListener("click", function () {
        closeCartDrawer();
        markBuyerNotificationsAsRead();
        if (auth.currentUser) {
            loadMyRequests();
        } else {
            showPage(authPage);
        }
    });
}

if (cartEmptyViewRequestsBtn) {
    cartEmptyViewRequestsBtn.addEventListener("click", function () {
        closeCartDrawer();
        markBuyerNotificationsAsRead();
        if (auth.currentUser) {
            loadMyRequests();
        } else {
            showPage(authPage);
        }
    });
}

// Escape key closes cart drawer
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && cartDrawer.classList.contains("open")) {
        closeCartDrawer();
    }
});

// Add a product to the cart
function addToCart(product, rentalDuration = 1) {
    const user = auth.currentUser;

    // Prevent adding own product
    if (user && product.sellerId === user.uid) {
        alert("You cannot add your own product to the cart.");
        return;
    }

    // Check availability
    if (product.status && product.status !== "Available") {
        alert("This product is currently " + product.status.toLowerCase() + " and cannot be added.");
        return;
    }

    // Check if already in cart
    const existingIndex = cartItems.findIndex(item => item.productId === product.id);
    if (existingIndex !== -1) {
        alert("This item is already in your cart.");
        openCartDrawer();
        return;
    }

    const isRent = product.type === "Rent";
    const unit = isRent ? (product.rentalUnit || "week") : null;
    const todayStr = getTodayDateString();
    const defaultDays = unit === "day" ? 1 : (unit === "month" ? 30 : 7);
    const endStr = isRent ? addDaysToDateString(todayStr, defaultDays) : null;
    const duration = isRent ? calculateRentalDuration(todayStr, endStr, unit) : null;

    cartItems.push({
        productId: product.id,
        title: product.title || "Untitled product",
        price: Number(product.price) || 0,
        type: product.type || "Sale",
        rentalUnit: unit,
        rentalDuration: duration,
        rentalStartDate: isRent ? todayStr : null,
        rentalEndDate: isRent ? endStr : null,
        imageUrl: product.imageUrl || "",
        sellerId: product.sellerId || "",
        sellerName: product.sellerName || "Student"
    });

    saveCartToStorage();
    openCartDrawer();

    if (selectedProduct && selectedProduct.id === product.id) {
        addToCartButton.textContent = "In Cart ✓";
    }
}

// Remove product from cart
function removeFromCart(productId) {
    cartItems = cartItems.filter(item => item.productId !== productId);
    saveCartToStorage();

    if (selectedProduct && selectedProduct.id === productId) {
        addToCartButton.textContent = "Add to Cart";
    }
}

// Update rental duration by adjusting end date
function updateRentalDuration(productId, delta) {
    const item = cartItems.find(i => i.productId === productId);
    if (!item || item.type !== "Rent") return;

    const unit = item.rentalUnit || "week";
    const daysPerUnit = unit === "day" ? 1 : (unit === "month" ? 30 : 7);
    const currentDur = item.rentalDuration || 1;
    const newDur = Math.max(1, currentDur + delta);
    const startStr = item.rentalStartDate || getTodayDateString();
    const newEndStr = addDaysToDateString(startStr, newDur * daysPerUnit);

    item.rentalStartDate = startStr;
    item.rentalEndDate = newEndStr;
    item.rentalDuration = newDur;
    saveCartToStorage();
}

// Update rental dates directly
function updateRentalDates(productId, startDate, endDate) {
    const item = cartItems.find(i => i.productId === productId);
    if (!item || item.type !== "Rent") return;

    if (startDate) item.rentalStartDate = startDate;
    if (endDate) item.rentalEndDate = endDate;

    const unit = item.rentalUnit || "week";
    const duration = calculateRentalDuration(item.rentalStartDate, item.rentalEndDate, unit);
    item.rentalDuration = Math.max(1, duration);

    saveCartToStorage();
}

// Render the cart items, counters, and totals
function renderCart() {
    const totalCount = cartItems.length;

    // Update Drawer Header Count (Cart item count is displayed in drawer header; navbar badge is for request notifications)
    cartDrawerCount.textContent = `(${totalCount} item${totalCount === 1 ? "" : "s"})`;

    if (totalCount === 0) {
        cartEmptyState.style.display = "flex";
        cartFooter.classList.add("hidden");
        cartItemsList.innerHTML = "";
        return;
    }

    cartEmptyState.style.display = "none";
    cartFooter.classList.remove("hidden");
    cartItemsList.innerHTML = "";

    let totalAmount = 0;

    cartItems.forEach(function (item) {
        const isRent = item.type === "Rent";
        const duration = isRent ? (item.rentalDuration || 1) : 1;
        const itemTotal = item.price * duration;
        totalAmount += itemTotal;

        const card = document.createElement("div");
        card.className = "cart-item-card";

        // Image
        if (item.imageUrl) {
            const img = document.createElement("img");
            img.src = item.imageUrl;
            img.alt = item.title;
            img.className = "cart-item-image";
            img.loading = "lazy";
            card.appendChild(img);
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "cart-item-image-placeholder";
            placeholder.textContent = "Photo";
            card.appendChild(placeholder);
        }

        // Details
        const details = document.createElement("div");
        details.className = "cart-item-details";

        const title = document.createElement("h4");
        title.className = "cart-item-title";
        title.textContent = item.title;

        const meta = document.createElement("div");
        meta.className = "cart-item-meta";

        const typeBadge = document.createElement("span");
        typeBadge.className = `cart-type-badge ${isRent ? "rent" : "sale"}`;
        typeBadge.textContent = isRent ? "For Rent" : "For Sale";

        const seller = document.createElement("span");
        seller.className = "cart-item-seller";
        seller.textContent = "From " + (item.sellerName || "Student");

        meta.append(typeBadge, seller);

        // Pricing and rental controls
        const pricing = document.createElement("div");
        pricing.className = "cart-item-pricing";

        const priceDisplay = document.createElement("div");
        const priceValue = document.createElement("div");
        priceValue.className = "cart-item-price";
        priceValue.textContent = "₹" + new Intl.NumberFormat("en-IN").format(itemTotal);
        priceDisplay.appendChild(priceValue);

        if (isRent) {
            const unitRate = document.createElement("small");
            unitRate.className = "cart-item-rate";
            unitRate.textContent = `₹${item.price}/${item.rentalUnit || "week"} × ${duration}`;
            priceDisplay.appendChild(unitRate);

            // Duration controls (+ / -)
            const durationControl = document.createElement("div");
            durationControl.className = "cart-duration-control";

            const decBtn = document.createElement("button");
            decBtn.className = "cart-duration-btn";
            decBtn.type = "button";
            decBtn.textContent = "−";
            decBtn.title = "Decrease duration";
            decBtn.addEventListener("click", () => updateRentalDuration(item.productId, -1));

            const durVal = document.createElement("span");
            durVal.className = "cart-duration-val";
            durVal.textContent = duration;

            const incBtn = document.createElement("button");
            incBtn.className = "cart-duration-btn";
            incBtn.type = "button";
            incBtn.textContent = "+";
            incBtn.title = "Increase duration";
            incBtn.addEventListener("click", () => updateRentalDuration(item.productId, 1));

            durationControl.append(decBtn, durVal, incBtn);
            pricing.append(priceDisplay, durationControl);
        } else {
            pricing.appendChild(priceDisplay);
        }

        details.append(title, meta, pricing);

        // Rental date period selector & terms summary
        if (isRent) {
            const rentalPeriod = document.createElement("div");
            rentalPeriod.className = "cart-rental-period";

            const todayStr = getTodayDateString();
            const currentStart = item.rentalStartDate || todayStr;
            const unit = item.rentalUnit || "week";
            const daysPerUnit = unit === "day" ? 1 : (unit === "month" ? 30 : 7);
            const currentEnd = item.rentalEndDate || addDaysToDateString(currentStart, daysPerUnit);

            const fields = document.createElement("div");
            fields.className = "cart-rental-fields";

            // Start Date Field
            const startField = document.createElement("div");
            startField.className = "cart-rental-field";
            const startLabel = document.createElement("label");
            startLabel.textContent = "Start Date";
            const startInput = document.createElement("input");
            startInput.type = "date";
            startInput.className = "cart-date-input";
            startInput.min = todayStr;
            startInput.value = currentStart;
            startField.append(startLabel, startInput);

            // End Date Field
            const endField = document.createElement("div");
            endField.className = "cart-rental-field";
            const endLabel = document.createElement("label");
            endLabel.textContent = "End Date";
            const endInput = document.createElement("input");
            endInput.type = "date";
            endInput.className = "cart-date-input";
            endInput.min = addDaysToDateString(currentStart, 1);
            endInput.value = currentEnd;
            endField.append(endLabel, endInput);

            fields.append(startField, endField);

            // Summary of rental duration & unit rate
            const summary = document.createElement("div");
            summary.className = "cart-rental-summary";
            const durLabel = `${duration} ${unit}${duration > 1 ? "s" : ""}`;
            summary.innerHTML = `
                <span><strong>Duration:</strong> ${durLabel}</span>
                <span><strong>Rate:</strong> ₹${item.price}/${unit}</span>
            `;

            rentalPeriod.append(fields, summary);

            // Start Date Change Listener
            startInput.addEventListener("change", function () {
                let newStart = startInput.value;
                if (!newStart || newStart < todayStr) {
                    newStart = todayStr;
                    startInput.value = newStart;
                }
                let curEnd = item.rentalEndDate || currentEnd;
                if (!curEnd || curEnd <= newStart) {
                    curEnd = addDaysToDateString(newStart, daysPerUnit);
                }
                updateRentalDates(item.productId, newStart, curEnd);
            });

            // End Date Change Listener
            endInput.addEventListener("change", function () {
                const s = item.rentalStartDate || todayStr;
                let newEnd = endInput.value;
                if (!newEnd || newEnd <= s) {
                    newEnd = addDaysToDateString(s, 1);
                    endInput.value = newEnd;
                }
                updateRentalDates(item.productId, s, newEnd);
            });

            details.appendChild(rentalPeriod);
        }

        // Remove button
        const removeBtn = document.createElement("button");
        removeBtn.className = "cart-item-remove";
        removeBtn.type = "button";
        removeBtn.innerHTML = "×";
        removeBtn.title = "Remove item";
        removeBtn.setAttribute("aria-label", `Remove ${item.title} from cart`);
        removeBtn.addEventListener("click", () => removeFromCart(item.productId));

        card.append(details, removeBtn);
        cartItemsList.appendChild(card);
    });

    const formattedTotal = "₹" + new Intl.NumberFormat("en-IN").format(totalAmount);
    cartSubtotal.textContent = formattedTotal;
    cartTotal.textContent = formattedTotal;
}

// Submit purchase/rental requests from cart
async function submitCartRequests() {
    const user = auth.currentUser;

    if (!user || !user.emailVerified) {
        alert("Please log in with your verified college email to submit requests.");
        closeCartDrawer();
        showPage(accountPage);
        return;
    }

    if (cartItems.length === 0) {
        alert("Your cart is empty.");
        return;
    }

    cartStatusMessage.className = "cart-status-message";
    cartStatusMessage.textContent = "Verifying items...";
    submitCartRequestsButton.disabled = true;

    const successfulProductIds = [];
    const skippedItems = [];

    try {
        const requestsRef = collection(db, "requests");

        for (let i = 0; i < cartItems.length; i++) {
            const item = cartItems[i];
            cartStatusMessage.textContent = `Processing ${i + 1} of ${cartItems.length}: ${item.title}...`;

            // Prevent self-requesting
            if (item.sellerId === user.uid) {
                skippedItems.push({
                    title: item.title,
                    reason: "You are the seller of this item."
                });
                continue;
            }

            // Re-validate product in Firestore
            try {
                const prodRef = doc(db, "products", item.productId);
                const prodSnap = await getDoc(prodRef);

                if (!prodSnap.exists()) {
                    skippedItems.push({
                        title: item.title,
                        reason: "This product listing was removed by the seller."
                    });
                    continue;
                }

                const liveProd = prodSnap.data();
                if (liveProd.status && liveProd.status !== "Available") {
                    skippedItems.push({
                        title: item.title,
                        reason: `Product is currently ${liveProd.status.toLowerCase()}.`
                    });
                    continue;
                }

                // Check for existing active requests
                const existingReqQuery = query(
                    requestsRef,
                    where("productId", "==", item.productId),
                    where("buyerId", "==", user.uid)
                );
                const existingSnap = await getDocs(existingReqQuery);

                const hasActive = existingSnap.docs.some(doc =>
                    ["Pending", "Accepted", "Declined"].includes(doc.data().status)
                );

                if (hasActive) {
                    skippedItems.push({
                        title: item.title,
                        reason: "You already have an active request for this item."
                    });
                    continue;
                }

                // Create the request document
                const isRent = (liveProd.type || item.type) === "Rent";
                const unitPrice = Number(liveProd.price) || item.price || 0;

                const requestPayload = {
                    productId: item.productId,
                    productTitle: liveProd.title || item.title,
                    productImage: liveProd.imageUrl || item.imageUrl || "",
                    productPrice: unitPrice,
                    productType: isRent ? "Rent" : "Sale",
                    buyerId: user.uid,
                    buyerName: user.displayName || "Student",
                    buyerEmail: user.email,
                    sellerId: liveProd.sellerId || item.sellerId,
                    sellerName: liveProd.sellerName || item.sellerName || "Student",
                    status: "Pending",
                    createdAt: serverTimestamp()
                };

                if (isRent) {
                    const todayStr = getTodayDateString();
                    const startStr = item.rentalStartDate || todayStr;
                    const unit = liveProd.rentalUnit || item.rentalUnit || "week";
                    const daysPerUnit = unit === "day" ? 1 : (unit === "month" ? 30 : 7);
                    const endStr = item.rentalEndDate || addDaysToDateString(startStr, daysPerUnit);

                    if (startStr < todayStr) {
                        skippedItems.push({
                            title: item.title,
                            reason: "Rental start date cannot be in the past."
                        });
                        continue;
                    }
                    if (endStr <= startStr) {
                        skippedItems.push({
                            title: item.title,
                            reason: "Rental end date must be after the start date."
                        });
                        continue;
                    }

                    const duration = Math.max(1, calculateRentalDuration(startStr, endStr, unit));
                    const totalAmount = unitPrice * duration;

                    requestPayload.rentalStartDate = startStr;
                    requestPayload.rentalEndDate = endStr;
                    requestPayload.rentalDuration = duration;
                    requestPayload.rentalUnit = unit;
                    requestPayload.totalPrice = totalAmount;
                } else {
                    requestPayload.totalPrice = unitPrice;
                }

                await addDoc(requestsRef, requestPayload);
                successfulProductIds.push(item.productId);

            } catch (itemErr) {
                console.error(`Error processing request for ${item.title}:`, itemErr);
                skippedItems.push({
                    title: item.title,
                    reason: "Network or permission error."
                });
            }
        }

        // Remove only successfully submitted items
        if (successfulProductIds.length > 0) {
            cartItems = cartItems.filter(item => !successfulProductIds.includes(item.productId));
            saveCartToStorage();
        }

        // Summary notification
        if (successfulProductIds.length > 0 && skippedItems.length === 0) {
            cartStatusMessage.className = "cart-status-message success";
            cartStatusMessage.textContent = "Your request has been sent successfully. Please wait for the seller to respond.";
            alert("Your request has been sent successfully. Please wait for the seller to respond.");
            closeCartDrawer();
        } else if (successfulProductIds.length > 0 && skippedItems.length > 0) {
            const skipDetails = skippedItems.map(s => `• ${s.title}: ${s.reason}`).join("\n");
            alert(`${successfulProductIds.length} request(s) submitted successfully!\n\nThe following item(s) could not be submitted and remain in your cart:\n${skipDetails}`);
            cartStatusMessage.textContent = `${successfulProductIds.length} submitted. Check remaining items above.`;
        } else {
            const skipDetails = skippedItems.map(s => `• ${s.title}: ${s.reason}`).join("\n");
            alert(`None of the items could be submitted:\n\n${skipDetails}`);
            cartStatusMessage.textContent = "Could not submit items. See details above.";
        }

    } catch (error) {
        console.error("Cart submission error:", error);
        alert("Something went wrong while submitting your requests. Your cart has been preserved.");
        cartStatusMessage.textContent = "Error submitting requests. Please try again.";
    } finally {
        submitCartRequestsButton.disabled = false;
        renderCart();
    }
}

submitCartRequestsButton.addEventListener("click", submitCartRequests);

// Wire Product Details Add to Cart and Wishlist buttons
addToCartButton.addEventListener("click", function () {
    if (!selectedProduct) return;
    addToCart(selectedProduct);
});

detailsWishlistButton.addEventListener("click", async function () {
    if (!selectedProduct) return;
    await toggleWishlist(selectedProduct);
    const isWishlisted = wishlistIds.has(selectedProduct.id);
    detailsWishlistButton.textContent = isWishlisted ? "♥ In Wishlist" : "♡ Add to wishlist";
    detailsWishlistButton.classList.toggle("active", isWishlisted);
});

// ==================================
// LOAD USER'S SAVED WISHLIST
// ==================================

let unsubscribeWishlist = null;
let unsubscribeNotificationBuyer = null;
let unsubscribeNotificationSeller = null;
let unsubscribeBuyerRequestsNotifications = null;
let unsubscribeSellerIncomingNotifications = null;

onAuthStateChanged(auth, function (user) {

    // Stop listening to the previous user's wishlist
    if (unsubscribeWishlist) {
        unsubscribeWishlist();
        unsubscribeWishlist = null;
    }
    // Stop previous user's notification listeners
if (unsubscribeNotificationBuyer) {
    unsubscribeNotificationBuyer();
    unsubscribeNotificationBuyer = null;
}

if (unsubscribeNotificationSeller) {
    unsubscribeNotificationSeller();
    unsubscribeNotificationSeller = null;
}

if (unsubscribeBuyerRequestsNotifications) {
    unsubscribeBuyerRequestsNotifications();
    unsubscribeBuyerRequestsNotifications = null;
}

if (unsubscribeSellerIncomingNotifications) {
    unsubscribeSellerIncomingNotifications();
    unsubscribeSellerIncomingNotifications = null;
}

if (unsubscribeSellerRequests) {
    unsubscribeSellerRequests();
    unsubscribeSellerRequests = null;
}

if (unsubscribeSellerProducts) {
    unsubscribeSellerProducts();
    unsubscribeSellerProducts = null;
}

    if (user) {


// Listen for unread messages across all conversations
let buyerNotificationDocs = [];
let sellerNotificationDocs = [];

function updateFloatingNotification() {
    const allConversations = [
        ...buyerNotificationDocs,
        ...sellerNotificationDocs
    ];

    const hasUnread = allConversations.some(function (conversation) {
        const readField = conversation.buyerId === user.uid
            ? "buyerLastReadAt"
            : "sellerLastReadAt";

        const lastReadTime =
            conversation[readField]?.toMillis?.() || 0;

        const lastMessageTime =
            conversation.updatedAt?.toMillis?.() || 0;

        return (
            conversation.lastSenderId &&
            conversation.lastSenderId !== user.uid &&
            lastMessageTime > lastReadTime
        );
    });

    const notificationDot =
        document.getElementById("messageNotificationDot");

    if (notificationDot) {
        notificationDot.style.display = hasUnread ? "block" : "none";
    }
}

// Listen to conversations where current user is the buyer
unsubscribeNotificationBuyer = onSnapshot(
    query(
        collection(db, "conversations"),
        where("buyerId", "==", user.uid)
    ),
    function (snapshot) {
        buyerNotificationDocs = snapshot.docs.map(doc => doc.data());
        updateFloatingNotification();
    },
    function (error) {
        console.error("Buyer notification error:", error);
    }
);

// Listen to conversations where current user is the seller
unsubscribeNotificationSeller = onSnapshot(
    query(
        collection(db, "conversations"),
        where("sellerId", "==", user.uid)
    ),
    function (snapshot) {
        sellerNotificationDocs = snapshot.docs.map(doc => doc.data());
        updateFloatingNotification();
    },
    function (error) {
        console.error("Seller notification error:", error);
    }
);

// Listen to requests where current user is the buyer (Buyer Request Notifications - Priority 6)
let buyerRequestsDocs = [];

function updateBuyerNotificationBadge() {
    if (!user) return;
    const readKey = `thriftly_buyer_read_requests_${user.uid}`;
    let readMap = {};
    try {
        readMap = JSON.parse(localStorage.getItem(readKey) || "{}");
    } catch (e) {
        readMap = {};
    }

    const unreadUpdates = buyerRequestsDocs.filter(req => {
        // Notify on requests that have been updated by the seller (Accepted, Declined, Completed)
        if (!["Accepted", "Declined", "Completed"].includes(req.status)) {
            return false;
        }
        // Unread if the current status has not been acknowledged by the buyer
        return readMap[req.id] !== req.status;
    });

    unreadBuyerRequestUpdates = unreadUpdates;
    const count = unreadUpdates.length;

    if (cartCountBadge) {
        if (count > 0) {
            cartCountBadge.textContent = count;
            cartCountBadge.classList.remove("hidden");
        } else {
            cartCountBadge.classList.add("hidden");
        }
    }

    updateCartDrawerNotificationBanner(count);
}

unsubscribeBuyerRequestsNotifications = onSnapshot(
    query(
        collection(db, "requests"),
        where("buyerId", "==", user.uid)
    ),
    function (snapshot) {
        buyerRequestsDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateBuyerNotificationBadge();
    },
    function (error) {
        console.error("Buyer requests notification error:", error);
    }
);

// Listen to requests where current user is the seller (Seller Incoming Notifications - Priority 7)
let sellerIncomingDocs = [];

function updateSellerNotificationBadge() {
    if (!user) return;
    const readKey = `thriftly_seller_read_requests_${user.uid}`;
    let readMap = {};
    try {
        readMap = JSON.parse(localStorage.getItem(readKey) || "{}");
    } catch (e) {
        readMap = {};
    }

    const unreadPending = sellerIncomingDocs.filter(req => {
        if (req.status !== "Pending") return false;
        return readMap[req.id] !== "seen";
    });

    unreadSellerRequests = unreadPending;
    const count = unreadPending.length;

    const badges = [
        document.getElementById("sellerNotificationBadge"),
        document.getElementById("sidebarSellerBadge"),
        document.getElementById("accountSellerBadge")
    ];

    badges.forEach(b => {
        if (!b) return;
        if (count > 0) {
            b.textContent = count;
            b.classList.remove("hidden");
        } else {
            b.classList.add("hidden");
        }
    });
}

unsubscribeSellerIncomingNotifications = onSnapshot(
    query(
        collection(db, "requests"),
        where("sellerId", "==", user.uid)
    ),
    function (snapshot) {
        sellerIncomingDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateSellerNotificationBadge();
        if (sellerDashboardPage && !sellerDashboardPage.classList.contains("hidden")) {
            renderSellerRequestsFiltered();
        }
    },
    function (error) {
        console.error("Seller incoming notification error:", error);
    }
);

      // SHOW LOGGED-IN USER
const navUserProfile = document.getElementById("navUserProfile");
const navUserName = document.getElementById("navUserName");
const navUserAvatar = document.getElementById("navUserAvatar");

navUserProfile.classList.remove("hidden");

const dashboardNavBtn = document.getElementById("dashboardButton");
if (dashboardNavBtn) dashboardNavBtn.classList.remove("hidden");

const sidebarSellerBtn = document.getElementById("sidebarSellerButton");
if (sidebarSellerBtn) sidebarSellerBtn.style.display = "block";

document.getElementById("loginButton").style.display = "none";

const displayName = user.displayName || user.email;

navUserName.textContent = displayName;
navUserAvatar.textContent = displayName.charAt(0).toUpperCase(); 

// UPDATE MY PROFILE PAGE
document.getElementById("profileName").textContent =
    user.displayName || "Student";

document.getElementById("profileEmail").textContent =
    user.email;

document.getElementById("profileAvatar").textContent =
    (user.displayName || user.email).charAt(0).toUpperCase();

        if (sidebarWishlistButton) sidebarWishlistButton.style.display = "block";
        if (sidebarAccountButton) sidebarAccountButton.style.display = "block";
        if (sidebarAccountTitle) sidebarAccountTitle.style.display = "block";
        if (logoutButton) logoutButton.style.display = "block";

document.getElementById("loginButton").style.display = "none";

        const wishlistCollection = collection(
            db,
            "users",
            user.uid,
            "wishlist"
        );

        // Listen for wishlist changes in real time
        unsubscribeWishlist = onSnapshot(
            wishlistCollection,
            function (snapshot) {

                wishlistIds = new Set();
                wishlistMeta = new Map();

                snapshot.docs.forEach(function (wishlistDoc) {
                    wishlistIds.add(wishlistDoc.id);
                    wishlistMeta.set(wishlistDoc.id, { id: wishlistDoc.id, ...wishlistDoc.data() });
                });

                updateWishlistBadge();
                updateMarketplace();
    updateHomeRecentListings();

                if (wishlistPage && !wishlistPage.classList.contains("hidden")) {
                    renderWishlistPage();
                }

            },
            function (error) {
                console.error("Wishlist loading error:", error);
            }
        );

        // Load user's scoped cart
        loadCartFromStorage();

    } else {

        // HIDE USER PROFILE WHEN LOGGED OUT
        document.getElementById("navUserProfile").classList.add("hidden");

        if (sidebarWishlistButton) sidebarWishlistButton.style.display = "none";
        if (sidebarAccountButton) sidebarAccountButton.style.display = "none";
        if (sidebarAccountTitle) sidebarAccountTitle.style.display = "none";
        if (logoutButton) logoutButton.style.display = "none";

        document.getElementById("loginButton").style.display = "block";

        wishlistIds.clear();
        wishlistMeta.clear();
        updateWishlistBadge();
        updateMarketplace();
    updateHomeRecentListings();

        if (wishlistPage && !wishlistPage.classList.contains("hidden")) {
            renderWishlistPage();
        }

        // Load guest cart
        loadCartFromStorage();

        // Clear buyer request notifications on logout
        unreadBuyerRequestUpdates = [];
        if (cartCountBadge) {
            cartCountBadge.classList.add("hidden");
            cartCountBadge.textContent = "0";
        }
        updateCartDrawerNotificationBanner(0);

        // Hide seller buttons and clear seller badges on logout
        const dashboardNavBtn = document.getElementById("dashboardButton");
        if (dashboardNavBtn) dashboardNavBtn.classList.add("hidden");
        const sidebarSellerBtn = document.getElementById("sidebarSellerButton");
        if (sidebarSellerBtn) sidebarSellerBtn.style.display = "none";

        unreadSellerRequests = [];
        [
            document.getElementById("sellerNotificationBadge"),
            document.getElementById("sidebarSellerBadge"),
            document.getElementById("accountSellerBadge")
        ].forEach(b => {
            if (b) {
                b.classList.add("hidden");
                b.textContent = "0";
            }
        });

    }

});

// ==================================
// THRIFTLY - SELLER DASHBOARD & INCOMING REQUESTS (Priority 7)
// ==================================

let unsubscribeSellerRequests = null;
let unsubscribeSellerProducts = null;
let currentSellerStatusFilter = "all";
let currentSellerTypeFilter = "all";
let currentSellerRequestsData = [];
let currentSellerListingsData = [];

// Format Firestore timestamp for request cards
function formatRequestDate(timestamp) {
    if (!timestamp) return "Recently";
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return "Recently";
        return date.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    } catch (e) {
        return "Recently";
    }
}

// Mark pending seller requests as read
async function markSellerNotificationsAsRead() {
    const user = auth.currentUser;
    if (!user || unreadSellerRequests.length === 0) return;

    const readKey = `thriftly_seller_read_requests_${user.uid}`;
    let readMap = {};
    try {
        readMap = JSON.parse(localStorage.getItem(readKey) || "{}");
    } catch (e) {
        readMap = {};
    }

    const toMark = [...unreadSellerRequests];
    unreadSellerRequests = [];

    const badges = [
        document.getElementById("sellerNotificationBadge"),
        document.getElementById("sidebarSellerBadge"),
        document.getElementById("accountSellerBadge")
    ];
    badges.forEach(b => {
        if (b) {
            b.classList.add("hidden");
            b.textContent = "0";
        }
    });

    toMark.forEach(req => {
        readMap[req.id] = "seen";
    });

    try {
        localStorage.setItem(readKey, JSON.stringify(readMap));
    } catch (e) {}
}

// Start/open conversation with the buyer of a request
async function openConversationWithBuyer(request) {
    const user = auth.currentUser;
    if (!user || !user.emailVerified) {
        alert("Please log in first.");
        return;
    }

    try {
        const conversationsRef = collection(db, "conversations");
        const existingQuery = query(
            conversationsRef,
            where("buyerId", "==", request.buyerId),
            where("sellerId", "==", user.uid),
            where("productId", "==", request.productId)
        );
        const existingSnapshot = await getDocs(existingQuery);

        let conversationId;
        let conversationData;

        if (!existingSnapshot.empty) {
            const docSnap = existingSnapshot.docs[0];
            conversationId = docSnap.id;
            conversationData = { id: conversationId, ...docSnap.data() };
        } else {
            conversationId = [request.buyerId, user.uid, request.productId].join("_");
            const conversationRef = doc(db, "conversations", conversationId);
            const newConv = {
                buyerId: request.buyerId,
                buyerName: request.buyerName || "Student",
                sellerId: user.uid,
                sellerName: user.displayName || "Student",
                productId: request.productId,
                productTitle: request.productTitle || "Product",
                productImage: request.productImage || "",
                lastMessage: "",
                lastSenderId: "",
                updatedAt: serverTimestamp()
            };
            await setDoc(conversationRef, newConv);
            conversationData = { id: conversationId, ...newConv };
        }

        showPage(messagesPage);
        loadConversations();
        openChat(conversationData);
    } catch (err) {
        console.error("Could not open chat with buyer:", err);
        alert("Could not open conversation. Please try again.");
    }
}

// Start/open conversation with the seller of a request
async function openConversationWithSeller(request) {
    const user = auth.currentUser;
    if (!user || !user.emailVerified) {
        alert("Please log in first.");
        return;
    }

    try {
        const conversationsRef = collection(db, "conversations");
        const existingQuery = query(
            conversationsRef,
            where("buyerId", "==", user.uid),
            where("sellerId", "==", request.sellerId),
            where("productId", "==", request.productId)
        );
        const existingSnapshot = await getDocs(existingQuery);

        let conversationId;
        let conversationData;

        if (!existingSnapshot.empty) {
            const docSnap = existingSnapshot.docs[0];
            conversationId = docSnap.id;
            conversationData = { id: conversationId, ...docSnap.data() };
        } else {
            conversationId = [user.uid, request.sellerId, request.productId].join("_");
            const conversationRef = doc(db, "conversations", conversationId);
            const newConv = {
                buyerId: user.uid,
                buyerName: user.displayName || "Student",
                sellerId: request.sellerId,
                sellerName: request.sellerName || "Student",
                productId: request.productId,
                productTitle: request.productTitle || "Product",
                productImage: request.productImage || "",
                lastMessage: "",
                lastSenderId: "",
                updatedAt: serverTimestamp()
            };
            await setDoc(conversationRef, newConv);
            conversationData = { id: conversationId, ...newConv };
        }

        showPage(messagesPage);
        loadConversations();
        openChat(conversationData);
    } catch (err) {
        console.error("Could not open chat with seller:", err);
        alert("Could not open conversation. Please try again.");
    }
}

// Create a rich seller request card with thumbnail, details, and context-aware action buttons
function createSellerRequestCard(request) {
    const card = document.createElement("div");
    card.className = "seller-request-card";

    // Product Thumbnail
    if (request.productImage) {
        const img = document.createElement("img");
        img.src = request.productImage;
        img.alt = request.productTitle || "Product image";
        img.className = "seller-request-thumb";
        img.loading = "lazy";
        card.appendChild(img);
    } else {
        const placeholder = document.createElement("div");
        placeholder.className = "seller-request-placeholder";
        placeholder.textContent = "Photo";
        card.appendChild(placeholder);
    }

    // Main Content
    const main = document.createElement("div");
    main.className = "seller-request-main";

    const title = document.createElement("h3");
    title.className = "seller-request-title";
    title.textContent = request.productTitle || "Untitled product";

    const meta = document.createElement("div");
    meta.className = "seller-request-meta";

    const buyer = document.createElement("span");
    buyer.innerHTML = `Requested by: <strong>${request.buyerName || "Student"}</strong> (${request.buyerEmail || ""})`;

    const price = document.createElement("span");
    price.className = "account-item-price";
    price.textContent = `₹${request.productPrice || 0}`;

    const isRent = request.productType === "Rent";
    const typeBadge = document.createElement("span");
    typeBadge.className = `cart-type-badge ${isRent ? "rent" : "sale"}`;
    typeBadge.textContent = isRent ? "For Rent" : "For Sale";

    const st = (request.status || "Pending").toLowerCase();
    const statusBadge = document.createElement("span");
    statusBadge.className = `request-status status-${st}`;
    statusBadge.textContent = request.status || "Pending";

    const date = document.createElement("span");
    date.className = "seller-request-date";
    date.textContent = formatRequestDate(request.createdAt);

    meta.append(buyer, price, typeBadge, statusBadge, date);
    main.append(title, meta);

    // Rental details badge (Priority 5)
    if (isRent) {
        const rentalInfo = createRentalDetailsElement(request);
        if (rentalInfo) main.appendChild(rentalInfo);
    }

    // Actions
    const actions = document.createElement("div");
    actions.className = "request-actions";

    if (request.status === "Pending") {
        const acceptBtn = document.createElement("button");
        acceptBtn.className = "primary-button";
        acceptBtn.textContent = "Accept Request";
        acceptBtn.addEventListener("click", () => respondToRequest(request.id, "Accepted"));

        const declineBtn = document.createElement("button");
        declineBtn.className = "secondary-button";
        declineBtn.textContent = "Decline";
        declineBtn.addEventListener("click", () => respondToRequest(request.id, "Declined"));

        const msgBtn = document.createElement("button");
        msgBtn.className = "secondary-button";
        msgBtn.textContent = "Message Buyer";
        msgBtn.addEventListener("click", () => openConversationWithBuyer(request));

        actions.append(acceptBtn, declineBtn, msgBtn);
    } else if (request.status === "Accepted") {
        const completeBtn = document.createElement("button");
        completeBtn.className = "primary-button";
        completeBtn.textContent = "Mark as Completed";
        completeBtn.addEventListener("click", () => respondToRequest(request.id, "Completed"));

        const msgBtn = document.createElement("button");
        msgBtn.className = "secondary-button";
        msgBtn.textContent = "Message Buyer";
        msgBtn.addEventListener("click", () => openConversationWithBuyer(request));

        actions.append(completeBtn, msgBtn);
    } else {
        const msgBtn = document.createElement("button");
        msgBtn.className = "secondary-button";
        msgBtn.textContent = "Message Buyer";
        msgBtn.addEventListener("click", () => openConversationWithBuyer(request));
        actions.appendChild(msgBtn);
    }

    main.appendChild(actions);
    card.appendChild(main);
    return card;
}

// Render filtered seller requests in sellerDashboardPage
function renderSellerRequestsFiltered() {
    const requestsList = document.getElementById("sellerRequestsList");
    if (!requestsList) return;
    requestsList.innerHTML = "";

    const filtered = currentSellerRequestsData.filter(req => {
        // Status filter
        if (currentSellerStatusFilter !== "all") {
            if (currentSellerStatusFilter === "other") {
                if (!["Declined", "Cancelled"].includes(req.status)) return false;
            } else if (req.status !== currentSellerStatusFilter) {
                return false;
            }
        }
        // Type filter
        if (currentSellerTypeFilter !== "all") {
            if (req.productType !== currentSellerTypeFilter) return false;
        }
        return true;
    });

    if (filtered.length === 0) {
        requestsList.innerHTML = `<p class="account-empty-inline">No requests match the selected filters.</p>`;
        return;
    }

    filtered.forEach(req => {
        requestsList.appendChild(createSellerRequestCard(req));
    });
}

// Calculate and update all Seller Dashboard statistics from Firestore data
function updateSellerDashboardStats() {
    // Listings counts
    const totalListings = currentSellerListingsData.length;
    const availableListings = currentSellerListingsData.filter(p => (p.status || "Available") === "Available").length;

    // Requests counts
    const pendingCount = currentSellerRequestsData.filter(r => r.status === "Pending").length;
    const acceptedCount = currentSellerRequestsData.filter(r => r.status === "Accepted").length;
    const completedCount = currentSellerRequestsData.filter(r => r.status === "Completed").length;

    // Earnings calculation (from completed transactions)
    const totalRevenue = currentSellerRequestsData
        .filter(r => r.status === "Completed")
        .reduce((sum, r) => sum + (Number(r.totalPrice || r.productPrice) || 0), 0);

    // Update Overview statistics elements
    const totalListingsEl = document.getElementById("totalListingsStat");
    if (totalListingsEl) totalListingsEl.textContent = totalListings;

    const availableListingsEl = document.getElementById("availableListingsStat");
    if (availableListingsEl) availableListingsEl.textContent = availableListings;

    const pendingEl = document.getElementById("pendingRequests");
    if (pendingEl) pendingEl.textContent = pendingCount;

    const acceptedEl = document.getElementById("acceptedRequests");
    if (acceptedEl) acceptedEl.textContent = acceptedCount;

    const completedEl = document.getElementById("completedRequests");
    if (completedEl) completedEl.textContent = completedCount;

    const totalRequestsEl = document.getElementById("totalRequests");
    if (totalRequestsEl) totalRequestsEl.textContent = currentSellerRequestsData.length;

    const revenueEl = document.getElementById("totalRevenueStat");
    if (revenueEl) revenueEl.textContent = `₹${totalRevenue}`;

    // Update Tab count indicators
    const tabListingsEl = document.getElementById("sellerTabListingsCount");
    if (tabListingsEl) tabListingsEl.textContent = totalListings;

    const tabRequestsEl = document.getElementById("sellerTabRequestsCount");
    if (tabRequestsEl) tabRequestsEl.textContent = currentSellerRequestsData.length;

    const tabSalesEl = document.getElementById("sellerTabSalesCount");
    if (tabSalesEl) tabSalesEl.textContent = completedCount;

    // Update Request Filter Pill counts
    const filterAllEl = document.getElementById("filterAllCount");
    if (filterAllEl) filterAllEl.textContent = currentSellerRequestsData.length;

    const filterPendingEl = document.getElementById("filterPendingCount");
    if (filterPendingEl) filterPendingEl.textContent = pendingCount;

    const filterAcceptedEl = document.getElementById("filterAcceptedCount");
    if (filterAcceptedEl) filterAcceptedEl.textContent = acceptedCount;

    const filterCompletedEl = document.getElementById("filterCompletedCount");
    if (filterCompletedEl) filterCompletedEl.textContent = completedCount;

    const filterOtherEl = document.getElementById("filterOtherCount");
    if (filterOtherEl) filterOtherEl.textContent = currentSellerRequestsData.filter(r => ["Declined", "Cancelled"].includes(r.status)).length;
}

// Render Seller's products in Section B: My Listings
function renderSellerDashboardListings() {
    const container = document.getElementById("sellerDashboardListingsGrid");
    if (!container) return;
    container.innerHTML = "";

    if (currentSellerListingsData.length === 0) {
        container.innerHTML = `
            <div class="account-empty-state">
                <h3>You haven't listed any products yet</h3>
                <p>Have an old textbook, lab coat, or electronics? List it on Thriftly to sell or rent to fellow students.</p>
                <button class="primary-button" id="sellerEmptyListBtn">+ List an Item</button>
            </div>
        `;
        const btn = document.getElementById("sellerEmptyListBtn");
        if (btn) btn.addEventListener("click", openSellingPage);
        return;
    }

    currentSellerListingsData.forEach(function (product) {
        const card = document.createElement("div");
        card.className = "seller-request-card";

        // Thumbnail
        if (product.imageUrl) {
            const img = document.createElement("img");
            img.src = product.imageUrl;
            img.alt = product.title || "Product image";
            img.className = "seller-request-thumb";
            img.loading = "lazy";
            card.appendChild(img);
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "seller-request-placeholder";
            placeholder.textContent = "Photo";
            card.appendChild(placeholder);
        }

        // Main info
        const main = document.createElement("div");
        main.className = "seller-request-main";

        const title = document.createElement("h3");
        title.className = "seller-request-title";
        title.textContent = product.title || "Untitled Product";

        const meta = document.createElement("div");
        meta.className = "seller-request-meta";

        const price = document.createElement("span");
        price.className = "account-item-price";
        price.textContent = formatPrice(product);

        const isRent = product.type === "Rent";
        const typeBadge = document.createElement("span");
        typeBadge.className = `cart-type-badge ${isRent ? "rent" : "sale"}`;
        typeBadge.textContent = isRent ? "For Rent" : "For Sale";

        const isAvailable = (product.status || "Available") === "Available";
        const statusBadge = document.createElement("span");
        statusBadge.className = `request-status status-${isAvailable ? "completed" : "pending"}`;
        statusBadge.textContent = product.status || "Available";

        const condition = document.createElement("span");
        condition.textContent = `Condition: ${product.condition || "Good"}`;

        meta.append(price, typeBadge, statusBadge, condition);
        main.appendChild(title);
        main.appendChild(meta);

        // Actions
        const actions = document.createElement("div");
        actions.className = "request-actions";

        const editBtn = document.createElement("button");
        editBtn.className = "primary-button edit-listing-btn";
        editBtn.type = "button";
        editBtn.textContent = "Edit Listing";

        if (product.status && product.status !== "Available") {
            editBtn.disabled = true;
            editBtn.title = "Sold or completed listings cannot be edited.";
            editBtn.style.opacity = "0.5";
            editBtn.style.cursor = "not-allowed";
        } else {
            editBtn.addEventListener("click", function () {
                openEditProductModal(product);
            });
        }

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "secondary-button";
        deleteBtn.type = "button";
        deleteBtn.textContent = "Delete Listing";
        deleteBtn.addEventListener("click", async function () {
            const confirmed = confirm(
                `Are you sure you want to delete "${product.title}"? This will remove it from the marketplace.`
            );
            if (!confirmed) return;

            const currentUser = auth.currentUser;
            if (!currentUser || product.sellerId !== currentUser.uid) {
                alert("You can only delete your own listings.");
                return;
            }

            try {
                deleteBtn.disabled = true;
                deleteBtn.textContent = "Deleting...";
                await deleteDoc(doc(db, "products", product.id));
                alert("Listing deleted successfully!");
            } catch (err) {
                console.error("Delete listing error:", err);
                alert("Could not delete listing. Please try again.");
                deleteBtn.disabled = false;
                deleteBtn.textContent = "Delete Listing";
            }
        });

        actions.append(editBtn, deleteBtn);
        main.appendChild(actions);
        card.appendChild(main);
        container.appendChild(card);
    });
}

// Render Seller's completed transactions in Section D: Sales History
function renderSellerDashboardSales() {
    const container = document.getElementById("sellerDashboardSalesGrid");
    if (!container) return;
    container.innerHTML = "";

    const completedSales = currentSellerRequestsData.filter(r => r.status === "Completed");

    if (completedSales.length === 0) {
        container.innerHTML = `
            <div class="account-empty-state">
                <h3>No completed sales yet</h3>
                <p>When you complete a sale or rental transaction with a buyer, your transaction record will appear here.</p>
                <button class="primary-button" id="sellerSalesListBtn">+ List an Item</button>
            </div>
        `;
        const btn = document.getElementById("sellerSalesListBtn");
        if (btn) btn.addEventListener("click", openSellingPage);
        return;
    }

    completedSales.forEach(function (request) {
        const card = document.createElement("div");
        card.className = "seller-request-card";

        // Thumbnail
        if (request.productImage) {
            const img = document.createElement("img");
            img.src = request.productImage;
            img.alt = request.productTitle || "Product image";
            img.className = "seller-request-thumb";
            img.loading = "lazy";
            card.appendChild(img);
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "seller-request-placeholder";
            placeholder.textContent = "Photo";
            card.appendChild(placeholder);
        }

        const main = document.createElement("div");
        main.className = "seller-request-main";

        const title = document.createElement("h3");
        title.className = "seller-request-title";
        title.textContent = request.productTitle || "Untitled Product";

        const meta = document.createElement("div");
        meta.className = "seller-request-meta";

        const buyer = document.createElement("span");
        buyer.innerHTML = `Buyer: <strong>${request.buyerName || "Student"}</strong> (${request.buyerEmail || ""})`;

        const price = document.createElement("span");
        price.className = "account-item-price";
        const amount = request.totalPrice || request.productPrice || 0;
        price.textContent = `₹${amount}`;

        const isRent = request.productType === "Rent";
        const typeBadge = document.createElement("span");
        typeBadge.className = `cart-type-badge ${isRent ? "rent" : "sale"}`;
        typeBadge.textContent = isRent ? "Rental" : "Purchase";

        const statusBadge = document.createElement("span");
        statusBadge.className = "request-status status-completed";
        statusBadge.textContent = "Completed";

        const completedDate = document.createElement("span");
        completedDate.className = "seller-request-date";
        completedDate.textContent = `Completed: ${formatRequestDate(request.completedAt || request.respondedAt || request.createdAt)}`;

        meta.append(buyer, price, typeBadge, statusBadge, completedDate);
        main.appendChild(title);
        main.appendChild(meta);

        if (isRent) {
            const rentalInfo = createRentalDetailsElement(request);
            if (rentalInfo) main.appendChild(rentalInfo);
        }

        const actions = document.createElement("div");
        actions.className = "request-actions";

        const msgBtn = document.createElement("button");
        msgBtn.className = "secondary-button";
        msgBtn.textContent = "Message Buyer";
        msgBtn.addEventListener("click", () => openConversationWithBuyer(request));
        actions.appendChild(msgBtn);

        main.appendChild(actions);
        card.appendChild(main);
        container.appendChild(card);
    });
}

// Load and display the Seller Dashboard
function loadSellerDashboard() {
    const user = auth.currentUser;

    if (!user || !user.emailVerified) {
        alert("Please log in with a verified account.");
        showPage(accountPage);
        return;
    }

    markSellerNotificationsAsRead();

    // Stop any previous listeners
    if (unsubscribeSellerRequests) {
        unsubscribeSellerRequests();
        unsubscribeSellerRequests = null;
    }
    if (unsubscribeSellerProducts) {
        unsubscribeSellerProducts();
        unsubscribeSellerProducts = null;
    }

    // 1. Listen to Seller Requests
    const requestsQuery = query(
        collection(db, "requests"),
        where("sellerId", "==", user.uid)
    );

    unsubscribeSellerRequests = onSnapshot(
        requestsQuery,
        function (snapshot) {
            currentSellerRequestsData = snapshot.docs.map(function (requestDoc) {
                return {
                    id: requestDoc.id,
                    ...requestDoc.data()
                };
            });

            updateSellerDashboardStats();
            renderSellerRequestsFiltered();
            renderSellerDashboardSales();
        },
        function (error) {
            console.error("Seller requests error:", error);
            const listEl = document.getElementById("sellerRequestsList");
            if (listEl) listEl.textContent = "Unable to load requests. Please try again.";
        }
    );

    // 2. Listen to Seller Listings
    const listingsQuery = query(
        collection(db, "products"),
        where("sellerId", "==", user.uid)
    );

    unsubscribeSellerProducts = onSnapshot(
        listingsQuery,
        function (snapshot) {
            currentSellerListingsData = snapshot.docs.map(function (docSnap) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                };
            });

            updateSellerDashboardStats();
            renderSellerDashboardListings();
        },
        function (error) {
            console.error("Seller products error:", error);
            const listEl = document.getElementById("sellerDashboardListingsGrid");
            if (listEl) listEl.textContent = "Unable to load listings. Please try again.";
        }
    );
}

// Tab Switching inside Seller Dashboard
const sellerDashboardTabs = [
    { button: "sellerTabOverview", section: "sellerSectionOverview" },
    { button: "sellerTabListings", section: "sellerSectionListings" },
    { button: "sellerTabRequests", section: "sellerSectionRequests" },
    { button: "sellerTabSales", section: "sellerSectionSales" }
];

function switchSellerTab(targetTabId) {
    sellerDashboardTabs.forEach(tab => {
        const btn = document.getElementById(tab.button);
        const sec = document.getElementById(tab.section);
        if (btn) btn.classList.toggle("active", tab.button === targetTabId);
        if (sec) sec.classList.toggle("hidden", tab.button !== targetTabId);
    });

    if (targetTabId === "sellerTabRequests") {
        markSellerNotificationsAsRead();
    }
}

sellerDashboardTabs.forEach(tab => {
    const btn = document.getElementById(tab.button);
    if (btn) {
        btn.addEventListener("click", function () {
            switchSellerTab(tab.button);
        });
    }
});

// Quick Action Buttons inside Seller Dashboard
const sellerOverviewListBtn = document.getElementById("sellerOverviewListBtn");
if (sellerOverviewListBtn) {
    sellerOverviewListBtn.addEventListener("click", openSellingPage);
}

const sellerListingsCreateBtn = document.getElementById("sellerListingsCreateBtn");
if (sellerListingsCreateBtn) {
    sellerListingsCreateBtn.addEventListener("click", openSellingPage);
}

const sellerOverviewRequestsBtn = document.getElementById("sellerOverviewRequestsBtn");
if (sellerOverviewRequestsBtn) {
    sellerOverviewRequestsBtn.addEventListener("click", function () {
        switchSellerTab("sellerTabRequests");
    });
}

// Helper to open Seller Dashboard directly to a specific tab
function openSellerDashboardTab(targetTabId = "sellerTabOverview") {
    if (!auth.currentUser || !auth.currentUser.emailVerified) {
        showPage(accountPage);
        return;
    }
    showPage(sellerDashboardPage);
    loadSellerDashboard();
    switchSellerTab(targetTabId);
}

// Wire Seller Filter Pills (Status & Type)
const sellerStatusFilters = document.getElementById("sellerStatusFilters");
if (sellerStatusFilters) {
    sellerStatusFilters.addEventListener("click", function (e) {
        const btn = e.target.closest(".filter-pill");
        if (!btn) return;
        sellerStatusFilters.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        currentSellerStatusFilter = btn.getAttribute("data-status") || "all";
        renderSellerRequestsFiltered();
    });
}

const sellerTypeFilters = document.getElementById("sellerTypeFilters");
if (sellerTypeFilters) {
    sellerTypeFilters.addEventListener("click", function (e) {
        const btn = e.target.closest(".filter-pill");
        if (!btn) return;
        sellerTypeFilters.querySelectorAll(".filter-pill").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        currentSellerTypeFilter = btn.getAttribute("data-type") || "all";
        renderSellerRequestsFiltered();
    });
}

// Wire Seller Navigation Buttons
const dashboardButton = document.getElementById("dashboardButton");
if (dashboardButton) {
    dashboardButton.addEventListener("click", function () {
        openSellerDashboardTab("sellerTabOverview");
    });
}

const sidebarSellerButton = document.getElementById("sidebarSellerButton");
if (sidebarSellerButton) {
    sidebarSellerButton.addEventListener("click", function () {
        closeSidebar();
        openSellerDashboardTab("sellerTabOverview");
    });
}

const chatBackButton = document.getElementById("chatBackButton");
if (chatBackButton) {
    chatBackButton.addEventListener("click", function () {
        const messagingLayout = document.querySelector(".messaging-layout");
        if (messagingLayout) {
            messagingLayout.classList.remove("chat-open");
        }
    });
}

if (sidebarWishlistButton) {
    sidebarWishlistButton.addEventListener("click", function () {
        closeSidebar();
        if (!auth.currentUser) {
            showPage(authPage);
            return;
        }
        openWishlistPage();
    });
}

if (sidebarAccountButton) {
    sidebarAccountButton.addEventListener("click", function () {
        closeSidebar();
        if (!auth.currentUser) {
            showPage(authPage);
            return;
        }
        showPage(profilePage);
        loadAccountDashboard();
    });
}

// ==================================
// SELLER ACCEPT / DECLINE REQUEST
// ==================================


async function respondToRequest(requestId, newStatus) {

    const user = auth.currentUser;

    if (!user || !user.emailVerified) {
        alert("Please log in with a verified account.");
        return;
    }

    try {
        const requestRef = doc(db, "requests", requestId);
        const requestSnapshot = await getDoc(requestRef);

        if (!requestSnapshot.exists()) {
            alert("This request no longer exists.");
            return;
        }

        const requestData = requestSnapshot.data();

        if (requestData.sellerId !== user.uid) {
            alert("You are not authorized to update this request.");
            return;
        }

        // Accept or decline only pending requests
        if (newStatus === "Accepted" || newStatus === "Declined") {
            if (requestData.status !== "Pending") {
                alert("This request has already been processed.");
                return;
            }
        }
        // Complete only accepted requests
        else if (newStatus === "Completed") {
            if (requestData.status !== "Accepted") {
                alert("Only accepted requests can be completed.");
                return;
            }
        } else {
            alert("Invalid request status.");
            return;
        }

        // Rental Overlap & Sale Availability Check on Accept
        if (newStatus === "Accepted") {
            if (requestData.productType === "Rent") {
                const reqStart = requestData.rentalStartDate;
                const reqEnd = requestData.rentalEndDate;

                if (reqStart && reqEnd && requestData.productId) {
                    try {
                        const conflictQuery = query(
                            collection(db, "requests"),
                            where("productId", "==", requestData.productId),
                            where("sellerId", "==", user.uid)
                        );
                        const conflictSnap = await getDocs(conflictQuery);

                        const conflictingDoc = conflictSnap.docs.find(d => {
                            if (d.id === requestId) return false;
                            const data = d.data();
                            if (data.status !== "Accepted") return false;
                            if (data.productType !== "Rent") return false;
                            if (!data.rentalStartDate || !data.rentalEndDate) return false;

                            return hasRentalDateOverlap(reqStart, reqEnd, data.rentalStartDate, data.rentalEndDate);
                        });

                        if (conflictingDoc) {
                            const conflict = conflictingDoc.data();
                            alert(
                                `Cannot accept this rental request!\n\n` +
                                `This product is already accepted for rental from ${conflict.rentalStartDate} to ${conflict.rentalEndDate} (Buyer: ${conflict.buyerName || "Student"}).\n\n` +
                                `The requested dates (${reqStart} to ${reqEnd}) conflict with that booking.\n\n` +
                                `Please decline this request or coordinate different dates with the buyer via messaging.`
                            );
                            return;
                        }
                    } catch (conflictErr) {
                        console.warn("Could not check rental conflicts:", conflictErr);
                    }
                }
            } else if (requestData.productType === "Sale") {
                if (requestData.productId) {
                    try {
                        const prodRef = doc(db, "products", requestData.productId);
                        const prodSnap = await getDoc(prodRef);
                        if (prodSnap.exists() && prodSnap.data().status === "Sold") {
                            alert("This product has already been sold.");
                            return;
                        }
                    } catch (prodErr) {
                        console.warn("Could not check product sold status:", prodErr);
                    }
                }
            }
        }

        // Update data strictly matching Firestore Security Rules allowed keys
        let updateData;
        if (newStatus === "Completed") {
            updateData = {
                status: "Completed",
                completedAt: serverTimestamp()
            };
        } else {
            updateData = {
                status: newStatus,
                respondedAt: serverTimestamp()
            };
        }

        // 1. Update the request in Firestore
        await updateDoc(requestRef, updateData);

        // 2. If purchase is completed, update product status to Sold (or Available for rental)
        if (newStatus === "Completed" && requestData.productId) {
            try {
                const prodRef = doc(db, "products", requestData.productId);
                if (requestData.productType === "Sale") {
                    // Purchases: Permanently mark as Sold so it is removed from marketplace
                    await updateDoc(prodRef, { status: "Sold" });
                } else if (requestData.productType === "Rent") {
                    // Rentals: Transaction completed in history; product remains Available
                    await updateDoc(prodRef, { status: "Available" });
                }
            } catch (prodErr) {
                console.warn("Could not update product status in Firestore:", prodErr);
            }
        }

        alert(
            newStatus === "Completed"
                ? "Transaction marked as completed!"
                : newStatus === "Accepted"
                    ? "Request accepted successfully!"
                    : "Request declined."
        );

    } catch (error) {
        console.error("Request update error:", error);
        alert("Could not update the request. Please try again.");
    }
}


// MY REQUESTS PAGE

const myRequestsButton = document.getElementById("myRequestsButton");

if (myRequestsButton) {
    myRequestsButton.addEventListener("click", function () {
        loadMyRequests();
    });
}

let unsubscribeMyRequests = null;

function loadMyRequests() {
    const user = auth.currentUser;

    if (!user || !user.emailVerified) {
        alert("Please log in with your verified account first.");
        showPage(accountPage);
        return;
    }

    if (unsubscribeMyRequests) {
        unsubscribeMyRequests();
    }

    showPage(myRequestsPage);
    markBuyerNotificationsAsRead();

    const requestsQuery = query(
        collection(db, "requests"),
        where("buyerId", "==", user.uid)
    );

    unsubscribeMyRequests = onSnapshot(requestsQuery, function (snapshot) {
        const requestsList = document.getElementById("myRequestsList");

        requestsList.innerHTML = "";

        if (snapshot.empty) {
            requestsList.textContent = "You haven't requested any products yet.";
            return;
        }

        snapshot.forEach(function (requestDoc) {
            const request = requestDoc.data();

            const card = document.createElement("div");
            card.className = "seller-request-card";

            const title = document.createElement("h3");
            title.textContent = request.productTitle || "Untitled product";

            const price = document.createElement("p");
            price.textContent = "Price: ₹" + (request.productPrice || 0);

            const type = document.createElement("p");
            type.textContent = request.productType === "Rent"
                ? "Rental request"
                : "Purchase request";

            const status = document.createElement("span");
            status.className = `request-status status-${(request.status || "pending").toLowerCase()}`;
            status.textContent = request.status || "Pending";

            card.append(title, price, type, status);

            if (request.productType === "Rent") {
                const rentalDetails = createRentalDetailsElement(request);
                if (rentalDetails) {
                    card.appendChild(rentalDetails);
                }
            }

            // Buyer can cancel a pending request
            if (request.status === "Pending") {
                const actions = document.createElement("div");
                actions.className = "request-actions";
                const cancelBtn = document.createElement("button");
                cancelBtn.className = "secondary-button";
                cancelBtn.textContent = "Cancel Request";
                cancelBtn.addEventListener("click", async function () {
                    if (!confirm("Are you sure you want to cancel this request?")) return;
                    try {
                        await updateDoc(requestDoc.ref, {
                            status: "Cancelled",
                            cancelledAt: serverTimestamp()
                        });
                        alert("Your request has been cancelled.");
                    } catch (err) {
                        console.error("Cancel request error:", err);
                        alert("Could not cancel request. Please try again.");
                    }
                });
                actions.appendChild(cancelBtn);
                card.appendChild(actions);
            }

            requestsList.appendChild(card);
        });

    }, function (error) {
        console.error("Error loading buyer requests:", error);
        document.getElementById("myRequestsList").textContent =
            "Unable to load your requests. Please try again.";
    });
}

// MY LISTINGS NAVIGATION

const myListingsButton = document.getElementById("myListingsButton");

if (myListingsButton) {
    myListingsButton.addEventListener("click", function () {
        loadMyListings();
    });
}

// LOAD MY LISTINGS

let unsubscribeMyListings = null;

function loadMyListings() {
    const user = auth.currentUser;

    if (!user || !user.emailVerified) {
        alert("Please log in with your verified account first.");
        showPage(accountPage);
        return;
    }

    if (unsubscribeMyListings) {
        unsubscribeMyListings();
    }

    showPage(myListingsPage);

    const listingsQuery = query(
        collection(db, "products"),
        where("sellerId", "==", user.uid)
    );

    unsubscribeMyListings = onSnapshot(listingsQuery, function (snapshot) {
        const container = document.getElementById("myListingsContainer");

        container.innerHTML = "";

        if (snapshot.empty) {
            container.textContent = "You haven't listed any products yet.";
            return;
        }

        snapshot.forEach(function (productDoc) {
            const product = productDoc.data();

            const card = document.createElement("div");
            card.className = "seller-request-card";

            const image = document.createElement("img");

image.src = product.imageUrl || "";
image.alt = product.title || "Product image";
image.className = "my-listing-image";

            const title = document.createElement("h3");
            title.textContent = product.title;

            const price = document.createElement("p");
            price.textContent = "Price: ₹" + product.price;

            const type = document.createElement("p");
            type.textContent = product.type === "Rent"
                ? "For Rent"
                : "For Sale";

            const status = document.createElement("span");
            status.className = "request-status";
            status.textContent = product.status || "Available";

            const actions = document.createElement("div");
            actions.className = "request-actions";

            const editButton = document.createElement("button");
            editButton.textContent = "Edit Listing";
            editButton.className = "primary-button edit-listing-btn";
            editButton.type = "button";

            if (product.status && product.status !== "Available") {
                editButton.disabled = true;
                editButton.title = "Sold or completed listings cannot be edited.";
                editButton.style.opacity = "0.5";
                editButton.style.cursor = "not-allowed";
            } else {
                editButton.addEventListener("click", function () {
                    openEditProductModal({ id: productDoc.id, ...product });
                });
            }

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete Listing";
            deleteButton.className = "secondary-button";
            deleteButton.type = "button";

            deleteButton.addEventListener("click", async function () {
                const confirmed = confirm(
                    "Are you sure you want to delete this listing?"
                );

                if (!confirmed) return;

                try {
                    await deleteDoc(doc(db, "products", productDoc.id));
                    alert("Listing deleted successfully!");
                } catch (error) {
                    console.error("Delete listing error:", error);
                    alert("Unable to delete listing. Please try again.");
                }
            });

            actions.append(editButton, deleteButton);
            card.append(image, title, price, type, status, actions);
            container.appendChild(card);
        });

    }, function (error) {
        console.error("Error loading your listings:", error);
        document.getElementById("myListingsContainer").textContent =
            "Unable to load your listings.";
    });
}

// ==========================================
// EDIT LISTING MODAL & WORKFLOW
// ==========================================

const editListingModalBackdrop = document.getElementById("editListingModalBackdrop");
const editListingModal = document.getElementById("editListingModal");
const editListingForm = document.getElementById("editListingForm");
const closeEditModalButton = document.getElementById("closeEditModalButton");
const cancelEditModalButton = document.getElementById("cancelEditModalButton");
const saveEditModalButton = document.getElementById("saveEditModalButton");

const editProductId = document.getElementById("editProductId");
const editProductTitle = document.getElementById("editProductTitle");
const editProductDescription = document.getElementById("editProductDescription");
const editProductCategory = document.getElementById("editProductCategory");
const editProductType = document.getElementById("editProductType");
const editPriceLabel = document.getElementById("editPriceLabel");
const editProductPrice = document.getElementById("editProductPrice");
const editRentalUnitField = document.getElementById("editRentalUnitField");
const editRentalUnit = document.getElementById("editRentalUnit");
const editProductCondition = document.getElementById("editProductCondition");
const editProductImage = document.getElementById("editProductImage");
const editCurrentImageContainer = document.getElementById("editCurrentImageContainer");
const editCurrentImagePreview = document.getElementById("editCurrentImagePreview");
const editListingMessage = document.getElementById("editListingMessage");
const editProductTypeNote = document.getElementById("editProductTypeNote");

let currentlyEditingProduct = null;

function updateEditPriceLabel() {
    if (!editProductType || !editPriceLabel) return;
    const isRent = editProductType.value === "Rent";
    if (editRentalUnitField) editRentalUnitField.hidden = !isRent;
    if (isRent) {
        const unit = (editRentalUnit && editRentalUnit.value) ? editRentalUnit.value : "day";
        editPriceLabel.textContent = `Rental price (₹ / ${unit})`;
    } else {
        editPriceLabel.textContent = "Selling price (₹)";
    }
}

if (editProductType) {
    editProductType.addEventListener("change", updateEditPriceLabel);
}
if (editRentalUnit) {
    editRentalUnit.addEventListener("change", updateEditPriceLabel);
}

function openEditProductModal(product) {
    const user = auth.currentUser;
    if (!user || !user.emailVerified) {
        alert("Please log in with your verified account first.");
        showPage(accountPage);
        return;
    }

    if (product.sellerId !== user.uid) {
        alert("You can only edit your own listings.");
        return;
    }

    if (product.status && product.status !== "Available") {
        alert("This listing has already been sold or completed and cannot be edited.");
        return;
    }

    currentlyEditingProduct = product;

    // Check if product has active pending or accepted requests
    const hasActiveRequests = Array.isArray(currentSellerRequestsData) && currentSellerRequestsData.some(
        r => r.productId === product.id && ["Pending", "Accepted"].includes(r.status)
    );

    // Pre-fill form fields
    editProductId.value = product.id;
    editProductTitle.value = product.title || "";
    editProductDescription.value = product.description || "";
    editProductCategory.value = product.category || "";
    editProductType.value = product.type === "Rent" ? "Rent" : "Sale";
    editProductPrice.value = product.price || "";
    editRentalUnit.value = product.rentalUnit || "day";
    editProductCondition.value = product.condition || "Good";
    editProductImage.value = "";

    // Image preview
    if (product.imageUrl) {
        editCurrentImagePreview.src = product.imageUrl;
        editCurrentImageContainer.style.display = "flex";
    } else {
        editCurrentImageContainer.style.display = "none";
    }

    // Rental vs Sale label
    updateEditPriceLabel();

    // If active requests exist, prevent changing listing type (Sale <-> Rent)
    if (hasActiveRequests) {
        editProductType.disabled = true;
        if (editProductTypeNote) {
            editProductTypeNote.textContent = "Listing type cannot be changed while there are pending or accepted requests.";
            editProductTypeNote.classList.remove("hidden");
        }
    } else {
        editProductType.disabled = false;
        if (editProductTypeNote) {
            editProductTypeNote.classList.add("hidden");
        }
    }

    // Reset messages and buttons
    editListingMessage.textContent = "";
    editListingMessage.className = "listing-message";
    saveEditModalButton.disabled = false;
    saveEditModalButton.textContent = "Save Changes";

    // Show modal
    editListingModalBackdrop.classList.remove("hidden");
    editListingModal.classList.remove("hidden");
    document.body.classList.add("no-scroll");
}

function closeEditProductModal() {
    if (editListingModalBackdrop) editListingModalBackdrop.classList.add("hidden");
    if (editListingModal) editListingModal.classList.add("hidden");
    document.body.classList.remove("no-scroll");
    if (editListingForm) editListingForm.reset();
    if (editListingMessage) editListingMessage.textContent = "";
    currentlyEditingProduct = null;
}

if (closeEditModalButton) closeEditModalButton.addEventListener("click", closeEditProductModal);
if (cancelEditModalButton) cancelEditModalButton.addEventListener("click", closeEditProductModal);
if (editListingModalBackdrop) editListingModalBackdrop.addEventListener("click", closeEditProductModal);

window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && editListingModal && !editListingModal.classList.contains("hidden")) {
        closeEditProductModal();
    }
});

// Save Changes submit handler
if (editListingForm) {
    editListingForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const user = auth.currentUser;
        if (!user || !user.emailVerified) {
            alert("Please log in with your verified account first.");
            closeEditProductModal();
            showPage(accountPage);
            return;
        }

        const productId = editProductId.value;
        if (!productId) {
            editListingMessage.className = "listing-message error";
            editListingMessage.textContent = "Product identifier is missing.";
            return;
        }

        if (!currentlyEditingProduct || currentlyEditingProduct.sellerId !== user.uid) {
            editListingMessage.className = "listing-message error";
            editListingMessage.textContent = "You can only edit your own listings.";
            return;
        }

        const title = editProductTitle.value.trim();
        const description = editProductDescription.value.trim();
        const category = editProductCategory.value;
        const type = editProductType.value;
        const price = Number(editProductPrice.value);
        const rentalUnit = type === "Rent" ? editRentalUnit.value : null;
        const condition = editProductCondition.value;
        const imageFile = editProductImage.files ? editProductImage.files[0] : null;

        // Validation
        if (!title) {
            editListingMessage.className = "listing-message error";
            editListingMessage.textContent = "Please enter a product title.";
            return;
        }

        if (!description) {
            editListingMessage.className = "listing-message error";
            editListingMessage.textContent = "Please enter a description.";
            return;
        }

        if (!category) {
            editListingMessage.className = "listing-message error";
            editListingMessage.textContent = "Please select a category.";
            return;
        }

        if (!type || !["Sale", "Rent"].includes(type)) {
            editListingMessage.className = "listing-message error";
            editListingMessage.textContent = "Please select a valid listing type.";
            return;
        }

        if (!price || price <= 0 || !Number.isFinite(price)) {
            editListingMessage.className = "listing-message error";
            editListingMessage.textContent = "Please enter a valid price greater than zero.";
            return;
        }

        if (!condition) {
            editListingMessage.className = "listing-message error";
            editListingMessage.textContent = "Please select an item condition.";
            return;
        }

        if (imageFile) {
            if (imageFile.size > 5 * 1024 * 1024) {
                editListingMessage.className = "listing-message error";
                editListingMessage.textContent = "Image size must be under 5 MB.";
                return;
            }
            if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
                editListingMessage.className = "listing-message error";
                editListingMessage.textContent = "Please select a JPEG, PNG or WebP image.";
                return;
            }
        }

        try {
            saveEditModalButton.disabled = true;
            saveEditModalButton.textContent = "Saving changes...";
            editListingMessage.className = "listing-message info";
            editListingMessage.textContent = "Saving your changes...";

            let newImageUrl = null;

            // If a replacement image was selected, upload via Supabase Edge Function
            if (imageFile) {
                editListingMessage.textContent = "Uploading new product photo...";
                const token = await user.getIdToken();
                const formData = new FormData();
                formData.append("file", imageFile);

                const uploadResponse = await fetch(
                    "https://xnqqrazxqlmfwjsdrncy.supabase.co/functions/v1/upload-product-image",
                    {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "apikey": "sb_publishable_-v9LI4cP-r_-err_e86rDg_k07iyq9e"
                        },
                        body: formData
                    }
                );

                const uploadResult = await uploadResponse.json();
                if (!uploadResponse.ok) {
                    throw new Error(uploadResult.error || "Image upload failed.");
                }
                newImageUrl = uploadResult.imageUrl;
            }

            editListingMessage.textContent = "Updating product listing...";

            const updatePayload = {
                title: title,
                description: description,
                category: category,
                type: type,
                price: price,
                condition: condition,
                rentalUnit: rentalUnit,
                updatedAt: serverTimestamp()
            };

            if (newImageUrl) {
                updatePayload.imageUrl = newImageUrl;
            }

            // Update existing Firestore product document
            await updateDoc(doc(db, "products", productId), updatePayload);

            // Update in-memory product details if user is currently viewing this item
            if (typeof currentProduct !== "undefined" && currentProduct && currentProduct.id === productId) {
                currentProduct = { ...currentProduct, ...updatePayload };
            }

            editListingMessage.className = "listing-message success";
            editListingMessage.textContent = "Listing updated successfully!";

            setTimeout(() => {
                closeEditProductModal();
            }, 1200);

        } catch (error) {
            console.error("Edit listing error:", error);
            editListingMessage.className = "listing-message error";
            editListingMessage.textContent = error.message || "Failed to update listing. Please try again.";
            saveEditModalButton.disabled = false;
            saveEditModalButton.textContent = "Save Changes";
        }
    });
}

// LOGOUT FUNCTIONALITY

async function handleLogout() {
    try {
        await signOut(auth);
        closeSidebar();
        alert("You have been logged out successfully!");
        showPage(homePage);
    } catch (error) {
        console.error("Logout error:", error);
        alert("Unable to log out. Please try again.");
    }
}

if (logoutButton) {
    logoutButton.addEventListener("click", handleLogout);
}

if (accountLogoutButton) {
    accountLogoutButton.addEventListener("click", handleLogout);
}

if (accountHeaderLogoutButton) {
    accountHeaderLogoutButton.addEventListener("click", handleLogout);
}


// FLOATING MESSAGES / HOME BUTTON

const messagesButton = document.getElementById("messagesButton");

messagesButton.addEventListener("click", function () {
    const messagesPage = document.getElementById("messagesPage");

    if (!messagesPage.classList.contains("hidden")) {
        showPage(homePage);
    } else {
        loadConversations();
    }
});


function updateFloatingButton() {
    const messagesPage = document.getElementById("messagesPage");
    const isMessagesPageOpen =
        !messagesPage.classList.contains("hidden");

    const dot = document.getElementById("messageNotificationDot");
    const isDotVisible = dot && dot.style.display === "block";

    if (isMessagesPageOpen) {
        messagesButton.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="m3 10 9-7 9 7"></path>
                <path d="M5 9v12h14V9"></path>
                <path d="M9 21v-7h6v7"></path>
            </svg>
            <span class="message-notification-dot" id="messageNotificationDot" style="display: ${isDotVisible ? 'block' : 'none'};"></span>
        `;

        messagesButton.title = "Go to homepage";
        messagesButton.setAttribute("aria-label", "Go to homepage");
    } else {
        messagesButton.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"></path>
            </svg>
            <span class="message-notification-dot" id="messageNotificationDot" style="display: ${isDotVisible ? 'block' : 'none'};"></span>
        `;

        messagesButton.title = "Messages";
        messagesButton.setAttribute("aria-label", "Open messages");
    }
}



// START CONVERSATION WITH SELLER


messageSellerButton.addEventListener("click", async function () {
    const user = auth.currentUser;

    if (!user || !user.emailVerified) {
        alert("Please log in with your verified account first.");
        showPage(accountPage);
        return;
    }

    if (!selectedProduct || !selectedProduct.id) {
        alert("Product information not found.");
        return;
    }

    if (selectedProduct.sellerId === user.uid) {
        alert("You cannot message yourself!");
        return;
    }

    try {
        messageSellerButton.disabled = true;
        messageSellerButton.textContent = "Opening chat...";

        const conversationsRef = collection(db, "conversations");

        // First check for older conversations created with random IDs
        const existingQuery = query(
            conversationsRef,
            where("buyerId", "==", user.uid),
            where("sellerId", "==", selectedProduct.sellerId),
            where("productId", "==", selectedProduct.id)
        );

        const existingSnapshot = await getDocs(existingQuery);

        let conversationId;
        let conversationData;

        if (!existingSnapshot.empty) {

            // Prefer the existing conversation that already has messages
            const existingDocs = existingSnapshot.docs;

            existingDocs.sort(function (a, b) {
                const aHasMessage = a.data().lastMessage ? 1 : 0;
                const bHasMessage = b.data().lastMessage ? 1 : 0;
                return bHasMessage - aHasMessage;
            });

            conversationId = existingDocs[0].id;
            conversationData = {
    id: conversationId,
    ...existingDocs[0].data()
};

        
} else {

    // Generate a stable ID for this buyer, seller and product
    conversationId = [
        user.uid,
        selectedProduct.sellerId,
        selectedProduct.id
    ].join("_");

    const conversationRef = doc(
        db,
        "conversations",
        conversationId
    );

    // Create the conversation directly.
    // Existing conversations are already found by the query above.
    await setDoc(conversationRef, {
        buyerId: user.uid,
        buyerName: user.displayName || "Student",

        sellerId: selectedProduct.sellerId,
        sellerName: selectedProduct.sellerName || "Student",

        productId: selectedProduct.id,
        productTitle: selectedProduct.title,
        productImage: selectedProduct.imageUrl || "",

        lastMessage: "",
        lastSenderId: "",
        updatedAt: serverTimestamp()
    });
    conversationData = {
    id: conversationId,
    buyerId: user.uid,
    buyerName: user.displayName || "Student",
    sellerId: selectedProduct.sellerId,
    sellerName: selectedProduct.sellerName || "Student",
    productId: selectedProduct.id,
    productTitle: selectedProduct.title,
    productImage: selectedProduct.imageUrl || "",
    lastMessage: "",
    lastSenderId: ""
};
}


    showPage(messagesPage);
loadConversations();
openChat(conversationData);

    } catch (error) {
        console.error("Conversation error:", error);
        alert("Unable to open conversation. Please try again.");
    } finally {
        messageSellerButton.disabled = false;
        messageSellerButton.textContent = "Message Seller";
    }
});


// LOAD USER CONVERSATIONS

let unsubscribeConversations = null;

function loadConversations() {
    const user = auth.currentUser;

    if (!user || !user.emailVerified) {
        alert("Please log in first.");
        showPage(accountPage);
        return;
    }

    if (unsubscribeConversations) {
        unsubscribeConversations();
    }

    showPage(messagesPage);

    const conversationsQuery = query(
        collection(db, "conversations"),
        where("buyerId", "==", user.uid)
    );

    const sellerQuery = query(
        collection(db, "conversations"),
        where("sellerId", "==", user.uid)
    );

    const conversationsList = document.getElementById("conversationsList");

    let buyerConversations = [];
    let sellerConversations = [];

   

function displayConversations() {
    const allConversations = [
        ...buyerConversations,
        ...sellerConversations
    ];

    // Remove duplicate conversations
    const uniqueConversations = new Map();

    allConversations.forEach(function (conversation) {
        const key = [
            conversation.buyerId,
            conversation.sellerId,
            conversation.productId
        ].join("_");

        const existing = uniqueConversations.get(key);

        if (!existing) {
            uniqueConversations.set(key, conversation);
        } else {
            const existingTime = existing.updatedAt?.toMillis?.() || 0;
            const newTime = conversation.updatedAt?.toMillis?.() || 0;

            if (newTime > existingTime) {
                uniqueConversations.set(key, conversation);
            }
        }
    });

    const displayedConversations =
        Array.from(uniqueConversations.values());

    conversationsList.innerHTML = "";

    if (displayedConversations.length === 0) {
        conversationsList.textContent = "No conversations yet.";
        return;
    }

    displayedConversations.sort(function (a, b) {
        const timeA = a.updatedAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || 0;
        return timeB - timeA;
    });

    const currentUser = auth.currentUser;
    if (!currentUser) return;

    displayedConversations.forEach(function (conversation) {
        const card = document.createElement("div");
        card.className = "conversation-card";

        const otherPersonName = conversation.buyerId === currentUser.uid
            ? (conversation.sellerName || "Student")
            : (conversation.buyerName || "Student");

        const avatar = document.createElement("div");
        avatar.className = "conversation-avatar";
        avatar.textContent = otherPersonName.charAt(0).toUpperCase();

        const details = document.createElement("div");
        details.className = "conversation-details";

        const title = document.createElement("h3");
        title.textContent = otherPersonName;

        const lastMessage = document.createElement("p");
        lastMessage.textContent = conversation.lastMessage
            ? conversation.productTitle + " · " + conversation.lastMessage
            : conversation.productTitle + " · Start a conversation";

        details.append(title, lastMessage);
        card.append(avatar, details);

        // Check whether this conversation has an unread message
        const readField = conversation.buyerId === currentUser.uid
            ? "buyerLastReadAt"
            : "sellerLastReadAt";

        const lastReadTime =
            conversation[readField]?.toMillis?.() || 0;

        const lastMessageTime =
            conversation.updatedAt?.toMillis?.() || 0;

        const hasUnreadMessage =
            conversation.lastSenderId &&
            conversation.lastSenderId !== currentUser.uid &&
            lastMessageTime > lastReadTime;

        if (hasUnreadMessage) {
            const dot = document.createElement("span");
            dot.className = "unread-dot";
            card.appendChild(dot);
        }

        card.addEventListener("click", function () {
            openChat(conversation);
        });

        conversationsList.appendChild(card);
    });

    const conversationSearch = document.getElementById("conversationSearch");
    if (conversationSearch && !conversationSearch.dataset.bound) {
        conversationSearch.dataset.bound = "true";
        conversationSearch.addEventListener("input", function () {
            const query = this.value.trim().toLowerCase();
            const cards = conversationsList.querySelectorAll(".conversation-card");
            cards.forEach(card => {
                const matches = card.textContent.toLowerCase().includes(query);
                card.style.display = matches ? "flex" : "none";
            });
        });
    }
}



    let buyerLoaded = false;
    let sellerLoaded = false;

    const stopBuyer = onSnapshot(conversationsQuery, function (snapshot) {
        buyerConversations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        buyerLoaded = true;
        if (buyerLoaded && sellerLoaded) displayConversations();
    });

    const stopSeller = onSnapshot(sellerQuery, function (snapshot) {
        sellerConversations = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        sellerLoaded = true;
        if (buyerLoaded && sellerLoaded) displayConversations();
    });

    unsubscribeConversations = function () {
        stopBuyer();
        stopSeller();
    };
}


// OPEN AN INDIVIDUAL CHAT

let activeConversation = null;
let unsubscribeMessages = null;

function openChat(conversation) {
    const user = auth.currentUser;


    if (!user || !user.emailVerified) {
        alert("Please log in first.");
        showPage(accountPage);
        return;
    }

    // Stop listening to the previously opened chat
    if (unsubscribeMessages) {
        unsubscribeMessages();
        unsubscribeMessages = null;
    }

    activeConversation = conversation;

    // Mark this conversation as read
const readField = conversation.buyerId === user.uid
    ? "buyerLastReadAt"
    : "sellerLastReadAt";

updateDoc(doc(db, "conversations", conversation.id), {
    [readField]: serverTimestamp()
}).catch(error => {
    console.error("Could not update read status:", error);
});

    const chatEmptyState = document.getElementById("chatEmptyState");
    const activeChat = document.getElementById("activeChat");
    const chatMessages = document.getElementById("chatMessages");
    const messagingLayout = document.querySelector(".messaging-layout");

    chatEmptyState.classList.add("hidden");
    activeChat.classList.remove("hidden");

    // Identify the other participant
    // Identify the other participant
const isBuyer = conversation.buyerId === user.uid;

const otherPerson = isBuyer
    ? (conversation.sellerName || "Student")
    : (conversation.buyerName || "Student");

document.getElementById("chatUserName").textContent = otherPerson;

document.getElementById("chatAvatar").textContent =
    otherPerson.charAt(0).toUpperCase();

    document.getElementById("chatProductName").textContent =
        "Regarding: " + conversation.productTitle;

    document.getElementById("chatProductTitle").textContent =
        conversation.productTitle;

    const productImage = document.getElementById("chatProductImage");

    if (conversation.productImage) {
        productImage.src = conversation.productImage;
        productImage.style.display = "block";
    } else {
        productImage.style.display = "none";
    }

    // Show chat on mobile
    messagingLayout.classList.add("chat-open");

    // Listen for messages in real time
    const messagesCollection = collection(
        db,
        "conversations",
        conversation.id,
        "messages"
    );

    unsubscribeMessages = onSnapshot(
        messagesCollection,
        function (snapshot) {

            chatMessages.innerHTML = "";

            const messages = snapshot.docs.map(function (messageDoc) {
                return {
                    id: messageDoc.id,
                    ...messageDoc.data()
                };
            });

            messages.sort(function (a, b) {
                const timeA = a.createdAt?.toMillis?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return timeA - timeB;
            });

            messages.forEach(function (message) {

                const bubble = document.createElement("div");

                bubble.className = message.senderId === user.uid
                    ? "message-bubble message-sent"
                    : "message-bubble message-received";

                const messageText = document.createElement("span");
                messageText.textContent = message.text;

                bubble.appendChild(messageText);

            
if (message.createdAt) {
    const time = document.createElement("span");
    time.className = "message-time";

    const messageDate = message.createdAt.toDate();
    const today = new Date();

    const isToday =
        messageDate.toDateString() === today.toDateString();

    const timeText = messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    const dateText = isToday
        ? ""
        : messageDate.toLocaleDateString([], {
            day: "numeric",
            month: "short"
        });

    time.textContent = dateText
        ? `${dateText}, ${timeText}`
        : timeText;

    bubble.appendChild(time);
}
   

                chatMessages.appendChild(bubble);
            });

            chatMessages.scrollTop = chatMessages.scrollHeight;

        },
        function (error) {
            console.error("Message loading error:", error);
            chatMessages.textContent =
                "Unable to load messages. Please try again.";
        }
    );
}



// SEND MESSAGE

const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const sendMessageButton = document.getElementById("sendMessageButton");

messageForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const user = auth.currentUser;
    const messageText = messageInput.value.trim();

    if (!user || !user.emailVerified) {
        alert("Please log in first.");
        return;
    }

    if (!activeConversation) {
    alert("Please open a conversation first.");
    return;
}

// Verify that the user belongs to this conversation
if (
    activeConversation.buyerId !== user.uid &&
    activeConversation.sellerId !== user.uid
) {
    alert("You are not authorized to send messages here.");
    return;
}

// Prevent empty messages
if (!messageText) {
    return;
}

// Enforce the 2,000-character limit
if (messageText.length > 2000) {
    alert("Messages cannot exceed 2,000 characters.");
    return;
}

    try {
        sendMessageButton.disabled = true;

        const messagesCollection = collection(
            db,
            "conversations",
            activeConversation.id,
            "messages"
        );

        const newMessage = await addDoc(messagesCollection, {
    senderId: user.uid,
    text: messageText,
    createdAt: serverTimestamp()
});

// Clear input immediately after the message is saved
messageInput.value = "";

// Update the conversation preview separately
try {
    await updateDoc(
        doc(db, "conversations", activeConversation.id),
        {
            lastMessage: messageText,
            lastSenderId: user.uid,
            updatedAt: serverTimestamp()
        }
    );
} catch (previewError) {
    console.error("Message sent, but preview update failed:", previewError);
}

        messageInput.value = "";

    } catch (error) {
        console.error("Send message error:", error);
        alert("Unable to send message. Please try again.");
    } finally {
        sendMessageButton.disabled = false;
        messageInput.focus();
    }
});



// ========================================
// MY ACCOUNT DASHBOARD (PERSONAL SETTINGS & BUYER ACTIVITY)
// ========================================

const accountTabs = [
    { button: "overviewTab", content: "accountOverview" },
    { button: "profileSettingsTab", content: "accountProfileSettings" },
    { button: "purchaseHistoryTab", content: "accountPurchaseHistory" },
    { button: "accountRequestsTab", content: "accountMyRequests" }
];

accountTabs.forEach(function (tab) {
    const btn = document.getElementById(tab.button);
    if (!btn) return;
    btn.addEventListener("click", async function () {
        accountTabs.forEach(function (item) {
            const contentEl = document.getElementById(item.content);
            const btnEl = document.getElementById(item.button);
            if (contentEl) contentEl.classList.add("hidden");
            if (btnEl) btnEl.classList.remove("active");
        });

        const activeContent = document.getElementById(tab.content);
        if (activeContent) activeContent.classList.remove("hidden");
        btn.classList.add("active");

        await loadAccountDashboard();
    });
});

// Route seller tabs and links from My Account directly to central Seller Dashboard
const accountSellerTabRoutes = [
    { button: "accountGoToSellerButton", target: "sellerTabOverview" },
    { button: "accountOverviewSellerBtn", target: "sellerTabOverview" },
    { button: "accountListingsTab", target: "sellerTabListings" },
    { button: "accountIncomingTab", target: "sellerTabRequests" },
    { button: "salesHistoryTab", target: "sellerTabSales" }
];

accountSellerTabRoutes.forEach(route => {
    const btn = document.getElementById(route.button);
    if (btn) {
        btn.addEventListener("click", function () {
            openSellerDashboardTab(route.target);
        });
    }
});


// LOAD COMPLETE ACCOUNT DASHBOARD

async function loadAccountDashboard() {
    const user = auth.currentUser;
    if (!user || !user.emailVerified) return;

    markBuyerNotificationsAsRead();

    const listingsBox = document.getElementById("accountListingsContent");
    const requestsBox = document.getElementById("accountRequestsContent");
    const purchasesBox = document.getElementById("accountPurchasesContent");
    const salesBox = document.getElementById("accountSalesContent");
    const incomingBox = document.getElementById("accountIncomingRequestsList");

    try {
        const [listings, requests, incomingRequests] = await Promise.all([
            getDocs(query(
                collection(db, "products"),
                where("sellerId", "==", user.uid)
            )),
            getDocs(query(
                collection(db, "requests"),
                where("buyerId", "==", user.uid)
            )),
            getDocs(query(
                collection(db, "requests"),
                where("sellerId", "==", user.uid)
            ))
        ]);

        // UPDATE COUNTS
        const listingsCountEl = document.getElementById("accountListingsCount");
        if (listingsCountEl) listingsCountEl.textContent = listings.size;

        const requestsCountEl = document.getElementById("accountRequestsCount");
        if (requestsCountEl) requestsCountEl.textContent = requests.size;

        const incomingCountEl = document.getElementById("accountIncomingRequestsCount");
        if (incomingCountEl) incomingCountEl.textContent = incomingRequests.size;

        // PURCHASE HISTORY & SALES HISTORY (Priority 8)
        const completedRequests = requests.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(request => request.status === "Completed");

        const completedSales = incomingRequests.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(request => request.status === "Completed");

        const purchasesCountEl = document.getElementById("accountPurchasesCount");
        if (purchasesCountEl) purchasesCountEl.textContent = completedRequests.length;

        const salesCountEl = document.getElementById("accountSalesCount");
        if (salesCountEl) salesCountEl.textContent = completedSales.length;

        // 1. INCOMING SELLER REQUESTS ON OVERVIEW
        if (incomingBox) {
            incomingBox.innerHTML = "";
            const activeIncoming = incomingRequests.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(r => r.status === "Pending" || r.status === "Accepted");

            if (activeIncoming.length === 0) {
                incomingBox.innerHTML = `<p class="account-empty-inline">No pending incoming requests from buyers right now.</p>`;
            } else {
                const incomingList = document.createElement("div");
                incomingList.className = "account-items-grid";

                activeIncoming.forEach(function (req) {
                    const card = document.createElement("div");
                    card.className = "account-item-card";

                    const details = document.createElement("div");
                    details.className = "account-item-details";

                    const title = document.createElement("h4");
                    title.className = "account-item-title";
                    title.textContent = req.productTitle || "Untitled product";

                    const meta = document.createElement("div");
                    meta.className = "account-item-meta";

                    const buyerInfo = document.createElement("span");
                    buyerInfo.textContent = `Buyer: ${req.buyerName || "Student"} (${req.buyerEmail || ""})`;

                    const priceInfo = document.createElement("span");
                    priceInfo.className = "account-item-price";
                    priceInfo.textContent = `₹${req.productPrice || 0}`;

                    const typeBadge = document.createElement("span");
                    typeBadge.className = `cart-type-badge ${req.productType === "Rent" ? "rent" : "sale"}`;
                    typeBadge.textContent = req.productType === "Rent" ? "Rental" : "Purchase";

                    const statusBadge = document.createElement("span");
                    statusBadge.className = `request-status status-${(req.status || "pending").toLowerCase()}`;
                    statusBadge.textContent = req.status || "Pending";

                    meta.append(buyerInfo, priceInfo, typeBadge, statusBadge);
                    details.append(title, meta);

                    if (req.productType === "Rent") {
                        const rentalDetails = createRentalDetailsElement(req);
                        if (rentalDetails) details.appendChild(rentalDetails);
                    }

                    // Actions: Accept / Decline / Mark Completed
                    const actions = document.createElement("div");
                    actions.className = "account-item-actions";

                    if (req.status === "Pending") {
                        const acceptBtn = document.createElement("button");
                        acceptBtn.className = "primary-button";
                        acceptBtn.textContent = "Accept";
                        acceptBtn.addEventListener("click", async function () {
                            await respondToRequest(req.id, "Accepted");
                            await loadAccountDashboard();
                        });

                        const declineBtn = document.createElement("button");
                        declineBtn.className = "secondary-button";
                        declineBtn.textContent = "Decline";
                        declineBtn.addEventListener("click", async function () {
                            await respondToRequest(req.id, "Declined");
                            await loadAccountDashboard();
                        });

                        actions.append(acceptBtn, declineBtn);
                    } else if (req.status === "Accepted") {
                        const completeBtn = document.createElement("button");
                        completeBtn.className = "primary-button";
                        completeBtn.textContent = "Mark as Completed";
                        completeBtn.addEventListener("click", async function () {
                            await respondToRequest(req.id, "Completed");
                            await loadAccountDashboard();
                        });
                        actions.appendChild(completeBtn);
                    }

                    // Message Buyer button
                    const msgBtn = document.createElement("button");
                    msgBtn.className = "secondary-button";
                    msgBtn.textContent = "Message Buyer";
                    msgBtn.addEventListener("click", function () {
                        openConversationWithBuyer(req);
                    });
                    actions.appendChild(msgBtn);

                    card.append(details, actions);
                    incomingList.appendChild(card);
                });

                incomingBox.appendChild(incomingList);
            }
        }

        // INCOMING REQUESTS TAB CONTENT (Priority 7)
        const incomingTabList = document.getElementById("accountIncomingTabList");
        if (incomingTabList) {
            incomingTabList.innerHTML = "";
            const allSellerReqs = incomingRequests.docs.map(d => ({ id: d.id, ...d.data() }));
            if (allSellerReqs.length === 0) {
                incomingTabList.innerHTML = `<p class="account-empty-inline">You have not received any requests from buyers yet.</p>`;
            } else {
                allSellerReqs.forEach(req => {
                    incomingTabList.appendChild(createSellerRequestCard(req));
                });
            }
        }

        // 2. PURCHASE HISTORY (BUYER - Priority 8)
        if (purchasesBox) {
            purchasesBox.innerHTML = "";
            if (completedRequests.length === 0) {
                purchasesBox.innerHTML = `
                    <div class="account-empty-state">
                        <h3>No completed purchases yet</h3>
                        <p>When sellers accept and complete transactions with you, they will appear here.</p>
                        <button class="primary-button" id="purchasesExploreBtn">Explore Marketplace</button>
                    </div>
                `;
                const btn = document.getElementById("purchasesExploreBtn");
                if (btn) btn.addEventListener("click", openMarketplace);
            } else {
                const purchasesGrid = document.createElement("div");
                purchasesGrid.className = "account-items-grid";

                completedRequests.forEach(function (request) {
                    const card = document.createElement("div");
                    card.className = "account-item-card";

                    if (request.productImage) {
                        const img = document.createElement("img");
                        img.src = request.productImage;
                        img.alt = request.productTitle || "Product";
                        img.className = "account-item-image";
                        card.appendChild(img);
                    } else {
                        const placeholder = document.createElement("div");
                        placeholder.className = "account-item-placeholder";
                        placeholder.textContent = "Thriftly";
                        card.appendChild(placeholder);
                    }

                    const details = document.createElement("div");
                    details.className = "account-item-details";

                    const title = document.createElement("h4");
                    title.className = "account-item-title";
                    title.textContent = request.productTitle || "Untitled product";

                    const meta = document.createElement("div");
                    meta.className = "account-item-meta";

                    const seller = document.createElement("span");
                    seller.textContent = `Seller: ${request.sellerName || "Student"}`;

                    const price = document.createElement("span");
                    price.className = "account-item-price";
                    const amount = request.totalPrice || request.productPrice || 0;
                    price.textContent = `₹${amount}`;

                    const typeBadge = document.createElement("span");
                    typeBadge.className = `cart-type-badge ${request.productType === "Rent" ? "rent" : "sale"}`;
                    typeBadge.textContent = request.productType === "Rent" ? "Rental" : "Purchase";

                    const status = document.createElement("span");
                    status.className = "request-status status-completed";
                    status.textContent = "Completed";

                    const completedDate = document.createElement("span");
                    completedDate.className = "account-item-date";
                    completedDate.textContent = `Completed: ${formatRequestDate(request.completedAt || request.updatedAt || request.respondedAt || request.createdAt)}`;

                    meta.append(seller, price, typeBadge, status, completedDate);
                    details.append(title, meta);

                    if (request.productType === "Rent") {
                        const rentalDetails = createRentalDetailsElement(request);
                        if (rentalDetails) details.appendChild(rentalDetails);
                    }

                    const actions = document.createElement("div");
                    actions.className = "account-item-actions";

                    const msgSellerBtn = document.createElement("button");
                    msgSellerBtn.className = "secondary-button";
                    msgSellerBtn.textContent = "Message Seller";
                    msgSellerBtn.addEventListener("click", function () {
                        openConversationWithSeller(request);
                    });
                    actions.appendChild(msgSellerBtn);

                    card.append(details, actions);
                    purchasesGrid.appendChild(card);
                });

                purchasesBox.appendChild(purchasesGrid);
            }
        }

        // 2B. SALES HISTORY (SELLER - Priority 8)
        if (salesBox) {
            salesBox.innerHTML = "";
            if (completedSales.length === 0) {
                salesBox.innerHTML = `
                    <div class="account-empty-state">
                        <h3>No completed sales yet</h3>
                        <p>When you complete sales or rentals with buyers, your transaction history will appear here.</p>
                        <button class="primary-button" id="salesCreateBtn">List an Item</button>
                    </div>
                `;
                const btn = document.getElementById("salesCreateBtn");
                if (btn) btn.addEventListener("click", openSellingPage);
            } else {
                const salesGrid = document.createElement("div");
                salesGrid.className = "account-items-grid";

                completedSales.forEach(function (request) {
                    const card = document.createElement("div");
                    card.className = "account-item-card";

                    if (request.productImage) {
                        const img = document.createElement("img");
                        img.src = request.productImage;
                        img.alt = request.productTitle || "Product";
                        img.className = "account-item-image";
                        card.appendChild(img);
                    } else {
                        const placeholder = document.createElement("div");
                        placeholder.className = "account-item-placeholder";
                        placeholder.textContent = "Thriftly";
                        card.appendChild(placeholder);
                    }

                    const details = document.createElement("div");
                    details.className = "account-item-details";

                    const title = document.createElement("h4");
                    title.className = "account-item-title";
                    title.textContent = request.productTitle || "Untitled product";

                    const meta = document.createElement("div");
                    meta.className = "account-item-meta";

                    const buyer = document.createElement("span");
                    buyer.textContent = `Buyer: ${request.buyerName || "Student"}`;

                    const price = document.createElement("span");
                    price.className = "account-item-price";
                    const amount = request.totalPrice || request.productPrice || 0;
                    price.textContent = `₹${amount}`;

                    const typeBadge = document.createElement("span");
                    typeBadge.className = `cart-type-badge ${request.productType === "Rent" ? "rent" : "sale"}`;
                    typeBadge.textContent = request.productType === "Rent" ? "Rental" : "Sale";

                    const status = document.createElement("span");
                    status.className = "request-status status-completed";
                    status.textContent = "Completed";

                    const completedDate = document.createElement("span");
                    completedDate.className = "account-item-date";
                    completedDate.textContent = `Completed: ${formatRequestDate(request.completedAt || request.updatedAt || request.respondedAt || request.createdAt)}`;

                    meta.append(buyer, price, typeBadge, status, completedDate);
                    details.append(title, meta);

                    if (request.productType === "Rent") {
                        const rentalDetails = createRentalDetailsElement(request);
                        if (rentalDetails) details.appendChild(rentalDetails);
                    }

                    const actions = document.createElement("div");
                    actions.className = "account-item-actions";

                    const msgBuyerBtn = document.createElement("button");
                    msgBuyerBtn.className = "secondary-button";
                    msgBuyerBtn.textContent = "Message Buyer";
                    msgBuyerBtn.addEventListener("click", function () {
                        openConversationWithBuyer(request);
                    });
                    actions.appendChild(msgBuyerBtn);

                    card.append(details, actions);
                    salesGrid.appendChild(card);
                });

                salesBox.appendChild(salesGrid);
            }
        }

        // 3. MY LISTINGS
        if (listingsBox) {
            listingsBox.innerHTML = "";
            if (listings.empty) {
                listingsBox.innerHTML = `
                    <div class="account-empty-state">
                        <h3>You haven't listed any items yet</h3>
                        <p>Give your textbooks, calculators, and essentials a second life on campus.</p>
                        <button class="primary-button" id="listingsCreateBtn">List an Item</button>
                    </div>
                `;
                const btn = document.getElementById("listingsCreateBtn");
                if (btn) btn.addEventListener("click", openSellingPage);
            } else {
                const listingsGrid = document.createElement("div");
                listingsGrid.className = "account-items-grid";

                listings.forEach(function (productDoc) {
                    const product = productDoc.data();
                    const card = document.createElement("div");
                    card.className = "account-item-card";

                    if (product.imageUrl) {
                        const img = document.createElement("img");
                        img.src = product.imageUrl;
                        img.alt = product.title || "Product";
                        img.className = "account-item-image";
                        card.appendChild(img);
                    }

                    const details = document.createElement("div");
                    details.className = "account-item-details";

                    const title = document.createElement("h4");
                    title.className = "account-item-title";
                    title.textContent = product.title || "Untitled product";

                    const meta = document.createElement("div");
                    meta.className = "account-item-meta";

                    const price = document.createElement("span");
                    price.className = "account-item-price";
                    price.textContent = formatPrice(product);

                    const condition = document.createElement("span");
                    condition.textContent = product.condition || "Good";

                    const status = document.createElement("span");
                    const st = (product.status || "Available").toLowerCase();
                    status.className = `request-status status-${st === "available" ? "completed" : "pending"}`;
                    status.textContent = product.status || "Available";

                    meta.append(price, condition, status);
                    details.append(title, meta);

                    const actions = document.createElement("div");
                    actions.className = "account-item-actions";

                    const deleteButton = document.createElement("button");
                    deleteButton.className = "secondary-button";
                    deleteButton.textContent = "Delete Listing";

                    deleteButton.addEventListener("click", async function () {
                        if (!confirm("Are you sure you want to delete this listing?")) {
                            return;
                        }
                        try {
                            await deleteDoc(doc(db, "products", productDoc.id));
                            await loadAccountDashboard();
                            alert("Listing deleted successfully!");
                        } catch (error) {
                            console.error("Delete listing error:", error);
                            alert("Unable to delete listing.");
                        }
                    });

                    actions.appendChild(deleteButton);
                    card.append(details, actions);
                    listingsGrid.appendChild(card);
                });

                listingsBox.appendChild(listingsGrid);
            }
        }

        // 4. MY REQUESTS
        if (requestsBox) {
            requestsBox.innerHTML = "";
            if (requests.empty) {
                requestsBox.innerHTML = `
                    <div class="account-empty-state">
                        <h3>You haven't requested any items yet</h3>
                        <p>Browse listings on Thriftly and send purchase or rental requests to sellers.</p>
                        <button class="primary-button" id="requestsExploreBtn">Explore Marketplace</button>
                    </div>
                `;
                const btn = document.getElementById("requestsExploreBtn");
                if (btn) btn.addEventListener("click", openMarketplace);
            } else {
                const requestsGrid = document.createElement("div");
                requestsGrid.className = "account-items-grid";

                requests.forEach(function (requestDoc) {
                    const request = requestDoc.data();
                    const card = document.createElement("div");
                    card.className = "account-item-card";

                    if (request.productImage) {
                        const img = document.createElement("img");
                        img.src = request.productImage;
                        img.alt = request.productTitle || "Product";
                        img.className = "account-item-image";
                        card.appendChild(img);
                    }

                    const details = document.createElement("div");
                    details.className = "account-item-details";

                    const title = document.createElement("h4");
                    title.className = "account-item-title";
                    title.textContent = request.productTitle || "Untitled product";

                    const meta = document.createElement("div");
                    meta.className = "account-item-meta";

                    const seller = document.createElement("span");
                    seller.textContent = `Seller: ${request.sellerName || "Student"}`;

                    const price = document.createElement("span");
                    price.className = "account-item-price";
                    price.textContent = `₹${request.productPrice || 0}`;

                    const typeBadge = document.createElement("span");
                    typeBadge.className = `cart-type-badge ${request.productType === "Rent" ? "rent" : "sale"}`;
                    typeBadge.textContent = request.productType === "Rent" ? "Rental" : "Purchase";

                    const status = document.createElement("span");
                    const st = (request.status || "Pending").toLowerCase();
                    status.className = `request-status status-${st}`;
                    status.textContent = request.status || "Pending";

                    meta.append(seller, price, typeBadge, status);
                    details.append(title, meta);

                    if (request.productType === "Rent") {
                        const rentalDetails = createRentalDetailsElement(request);
                        if (rentalDetails) details.appendChild(rentalDetails);
                    }

                    const actions = document.createElement("div");
                    actions.className = "account-item-actions";

                    // Cancel button for pending requests
                    if (request.status === "Pending") {
                        const cancelBtn = document.createElement("button");
                        cancelBtn.className = "secondary-button";
                        cancelBtn.textContent = "Cancel Request";
                        cancelBtn.addEventListener("click", async function () {
                            if (!confirm("Are you sure you want to cancel this request?")) return;
                            try {
                                await updateDoc(requestDoc.ref, {
                                    status: "Cancelled",
                                    cancelledAt: serverTimestamp()
                                });
                                await loadAccountDashboard();
                                alert("Your request has been cancelled.");
                            } catch (err) {
                                console.error("Cancel request error:", err);
                                alert("Could not cancel request. Please try again.");
                            }
                        });
                        actions.appendChild(cancelBtn);
                    }

                    // Message Seller button
                    const msgBtn = document.createElement("button");
                    msgBtn.className = "secondary-button";
                    msgBtn.textContent = "Message Seller";
                    msgBtn.addEventListener("click", function () {
                        openConversationWithSeller(request);
                    });
                    actions.appendChild(msgBtn);

                    card.append(details, actions);
                    requestsGrid.appendChild(card);
                });

                requestsBox.appendChild(requestsGrid);
            }
        }

        // 5. RECENT ACTIVITY
        const activity = document.getElementById("accountRecentActivity");
        if (activity) {
            activity.innerHTML = "";
            if (listings.empty && requests.empty && incomingRequests.empty) {
                activity.innerHTML = "<p>No recent activity yet.</p>";
            } else {
                const lines = [];
                if (listings.size > 0) lines.push(`You currently have <strong>${listings.size}</strong> listed product(s).`);
                if (incomingRequests.size > 0) lines.push(`You have received <strong>${incomingRequests.size}</strong> incoming buyer request(s).`);
                if (requests.size > 0) lines.push(`You have made <strong>${requests.size}</strong> product request(s).`);
                if (completedRequests.length > 0) lines.push(`You have completed <strong>${completedRequests.length}</strong> purchase(s).`);
                if (completedSales.length > 0) lines.push(`You have completed <strong>${completedSales.length}</strong> sale/rental transaction(s).`);

                activity.innerHTML = lines.map(l => `<p style="margin-bottom: 6px;">• ${l}</p>`).join("");
            }
        }

        // 6. PROFILE SETTINGS
        loadProfileSettings();

    } catch (error) {
        console.error("Account dashboard error:", error);
        if (listingsBox) listingsBox.textContent = "Unable to load your listings.";
        if (requestsBox) requestsBox.textContent = "Unable to load your requests.";
        if (purchasesBox) purchasesBox.textContent = "Unable to load your purchase history.";
        if (salesBox) salesBox.textContent = "Unable to load your sales history.";
    }
}


// PROFILE SETTINGS

function loadProfileSettings() {
    const user = auth.currentUser;
    if (!user) return;

    const container = document.getElementById("profileSettingsContent");
    if (!container) return;
    container.innerHTML = "";

    const form = document.createElement("form");
    form.className = "profile-settings-form";

    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Full name";
    nameLabel.setAttribute("for", "settingsFullName");

    const nameInput = document.createElement("input");
    nameInput.id = "settingsFullName";
    nameInput.type = "text";
    nameInput.value = user.displayName || "";
    nameInput.required = true;

    const emailLabel = document.createElement("label");
    emailLabel.textContent = "Verified College Email";
    emailLabel.setAttribute("for", "settingsEmail");

    const emailInput = document.createElement("input");
    emailInput.id = "settingsEmail";
    emailInput.type = "email";
    emailInput.value = user.email || "";
    emailInput.disabled = true;

    const note = document.createElement("small");
    note.textContent = "Your college email address is verified and cannot be changed.";

    const message = document.createElement("p");
    message.className = "profile-settings-message";

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "primary-button";
    saveButton.textContent = "Save Changes";

    form.append(
        nameLabel,
        nameInput,
        emailLabel,
        emailInput,
        note,
        message,
        saveButton
    );

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const newName = nameInput.value.trim();

        if (!newName) {
            message.className = "profile-settings-message error";
            message.textContent = "Please enter your name.";
            return;
        }

        try {
            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            await updateProfile(user, {
                displayName: newName
            });

            document.getElementById("navUserName").textContent = newName;
            document.getElementById("navUserAvatar").textContent =
                newName.charAt(0).toUpperCase();

            document.getElementById("profileName").textContent = newName;
            document.getElementById("profileAvatar").textContent =
                newName.charAt(0).toUpperCase();

            message.className = "profile-settings-message success";
            message.textContent = "Profile updated successfully!";

        } catch (error) {
            console.error("Profile update error:", error);
            message.className = "profile-settings-message error";
            message.textContent = "Unable to update your profile.";
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save Changes";
        }
    });

    container.appendChild(form);
}
