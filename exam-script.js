let examData = null;
let allQuestionsData = [];
let timerInterval;
let timeLeft = 15 * 60; 

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        alert("Invalid Link!");
        document.getElementById('btn-start').disabled = true;
        return;
    }

    try {
        // Token Çözme (Türkçe karakter destekli)
        const jsonString = decodeURIComponent(escape(atob(token)));
        examData = JSON.parse(jsonString);

        // Link Süresi Kontrolü (30 dk)
        const diffMinutes = (new Date().getTime() - examData.time) / 1000 / 60;
        if (diffMinutes > 30) { 
            document.getElementById('expiry-warning').style.display = 'block';
            document.getElementById('btn-start').disabled = true;
            document.getElementById('btn-start').innerText = "LINK EXPIRED";
            document.getElementById('btn-start').classList.replace('btn-success', 'btn-secondary');
            return;
        }

        // Giriş Metnini Hazırla
        const introHTML = `Hello Miss. or Mr. <strong>${examData.candidate}</strong>,
My Name Is <strong>${examData.admin}</strong> and I will give to you LifeInvader (<strong>Test 1</strong>).

- You will have <strong>15 minutes</strong> to edit 7 ADs. 
- You will need a minimum of <strong>5 correct answers to pass the test</strong>. 
- You can use the LifeInvader <strong>Internal Policy</strong> along with the <strong>Sellable vehicles - Clothing and items list</strong> to help you with the below. 
- Some ADs may need <strong>Rejecting</strong> so keep an eye out for that. 
- You can copy and paste the numerical symbol here: <strong>№</strong> if you need. 
- At the end of each AD please mention the <strong>Category</strong> it goes under in brackets. 
- All the best! 
 :liontop:`;

        document.getElementById('intro-text').innerHTML = introHTML;

    } catch (e) {
        console.error(e);
        alert("Corrupted Link!");
    }
};

function startExam() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('exam-container').style.display = 'block';
    loadQuestions();
    timerInterval = setInterval(updateTimer, 1000);
}

function loadQuestions() {
    const fileName = `questions-${examData.cat}.json`;

    fetch(fileName)
        .then(res => res.json())
        .then(data => {
            allQuestionsData = data; // Tüm veriyi hafızada tut (Cevap kontrolü için)
            const container = document.getElementById('questions-area');
            let htmlContent = "";

            examData.indices.forEach((qIndex, i) => {
                if (data[qIndex]) {
                    htmlContent += `
                    <div class="question-block">
                        <label class="fw-bold text-warning mb-2">Question ${i+1}:</label>
                        <p class="text-white mb-2">${data[qIndex].q}</p>
                        <textarea id="answer-${i}" class="form-control answer-input" rows="2" placeholder="Type your corrected ad here..."></textarea>
                    </div>`;
                }
            });
            container.innerHTML = htmlContent;
        });
}

function updateTimer() {
    const timerBox = document.getElementById('timer-box');
    let m = Math.floor(timeLeft / 60);
    let s = timeLeft % 60;
    timerBox.innerText = `${m}:${s < 10 ? '0'+s : s}`;

    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        alert("TIME IS UP! System is submitting your answers...");
        finishExam();
    } else {
        timeLeft--;
    }
}

function finishExam() {
    clearInterval(timerInterval);
    
    // --- PUANLAMA MOTORU ---
    let correctCount = 0;
    let resultListHTML = "";
    
    examData.indices.forEach((qIndex, i) => {
        const userAnswer = document.getElementById(`answer-${i}`).value.trim();
        const correctAnswer = allQuestionsData[qIndex].a.trim();
        
        // Basit Karşılaştırma (Birebir eşleşme gerekir - Case Insensitive)
        // Not: Gerçek hayatta bu zordur ama istek üzerine yapıldı.
        const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
        
        if (isCorrect) correctCount++;
        
        resultListHTML += `<div>${i+1}. ${isCorrect ? '✅' : '❌'} <br><small style="color:gray;">(You: ${userAnswer || "Empty"})</small></div>`;
    });

    const isPassed = correctCount >= 5;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    
    // 4 Saat Sonrası Hesaplama
    const retestTime = new Date(now.getTime() + 4*60*60*1000);
    const retestStr = retestTime.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'});

    // --- PDF İÇERİĞİ HAZIRLAMA ---
    let resultMessage = "";
    
    if (isPassed) {
        resultMessage = `
        <h2 style="color:green;">Result : ${correctCount}/7 (Passed)</h2>
        <p><strong>Mr. or Ms. ${examData.candidate}</strong><br>
        Congratulations🎉, you have passed the test with ${correctCount}/7 correct answers!<br> 
        Welcome to LifeInvader.</p>
        <p>Now, please watch the following videos to understand how to use the discord channels, their purpose, and how to use the PDA:<br>
        [Emails training](https://youtu.be/-Urb1XQpYJI)<br>
        [PDA training](https://www.youtube.com/watch?v=4_VSZONyonI&ab_channel=Nor!)<br>
        Watch them carefully to get a better understanding of how things work. Only after watching these videos you will receive the appropriate rank to start working.</p>`;
    } else {
        resultMessage = `
        <h2 style="color:red;">Result : ${correctCount}/7 (Fail)</h2>
        <p><strong>Mr. or Ms. ${examData.candidate}</strong><br>
        Sorry to tell you, but you've failed the test with ${correctCount}/7 Correct Answers.</p>
        <p>You are eligible to take retest after 4 hours on <strong>${dateStr} at ${retestStr} city time.</strong></p>`;
    }

    // PDF Şablonunu Doldur
    const pdfContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h1 style="text-align:center;">LifeInvader Exam Result</h1>
        <hr>
        <p><strong>Admin:</strong> ${examData.admin}</p>
        <p><strong>Candidate:</strong> ${examData.candidate}</p>
        <p><strong>Date:</strong> ${now.toLocaleString('en-GB')}</p>
        <hr>
        <h3>Answers Check:</h3>
        ${resultListHTML}
        <hr>
        ${resultMessage}
    </div>
    `;

    // İndirme İşlemi
    const element = document.createElement('div');
    element.innerHTML = pdfContent;
    
    var opt = {
        margin:       10,
        filename:     `Result_${examData.candidate}_${now.getTime()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Ekranı temizle ve mesaj ver
    document.getElementById('exam-container').innerHTML = `
        <div class="text-center text-white mt-5">
            <h1>Exam Completed</h1>
            <h3>Your result is being downloaded...</h3>
            <p>Please send the PDF file to the Admin.</p>
        </div>
    `;

    html2pdf().set(opt).from(element).save();
}
