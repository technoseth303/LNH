// Load user.users (custom JSON-like file)
async function loadUsers() {
    const response = await fetch("user.users");
    const data = await response.json();
    return data.users;
}

// Local login logic
async function setupLocalLogin() {
    const users = await loadUsers();

    const btn = document.getElementById("local_login_btn");

    btn.onclick = () => {
        const u = document.getElementById("local_user").value.trim();
        const p = document.getElementById("local_pass").value.trim();

        const match = users.find(x => x.username === u && x.password === p);

        if (!match) {
            alert("Incorrect local login");
            return;
        }

        alert(`Welcome, ${u}!`);
        // You can redirect or load your main app here
        // window.location.href = "main.html";
    };
}

window.addEventListener("DOMContentLoaded", setupLocalLogin);
