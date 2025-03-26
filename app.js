// Configuration object
const config = {
  startHour: 8,
  endHour: 21,
  announceType: 'halfhour',
  language: 'en'
};

// Locale data for translations
const locale = {
  en: {
    appTitle: "Time Announcer",
    startLabel: "Start Time:",
    endLabel: "End Time:",
    announceLabel: "Announce At:",
    hourLabel: "Hourly",
    halfHourLabel: "Half-hour",
    updateBtn: "Update Settings",
    statusWaiting: "Waiting for next announcement...",
    statusLast: "Last announced at",
    statusInitial: "Announcing current time...",
    scheduleActive: "Active between",
    and: "and",
    announceHour: "Hourly announcements",
    announceHalf: "Half-hour announcements",
    oclock: "o'clock",
    halfPast: "half past",
    currentTime: "The time is now "
  },
  zh: {
    appTitle: "报时器",
    startLabel: "开始时间:",
    endLabel: "结束时间:",
    announceLabel: "报时时间点:",
    hourLabel: "整点",
    halfHourLabel: "半点",
    updateBtn: "更新设置",
    statusWaiting: "等待下一次报时...",
    statusLast: "上次报时:",
    statusInitial: "正在报时...",
    scheduleActive: "报时时段:",
    and: "至",
    announceHour: "仅整点报时",
    announceHalf: "仅半点报时",
    oclock: "点整",
    halfPast: "点30分",
    currentTime: "现在时间是"
  }
};

// DOM elements
const elements = {
  langToggle: document.getElementById('langToggle'),
  appTitle: document.getElementById('appTitle'),
  startLabel: document.getElementById('startLabel'),
  endLabel: document.getElementById('endLabel'),
  announceLabel: document.getElementById('announceLabel'),
  hourLabel: document.getElementById('hourLabel'),
  halfHourLabel: document.getElementById('halfHourLabel'),
  updateBtn: document.getElementById('updateBtn'),
  timeDisplay: document.getElementById('timeDisplay'),
  status: document.getElementById('status'),
  scheduleInfo: document.getElementById('scheduleInfo'),
  startHour: document.getElementById('startHour'),
  endHour: document.getElementById('endHour'),
  announceHour: document.getElementById('announceHour'),
  announceHalfHour: document.getElementById('announceHalfHour')
};

// Create Web Worker for background timing
const workerCode = `
    let timer;
    self.onmessage = function(e) {
        if (e.data.command === 'start') {
            const interval = e.data.interval;
            timer = setInterval(() => {
                self.postMessage('tick');
            }, interval);
        } else if (e.data.command === 'stop') {
            clearInterval(timer);
        }
    };
`;
const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);
const worker = new Worker(workerUrl);

function updateLanguage() {
  const lang = config.language;
  const t = locale[lang];

  elements.appTitle.textContent = t.appTitle;
  elements.startLabel.textContent = t.startLabel;
  elements.endLabel.textContent = t.endLabel;
  elements.announceLabel.textContent = t.announceLabel;
  elements.hourLabel.textContent = t.hourLabel;
  elements.halfHourLabel.textContent = t.halfHourLabel;
  elements.updateBtn.textContent = t.updateBtn;
  elements.langToggle.textContent = lang === 'en' ? '中文' : 'English';

  updateScheduleInfo();
}

function announceTime(initialAnnouncement = false) {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const lang = config.language;
  const t = locale[lang];

  // Update time display with animation
  const displayHours = hours.toString().padStart(2, '0');
  const displayMinutes = minutes.toString().padStart(2, '0');
  elements.timeDisplay.textContent = `${displayHours}:${displayMinutes}`;
  elements.timeDisplay.classList.add('time-update');
  setTimeout(() => {
    elements.timeDisplay.classList.remove('time-update');
  }, 500);

  // Always announce the current time when triggered
  let speechText = '';
  const displayHours12 = hours % 12 || 12;

  if (minutes === 0) {
    speechText = lang === 'en'
      ? `${t.currentTime} ${displayHours12} ${t.oclock}`
      : `${t.currentTime}${hours}${t.oclock}`;
  } else if (minutes === 30) {
    speechText = lang === 'en'
      ? `${t.currentTime} ${t.halfPast} ${displayHours12}`
      : `${t.currentTime}${hours}${t.halfPast}`;
  } else {
    // Announce exact time if not on the hour or half-hour
    speechText = lang === 'en'
      ? `${t.currentTime} ${displayHours12}:${displayMinutes}`
      : `${t.currentTime}${hours}点${displayMinutes}分`;
  }

  if (isWithinTimeRange(now)) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume().then(() => {
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = lang === 'en' ? 'en-US' : 'zh-CN';
      window.speechSynthesis.speak(utterance);
    });

    elements.status.textContent = initialAnnouncement
      ? t.statusInitial
      : `${t.statusLast} ${displayHours}:${displayMinutes}`;
  } else if (!initialAnnouncement) {
    elements.status.textContent = t.statusWaiting;
  }

  updateScheduleInfo();
}

function isWithinTimeRange(time) {
  const totalMinutes = time.getHours() * 60 + time.getMinutes();
  return totalMinutes >= config.startHour * 60 &&
    totalMinutes < config.endHour * 60;
}

function getMsToNextAnnouncement() {
  const now = new Date();
  const currentMinutes = now.getMinutes();
  const currentSeconds = now.getSeconds();
  const currentMs = now.getMilliseconds();

  let nextMinutes;
  if (config.announceType === 'hour') {
    nextMinutes = 60;
  } else { // halfhour
    nextMinutes = currentMinutes < 30 ? 30 : 30;
  }

  const remainingMs = (nextMinutes - currentMinutes - 1) * 60000 +
    (60 - currentSeconds - 1) * 1000 +
    (1000 - currentMs);

  return remainingMs;
}

function updateScheduleInfo() {
  const lang = config.language;
  const t = locale[lang];

  const startText = `${config.startHour.toString().padStart(2, '0')}:00`;
  const endText = `${config.endHour.toString().padStart(2, '0')}:00`;

  let announceText = config.announceType === 'hour'
    ? t.announceHour
    : t.announceHalf;

  elements.scheduleInfo.textContent =
    `${t.scheduleActive} ${startText} ${t.and} ${endText} | ${announceText}`;
}

function updateConfig() {
  config.startHour = parseInt(elements.startHour.value);
  config.endHour = parseInt(elements.endHour.value);

  config.announceType = elements.announceHour.checked ? 'hour' : 'halfhour';

  if (config.endHour <= config.startHour) {
    alert(config.language === 'en'
      ? "End time must be after start time"
      : "结束时间必须晚于开始时间");
    return false;
  }

  return true;
}

function setupTimer(initialAnnouncement = true) {
  // Stop any existing worker
  worker.postMessage({ command: 'stop' });

  // Announce immediately
  announceTime(initialAnnouncement);

  // Calculate interval for worker
  const interval = config.announceType === 'hour' ? 3600000 : 1800000; // 1 hour or 30 minutes

  // Start worker with the calculated interval
  worker.postMessage({
    command: 'start',
    interval: interval
  });
}

// Handle messages from worker
worker.onmessage = function (e) {
  if (e.data === 'tick') {
    announceTime(false);
  }
};

function initApp() {
  elements.langToggle.addEventListener('click', () => {
    config.language = config.language === 'en' ? 'zh' : 'en';
    updateLanguage();
    announceTime(true);
  });

  elements.updateBtn.addEventListener('click', () => {
    if (updateConfig()) {
      setupTimer(true);
    }
  });

  updateLanguage();

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  elements.timeDisplay.textContent = `${hours}:${minutes}`;

  updateConfig();
  setupTimer(true);

  // Handle page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Update display when tab becomes visible again
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      elements.timeDisplay.textContent = `${hours}:${minutes}`;
    }
  });
}

window.onload = initApp;
