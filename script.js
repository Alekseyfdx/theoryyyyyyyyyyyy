// Pilot Theory Trainer — יוליה ✈️

const DATA_URL = 'questions.json';
const GEMINI_API_KEY = 'AIzaSyDYGe_wmTgu8hszDhnLB2qlEz5l-fKtscM';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// === Состояние ===
let questions = [];
let index = 0;
let filtered = null;

// === Быстрый доступ к DOM ===
const $ = id => document.getElementById(id);

// Загружаем вопросы при старте
window.onload = loadQuestions;

function loadQuestions() {
  fetch(DATA_URL)
    .then(res => res.json())
    .then(data => {
      questions = data.questions || [];
      showQuestion(index);
    })
    .catch(err => console.error('Ошибка загрузки questions.json:', err));
}

function showQuestion(i) {
  const arr = filtered || questions;
  if (!arr[i]) return;
  const q = arr[i];
  $('questionText').textContent = q.question;
  $('answerText').textContent = q.answer || '';
  $('questionCounter').textContent = `שאלה ${i + 1} מתוך ${arr.length}`;
  $('progressBar').style.width = `${100 * (i + 1) / arr.length}%`;
  $('explanation').setAttribute('aria-hidden', 'true');
  $('explanationText').textContent = '';
  $('explanationSource').textContent = '';
}

$('prevBtn').onclick = () => {
  if (index > 0) index--;
  showQuestion(index);
};

$('nextBtn').onclick = () => {
  const arr = filtered || questions;
  if (index < arr.length - 1) index++;
  showQuestion(index);
};

$('goToBtn').onclick = () => {
  const n = parseInt($('pageInput').value, 10) - 1;
  const arr = filtered || questions;
  if (!isNaN(n) && n >= 0 && n < arr.length) {
    index = n;
    showQuestion(index);
  }
};

$('searchBtn').onclick = () => {
  const val = $('searchInput').value.trim();
  if (!val) filtered = null;
  else {
    filtered = questions.filter(q =>
      q.question.includes(val) ||
      (q.answer && q.answer.includes(val))
    );
  }
  index = 0;
  showQuestion(index);
};

$('explanationBtn').onclick = async () => {
  const arr = filtered || questions;
  const q = arr[index];
  if (!q) return;

  $('explanation').removeAttribute('aria-hidden');
  $('explanationText').textContent = '🤖 שולף הסבר...';
  $('explanationSource').textContent = '';

  try {
    const prompt = `הסבר בקצרה (עד 5 שורות) לשאלה במבחן תיאוריה לטייס בישראל:\n"${q.question}"\nתשובה נכונה: ${q.answer}\nהסבר:`;
    const url = `${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Ошибка от API: ${txt}`);
    }

    const data = await res.json();
    const expl = data.candidates?.[0]?.content?.parts?.[0]?.text || 'לא התקבל הסבר.';
    $('explanationText').textContent = expl;
    $('explanationSource').textContent = 'נוצר אוטומטית ב־Gemini AI';
  } catch (e) {
    $('explanationText').textContent = 'שגיאה בשליפת הסבר: ' + e.message;
  }
};
