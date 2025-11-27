let examData = null;
let timerInterval;
let timeLeft = 15 * 60; // 15 Dakika (Saniye cinsinden)

// Sayfa Yüklendiğinde Linki Kontrol Et
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        alert("Invalid Link! No token provided.");
        document.getElementById('btn-start').disabled = true;
        return;
    }

    try {
        // Token'ı Çöz (Base64 Decode)
        const jsonString = atob(token);
        examData = JSON.parse(jsonString);

        // Linkin Süresi Geçmiş mi? (Link oluşturulduktan 30 dk sonra geçersiz olur)
        const linkCreatedTime = examData.time;
        const currentTime = new Date().getTime();
        const diffMinutes = (currentTime - linkCreatedTime) / 1000 / 60;

        if (diffMinutes > 30) { 
            document.getElementById('expiry-warning').style.display = 'block';
            document.getElementById('btn-start').disabled = true;
            document.getElementById('btn-start').innerText = "LINK EXPIRED";
            document.getElementById('btn-start').classList.replace('btn-success', 'btn-secondary');
        }

    } catch (e) {
        alert("Corrupted Link!");
        document.getElementById('btn-start').disabled = true;
    }
};

function startExam() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('exam-container').style.display = 'block';

    // Soruları Getir
    loadQuestions();

    // Sayacı Başlat
    timerInterval = setInterval(updateTimer, 1000);
}

function loadQuestions() {
    const fileName = `questions-${examData.cat}.json`;

    fetch(fileName)
        .then(res => res.json())
        .then(allQuestions => {
            const container = document.getElementById('questions-area');
            let htmlContent = "";

            // Token içindeki soru numaralarına göre soruları diz
            examData.indices.forEach((qIndex, i) => {
                // Hata önleyici: Eğer index listede varsa
                if (allQuestions[qIndex]) {
                    htmlContent += `
                    <div class="question-box mb-3">
                        <strong>Q${i+1}:</strong> ${allQuestions[qIndex].q}
                    </div>`;
                }
            });

            container.innerHTML = htmlContent;
        });
}

function updateTimer() {
    const timerBox = document.getElementById('timer-box');
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;

    // 00:00 formatı
    seconds = seconds < 10 ? '0' + seconds : seconds;
    minutes = minutes < 10 ? '0' + minutes : minutes;

    timerBox.innerText = `${minutes}:${seconds}`;

    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        alert("TIME IS UP! Downloading result...");
        finishExam();
    } else {
        timeLeft--;
    }
}

function finishExam() {
    clearInterval(timerInterval);
    
    // PDF Oluştur
    const element = document.getElementById('exam-container');
    const now = new Date();
    
    // Timer ve Butonu PDF'te gizlemek için geçici stil
    const btn = document.querySelector('button[onclick="finishExam()"]');
    btn.style.display = 'none';

    var opt = {
        margin:       10,
        filename:     `Candidate_Exam_${examData.cat}_${now.getTime()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        // İndirme bitince sayfayı kapat veya mesaj ver
        document.body.innerHTML = "<h1 style='color:white; text-align:center; margin-top:50px;'>Exam Completed. You can close this page.</h1>";
    });
}
