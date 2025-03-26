// Configuration object
const config = {
  startHour: 8,
  endHour: 21,
  announceType: 'halfhour', // Default to half-hour
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
    currentTime: "Current time is"
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
    currentTime: "现在是"
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

let timerId = null;

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

  // Generate speech text
  let speechText = '';
  let shouldAnnounce = false;

  if (initialAnnouncement) {
    shouldAnnounce = true;
    if (config.announceType === 'hour') {
      speechText = `${t.currentTime} ${hours % 12 || 12} ${t.oclock}`;
    } else {
      speechText = `${t.currentTime} ${hours % 12 || 12}${t.halfPast}`;
    }
  } else {
    if (minutes === 0 && config.announceType === 'hour') {
      speechText = `${t.currentTime} ${hours % 12 || 12} ${t.oclock}`;
      shouldAnnounce = true;
    } else if (minutes === 30 && config.announceType === 'halfhour') {
      speechText = `${t.currentTime} ${hours % 12 || 12}${t.halfPast}`;
      shouldAnnounce = true;
    }
  }

  if (shouldAnnounce && speechText && isWithinTimeRange(now)) {
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = lang === 'en' ? 'en-US' : 'zh-CN';
    window.speechSynthesis.speak(utterance);

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
  if (timerId) clearTimeout(timerId);

  announceTime(initialAnnouncement);

  const msToNext = getMsToNextAnnouncement();
  timerId = setTimeout(() => {
    setupTimer(false);
  }, msToNext);
}

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
}

window.onload = initApp;
