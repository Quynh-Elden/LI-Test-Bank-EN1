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
        <div style="text-align: left; color: #e9ecef; font-size: 13px; line-height: 1.4;">
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
                        <p class="text-white mb-2" style="font-family:'Courier New';">${data[qIndex].q}</p>
                        <div class="row g-2">
                            <div class="col-md-8">
                                <textarea id="answer-text-${i}" class="form-control answer-input" rows="2" placeholder="Ad Text"></textarea>
                            </div>
                            <div class="col-md-4">
                                <input type="text" id="answer-cat-${i}" class="form-control cat-input" placeholder="Category">
                            </div>
                        </div>
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

// --- YENİ VE GÜÇLÜ AYRIŞTIRICI ---
function parseAnswerString(fullStr) {
    // Sadece sondaki (Kategori) kısmını ayırır.
    // Örnek: "Rejected (Reason: abc) (Illegal)" -> Text: "Rejected (Reason: abc)" | Cat: "Illegal"
    // Bu Regex, cümlenin içindeki parantezlerle sondaki kategori parantezini karıştırmaz.
    const regex = /^(.*)\s+\(([^)]+)\)$/;
    const match = fullStr.match(regex);
    
    if (match) {
        return { text: match[1].trim(), cat: match[2].trim() };
    }
    // Eğer kategori parantezi yoksa (örn sadece text varsa)
    return { text: fullStr.trim(), cat: "" };
}

// --- "ESNEK" TEMİZLEME FONKSİYONU ---
// Bu fonksiyon noktalama işaretlerini siler ve küçük harfe çevirir.
// Böylece "Reason:" ile "Reason" aynı sayılır.
function cleanString(str) {
    if (!str) return "";
    return str.toLowerCase()
        .replace(/[().,:\-]/g, '') // Parantez, nokta, iki nokta, tire hepsini sil
        .replace(/\s+/g, ' ')       // Fazla boşlukları tek boşluğa indir
        .trim();
}

function finishExam() {
    clearInterval(timerInterval);
    
    let correctCount = 0;
    let resultListHTML = "";
    
    examData.indices.forEach((qIndex, i) => {
        const userAdText = document.getElementById(`answer-text-${i}`).value.trim();
        const userCatText = document.getElementById(`answer-cat-${i}`).value.trim();
        const possibleAnswersRaw = allQuestionsData[qIndex].a.split(" or ");
        
        let isQuestionPassed = false;
        let bestMatchCorrect = null; // Rapor için en uygun doğru cevabı tutalım

        for (let rawOption of possibleAnswersRaw) {
            const correctObj = parseAnswerString(rawOption);
            bestMatchCorrect = correctObj; // Varsayılan olarak bunu göster

            // --- 1. REKLAM METNİ KONTROLÜ (ESNEK) ---
            // Normalde katı olmalıydı ama noktalama işaretleri yüzünden esnek yapıyoruz
            // Ancak kelimeler ve harfler doğru olmalı.
            
            // Eğer Rejected sorusu ise çok esnek davran (Noktalama önemsiz)
            const isRejectedQuestion = correctObj.text.toLowerCase().includes("rejected");
            
            let isTextMatch = false;
            
            if (isRejectedQuestion) {
                // Rejected ise sadece harflere bak (CleanString kullan)
                if (cleanString(userAdText) === cleanString(correctObj.text)) {
                    isTextMatch = true;
                }
            } else {
                // Normal soru ise harf duyarlılığı olsun ama sondaki nokta vs. affedilsin
                // Kullanıcının yazdığının sonundaki noktayı silip kontrol edelim
                const cleanUserText = userAdText.replace(/[.]$/, ''); 
                const cleanCorrectText = correctObj.text.replace(/[.]$/, '');
                
                if (cleanUserText === cleanCorrectText) {
                    isTextMatch = true;
                }
            }

            // --- 2. KATEGORİ KONTROLÜ ---
            let isCatMatch = false;
            const cleanUserCat = cleanString(userCatText);
            const cleanCorrectCat = cleanString(correctObj.cat);

            if (cleanUserCat === cleanCorrectCat) {
                isCatMatch = true;
            } else if (correctObj.text.startsWith("Rejected")) {
                // Rejected ise kategori boş olsa da olur, doğru olsa da olur
                if (cleanUserCat === "" || cleanUserCat === cleanCorrectCat) {
                    isCatMatch = true;
                }
            }

            if (isTextMatch && isCatMatch) {
                isQuestionPassed = true;
                bestMatchCorrect = correctObj; // Eşleşen doğru cevabı kaydet
                break;
            }
        }

        if (isQuestionPassed) correctCount++;
        
        // --- RAPOR HTML OLUŞTURMA ---
        if (isQuestionPassed) {
            resultListHTML += `
            <div style="margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:4px;">
                <div style="font-weight:bold; font-size:12px; color:green;">Q${i+1}: ✅ Correct</div>
            </div>`;
        } else {
            // Yanlışsa detayları göster
            // Varsayılan olarak ilk doğru seçeneği gösterelim (eğer hiçbiri tutmadıysa)
            const displayCorrect = bestMatchCorrect || parseAnswerString(possibleAnswersRaw[0]);
            
            resultListHTML += `
            <div style="margin-bottom:10px; border-bottom:1px solid #ccc; padding-bottom:5px; background-color: #fff0f0; padding: 5px;">
                <div style="font-weight:bold; font-size:12px; color:red;">Q${i+1}: ❌ Failed</div>
                
                <div style="font-size:10px; margin-top:4px;">
                    <strong style="color:#555;">Your Input:</strong><br>
                    <span style="color:#333;">Text:</span> "${userAdText}" <br>
                    <span style="color:#333;">Cat:</span> "${userCatText}"
                </div>
                
                <div style="font-size:10px; margin-top:4px;">
                    <strong style="color:#006400;">Expected:</strong><br>
                    <span style="color:#006400;">Text:</span> "${displayCorrect.text}" <br>
                    <span style="color:#006400;">Cat:</span> "${displayCorrect.cat}"
                </div>
            </div>`;
        }
    });

    // --- PDF İŞLEMLERİ ---
    const isPassed = correctCount >= 5;
    const now = new Date();
    const examDateStr = now.toLocaleString('en-GB', { timeZone: 'Europe/London' });
    
    let resultMessage = "";
    let statusColor = isPassed ? "green" : "red";
    let statusText = isPassed ? "PASSED" : "FAIL";

    if (isPassed) {
        resultMessage = `
        <h3 style="color:green; margin-top:15px; border-bottom: 2px solid green; display:inline-block;">Result : ${correctCount}/7 (Passed)</h3>
        <p style="font-size:11px;"><strong>${examData.title} ${examData.candidate}</strong><br>
        Congratulations, you have passed the test!<br>Welcome to LifeInvader.</p>
        <p style="font-size:11px;">Please watch the training videos:</p>
        <ul style="font-size:11px;">
            <li><a href="https://youtu.be/-Urb1XQpYJI" style="color:blue;">Emails training</a></li>
            <li><a href="https://www.youtube.com/watch?v=4_VSZONyonI&ab_channel=Nor!" style="color:blue;">PDA training</a></li>
        </ul>`;
    } else {
        const retestTime = new Date(now.getTime() + 4*60*60*1000);
        const failMsgDate = retestTime.toLocaleString('en-GB', { timeZone: 'Europe/London' });
        resultMessage = `
        <h3 style="color:red; margin-top:15px; border-bottom: 2px solid red; display:inline-block;">Result : ${correctCount}/7 (Fail)</h3>
        <p style="font-size:11px;"><strong>${examData.title} ${examData.candidate}</strong><br>
        Sorry, you failed.</p>
        <p style="font-size:11px;">Retest available after: <strong>${failMsgDate}</strong></p>`;
    }

    const reportHTML = `
    <div id="final-report-view" style="font-family: Arial, sans-serif; padding: 40px; background-color: #ffffff; color: #000000; max-width: 800px; margin: 0 auto; min-height: 100vh;">
        <div style="text-align:center; margin-bottom:15px;">
            <img src="https://li-exam-team.github.io/LI-Test-Bank-EN1/LILOGO.jpg" style="height: 60px; width: auto; display:block; margin: 0 auto;">
            <h2 style="color: #d32f2f; margin: 5px 0;">LifeInvader Exam Result</h2>
            <hr style="margin: 5px 0; border: 1px solid #d32f2f;">
        </div>
        <table style="width:100%; margin-bottom:15px; font-size:11px; border-collapse: collapse;">
            <tr><td><strong>Admin:</strong> ${examData.admin}</td><td style="text-align:right;">${examDateStr}</td></tr>
            <tr><td><strong>Candidate:</strong> ${examData.title} ${examData.candidate}</td><td style="text-align:right; font-weight:bold; color:${statusColor}">${statusText}</td></tr>
        </table>
        <div style="background-color:#f9f9f9; padding:15px; border-radius:5px; border:1px solid #eee; margin-bottom:15px;">
            <h4 style="margin-top:0; margin-bottom:10px; border-bottom:1px solid #ccc;">Answers Check:</h4>
            ${resultListHTML}
        </div>
        ${resultMessage}
        <div style="margin-top:30px; text-align:center; font-size:9px; color:gray;">
            <hr>OFFICIAL LIFEINVADER DOCUMENT
        </div>
        <div style="text-align:center; margin-top:20px;">
            <p style="color: green; font-weight: bold;">✅ Exam Completed. Downloading PDF...</p>
        </div>
    </div>`;

    document.body.innerHTML = reportHTML;
    document.body.style.backgroundColor = "white"; 

    setTimeout(() => {
        const element = document.getElementById('final-report-view');
        var opt = {
            margin:       10,
            filename:     `Result_${examData.candidate.replace(/\s/g, '_')}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            enableLinks:  true
        };
        html2pdf().set(opt).from(element).save();
    }, 500);
}
