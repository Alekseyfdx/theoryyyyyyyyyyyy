import { initializeApp } from "firebase/app";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

// 1. Настройки Firebase (твои реальные из консоли)
const firebaseConfig = {
  apiKey: "ТВОЙ_API_KEY",
  authDomain: "…",
  projectId: "…",
  appId: "…"  
};
const app = initializeApp(firebaseConfig);

// 2. Инициализация AI Logic и модели Gemini
const ai = getAI(app, { backend: new GoogleAIBackend() });
const model = getGenerativeModel(ai, { model: "gemini-2.5-flash", mode: "prefer_on_device" });

const DATA_URL = 'questions.json';
let questions = [], index = 0, filtered = null;
const $ = id => document.getElementById(id);

window.onload = async () => {
  questions = (await fetch(DATA_URL).then(r => r.json())).questions || [];
  showQuestion(0);
};

function showQuestion(i) {
  const arr = filtered || questions;
  if (!arr[i]) return;
  const q = arr[i];
  $('questionText').textContent = q.question;
  $('answerText').textContent = q.answer || '';
  $('questionCounter').textContent = `שאלה ${i+1} מתוך ${arr.length}`;
  $('progressBar').style.width = `${100*(i+1)/arr.length}%`;
  $('explanation').setAttribute('aria-hidden','true');
  index = i;
}

// Навигация
$('prevBtn').onclick = () => showQuestion(index > 0 ? index - 1 : index);
$('nextBtn').onclick = () => {
  const arr = filtered || questions;
  showQuestion(index < arr.length - 1 ? index + 1 : index);
};
$('goToBtn').onclick = () => {
  const n = parseInt($('pageInput').value, 10) - 1;
  if (!isNaN(n) && n >= 0 && n < (filtered || questions).length) showQuestion(n);
};
$('searchBtn').onclick = () => {
  const term = $('searchInput').value.trim();
  filtered = term ? questions.filter(q =>
    q.question.includes(term) || q.answer?.includes(term)
  ) : null;
  showQuestion(0);
};

// Вызов AI объяснения
$('explanationBtn').onclick = async () => {
  const q = (filtered || questions)[index];
  if (!q) return;
  $('explanation').removeAttribute('aria-hidden');
  $('explanationText').textContent = 'טוען הסבר...';
  $('explanationSource').textContent = '';
  try {
    const res = await model.generateContent(`הסבר בקצרה: "${q.question}" תשובה: ${q.answer}`);
    $('explanationText').textContent = res.text || 'אין הסבר';
    $('explanationSource').textContent = 'AI (Gemini)';
  } catch (e) {
    $('explanationText').textContent = 'שגיאה: ' + e.message;
  }
};
