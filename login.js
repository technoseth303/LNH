async function loadUsers() {
    const response = await fetch("user.users");
    const data = await response.json();
    return data.users;
}

async function setupLocalLogin() {
    const users = await loadUsers();

    const btn = document.getElementById("local_login_btn");
    const box = document.getElementById("local_login");

    btn.onclick = () => {
        const u = document.getElementById("local_user").value.trim();
        const p = document.getElementById("local_pass").value.trim();

        const match = users.find(x => x.username === u && x.password === p);

        if (!match) {
            alert("Incorrect local login");
            return;
        }

        // Hide local login overlay
        box.style.visibility = "hidden";

        // Show LN login
        document.getElementById("login").style.visibility = "visible";
    };
}

window.addEventListener("DOMContentLoaded", setupLocalLogin);
