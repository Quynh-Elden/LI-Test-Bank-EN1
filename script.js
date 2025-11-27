// Soruları tutacağımız geçici hafıza
let currentQuestions = [];

function generateExam(category) {
    const fileName = `questions-${category}.json`;

    fetch(fileName)
        .then(response => {
            if (!response.ok) {
                throw new Error("File not found: " + fileName);
            }
            return response.json();
        })
        .then(data => {
            const selectedQuestions = shuffleAndSelect(data, 7);
            displayExam(selectedQuestions);
        })
        .catch(error => {
            alert("Error: " + error.message);
            console.error(error);
        });
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

    // Kutuları temizle
    qBox.innerHTML = "";
    aBox.innerHTML = "";

    let questionHtml = "";
    let answerHtml = "";

    questions.forEach((item, index) => {
        // HTML etiketi (<br>) kullanarak alt satıra geçmeyi zorunlu kılıyoruz
        questionHtml += `${index + 1}) ${item.q}<br><br>`;
        answerHtml += `${index + 1}) ${item.a}<br><br>`;
    });

    // innerHTML kullanarak HTML kodlarını işliyoruz
    qBox.innerHTML = questionHtml;
    aBox.innerHTML = answerHtml;

    qSection.style.display = 'block';
    aSection.style.display = 'none';
}

function showAnswers() {
    document.getElementById('answers-section').style.display = 'block';
    document.getElementById('answers-section').scrollIntoView({ behavior: 'smooth' });
}

function copyToClipboard(elementId) {
    // innerText kullanıyoruz ki <br> etiketlerini satır başı olarak kopyalasın
    const text = document.getElementById(elementId).innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        alert("Copied to clipboard!");
    }).catch(err => {
        console.error('Copy error:', err);
    });
}
