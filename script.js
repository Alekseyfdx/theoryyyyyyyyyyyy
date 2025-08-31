// Pilot Theory Trainer Logic - יוליה ✈️

// === API Keys and Endpoints ===
// ⚠️ חשוב: הכנס את המפתח שלך כאן כדי להשתמש ב-API של ג'מיני.
// החלף את 'AIzaSyD7xSUF7QrOTp_Rl8m21bBfX0A79aXXqFM' במפתח שלך.
const GEMINI_API_KEY = "AIzaSyAM2nVC5eLtukf3B1VxeyFCBQIu898N5QY";
const GEMINI_EXPLANATION_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";
const GEMINI_TTS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";

// === מצב האפליקציה ===
let questions = [];
let currentQuestionIndex = 0;
let filteredQuestions = null;
let chatHistory = [];
let audioContext = null;

// === גישה לאלמנטים ב-DOM ===
const $ = id => document.getElementById(id);

// אלמנטים
const appContent = $('appContent');
const loading = $('loading');
const questionText = $('questionText');
const answerText = $('answerText');
const explanationBtn = $('explanationBtn');
const explanation = $('explanation');
const explanationText = $('explanationText');
const prevBtn = $('prevBtn');
const nextBtn = $('nextBtn');
const searchInput = $('searchInput');
const searchBtn = $('searchBtn');
const questionCounter = $('questionCounter');
const pageInput = $('pageInput');
const goToBtn = $('goToBtn');
const chatFab = $('chatFab');
const chatWindow = $('chatWindow');
const chatCloseBtn = $('chatCloseBtn');
const chatMessages = $('chatMessages');
const chatInput = $('chatInput');
const chatSendBtn = $('chatSendBtn');
const speakQuestionBtn = $('speakQuestionBtn');
const speakAnswerBtn = $('speakAnswerBtn');


// === פונקציות עזר ===
function showMessage(message) {
  const messageBox = document.createElement('div');
  messageBox.textContent = message;
  messageBox.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 20px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    z-index: 2000;
    text-align: center;
  `;
  document.body.appendChild(messageBox);
  setTimeout(() => messageBox.remove(), 3000);
}

// המרת base64 ל-ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// המרת PCM ל-WAV
function pcmToWav(pcmData, sampleRate) {
  const numChannels = 1;
  const sampleBits = 16;
  const buffer = new ArrayBuffer(44 + pcmData.byteLength);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + pcmData.byteLength, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate (sample rate * block align)
  view.setUint32(28, sampleRate * numChannels * sampleBits / 8, true);
  // block align (channels * bits per sample / 8)
  view.setUint16(32, numChannels * sampleBits / 8, true);
  // bits per sample
  view.setUint16(34, sampleBits, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, pcmData.byteLength, true);
  // write the PCM data
  let offset = 44;
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(offset, pcmData[i], true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

// === לוגיקת האפליקציה ===

// טעינת שאלות
async function loadQuestions() {
  loading.style.display = 'flex';
  appContent.style.display = 'none';

  try {
    const response = await fetch('questions.json');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    questions = data.questions || [];
    if (questions.length === 0) {
      throw new Error('questions.json is empty');
    }
  } catch (error) {
    console.error('שגיאה בטעינת questions.json:', error);
    showMessage('לא ניתן היה לטעון שאלות. נעשה שימוש בנתונים חלופיים.');
    questions = getBackupQuestions();
  }

  filteredQuestions = [...questions];
  showQuestion(0);
  loading.style.display = 'none';
  appContent.style.display = 'block';
}

function getBackupQuestions() {
  return [
    { "id": 1, "question": "מטוס בעל רישום ישראלי, המבצע טיסה מעל הים בתחום FIR מסוים, יטוס לפי כללי הטיסה:", "answer": "של המדינה שבתחומה נמצא אותו FIR." },
    { "id": 2, "question": "טייס של מטוס בעל רישום ישראלי, יקיים בעת טיסתו מעל מים בינלאומיים, אשר אינם תחת פיקוח מדינה מוגדרת, את כללי הטיסה של:", "answer": "המוגדרים ב-ANNEX 2." },
    { "id": 3, "question": "טייס של מטוס בעל רישום ישראלי, יקיים בעת טיסתו בתחומי מדינה זרה את כללי הטיסה הנהוגים ב:", "answer": "באותה מדינה." },
    { "id": 4, "question": "איזה מהפעולות הבאות מוגדרת כתחזוקה קלה, לפי חוק הטיס 2011?", "answer": "החלפת יחידת הפעלה של מכשיר רדיו." },
    { "id": 5, "question": "על פי האמור בתקנה 71, לא יטיס אדם כלי טיס אלא אם מצויות בו לפחות תעודות אלה:", "answer": "רישום כלי הטיס, כשרות אוויר, רישיון תחנת רדיו, יומן טיסה, ביטוח בתוקף." },
    { "id": 6, "question": "מתי על טייס לדווח על תקלה בכלי טיס לגורם המוסמך?", "answer": "כאשר התקלה עלולה לסכן את בטיחות הטיסה או כאשר היא משפיעה על כשרות הטיס." },
    { "id": 7, "question": "מהי 'תקופת חידוש' כהגדרתה בחוק הטיס?", "answer": "תקופה של 60 יום לפני פקיעת רישיון, שבמהלכה בעל הרישיון רשאי לקיים את התנאים לחידושו." },
    { "id": 8, "question": "האם טייס רשאי להטיס כלי טיס אם תוקף התעודה הרפואית שלו פג?", "answer": "לא. רישיון הטיס לא יהיה תקף ללא תעודה רפואית בתוקף." },
    { "id": 9, "question": "מהו הכלל לגבי גובה טיסה מינימלי?", "answer": "בשטח מיושב - 1000 רגל מעל המכשול הגבוה ביותר בטווח של 600 מטר מהמטוס. בשטח לא מיושב - 500 רגל מעל הקרקע או המים." },
    { "id": 10, "question": "מהי 'בדיקה לפני טיסה'?", "answer": "בדיקה ויזואלית ותפקודית של המטוס, שמטרתה לגלות פגמים או תקלות גלויות לעין המשפיעות על הבטיחות." }
  ];
}

function showQuestion(index) {
  const arr = filteredQuestions || questions;
  if (!arr[index]) return;

  currentQuestionIndex = index;
  const q = arr[currentQuestionIndex];

  questionText.textContent = q.question;
  answerText.textContent = q.answer || '';
  explanation.setAttribute('aria-hidden', 'true');
  explanationText.textContent = '';

  questionCounter.textContent = `שאלה ${currentQuestionIndex + 1} מתוך ${arr.length}`;
  pageInput.value = currentQuestionIndex + 1;
}

// === טיפול באירועים ===

prevBtn.addEventListener('click', () => {
  const newIndex = (currentQuestionIndex - 1 + filteredQuestions.length) % filteredQuestions.length;
  showQuestion(newIndex);
});

nextBtn.addEventListener('click', () => {
  const newIndex = (currentQuestionIndex + 1) % filteredQuestions.length;
  showQuestion(newIndex);
});

explanationBtn.addEventListener('click', async () => {
  if (!GEMINI_API_KEY) {
    showMessage("מפתח ה-API אינו מוגדר. אנא הכנס אותו בקובץ script.js.");
    return;
  }

  const currentQuestion = filteredQuestions[currentQuestionIndex];
  const prompt = `הסבר בקצרה (עד 5 משפטים) את שאלת מבחן התיאוריה לטייס הבאה בעברית:\nשאלה: "${currentQuestion.question}"\nתשובה נכונה: "${currentQuestion.answer}"\nהסבר:`;

  explanation.setAttribute('aria-hidden', 'false');
  explanationText.textContent = "🤖 מקבל הסבר...";
  explanationBtn.disabled = true;

  try {
    const response = await fetch(`${GEMINI_EXPLANATION_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`שגיאת API: ${errorData.error.message}`);
    }
    
    const result = await response.json();
    const explanationTextFromAPI = result.candidates[0].content.parts[0].text;
    explanationText.textContent = explanationTextFromAPI;

  } catch (error) {
    console.error('שגיאה בקבלת ההסבר:', error);
    explanationText.textContent = "אירעה שגיאה בקבלת ההסבר. אנא נסה שוב מאוחר יותר.";
  } finally {
    explanationBtn.disabled = false;
  }
});

searchBtn.addEventListener('click', () => {
  const searchTerm = searchInput.value.trim();
  if (searchTerm === '') {
    filteredQuestions = [...questions];
  } else {
    filteredQuestions = questions.filter(q =>
      q.question.includes(searchTerm) ||
      (q.answer && q.answer.includes(searchTerm))
    );
  }
  if (filteredQuestions.length === 0) {
    showMessage('לא נמצאו שאלות התואמות לחיפוש.');
  }
  showQuestion(0);
});

goToBtn.addEventListener('click', () => {
  const pageNum = parseInt(pageInput.value, 10);
  if (pageNum && pageNum >= 1 && pageNum <= filteredQuestions.length) {
    showQuestion(pageNum - 1);
  } else {
    showMessage(`מספר שאלה לא חוקי. אנא הכנס מספר בין 1 ל-${filteredQuestions.length}.`);
  }
});

// === לוגיקת צ'אט AI חדשה ===
chatFab.addEventListener('click', () => {
  chatWindow.setAttribute('aria-hidden', 'false');
});

chatCloseBtn.addEventListener('click', () => {
  chatWindow.setAttribute('aria-hidden', 'true');
});

chatSendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

async function sendMessage() {
  const userMessage = chatInput.value.trim();
  if (!userMessage) return;

  appendMessage(userMessage, 'user');
  chatInput.value = '';
  
  if (!GEMINI_API_KEY) {
    appendMessage("מפתח ה-API אינו מוגדר.", 'bot');
    return;
  }
  
  appendMessage("...מקליד", 'bot', true);

  // הוספת הודעת המשתמש להיסטוריה
  chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });

  try {
    const response = await fetch(`${GEMINI_EXPLANATION_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: chatHistory
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`שגיאת API: ${errorData.error.message}`);
    }

    const result = await response.json();
    const botMessage = result.candidates[0].content.parts[0].text;
    
    // הוספת הודעת הבוט להיסטוריה
    chatHistory.push({ role: 'model', parts: [{ text: botMessage }] });
    
    removeTypingIndicator();
    appendMessage(botMessage, 'bot');
  } catch (error) {
    console.error('שגיאה בצ'אט:', error);
    removeTypingIndicator();
    appendMessage("אירעה שגיאה. אנא נסה שוב.", 'bot');
  }
}

function appendMessage(text, sender, isTyping = false) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('msg', sender);
  if (isTyping) {
    msgDiv.id = 'typingIndicator';
  }
  
  const avatarDiv = document.createElement('div');
  avatarDiv.classList.add('avatar');
  avatarDiv.textContent = sender === 'user' ? '🧑‍🎓' : '🤖';

  const bubbleDiv = document.createElement('div');
  bubbleDiv.classList.add('bubble');
  bubbleDiv.textContent = text;

  msgDiv.appendChild(avatarDiv);
  msgDiv.appendChild(bubbleDiv);
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const typingIndicator = $('typingIndicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// === לוגיקת טקסט לדיבור (TTS) חדשה ===
async function speakText(text) {
  if (!GEMINI_API_KEY) {
    showMessage("מפתח ה-API אינו מוגדר.");
    return;
  }
  
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  try {
    const response = await fetch(`${GEMINI_TTS_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Fenrir" }
            }
          }
      })
    });

    const result = await response.json();
    const audioData = result.candidates[0].content.parts[0].inlineData.data;
    const pcmData = base64ToArrayBuffer(audioData);
    const pcm16 = new Int16Array(pcmData);

    const wavBlob = pcmToWav(pcm16, 16000); // Sample rate is 16kHz
    const audioUrl = URL.createObjectURL(wavBlob);
    
    const audio = new Audio(audioUrl);
    audio.play();

  } catch (error) {
    console.error('שגיאה בהפעלת TTS:', error);
    showMessage("שגיאה בהפעלת הדיבור. נסה שוב מאוחר יותר.");
  }
}

speakQuestionBtn.addEventListener('click', () => speakText(questionText.textContent));
speakAnswerBtn.addEventListener('click', () => speakText(answerText.textContent));

// טעינת שאלות בהפעלת הדף
window.onload = loadQuestions;
