import {
    getAuthStatus,
    initializeCredentials,
    login
} from "./api.js";

const form = document.getElementById("loginForm");
const loginDialog = document.getElementById("login");
const errorElement = document.getElementById("loginError");
const initializationDialog = document.getElementById("initializationDialog");
const initializationForm = document.getElementById("initializationForm");
const initializationError = document.getElementById("initializationError");
const waiting = document.getElementById("waiting");

async function checkIfCredentialsAlreadyDefine() {
    try {
        
        const status = await getAuthStatus();

        waiting.style.display = "none";
        
        // if credential is already initialized display login password
        // otherwise display password creation
        if (status.initialized)
            loginDialog.showModal();
        else
            initializationDialog.showModal();

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

    //if (password.length < 8) {
    //    initializationError.textContent = "Password must contains at least 8 characters";
    //    return;
    //}

    try {
        await initializeCredentials(password);
        initializationDialog.close();
        loginDialog.showModal();
    } catch (error) {
        initializationError.textContent = error.message;
    }

});

checkIfCredentialsAlreadyDefine();
