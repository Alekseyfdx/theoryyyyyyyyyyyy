// Pilot Theory Trainer — OpenAI (chat completions) версия
// JSON: положи рядом questions.json (твой)
// ВНИМАНИЕ: ключ в клиентском JS виден пользователю. Для продакшена лучше прокси или Firebase.
// Документация Chat Completions: https://platform.openai.com/docs/api-reference/chat

const DATA_URL = 'questions.json';

// === ТВОЙ КЛЮЧ (встроенный по просьбе) ===
const OPENAI_API_KEY = 'sk-ZKdYwOdw2kXwpV2ZPv4uJA';

// Рекомендуемая модель — быстрая и дешёвая (актуальные смотри в доках)
const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4o-mini'; // можно заменить на актуальную из списка моделей

// === State ===
let questions = [];
let index = 0;
let filtered = null;

// === DOM ===
const $ = id => document.getElementById(id);

// Загрузка вопросов
window.addEventListener('load', async () => {
  try {
    const data = await fetch(DATA_URL).then(r => r.json());
    questions = Array.isArray(data) ? data : (data.questions || []);
  } catch (e) {
    console.error('Ошибка загрузки questions.json', e);
    questions = [];
  }
  show(0);
});

// Показ вопроса/ответа
function show(i){
  const arr = filtered || questions;
  if(!arr.length){ renderEmpty(); return; }
  index = Math.max(0, Math.min(i, arr.length - 1));
  const q = arr[index];
  $('questionText').textContent = q.question || '';
  $('answerText').textContent = q.answer || '';
  $('questionCounter').textContent = `שאלה ${index+1} מתוך ${arr.length}`;
  $('progressBar').style.width = `${((index+1)/arr.length)*100}%`;

  // сброс AI блока
  $('explanation').setAttribute('aria-hidden','true');
  $('explanationText').textContent = '';
  $('explanationSource').textContent = '';
}

function renderEmpty(){
  $('questionText').textContent = 'לא נמצאו שאלות.';
  $('answerText').textContent = '—';
  $('questionCounter').textContent = '—';
  $('progressBar').style.width = '0%';
}

// Навигация
$('prevBtn').onclick = () => show(Math.max(0, index-1));
$('nextBtn').onclick = () => show(Math.min((filtered||questions).length-1, index+1));
$('goToBtn').onclick = () => {
  const n = parseInt($('pageInput').value,10) - 1;
  const arr = filtered || questions;
  if(!isNaN(n) && n>=0 && n<arr.length) show(n);
};

// Поиск
$('searchBtn').onclick = () => {
  const term = $('searchInput').value.trim();
  filtered = term ? questions.filter(q =>
    (q.question||'').includes(term) || (q.answer||'').includes(term)
  ) : null;
  show(0);
};

// AI-объяснение через OpenAI
$('explanationBtn').onclick = async () => {
  const arr = filtered || questions;
  const q = arr[index];
  if(!q) return;

  $('explanation').setAttribute('aria-hidden','false');
  $('explanationText').textContent = '🤖 שולף הסבר...';
  $('explanationSource').textContent = '';

  // Формируем prompt в стиле Chat Completions
  const messages = [
    { role: 'system', content: 'אתה מסביר קצר וברור לבחינות תיאוריה לטיס בישראל.' },
    { role: 'user', content:
      `הסבר בקצרה (עד 5 שורות) לשאלה במבחן תיאוריה לטייס:
"שאלה": ${q.question}
"תשובה נכונה": ${q.answer}
תן הסבר ברור וקצר, ללא הקדמות מיותרות.` }
  ];

  try{
    const res = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages,
        temperature: 0.2
      })
    });

    if(!res.ok){
      const txt = await res.text();
      throw new Error(`OpenAI API: ${txt}`);
    }

    const out = await res.json();
    const expl = out?.choices?.[0]?.message?.content?.trim() || 'לא התקבל הסבר.';
    $('explanationText').textContent = expl;
    $('explanationSource').textContent = 'נוצר אוטומטית ב־OpenAI';
  }catch(err){
    // Возможная причина — CORS (браузер блокирует домен без нужных заголовков)
    $('explanationText').textContent = 'שגיאה בשליפת הסבר: ' + (err.message || err);
    $('explanationSource').textContent = '';
  }
};
