// --- GÜVENLİK AYARLARI ---
const GLOBAL_SITE_PASS = "Admin123"; // 1. Katman: Site Şifresi

// 2. Katman: Kullanıcı Listesi
// "ID": { name: "İsim", pass: "ÖzelŞifre" }
const authorizedUsers = {
    "9999":   { name: "Nazan Koc",         pass: "AdminNazan" },
    "371687": { name: "Habib Targaryen",   pass: "Habib123" }, // Örnek: ID şifre değildir!
    "1001":   { name: "Test User",         pass: "1234" }
};
// ------------------------

let currentQuestions = [];

function checkLogin() {
    const siteInput = document.getElementById('sitePassInput').value.trim();
    const idInput = document.getElementById('userIdInput').value.trim();
    const passInput = document.getElementById('userPassInput').value.trim();
    
    const errorMsg = document.getElementById('error-msg');
    const welcomeMsg = document.getElementById('welcome-msg');
    
    // 1. KONTROL: Site şifresi doğru mu?
    if (siteInput !== GLOBAL_SITE_PASS) {
        showError("Global Site Access Code is wrong!");
        return;
    }

    // 2. KONTROL: Kullanıcı ID var mı?
    if (!authorizedUsers[idInput]) {
        showError("User ID not found in database!");
        return;
    }

    // 3. KONTROL: Kullanıcının şifresi doğru mu?
    if (authorizedUsers[idInput].pass !== passInput) {
        showError("Wrong personal password!");
        return;
    }

    // --- HER ŞEY DOĞRUYSA ---
    const userName = authorizedUsers[idInput].name;
    
    errorMsg.style.display = 'none';
    welcomeMsg.innerText = `Access Granted. Welcome, ${userName}!`;
    welcomeMsg.style.display = 'block';

    setTimeout(() => {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('user-display').innerText = `Logged in as: ${userName} (ID: ${idInput})`;
    }, 1000);
}

function showError(message) {
    const errorMsg = document.getElementById('error-msg');
    errorMsg.innerText = message;
    errorMsg.style.display = 'block';
    document.getElementById('login-screen').classList.add('shake');
    setTimeout(() => document.getElementById('login-screen').classList.remove('shake'), 500);
}

function logout() {
    location.reload(); // Sayfayı yenile (Çıkış yapmış olur)
}

// Enter tuşu desteği (Herhangi bir kutuda enter'a basarsa giriş yapar)
document.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        // Eğer login ekranı açıksa
        if (document.getElementById('login-screen').style.display !== 'none') {
            checkLogin();
        }
    }
});

// --- SINAV SİSTEMİ ---

function generateExam(category) {
    const fileName = `questions-${category}.json`;

    fetch(fileName)
        .then(response => {
            if (!response.ok) throw new Error("File not found");
            return response.json();
        })
        .then(data => {
            const selectedQuestions = shuffleAndSelect(data, 7);
            displayExam(selectedQuestions);
        })
        .catch(error => console.error(error));
}

function shuffleAndSelect(array, count) {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

function displayExam(questions) {
    const qBox = document.getElementById('questions-box');
    const aBox = document.getElementById('answers-box');
    const qSection = document.getElementById('questions-section');
    const aSection = document.getElementById('answers-section');

    qBox.textContent = "";
    aBox.textContent = "";

    let questionText = "";
    let answerText = "";

    questions.forEach((item, index) => {
        questionText += `${index + 1}) ${item.q}\n\n`;
        answerText += `${index + 1}) ${item.a}\n\n`;
    });

    qBox.textContent = questionText;
    aBox.textContent = answerText;

    qSection.style.display = 'block';
    aSection.style.display = 'none';
}

function showAnswers() {
    document.getElementById('answers-section').style.display = 'block';
    document.getElementById('answers-section').scrollIntoView({ behavior: 'smooth' });
}

function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => alert("Copied!")).catch(err => console.error(err));
}
