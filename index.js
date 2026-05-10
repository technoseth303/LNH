speed = 10000;
document.getElementById("settings_button").addEventListener("click", () => {
    document.getElementById("settings").showModal();
});
speed_input = document.getElementById("speed_slider");
speed_input.oninput = function () {
    speed = 10 ** this.value;
    document.getElementById("speed_display").innerText = secondsToString(speed);
};

function secondsToString(seconds) {
    const numyears = Math.floor(seconds / 31536000);
    const numdays = Math.floor((seconds % 31536000) / 86400);
    const numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
    const numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
    const numseconds = (((seconds % 31536000) % 86400) % 3600) % 60;
    return `${numyears} years ${numdays} days ${numhours} hours ${numminutes} minutes ${numseconds} seconds`;
}

function set_checkboxes(node, state) {
    const container = document.getElementById(node);
    for (const checkbox of container.querySelectorAll("input[type=checkbox]")) {
        checkbox.checked = state;
    }
}

async function asyncPool(array, poolSize) {
    const result = [];
    const pool = [];

    function leavePool(e) {
        pool.splice(pool.indexOf(e), 1);
    }

    for (const item of array) {
        const p = Promise.resolve(item());
        result.push(p);
        const e = p.then(() => leavePool(e));
        pool.push(e);
        if (pool.length >= poolSize) await Promise.race(pool);
    }
    return Promise.all(result);
}

class task_completer {
    constructor(token, task, ietf) {
        this.token = token;
        this.task = task;

        this.mode = this.get_task_type();
        this.to_language = ietf;

        this.homework_id = task.base[0];
        this.catalog_uid = task.catalog_uid ?? task.base[task.base.length - 1];
        this.rel_module_uid = task.rel_module_uid;
        this.game_uid = task.game_uid;
        this.game_type = task.type;
    }

    async complete() {
        const answers = await this.get_data();
        await this.send_answers(answers);
    }

    async get_data() {
        if (this.mode === "sentence") return await this.get_sentences();
        if (this.mode === "verbs") return await this.get_verbs();
        if (this.mode === "phonics") return await this.get_phonics();
        if (this.mode === "exam") return await this.get_exam();
        return await this.get_vocabs();
    }

    async send_answers(vocabs) {
        if (!vocabs || vocabs.length === 0) return;

        const data = {
            moduleUid: this.catalog_uid,
            gameUid: this.game_uid,
            gameType: this.game_type,
            isTest: true,
            toietf: this.to_language,
            fromietf: "en-US",
            score: vocabs.length * 200,
            correctVocabs: vocabs.map(x => x.uid).join(","),
            incorrectVocabs: [],
            homeworkUid: this.homework_id,
            isSentence: this.mode === "sentence",
            isVerb: this.mode === "verbs",
            verbUid: this.mode === "verbs" ? this.catalog_uid : "",
            phonicUid: this.mode === "phonics" ? this.catalog_uid : "",
            sentenceScreenUid: this.mode === "sentence" ? 100 : "",
            sentenceCatalogUid: this.mode === "sentence" ? this.catalog_uid : "",
            grammarCatalogUid: this.catalog_uid,
            isExam: this.mode === "exam",
            timeStamp: Math.floor(speed + ((Math.random() - 0.5) / 10) * speed) * 1000,
            vocabNumber: vocabs.length,
            rel_module_uid: this.task.rel_module_uid,
            dontStoreStats: true,
            product: "secondary",
            token: this.token,
        };

        return await this.call_lnut("gameDataController/addGameScore", data);
    }

    async get_verbs() {
        return (await this.call_lnut("verbTranslationController/getVerbTranslations", {
            verbUid: this.catalog_uid,
            toLanguage: this.to_language,
            fromLanguage: "en-US",
            token: this.token,
        })).verbTranslations;
    }

    async get_phonics() {
        return (await this.call_lnut("phonicsController/getPhonicsData", {
            phonicCatalogUid: this.catalog_uid,
            toLanguage: this.to_language,
            fromLanguage: "en-US",
            token: this.token,
        })).phonics;
    }

    async get_sentences() {
        return (await this.call_lnut("sentenceTranslationController/getSentenceTranslations", {
            catalogUid: this.catalog_uid,
            toLanguage: this.to_language,
            fromLanguage: "en-US",
            token: this.token,
        })).sentenceTranslations;
    }

    async get_exam() {
        return (await this.call_lnut("examTranslationController/getExamTranslationsCorrect", {
            gameUid: this.game_uid,
            examUid: this.catalog_uid,
            toLanguage: this.to_language,
            fromLanguage: "en-US",
            token: this.token,
        })).examTranslations;
    }

    async get_vocabs() {
        return (await this.call_lnut("vocabTranslationController/getVocabTranslations", {
            "catalogUid[]": this.catalog_uid,
            toLanguage: this.to_language,
            fromLanguage: "en-US",
            token: this.token,
        })).vocabTranslations;
    }

    async call_lnut(url, data) {
        const response = await fetch(`https://api.languagenut.com/${url}?${new URLSearchParams(data)}`);
        return await response.json();
    }

    get_task_type() {
        if (this.task.gameLink.includes("sentenceCatalog")) return "sentence";
        if (this.task.gameLink.includes("verbUid")) return "verbs";
        if (this.task.gameLink.includes("phonicCatalogUid")) return "phonics";
        if (this.task.gameLink.includes("examUid")) return "exam";
        return "vocabs";
    }
}

class client_application {
    constructor() {
        this.username_box = document.getElementById("username_input");
        this.password_box = document.getElementById("password_input");
        this.module_translations = [];
        this.display_translations = [];
        this.homeworks = [];
    }

    hide_all() {
        for (const div of document.getElementsByClassName("overlay"))
            div.style.visibility = "hidden";
    }

    show_box(id) {
        document.getElementById(id).style.visibility = "visible";
    }

    async call_lnut(url, data) {
        const response = await fetch(`https://api.languagenut.com/${url}?${new URLSearchParams(data)}`);
        return await response.json();
    }

    main() {
        this.show_box("login");
        document.getElementById("login_btn").onclick = async () => {
            const response = await this.call_lnut("loginController/attemptLogin", {
                username: this.username_box.value,
                pass: this.password_box.value,
            });
            this.token = response.newToken;
            if (this.token) this.on_log_in();
        };
    }

    on_log_in() {
        this.hide_all();
        this.show_box("hw_panel");
        this.show_box("log_panel");

        document.getElementById("do_hw").onclick = () => this.do_hwks();

        this.get_module_translations();
        this.get_display_translations();
        this.display_hwks();
    }

    get_task_name(task) {
        if (task.module_translations)
            return this.module_translations[task.module_translations[0]];
        if (task.module_translation)
            return this.module_translations[task.module_translation];
        return task.verb_name;
    }

    async display_hwks() {
        const homeworks = await this.get_hwks();
        const panel = document.getElementById("hw_container");
        panel.innerHTML = "";

        this.homeworks = homeworks.homework.reverse();

        document.getElementById("selectall").onclick = function () {
            for (const c of document.getElementsByName("boxcheck"))
                c.checked = this.checked;
        };

        let hw_idx = 0;
        for (const homework of this.homeworks) {
            const hw_checkbox = document.createElement("input");
            hw_checkbox.type = "checkbox";
            hw_checkbox.name = "boxcheck";
            hw_checkbox.onclick = function () {
                set_checkboxes(this.parentNode.nextElementSibling.id, this.checked);
            };

            const hw_name = document.createElement("span");
            hw_name.innerText = homework.name;
            hw_name.style.display = "block";
            hw_name.prepend(hw_checkbox);

            const hw_display = document.createElement("div");
            hw_display.id = `hw${homework.id}`;

            let idx = 0;
            for (const task of homework.tasks) {
                const task_checkbox = document.createElement("input");
                task_checkbox.type = "checkbox";
                task_checkbox.name = "boxcheck";
                task_checkbox.id = `${hw_idx}-${idx}`;

                const task_display = document.createElement("label");
                task_display.for = task_checkbox.id;
                const percentage = task.gameResults ? task.gameResults.percentage : "-";
                task_display.innerHTML =
                    `${this.display_translations[task.translation]} - ${this.get_task_name(task)} (${percentage}%)`;

                const task_span = document.createElement("span");
                task_span.classList.add("task");
                task_span.appendChild(task_checkbox);
                task_span.appendChild(task_display);
                task_span.appendChild(document.createElement("br"));

                hw_display.appendChild(task_span);
                idx++;
            }

            panel.appendChild(hw_name);
            panel.appendChild(hw_display);
            hw_idx++;
        }
    }

    async do_hwks() {
        const checkboxes = document.querySelectorAll(".task > input[type=checkbox]:checked");
        const logs = document.getElementById("log_container");
        logs.innerHTML = `doing ${checkboxes.length} tasks...<br>`;

        const progress_bar = document.getElementById("hw_bar");
        let progress = 0;
        progress_bar.style.width = "0%";

        const funcs = [];
        let task_id = 1;

        for (const c of checkboxes) {
            const [hw_i, t_i] = c.id.split("-");
            const task = this.homeworks[hw_i].tasks[t_i];
            const task_doer = new task_completer(this.token, task, this.homeworks[hw_i].languageCode);

            funcs.push(() =>
                (async (id) => {
                    const answers = await task_doer.get_data();
                    if (!answers || answers.length === 0) return;

                    logs.innerHTML += `<b>fetched vocabs for task ${id}</b>`;
                    logs.innerHTML += `<div class="json_small">${JSON.stringify(answers)}</div>`;

                    progress++;
                    progress_bar.style.width = `${(progress / (checkboxes.length * 2)) * 100}%`;

                    const result = await task_doer.send_answers(answers);

                    logs.innerHTML += `<b>task ${id} done, scored ${result.score}</b>`;
                    logs.innerHTML += `<div class="json_small">${JSON.stringify(result)}</div>`;
                    logs.scrollTop = logs.scrollHeight;

                    progress++;
                    progress_bar.style.width = `${(progress / (checkboxes.length * 2)) * 100}%`;
                })(task_id++)
            );
        }

        asyncPool(funcs, 5).then(() => this.display_hwks());
    }

    async get_display_translations() {
        this.display_translations =
            (await this.call_lnut("publicTranslationController/getTranslations", {})).translations;
    }

    async get_module_translations() {
        this.module_translations =
            (await this.call_lnut("translationController/getUserModuleTranslations", {
                token: this.token,
            })).translations;
    }

    async get_hwks() {
        return await this.call_lnut("assignmentController/getViewableAll", {
            token: this.token,
        });
    }
}

app = new client_application();
app.main();
