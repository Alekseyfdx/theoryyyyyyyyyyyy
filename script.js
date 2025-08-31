// Pilot Theory Trainer — יוליה ✈️
const DATA_URL = 'questions.json';
const GEMINI_API_KEY = 'AIzaSyDYGe_wmTgu8hszDhnLB2qlEz5l-fKtscM';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// === State ===
let questions = [];
let index = 0;
let filtered = null;

// === DOM ===
const $ = id => document.getElementById(id);

function loadQuestions() {
  fetch(DATA_URL)
    .then(r => r.json())
    .then(data => {
      questions = data.questions || [];
      show(index);
    });
}

function show(i) {
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
  if (index > 0) { index--; show(index); }
};
$('nextBtn').onclick = () => {
  const arr = filtered || questions;
  if (index < arr.length - 1) { index++; show(index); }
};
$('goToBtn').onclick = () => {
  const n = parseInt($('pageInput').value, 10) - 1;
  const arr = filtered || questions;
  if (n >= 0 && n < arr.length) { index = n; show(index); }
};

$('searchBtn').onclick = () => {
  const val = $('searchInput').value.trim();
  if (!val) { filtered = null; index = 0; show(index); return; }
  filtered = questions.filter(q => q.question.includes(val) || (q.answer && q.answer.includes(val)));
  index = 0;
  show(index);
};

$('explanationBtn').onclick = async () => {
  const arr = filtered || questions;
  const q = arr[index];
  $('explanation').setAttribute('aria-hidden', 'false');
  $('explanationText').textContent = '🤖 שולף הסבר...';

  // Gemini API integration
  try {
    const prompt = `הסבר בקצרה (עד 5 שורות) לשאלה במבחן תיאוריה לטייס בישראל: \n"${q.question}"\nתשובה נכונה: ${q.answer}\nהסבר:`;
    const res = await fetch(GEMINI_ENDPOINT + '?key=' + AIzaSyDYGe_wmTgu8hszDhnLB2qlEz5l-fKtscM, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [ { text: prompt } ] }
        ]
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const out = await res.json();
    const expl = out.candidates?.[0]?.content?.parts?.[0]?.text || 'לא התקבל הסבר.';
    $('explanationText').textContent = expl;
    $('explanationSource').textContent = 'נוצר אוטומטית ב־Gemini AI';
  } catch (e) {
    $('explanationText').textContent = 'שגיאה בשליפת הסבר מ־Gemini: ' + (e.message || e);
    $('explanationSource').textContent = '';
  }
};

window.onload = loadQuestions;
