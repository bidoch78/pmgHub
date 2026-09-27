import {
    getAuthStatus,
    initializeCredentials,
    login
} from "./api.js";

const form = document.getElementById("loginForm");
const errorElement = document.getElementById("loginError");
const initializationDialog = document.getElementById("initializationDialog");
const initializationForm = document.getElementById("initializationForm");
const initializationError = document.getElementById("initializationError");

async function checkCredentials() {
    try {
        const status = await getAuthStatus();

        if (!status.initialized) {
            initializationDialog.showModal();
        }
    } catch (error) {
        errorElement.textContent = error.message;
    }
}

form.addEventListener("submit", async event => {
    event.preventDefault();

    errorElement.textContent = "";

    const password = document.getElementById("password").value;

    try {
        await login(password);
        window.location.href = "/";
    } catch (error) {
        errorElement.textContent = error.message;
    }
});

initializationForm.addEventListener("submit", async event => {
    event.preventDefault();
    initializationError.textContent = "";

    const password = document.getElementById("initializationPassword").value;
    const confirmation = document.getElementById("initializationConfirmation").value;

    if (password !== confirmation) {
        initializationError.textContent = "Passwords do not match";
        return;
    }

    try {
        await initializeCredentials(password);
        initializationDialog.close();
        errorElement.textContent = "Password set. You can now unlock pmgHub.";
    } catch (error) {
        initializationError.textContent = error.message;
    }
});

checkCredentials();
