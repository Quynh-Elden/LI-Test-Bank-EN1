// Soruları tutacağımız geçici hafıza
let currentQuestions = [];

/**
 * Sınav Oluşturma Fonksiyonu
 * @param {string} category - Hangi kategoriyi çekeceğimizi belirler (örn: 'easy')
 */
function generateExam(category) {
    // 1. Doğru dosyayı seç (questions-easy.json)
    const fileName = `questions-${category}.json`;

    // 2. Veriyi çek (Fetch API)
    fetch(fileName)
        .then(response => {
            if (!response.ok) {
                throw new Error("Dosya bulunamadı! Dosya ismini kontrol et: " + fileName);
            }
            return response.json();
        })
        .then(data => {
            // 3. Soruları Karıştır ve Seç
            const selectedQuestions = shuffleAndSelect(data, 7);
            
            // 4. Ekrana Bas
            displayExam(selectedQuestions);
        })
        .catch(error => {
            alert("Hata oluştu: " + error.message);
            console.error(error);
        });
}

/**
 * Fisher-Yates Algoritması ile Karıştırma ve Kesme
 */
function shuffleAndSelect(array, count) {
    // Orijinal diziyi bozmamak için kopyasını alıyoruz
    let shuffled = [...array];
    
    // Karıştırma döngüsü
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // İstenilen sayıda (7 tane) al
    return shuffled.slice(0, count);
}

/**
 * Sonuçları HTML sayfasına yazdırma
 */
function displayExam(questions) {
    const qBox = document.getElementById('questions-box');
    const aBox = document.getElementById('answers-box');
    const qSection = document.getElementById('questions-section');
    const aSection = document.getElementById('answers-section');

    // Kutuları temizle
    qBox.textContent = "";
    aBox.textContent = "";

    let questionText = "";
    let answerText = "";

    // Her bir soruyu döngü ile metne çevir
    questions.forEach((item, index) => {
        // Soru listesi
        questionText += `${index + 1}) ${item.q}\n\n`;
        // Cevap listesi
        answerText += `${index + 1}) ${item.a}\n\n`;
    });

    // Metinleri kutulara yerleştir
    qBox.textContent = questionText;
    aBox.textContent = answerText;

    // Arayüzü güncelle (Soruları göster, cevapları gizle)
    qSection.style.display = 'block';
    aSection.style.display = 'none';
}

/**
 * Cevapları Göster Butonu
 */
function showAnswers() {
    document.getElementById('answers-section').style.display = 'block';
    // Cevaplara doğru otomatik kaydır
    document.getElementById('answers-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Kopyalama Fonksiyonu
 */
function copyToClipboard(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert("Metin başarıyla kopyalandı!");
    }).catch(err => {
        console.error('Kopyalama hatası:', err);
        alert("Kopyalama başarısız oldu. Lütfen manuel seçip kopyalayın.");
    });
}
