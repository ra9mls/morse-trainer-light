// Словарь Морзе для русского алфавита
const MORSE_RU = {
  'А': '.-',    'Б': '-...',  'В': '.--',   'Г': '--.',   'Д': '-..',
  'Е': '.',     'Ж': '...-',  'З': '--..',  'И': '..',    'Й': '.---',
  'К': '-.-',   'Л': '.-..',  'М': '--',    'Н': '-.',    'О': '---',
  'П': '.--.',  'Р': '.-.',   'С': '...',   'Т': '-',     'У': '..-',
  'Ф': '..-.',  'Х': '....',  'Ц': '-.-.',  'Ч': '---.',  'Ш': '----',
  'Щ': '--.-',  'Ъ': '--.--', 'Ы': '-.--',  'Ь': '-..-',  'Э': '..-..',
  'Ю': '..--',  'Я': '.-.-'
};

const LETTERS = Object.keys(MORSE_RU);

let currentLetter = '';
let currentMorse = '';
let currentIndex = 0;
let score = 0;
let timer = null;
let timeLeft = 10;
let allowInput = true;
let retry = false;

const letterEl = document.getElementById('current-letter');
const morseEl = document.getElementById('morse-code');
const feedbackEl = document.getElementById('morse-feedback');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');

const chantEl = document.createElement('div');
chantEl.className = 'chant';
chantEl.style.marginTop = '10px';
chantEl.style.textAlign = 'center';
chantEl.style.fontSize = '1.1rem';
chantEl.style.color = '#ffd700';
const letterArea = document.querySelector('.letter-area');
letterArea.parentNode.insertBefore(chantEl, letterArea.nextSibling);

// Удаляю fetch('song.json') и использую window.chantsByLetter
let chantsByLetter = window.chantsByLetter || {};

function updateChant() {
  chantEl.textContent = chantsByLetter[currentLetter] || '';
}

function getRandomLetter() {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)];
}

function showNewLetter() {
  currentLetter = getRandomLetter();
  currentMorse = MORSE_RU[currentLetter];
  currentIndex = 0;
  retry = false;
  allowInput = true;
  timeLeft = 10;
  letterEl.textContent = currentLetter;
  morseEl.textContent = currentMorse;
  updateFeedback();
  updateTimer();
  updateChant();
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    updateTimer();
    if (timeLeft <= 0) {
      handleFail();
    }
  }, 1000);
}

function updateFeedback(stateArr) {
  feedbackEl.innerHTML = '';
  for (let i = 0; i < currentMorse.length; i++) {
    const span = document.createElement('span');
    span.className = 'feedback-symbol';
    span.textContent = currentMorse[i];
    if (stateArr) {
      if (stateArr[i] === 'correct') span.classList.add('correct');
      else if (stateArr[i] === 'incorrect') span.classList.add('incorrect');
      else if (stateArr[i] === 'active') span.classList.add('active');
    } else {
      if (i === 0) span.classList.add('active');
    }
    feedbackEl.appendChild(span);
  }
}

function updateTimer() {
  timerEl.textContent = timeLeft;
}

function updateScore() {
  scoreEl.textContent = score;
}

let pressStart = 0;
let stateArr = [];

// Новые константы длительности
const DOT_MAX = 300; // мс (точка < 300)
const DASH_MAX = 900; // мс (тире >= 300)
const MAX_PRESS = 1000; // максимальная длительность звука

let audioCtx = null;
let osc = null;
let toneTimeout = null;

function startTone() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 700;
  osc.connect(audioCtx.destination);
  osc.start();
  // Безопасно: автостоп через MAX_PRESS
  toneTimeout = setTimeout(stopTone, MAX_PRESS);
}

function stopTone() {
  if (osc) {
    osc.stop();
    osc.disconnect();
    osc = null;
  }
  if (toneTimeout) {
    clearTimeout(toneTimeout);
    toneTimeout = null;
  }
}

function vibrate(ms = 200) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function resetStateArr() {
  stateArr = Array(currentMorse.length).fill(null);
  stateArr[currentIndex] = 'active';
}

function handleFail() {
  allowInput = false;
  if (timer) clearInterval(timer);
  stateArr[currentIndex] = 'incorrect';
  updateFeedback(stateArr);
  vibrate(300);
  setTimeout(() => {
    showNewLetter();
  }, 1200);
}

function handleSuccess() {
  allowInput = false;
  if (timer) clearInterval(timer);
  score += 10;
  updateScore();
  setTimeout(() => {
    showNewLetter();
  }, 800);
}

function handleInput(isDash) {
  if (!allowInput) return;
  const expected = currentMorse[currentIndex];
  const input = isDash ? '-' : '.';
  if (input === expected) {
    stateArr[currentIndex] = 'correct';
    currentIndex++;
    if (currentIndex < currentMorse.length) {
      stateArr[currentIndex] = 'active';
      updateFeedback(stateArr);
    } else {
      updateFeedback(stateArr);
      handleSuccess();
    }
  } else {
    stateArr[currentIndex] = 'incorrect';
    updateFeedback(stateArr);
    vibrate(200);
    if (!retry) {
      retry = true;
      setTimeout(() => {
        stateArr[currentIndex] = 'active';
        updateFeedback(stateArr);
      }, 500);
    } else {
      handleFail();
    }
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && allowInput && pressStart === 0) {
    pressStart = Date.now();
    startTone();
    e.preventDefault();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && allowInput && pressStart !== 0) {
    const duration = Date.now() - pressStart;
    pressStart = 0;
    stopTone();
    // Проверка: если длительность < DOT_MAX — точка, иначе тире
    if (duration < DOT_MAX) {
      handleInput(false); // точка
    } else if (duration < MAX_PRESS) {
      handleInput(true); // тире
    } else {
      // Слишком долгое нажатие — ошибка
      stateArr[currentIndex] = 'incorrect';
      updateFeedback(stateArr);
      vibrate(200);
      if (!retry) {
        retry = true;
        setTimeout(() => {
          stateArr[currentIndex] = 'active';
          updateFeedback(stateArr);
        }, 500);
      } else {
        handleFail();
      }
    }
    e.preventDefault();
  }
});

function startGame() {
  score = 0;
  updateScore();
  showNewLetter();
  resetStateArr();
}

document.addEventListener('DOMContentLoaded', () => {
  startGame();
}); 