document.addEventListener('DOMContentLoaded', () => {
    // ##################################################################
    // ################### הגדרות משתנים ואלמנטים ######################
    // ##################################################################
    
    // !!! חשוב: החלף את המפתח למפתח ה-API שלך מ-Google AI Studio
    const API_KEY = 'AIzaSyCbqccwb480Pqcjuf93zcenmFfXmfFC51M'; // החלף למפתח שלך
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

    // Elements
    const questionTextEl = document.getElementById('question-text');
    const answerTextEl = document.getElementById('answer-text');
    const explainBtn = document.getElementById('explain-btn');
    const explanationCardEl = document.getElementById('explanation-card');
    const explanationTextEl = document.getElementById('explanation-text');
    const nextBtn = document.getElementById('next-btn');
    const progressTextEl = document.getElementById('progress-text');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    
    // State
    let allQuestions = [];
    let currentQuestionIndex = 0;

    // ##################################################################
    // ##################### פונקציות מרכזיות ##########################
    // ##################################################################

    // טעינת וערבוב השאלות
    async function initializeApp() {
        try {
            const response = await fetch('questions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allQuestions = await response.json();
            shuffleArray(allQuestions);
            displayQuestion();
            enableButtons();
        } catch (error) {
            questionTextEl.textContent = 'שגיאה בטעינת השאלות. אנא רענן את העמוד.';
            console.error('Error loading questions:', error);
        }
    }

    // ערבוב המערך
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // הצגת השאלה הנוכחית
    function displayQuestion() {
        if (allQuestions.length === 0) return;

        const question = allQuestions[currentQuestionIndex];
        questionTextEl.textContent = question.question;
        answerTextEl.textContent = question.answer;

        updateProgress();
        resetExplanation();
    }
    
    // עדכון פס ההתקדמות
    function updateProgress() {
        progressTextEl.textContent = `שאלה ${currentQuestionIndex + 1} מתוך ${allQuestions.length}`;
    }

    // איפוס אזור ההסבר
    function resetExplanation() {
        explanationCardEl.classList.add('hidden');
        explanationTextEl.innerHTML = '';
        explainBtn.textContent = 'הסבר';
    }
    
    // הפעלת הכפתורים לאחר טעינה
    function enableButtons() {
        nextBtn.disabled = false;
        explainBtn.disabled = false;
    }

    // טיפול בבקשת הסבר
    async function handleExplainClick() {
        if (!explanationCardEl.classList.contains('hidden')) {
            explanationCardEl.classList.add('hidden');
            return;
        }

        const currentQuestion = allQuestions[currentQuestionIndex];
        explainBtn.disabled = true;
        explainBtn.textContent = 'חושב...';
        explanationTextEl.innerHTML = 'טוען הסבר...';
        explanationCardEl.classList.remove('hidden');

        try {
            const prompt = `אנא הסבר בעברית פשוטה וברורה את ההיגיון מאחורי השאלה והתשובה הבאות, מתחום חוקת האוויר והתעופה בישראל. התמקד בעיקר במשמעות המעשית של החוק או התקנה.\n\nשאלה: "${currentQuestion.question}"\n\nתשובה: "${currentQuestion.answer}"`;
            
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API Error:', errorData);
                throw new Error(errorData.error.message || `שגיאת שרת: ${response.status}`);
            }

            const data = await response.json();
            const explanation = data.candidates[0].content.parts[0].text;
            explanationTextEl.innerHTML = explanation.replace(/\n/g, '<br>');

        } catch (error) {
            explanationTextEl.textContent = `אופס, קרתה שגיאה בקבלת ההסבר. נסה שוב. (${error.message})`;
            console.error('Error fetching explanation:', error);
        } finally {
            explainBtn.disabled = false;
            explainBtn.textContent = 'הסתר הסבר';
        }
    }

    // טיפול במעבר לשאלה הבאה
    function handleNextClick() {
        currentQuestionIndex++;
        if (currentQuestionIndex >= allQuestions.length) {
            currentQuestionIndex = 0; // חזרה להתחלה
        }
        displayQuestion();
    }

    // ##################################################################
    // ######################### מצב בהיר/כהה ##########################
    // ##################################################################

    function setInitialTheme() {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.classList.add('dark-mode');
            themeToggle.checked = true;
            themeIcon.textContent = '🌙';
        } else {
            document.body.classList.remove('dark-mode');
            themeToggle.checked = false;
            themeIcon.textContent = '☀️';
        }
    }

    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        themeIcon.textContent = isDark ? '🌙' : '☀️';
    }


    // ##################################################################
    // ####################### רישום Event Listeners #####################
    // ##################################################################
    
    nextBtn.addEventListener('click', handleNextClick);
    explainBtn.addEventListener('click', handleExplainClick);
    themeToggle.addEventListener('change', toggleTheme);
    
    // ##################################################################
    // ######################## התחלת האפליקציה #########################
    // ##################################################################

    setInitialTheme();
    initializeApp();
});