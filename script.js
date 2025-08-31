const DATA_URL = 'questions.json';
const API_KEY = 'AIzaSyD7xSUF7QrOTp_Rl8m21bBfX0A79aXXqFM'; // מפתח ה-API החדש שסיפקת
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`; // נקודת קצה מעודכנת ל-gemini-2.0-flash

// DOM Elements
const questionText = document.getElementById('questionText');
const answerText   = document.getElementById('answerText');
const prevBtn      = document.getElementById('prevBtn');
const nextBtn      = document.getElementById('nextBtn');
const progressBar  = document.getElementById('progressBar');
const questionCounter = document.getElementById('questionCounter');
const searchInput  = document.getElementById('searchInput');
const searchBtn    = document.getElementById('searchBtn');
const pageInput    = document.getElementById('pageInput');
const goToBtn      = document.getElementById('goToBtn');

// Explanation elements
const explanationBtn = document.getElementById('explanationBtn');
const explanationDiv = document.getElementById('explanation');
const explanationText = document.getElementById('explanationText');
const explanationSource = document.getElementById('explanationSource');

// Chat elements
const fabBtn       = document.getElementById('chatBtn');
const chatWindow   = document.getElementById('chatWindow');
const chatClose    = document.getElementById('chatClose');
const chatMessages = document.getElementById('chatMessages');
const chatInput    = document.getElementById('chatInput');
const chatSend     = document.getElementById('chatSend');
const loadingSpinner = document.getElementById('loadingSpinner');

// State
let allQuestions = [];
let filtered = [];
let index = 0;
const STORAGE_INDEX = 'pilot_theory_index';
const STORAGE_TERM  = 'pilot_theory_term';
const STORAGE_CHAT_HISTORY = 'pilot_theory_chat_history';

// == Load Questions
async function loadQuestions(){
  try{
    const res = await fetch(DATA_URL);
    const data = await res.json();
    const arr = Array.isArray(data) ? data : (data?.questions ?? []);
    if (!Array.isArray(arr) || !arr.length) throw new Error('questions.json is not in the required format.');

    allQuestions = arr.map(q => ({
      id: Number(q.id),
      question: String(q.question ?? '').trim(),
      answer: String(q.answer ?? '').trim(),
      explanation: String(q.explanation ?? '').trim(), // New field
      source: String(q.source ?? '').trim()          // New field
    }));

    const savedTerm = localStorage.getItem(STORAGE_TERM) || '';
    filtered = savedTerm ? runFilter(savedTerm) : allQuestions;
    if (savedTerm) searchInput.value = savedTerm;

    const savedIdx = Number(localStorage.getItem(STORAGE_INDEX));
    index = Number.isFinite(savedIdx) && savedIdx >= 0 && savedIdx < filtered.length ? savedIdx : 0;

    render();
  }catch(err){
    console.error('Error loading questions:', err);
    questionText.textContent = 'שגיאה בטעינת השאלות (questions.json). אנא וודא שהקובץ קיים ובפורמט תקין.';
  }
}

// == Render Question and Answer
function render(){
  if (!filtered.length){
    questionText.textContent = 'אין שאלות התואמות לחיפוש.';
    answerText.textContent = '';
    hideExplanation();
    updateProgress();
    return;
  }
  const q = filtered[index];
  questionText.textContent = q.question;
  answerText.textContent   = q.answer;
  
  // Hide explanation when moving to new question
  hideExplanation();
  
  updateProgress();
  persist();
}

// == Update Progress Bar and Counter
function updateProgress(){
  const total = filtered.length;
  const pos = total ? index + 1 : 0;
  questionCounter.textContent = `שאלה ${pos} מתוך ${total}`;
  progressBar.style.width = (total ? (pos/total*100) : 0) + '%';
  
  pageInput.max = total;
  pageInput.placeholder = total ? `1-${total}` : 'מספר';
}

// == Persist State to Local Storage
function persist(){
  localStorage.setItem(STORAGE_INDEX, String(index));
  localStorage.setItem(STORAGE_TERM, searchInput.value.trim());
}

// == Page Navigation
function goToPage(){
  if (!filtered.length) return;
  
  const pageNum = parseInt(pageInput.value);
  if (!Number.isFinite(pageNum) || pageNum < 1 || pageNum > filtered.length) {
    pageInput.value = ''; // Clear invalid input
    return;
  }
  
  index = pageNum - 1;
  pageInput.value = ''; // Clear input after valid navigation
  render();
}

// == Explanation Logic
async function toggleExplanation(){
  if (explanationDiv.classList.contains('show')) {
    hideExplanation();
  } else {
    // Check if explanation already exists in the question object
    const currentQuestion = filtered[index];
    if (currentQuestion.explanation && currentQuestion.explanation !== "טוען הסבר..." && currentQuestion.explanation !== "לא התקבל הסבר.") {
      showExplanation(currentQuestion.explanation, currentQuestion.source);
    } else {
      explanationText.textContent = 'טוען הסבר...';
      explanationSource.textContent = '';
      explanationDiv.classList.add('show');
      explanationBtn.textContent = 'טוען...';
      explanationBtn.disabled = true;

      try {
        const prompt = `הסבר בעברית פשוטה וברורה את ההיגיון מאחורי השאלה והתשובה הבאות, מתחום חוקת האוויר והתעופה בישראל. התמקד במשמעות המעשית של החוק או התקנה. ציין את מספר התקנה או החוק אם רלוונטי בסוף ההסבר, לדוגמה: (תקנה 71). אם אין מקור ספציפי, אל תציין. אם אין הסבר, ציין זאת במפורש.
        
        שאלה: "${currentQuestion.question}"
        תשובה: "${currentQuestion.answer}"`;

        const geminiExplanation = await askGemini(prompt);
        currentQuestion.explanation = geminiExplanation; // Save to state
        showExplanation(geminiExplanation, ''); // Source might be embedded in explanation or not present.
      } catch (error) {
        console.error('Error fetching explanation from Gemini:', error);
        currentQuestion.explanation = `אופס, קרתה שגיאה בקבלת ההסבר: ${error.message}`;
        showExplanation(currentQuestion.explanation, '');
      } finally {
        explanationBtn.disabled = false;
        explanationBtn.textContent = 'הסתר הסבר';
      }
    }
  }
}

function showExplanation(text, source){
  explanationText.innerHTML = text.replace(/\n/g, '<br>');
  explanationSource.textContent = source ? `מקור: ${source}` : '';
  explanationDiv.classList.add('show');
  explanationBtn.textContent = 'הסתר הסבר';
}

function hideExplanation(){
  explanationDiv.classList.remove('show');
  explanationBtn.textContent = 'הסבר באמצעות AI';
}


// == Navigation Actions
function next(){ 
  if(!filtered.length) return; 
  index = (index + 1) % filtered.length; 
  render(); 
}

function prev(){ 
  if(!filtered.length) return; 
  index = (index - 1 + filtered.length) % filtered.length; 
  render(); 
}

// == Search and Filter
function runFilter(term){
  const t = term.trim().toLowerCase();
  if (!t) return allQuestions;
  return allQuestions.filter(q =>
    q.question.toLowerCase().includes(t) ||
    q.answer.toLowerCase().includes(t)
  );
}

function runSearch(){ 
  filtered = runFilter(searchInput.value); 
  index = 0; 
  render(); 
}

// == Keyboard Navigation (doesn't interfere with typing in input fields)
document.addEventListener('keydown', (e) => {
  const tag = (document.activeElement?.tagName) || '';
  const typing = tag === 'INPUT' || tag === 'TEXTAREA';
  if (typing) return;

  if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') next();
  if (e.key === 'ArrowLeft') prev();
});

// == Event Listeners
nextBtn.addEventListener('click', next);
prevBtn.addEventListener('click', prev);
searchBtn.addEventListener('click', runSearch);
searchInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') runSearch(); });
explanationBtn.addEventListener('click', toggleExplanation);
goToBtn.addEventListener('click', goToPage);
pageInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') goToPage(); });

// == Chat Helpers
function addMsg(text, who='bot'){
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + (who==='user' ? 'user' : 'bot');
  const av = document.createElement('div'); av.className = 'avatar'; av.textContent = who==='user' ? '👤' : '🤖';
  const bubble = document.createElement('div'); bubble.className = 'bubble'; bubble.textContent = text;
  wrap.appendChild(av); wrap.appendChild(bubble);
  chatMessages.appendChild(wrap);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  // Save chat history
  const history = JSON.parse(localStorage.getItem(STORAGE_CHAT_HISTORY) || '[]');
  history.push({text, who});
  localStorage.setItem(STORAGE_CHAT_HISTORY, JSON.stringify(history));
}

// Load chat history on window open
function loadChatHistory() {
  const history = JSON.parse(localStorage.getItem(STORAGE_CHAT_HISTORY) || '[]');
  chatMessages.innerHTML = ''; // Clear initial bot message
  // Add initial bot message
  chatMessages.innerHTML = `
    <div class="msg bot">
      <div class="avatar">🤖</div>
      <div class="bubble">היי! שאל/י כל דבר על תעופה. אענה עניינית וברורה. אם חסר משהו—אשאל הבהרה קצרה.</div>
    </div>
  `;
  history.forEach(msg => addMsg(msg.text, msg.who));
}


// == Gemini API Call for Chat
async function askGemini(prompt){
  const system = [
    'אתה עוזר וירטואלי מומחה בתחום התעופה וחוקת האוויר בישראל.',
    'ענה בעברית טבעית וברורה על כל שאלה הקשורה לתעופה, חוקים, תקנות, נוהלי טיסה ועוד.',
    'ענייניות ראשונה: קצר כשאפשר, מפורט רק כשנדרש.',
    'אם חסר מידע מהשאלה כדי לענות במדויק — בקש הבהרה קצרה (שאלה אחת) לפני מתן תשובה.',
    'אל תמציא עובדות; אם אינך בטוח לגבי פרט כלשהו, אמור שאינך בטוח או שזה דורש בדיקה נוספת.',
    'השתמש בדוגמאות או סעיפים קצרים כשזה מבהיר את התשובה.',
    'שמור על טון מקצועי, אדיב ועוזר.'
  ].join(' ');

  const body = { 
    contents:[
      { role:'user', parts:[{ text: system }] },
      { role:'user', parts:[{ text: prompt }] }
    ]
  };

  const res = await fetch(GEMINI_ENDPOINT,{
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  if(!res.ok){
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `שגיאת רשת או שרת: ${res.status}`;
    throw new Error('שגיאה מה-AI: ' + errorMessage);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'לא התקבלה תשובה מה-AI.';
}

// == Chat Open/Close (FAB)
function openChat(){ 
  chatWindow.style.display = 'flex'; 
  chatWindow.setAttribute('aria-hidden','false'); 
  loadChatHistory(); // Load history when opening
  chatInput.focus();
}

function closeChat(){ 
  chatWindow.style.display = 'none'; 
  chatWindow.setAttribute('aria-hidden','true'); 
}

fabBtn.addEventListener('click', openChat);
chatClose.addEventListener('click', closeChat);

// == Chat Send Message
async function sendChat(){
  const text = chatInput.value.trim();
  if(!text) return;
  addMsg(text,'user');
  chatInput.value = '';
  loadingSpinner.hidden = false;
  try{
    const reply = await askGemini(text);
    addMsg(reply,'bot');
  }catch(err){
    addMsg(err.message || 'אירעה שגיאה.', 'bot');
  }finally{
    loadingSpinner.hidden = true;
  }
}
chatSend.addEventListener('click', sendChat);
chatInput.addEventListener('keydown',(e)=>{ if(e.key==='Enter') sendChat(); });

// == Initialize Application
loadQuestions();
