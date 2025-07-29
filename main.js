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


// Состояние игры
let currentLetter = '';
let currentMorse = '';
let currentIndex = 0;
let score = 0;
let timer = null;
let timeLeft = 10;
let allowInput = true;
let retry = false;

// WPM и адаптивная сложность
let currentWPM = 7; // Начальное значение WPM
let targetWPM = 7; // Целевое значение WPM
let successStreak = 0; // Счетчик успешных попыток
let failStreak = 0; // Счетчик неудачных попыток
let lastLetterStartTime = 0; // Время начала ввода текущей буквы

// Константы для расчета WPM
const DOT_UNITS = 1;
const DASH_UNITS = 3;
const SYMBOL_GAP_UNITS = 1;
const LETTER_GAP_UNITS = 3;
const WORD_GAP_UNITS = 7;
const UNITS_PER_WORD = 50; // PARIS = 50 единиц

const letterEl = document.getElementById('current-letter');
const morseEl = document.getElementById('morse-code');
const feedbackEl = document.getElementById('morse-feedback');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');


const chantEl = document.createElement('div');
chantEl.className = 'chant';
Object.assign(chantEl.style, {
  marginTop: '10px',
  textAlign: 'center',
  fontSize: '1.1rem',
  color: '#ffd700'
});
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

// Рассчитываем количество единиц в букве
function calculateUnitsInLetter(morse) {
  let units = 0;
  for (let i = 0; i < morse.length; i++) {
    units += morse[i] === '.' ? DOT_UNITS : DASH_UNITS;
    if (i < morse.length - 1) units += SYMBOL_GAP_UNITS;
  }
  return units;
}

// Рассчитываем текущий WPM на основе времени ввода
function calculateCurrentWPM(units, timeMs) {
  const timeMinutes = timeMs / (1000 * 60);
  return (units / UNITS_PER_WORD) / timeMinutes;
}

function showNewLetter() {
  currentLetter = getRandomLetter();
  currentMorse = MORSE_RU[currentLetter];
  currentIndex = 0;
  retry = false;
  allowInput = true;
  
  // Устанавливаем время на основе текущего WPM
  const letterUnits = calculateUnitsInLetter(currentMorse);
  const unitsPerSecond = (currentWPM * UNITS_PER_WORD) / 60;
  timeLeft = Math.max(Math.ceil(letterUnits / unitsPerSecond), 5); // минимум 5 секунд
  
  letterEl.textContent = currentLetter;
  morseEl.textContent = currentMorse;
  updateFeedback();
  updateTimer();
  updateChant();
  lastLetterStartTime = Date.now();
  
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    timeLeft--;
    updateTimer();
    if (timeLeft <= 0) {
      stateArr.fill('incorrect');
      updateFeedback(stateArr);
      vibrate(300);
      failStreak++;
      successStreak = 0;
      
      // Адаптируем сложность
      if (failStreak >= 3) {
        currentWPM = Math.max(5, currentWPM - 1);
        failStreak = 0;
      }
      
      timeLeft = Math.max(Math.ceil(letterUnits / unitsPerSecond), 5);
      currentIndex = 0;
      updateTimer();
    }
  }, 1000);
}

function getMorseSVG(symbol) {
  if (symbol === '.') {
    // SVG круг (точка)
    return `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="6" fill="#ffd700"/></svg>`;
  } else if (symbol === '-') {
    // SVG длинный прямоугольник (тире)
    return `<svg width="32" height="12" viewBox="0 0 32 12" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="3" width="28" height="6" rx="3" fill="#ffd700"/></svg>`;
  }
  return symbol;
}


function updateFeedback(stateArr) {
  feedbackEl.innerHTML = '';
  for (let i = 0; i < currentMorse.length; i++) {
    const span = document.createElement('span');
    span.className = 'feedback-symbol';
    span.setAttribute('data-symbol', currentMorse[i]);
    span.innerHTML = getMorseSVG(currentMorse[i]);
    if (stateArr) {
      if (stateArr[i] === 'correct') span.classList.add('correct');
      else if (stateArr[i] === 'incorrect') span.classList.add('incorrect');
      else if (stateArr[i] === 'active') span.classList.add('active');
    } else if (i === 0) {
      span.classList.add('active');
    }
    feedbackEl.appendChild(span);
  }
}

function setIncorrectAndMaybeRetry() {
  stateArr[currentIndex] = 'incorrect';
  updateFeedback(stateArr);
  vibrate(200);
  // Даем возможность повторить ввод в пределах таймера
  setTimeout(() => {
    stateArr[currentIndex] = 'active';
    updateFeedback(stateArr);
  }, 500);
}

function updateTimer() {
  timerEl.textContent = timeLeft;
}

function updateScore() {
  scoreEl.textContent = score;
  document.getElementById('wpm').textContent = currentWPM;
}

let pressStart = 0;
let stateArr = [];

// Адаптивное определение скорости ключевания
const HISTORY_WINDOW = 10000; // окно истории 5 секунд
const MAX_PRESS = 2000; // максимальная длительность звука
const pressHistory = []; // история нажатий
let dotThreshold = 150; // начальное пороговое значение для точки

function updateThresholds() {
  // Удаляем старые записи
  const now = Date.now();
  const cutoffTime = now - HISTORY_WINDOW;
  while (pressHistory.length > 0 && pressHistory[0].time < cutoffTime) {
    pressHistory.shift();
  }

  // Если есть достаточно данных, обновляем пороги
  if (pressHistory.length >= 3) {
    // Сортируем длительности нажатий
    const durations = pressHistory.map(press => press.duration).sort((a, b) => a - b);
    
    // Находим медиану для точек (короткие нажатия)
    const shortPressesDuration = durations.filter(d => d < dotThreshold);
    if (shortPressesDuration.length >= 2) {
      const medianDot = shortPressesDuration[Math.floor(shortPressesDuration.length / 2)];
      // Устанавливаем новый порог как 2x от медианной точки
      dotThreshold = medianDot * 2;
    }
  }
}

let audioCtx = null;
let osc = null;
let toneTimeout = null;

const volumeInput = document.getElementById('volume');
const volumeValue = document.getElementById('volume-value');
let gainNode = null;

volumeInput.addEventListener('input', () => {
  const volume = volumeInput.value;
  volumeValue.textContent = volume + '%';
  if (gainNode) {
    gainNode.gain.value = volume / 100;
  }
});

function startTone() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    gainNode.gain.value = volumeInput.value / 100;
  }
  osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 700;
  osc.connect(gainNode);
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
  stateArr.fill('incorrect');
  updateFeedback(stateArr);
  vibrate(300);
  setTimeout(() => {
    showNewLetter();
  }, 1200);
}

function handleSuccess() {
  allowInput = false;
  if (timer) clearInterval(timer);
  
  // Рассчитываем фактический WPM для введенной буквы
  const timeSpent = Date.now() - lastLetterStartTime;
  const letterUnits = calculateUnitsInLetter(currentMorse);
  const achievedWPM = calculateCurrentWPM(letterUnits, timeSpent);
  
  // Обновляем статистику успехов
  successStreak++;
  failStreak = 0;
  score += 10;
  
  // Адаптируем сложность
  if (successStreak >= 3) {
    currentWPM = Math.min(30, currentWPM + 1); // Максимум 30 WPM
    successStreak = 0;
  }
  
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
    setIncorrectAndMaybeRetry();
  }
}

// Touch-кнопка для мобильных
const touchBtn = document.getElementById('touch-btn');

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

if (isTouchDevice()) {
  touchBtn.style.display = '';
}

let touchPressStart = 0;

touchBtn?.addEventListener('touchstart', (e) => {
  if (!allowInput || pressStart !== 0) return;
  e.preventDefault();
  pressStart = Date.now();
  touchPressStart = pressStart;
  startTone();
  // Анимация нажатия
  touchBtn.style.background = '#1e2a46';
  touchBtn.style.boxShadow = '0 1px 2px #0006';
});


touchBtn?.addEventListener('touchend', (e) => {
  if (!allowInput || touchPressStart === 0) return;
  e.preventDefault();
  const duration = Date.now() - touchPressStart;
  // Добавляем нажатие в историю
  pressHistory.push({
    time: Date.now(),
    duration: duration
  });
  updateThresholds();
  
  pressStart = 0;
  touchPressStart = 0;
  stopTone();
  // Анимация отпускания
  touchBtn.style.background = '#3c8cff';
  touchBtn.style.boxShadow = '0 2px 8px #0003';
  if (duration < dotThreshold) {
    handleInput(false); // точка
  } else if (duration < MAX_PRESS) {
    handleInput(true); // тире
  } else {
    setIncorrectAndMaybeRetry();
  }
});

touchBtn?.addEventListener('touchcancel', (e) => {
  // Сброс анимации и звука при отмене
  pressStart = 0;
  touchPressStart = 0;
  stopTone();
  touchBtn.style.background = '#3c8cff';
  touchBtn.style.boxShadow = '0 2px 8px #0003';
});

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
    // Добавляем нажатие в историю
    pressHistory.push({
      time: Date.now(),
      duration: duration
    });
    updateThresholds();
    
    pressStart = 0;
    stopTone();
    if (duration < dotThreshold) {
      handleInput(false); // точка
    } else if (duration < MAX_PRESS) {
      handleInput(true); // тире
    } else {
      setIncorrectAndMaybeRetry();
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