const DATA_URL = 'questions.json';

let questions = [];
let index = 0;
let filtered = null;

const $ = id => document.getElementById(id);

window.onload = () => {
  fetch(DATA_URL).then(r => r.json()).then(data => {
    questions = data.questions || [];
    showQuestion(0);
  });
};

function showQuestion(i) {
  const arr = filtered || questions;
  if (!arr[i]) return;
  const q = arr[i];
  $('questionText').textContent = q.question;
  $('answerText').textContent = q.answer || '';
  $('questionCounter').textContent = `שאלה ${i + 1} מתוך ${arr.length}`;
  $('progressBar').style.width = `${100 * (i + 1) / arr.length}%`;
  $('explanation').setAttribute('aria-hidden', 'true');
  index = i;
}

$('prevBtn').onclick = () => showQuestion(Math.max(0, index - 1));
$('nextBtn').onclick = () => showQuestion((filtered || questions).length > index + 1 ? index + 1 : index);
$('goToBtn').onclick = () => {
  const n = Number($('pageInput').value) - 1;
  if (n >= 0 && n < (filtered || questions).length) showQuestion(n);
};

$('searchBtn').onclick = () => {
  const term = $('searchInput').value.trim();
  filtered = term ? questions.filter(q => q.question.includes(term) || q.answer?.includes(term)) : null;
  showQuestion(0);
};

$('explanationBtn').onclick = async () => {
  const q = (filtered || questions)[index];
  if (!q) return;

  $('explanation').removeAttribute('aria-hidden');
  $('explanationText').textContent = 'טוען הסבר...';
  $('explanationSource').textContent = '';

  try {
    // Если используем прокси — заменить URL:
    const response = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q.question, answer: q.answer })
    });
    const data = await response.json();
    $('explanationText').textContent = data.explanation || 'אין הסבר';
    $('explanationSource').textContent = 'הסבר אוטומטי';
  } catch (err) {
    $('explanationText').textContent = 'שגיאה בהסבר: ' + err.message;
  }
};
