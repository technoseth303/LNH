// Load users.json
async function loadUsers() {
    const response = await fetch("users.json");
    const data = await response.json();
    return data.users; // custom structure: user.users
}

// Local login logic
async function setupLocalLogin() {
    const users = await loadUsers();

    const btn = document.getElementById("local_login_btn");
    const box = document.getElementById("local_login");

    btn.onclick = () => {
        const u = document.getElementById("local_user").value;
        const p = document.getElementById("local_pass").value;

        const match = users.find(x => x.username === u && x.password === p);

        if (!match) {
            alert("Incorrect local login");
            return;
        }

        // Hide local login
        box.style.visibility = "hidden";

        // Show LN login
        document.getElementById("login").style.visibility = "visible";
    };
}

setupLocalLogin();
