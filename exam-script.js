let examData = null;
let allQuestionsData = [];
let timerInterval;
let timeLeft = 15 * 60; 
let token = "";

function getUKTime(dateObj = new Date()) {
    return dateObj.toLocaleString('en-GB', { timeZone: 'Europe/London' });
}

window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    token = urlParams.get('token');

    if (!token) { disableStart("Invalid Link!"); return; }
    if (localStorage.getItem('used_' + token)) { disableStart("⚠️ This link has already been used!"); return; }

    try {
        const jsonString = decodeURIComponent(escape(atob(token)));
        examData = JSON.parse(jsonString);

        const diffMinutes = (new Date().getTime() - examData.time) / 1000 / 60;
        if (diffMinutes > 30) { disableStart("⚠️ This link has expired!"); return; }

        const introHTML = `
        <div style="text-align: left; color: #e9ecef; font-size: 14px; line-height: 1.4;">
            <p>Hello <strong>${examData.title} ${examData.candidate}</strong>,</p>
            <p>My Name Is <strong>${examData.admin}</strong> and I will give to you LifeInvader (<strong>Test 1</strong>).</p>
            <ul style="padding-left: 20px; margin: 10px 0;">
                <li>You will have <strong>15 minutes</strong> to edit 7 ADs.</li>
                <li>You will need a minimum of <strong>5 correct answers to pass the test</strong>.</li>
                <li>You can use the LifeInvader <strong>Internal Policy</strong> along with the <strong>Sellable vehicles</strong> list.</li>
                <li>Some ADs may need <strong>Rejecting</strong> so keep an eye out for that.</li>
                <li>You can copy and paste the numerical symbol here: <strong>№</strong> if you need.</li>
                <li>At the end of each AD please mention the <strong>Category</strong> it goes under in brackets.</li>
                <li>All the best! <img src="LI_TOP.png" style="height:18px; vertical-align:middle;"></li>
            </ul>
        </div>`;
        document.getElementById('intro-text').innerHTML = introHTML;

    } catch (e) {
        console.error(e);
        disableStart("Corrupted Link!");
    }
};

function disableStart(msg) {
    const warning = document.getElementById('expiry-warning');
    warning.innerText = msg;
    warning.style.display = 'block';
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-start').innerText = "ACCESS DENIED";
    document.getElementById('btn-start').classList.replace('btn-success', 'btn-secondary');
}

function startExam() {
    localStorage.setItem('used_' + token, 'true');
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
            allQuestionsData = data; 
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
        alert("TIME IS UP! Submitting...");
        finishExam();
    } else {
        timeLeft--;
    }
}

// --- AKILLI PUANLAMA FONKSİYONU ---
// Yazıları sadeleştirir: "Hello World!" -> "helloworld"
function normalizeString(str) {
    if(!str) return "";
    return str.toLowerCase()
        .replace(/[^a-z0-9]/g, "") // Sadece harf ve rakamları tut (nokta, virgül, parantez sil)
        .trim();
}

function finishExam() {
    clearInterval(timerInterval);
    
    let correctCount = 0;
    let resultListHTML = "";
    
    examData.indices.forEach((qIndex, i) => {
        const userAnswerRaw = document.getElementById(`answer-${i}`).value;
        const correctAnswerRaw = allQuestionsData[qIndex].a;
        
        // Sadeleştirilmiş (Normalize) hallerini karşılaştır
        const userClean = normalizeString(userAnswerRaw);
        const correctClean = normalizeString(correctAnswerRaw);
        
        // Mantık: Eğer doğru cevap kullanıcının yazdığını içeriyorsa VEYA tam tersi
        // Bu sayede "(5 days)" eksik olsa bile kabul eder.
        let isCorrect = false;
        
        if (userClean === correctClean) {
            isCorrect = true;
        } else if (correctClean.includes(userClean) && userClean.length > 5) {
            // Kullanıcı eksik yazdı ama yazdığı kısım doğru (örn: Rejected yazdı ama reason yazmadı)
            // Çok kısa cevapları (örn: "a") doğru saymamak için uzunluk kontrolü
            isCorrect = true;
        } else if (userClean.includes(correctClean)) {
            // Kullanıcı fazla detay yazdı
            isCorrect = true;
        }
        
        if (isCorrect) correctCount++;
        
        resultListHTML += `
        <div style="margin-bottom:15px; border-bottom:1px solid #ccc; padding-bottom:5px;">
            <div style="margin-bottom:5px;"><strong>Q${i+1}:</strong> ${isCorrect ? '<span style="color:green">✅ Correct</span>' : '<span style="color:red">❌ Wrong</span>'}</div>
            <div style="font-size:12px; color:#333;"><i>Your Answer:</i> ${userAnswerRaw || "(Empty)"}</div>
            ${!isCorrect ? `<div style="font-size:12px; color:#006400;"><i>Expected:</i> ${correctAnswerRaw}</div>` : ''}
        </div>`;
    });

    const isPassed = correctCount >= 5;
    const now = new Date();
    const examDateStr = now.toLocaleString('en-GB', { timeZone: 'Europe/London' });
    
    let resultMessage = "";
    let statusColor = isPassed ? "green" : "red";
    let statusText = isPassed ? "PASSED" : "FAIL";

    if (isPassed) {
        resultMessage = `
        <h2 style="color:green; margin-top:20px; border-bottom: 2px solid green;">Result : ${correctCount}/7 (Passed)</h2>
        <p><strong>${examData.title} ${examData.candidate}</strong><br>
        Congratulations, you have passed the test with ${correctCount}/7 correct answers!<br> 
        Welcome to LifeInvader.</p>
        <p>Please watch the training videos:</p>
        <ul>
            <li><a href="https://youtu.be/-Urb1XQpYJI" style="color:blue;">Emails training</a></li>
            <li><a href="https://www.youtube.com/watch?v=4_VSZONyonI&ab_channel=Nor!" style="color:blue;">PDA training</a></li>
        </ul>`;
    } else {
        const retestTime = new Date(now.getTime() + 4*60*60*1000);
        const failMsgDate = retestTime.toLocaleString('en-GB', { timeZone: 'Europe/London' });
        resultMessage = `
        <h2 style="color:red; margin-top:20px; border-bottom: 2px solid red;">Result : ${correctCount}/7 (Fail)</h2>
        <p><strong>${examData.title} ${examData.candidate}</strong><br>
        Sorry to tell you, but you've failed the test with ${correctCount}/7 Correct Answers.</p>
        <p>You are eligible to take retest after 4 hours on: <br>
        <strong>${failMsgDate} (City Time)</strong></p>`;
    }

    // --- KESİN PDF ÇÖZÜMÜ: EKRANI DEĞİŞTİRME ---
    // Mevcut sayfayı siliyoruz ve yerine raporu koyuyoruz.
    // Bu sayede html2pdf %100 çalışıyor.
    
    const reportHTML = `
    <div id="final-report" style="font-family: Arial, sans-serif; padding: 40px; background-color: #ffffff; color: #000000; max-width: 800px; margin: 0 auto;">
        
        <div style="text-align:center; margin-bottom:20px;">
            <img src="https://li-exam-team.github.io/LI-Test-Bank-EN1/LILOGO.jpg" style="height: 80px; width: auto; display:block; margin: 0 auto;">
            <h1 style="color: #d32f2f; margin: 10px 0;">LifeInvader Exam Result</h1>
            <div style="border-bottom: 3px solid #d32f2f; width: 100%;"></div>
        </div>

        <table style="width:100%; margin-bottom:20px; font-size:14px;">
            <tr>
                <td style="padding: 5px;"><strong>Admin:</strong> ${examData.admin}</td>
                <td style="padding: 5px; text-align:right;"><strong>Date:</strong> ${examDateStr}</td>
            </tr>
            <tr>
                <td style="padding: 5px;"><strong>Candidate:</strong> ${examData.title} ${examData.candidate}</td>
                <td style="padding: 5px; text-align:right;"><strong>Status:</strong> <span style="color:${statusColor}; font-weight:bold;">${statusText}</span></td>
            </tr>
        </table>

        <div style="background-color:#f8f9fa; padding:20px; border:1px solid #ccc; margin-bottom:20px;">
            <h3 style="margin-top:0; border-bottom:1px solid #999; padding-bottom:5px;">Answers Check:</h3>
            ${resultListHTML}
        </div>

        <div>
            ${resultMessage}
        </div>

        <div style="margin-top:50px; text-align:center; font-size:10px; color: #666;">
            <hr>
            OFFICIAL LIFEINVADER DOCUMENT
        </div>
    </div>
    `;

    // 1. Ekrandaki her şeyi sil
    document.body.innerHTML = reportHTML;
    document.body.style.backgroundColor = "white"; // Arka planı beyaza çevir

    // 2. PDF İndir
    const element = document.getElementById('final-report');
    var opt = {
        margin:       10,
        filename:     `Result_${examData.candidate.replace(/\s/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // PDF indikten sonra ekrana mesaj ekle
    html2pdf().set(opt).from(element).save().then(() => {
        const msg = document.createElement('div');
        msg.innerHTML = `<h3 style="text-align:center; color:green; margin-top:20px;">PDF Downloaded Successfully!</h3>`;
        document.body.appendChild(msg);
    });
}
