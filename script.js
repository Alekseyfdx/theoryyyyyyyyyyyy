// Замените эти строки:
const GEMINI_EXPLANATION_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent";
const GEMINI_TTS_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";

// На:
const GEMINI_EXPLANATION_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
// TTS API пока удалим, так как он не работает в текущей версии
