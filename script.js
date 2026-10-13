/**
 * ============================================================================
 * ROMANTIC SURPRISE APP (CELAMUR STYLE) - CORE SCRIPT
 * ============================================================================
 */

(function () {
  'use strict';

  // --- Состояние приложения ---
  const state = {
    selectedActivity: null,
    selectedDate: null,
    selectedTime: null,
    isMusicPlaying: false,
    audioCtx: null,
    musicInterval: null
  };

  const config = window.APP_CONFIG || {
    recipientName: "Даша",
    senderName: "Никита",
    secretQuestion: "где мы познакомились?",
    secretAnswers: ["кафе"],
    secretErrorHint: "Неправильный ответ... Вспомни получше! 😉",
    envelopeBadge: "Даша",
    letterHeader: "это тебе, Даша",
    letterGreeting: "Даша, с днём рождения!",
    letterBody: ["Люблю тебя."],
    letterSign: "твой Никита",
    polaroidPhoto: "assets/polaroid_placeholder.png",
    polaroidCaption: "мими!",
    activities: [],
    dates: [],
    times: [],
    portraitPhoto: "assets/portrait_placeholder.png",
    mosaicWord: "ДАША",
    mosaicTargetCount: 1450,
    mosaicSubtext: "по {count} раз думаю о тебе каждый день {name})",
    telegramUsername: ""
  };

  // --- Инициализация Telegram WebApp SDK ---
  const tg = window.Telegram?.WebApp;
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (tg.enableClosingConfirmation) tg.enableClosingConfirmation();
      if (tg.setHeaderColor) tg.setHeaderColor('#120515');
      if (tg.setBackgroundColor) tg.setBackgroundColor('#120515');
    } catch (e) {
      console.warn("Telegram WebApp init:", e);
    }
  }

  function triggerHaptic(type = 'light') {
    if (tg?.HapticFeedback) {
      if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
      else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
      else tg.HapticFeedback.impactOccurred(type);
    }
  }

  // --- Навигация по экранам ---
  function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(s => {
      s.classList.remove('active');
    });

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      triggerHaptic('light');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // --- Звуковой синтезатор на Web Audio API (романтичная музыка-шкатулка / арфа) ---
  function initAudio() {
    if (!state.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        state.audioCtx = new AudioContext();
      }
    }
    if (state.audioCtx && state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }
  }

  function playTone(freq, duration = 1.2, delay = 0) {
    if (!state.audioCtx) return;
    setTimeout(() => {
      try {
        const osc = state.audioCtx.createOscillator();
        const gain = state.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, state.audioCtx.currentTime);

        gain.gain.setValueAtTime(0.001, state.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, state.audioCtx.currentTime + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, state.audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(state.audioCtx.destination);

        osc.start();
        osc.stop(state.audioCtx.currentTime + duration);
      } catch (err) {}
    }, delay);
  }

  // Приятные аккорды (C-maj9 / A-min9 / F-maj7)
  const melodyNotes = [
    [261.63, 329.63, 392.00, 493.88], // C, E, G, B
    [220.00, 261.63, 329.63, 392.00], // A, C, E, G
    [174.61, 220.00, 261.63, 329.63], // F, A, C, E
    [196.00, 246.94, 293.66, 392.00]  // G, B, D, G
  ];

  let melodyIndex = 0;
  function startMusicLoop() {
    if (state.musicInterval) clearInterval(state.musicInterval);
    state.isMusicPlaying = true;
    document.getElementById('musicToggleBtn')?.classList.add('playing');

    function playChord() {
      if (!state.isMusicPlaying) return;
      const chord = melodyNotes[melodyIndex % melodyNotes.length];
      chord.forEach((freq, idx) => {
        playTone(freq, 2.4, idx * 180);
      });
      melodyIndex++;
    }

    playChord();
    state.musicInterval = setInterval(playChord, 2200);
  }

  function stopMusicLoop() {
    state.isMusicPlaying = false;
    document.getElementById('musicToggleBtn')?.classList.remove('playing');
    if (state.musicInterval) {
      clearInterval(state.musicInterval);
      state.musicInterval = null;
    }
  }

  // --- Романтический салют сердечек и бабочек ---
  function spawnHearts(count = 14, x = null, y = null) {
    const container = document.getElementById('particleContainer');
    if (!container) return;

    const emojis = ['🤍', '🌸', '✨', '💖', '🕊️'];
    const startX = x !== null ? x : window.innerWidth / 2;
    const startY = y !== null ? y : window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
      const span = document.createElement('span');
      span.className = 'floating-heart';
      span.textContent = emojis[Math.floor(Math.random() * emojis.length)];

      const offsetX = (Math.random() - 0.5) * 160;
      const offsetY = (Math.random() - 0.5) * 60;
      const dur = 1.8 + Math.random() * 1.2;

      span.style.left = `${startX + offsetX}px`;
      span.style.top = `${startY + offsetY}px`;
      span.style.animationDuration = `${dur}s`;

      container.appendChild(span);
      setTimeout(() => span.remove(), dur * 1000);
    }
  }

  // --- Фоновые мерцающие звёздочки (Canvas) ---
  function initStars() {
    const canvas = document.getElementById('starsCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const stars = Array.from({ length: 45 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.4 + 0.4,
      alpha: Math.random(),
      speed: Math.random() * 0.015 + 0.005
    }));

    function animate() {
      ctx.clearRect(0, 0, width, height);
      stars.forEach(s => {
        s.alpha += s.speed;
        if (s.alpha > 1 || s.alpha < 0) s.speed = -s.speed;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 200, 220, ${Math.abs(s.alpha)})`;
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

  // --- Инициализация и привязка данных из config.js ---
  function populateConfigData() {
    // 1. Вопрос
    const qText = document.getElementById('questionText');
    if (qText && config.secretQuestion) qText.textContent = config.secretQuestion;

    // 2. Конверт
    const envHead = document.getElementById('envelopeHeading');
    if (envHead) envHead.textContent = `${config.recipientName}, тебе письмо`;
    const waxText = document.getElementById('waxSealText');
    if (waxText) waxText.textContent = config.envelopeBadge || config.recipientName;

    // 3. Письмо
    const letRec = document.getElementById('letterRecipient');
    if (letRec) letRec.textContent = config.letterHeader || `это тебе, ${config.recipientName}`;
    const letGreet = document.getElementById('letterGreeting');
    if (letGreet) letGreet.textContent = config.letterGreeting;

    const bodyCont = document.getElementById('letterBodyContainer');
    if (bodyCont && Array.isArray(config.letterBody)) {
      bodyCont.innerHTML = config.letterBody.map(p => `<p>${p}</p>`).join('');
    }

    const polImg = document.getElementById('polaroidImage');
    if (polImg && config.polaroidPhoto) polImg.src = config.polaroidPhoto;
    const polCap = document.getElementById('polaroidCaption');
    if (polCap && config.polaroidCaption) polCap.textContent = config.polaroidCaption;

    const letSign = document.getElementById('letterSign');
    if (letSign && config.letterSign) letSign.textContent = config.letterSign;

    // 4. Варианты свиданий
    const actList = document.getElementById('activitiesList');
    if (actList && Array.isArray(config.activities)) {
      actList.innerHTML = config.activities.map((act, idx) => `
        <div class="activity-card" data-id="${act.id}" data-index="${idx}">
          <span class="activity-icon">${act.icon || '✨'}</span>
          <div class="activity-info">
            <span class="activity-title">${act.title}</span>
            <span class="activity-subtitle">${act.subtitle}</span>
          </div>
        </div>
      `).join('');
    }

    // 5. Даты
    const dateWheel = document.getElementById('dateWheel');
    if (dateWheel && Array.isArray(config.dates)) {
      dateWheel.innerHTML = config.dates.map((d, idx) => `
        <div class="picker-item ${idx === 0 ? 'selected' : ''}" data-day="${d.day}" data-weekday="${d.weekday}">
          <span class="picker-day">${d.day}</span>
          <span class="picker-weekday">${d.weekday}</span>
        </div>
      `).join('');
      if (config.dates.length > 0) {
        state.selectedDate = config.dates[0];
      }
    }

    // 6. Время
    const timeWheel = document.getElementById('timeWheel');
    if (timeWheel && Array.isArray(config.times)) {
      timeWheel.innerHTML = config.times.map((t, idx) => `
        <div class="picker-item ${idx === 0 ? 'selected' : ''}" data-time="${t}">
          <span class="picker-time-val">${t}</span>
        </div>
      `).join('');
      if (config.times.length > 0) {
        state.selectedTime = config.times[0];
      }
    }

    // 7. Финал: текст под портретом
    const capCount = document.getElementById('mosaicCaptionCount');
    if (capCount) capCount.textContent = config.mosaicTargetCount || 1450;
    const capName = document.getElementById('mosaicCaptionName');
    if (capName) capName.textContent = config.recipientName;
  }

  // --- Привязка событий интерактивных элементов ---
  function setupEventListeners() {
    // Кнопка музыки
    const musicBtn = document.getElementById('musicToggleBtn');
    musicBtn?.addEventListener('click', () => {
      initAudio();
      if (state.isMusicPlaying) {
        stopMusicLoop();
      } else {
        startMusicLoop();
      }
    });

    // --- Экран 1: Проверка ответа на секретный вопрос ---
    const qForm = document.getElementById('questionForm');
    const ansInput = document.getElementById('answerInput');
    const submitBtn = document.getElementById('submitAnswerBtn');
    const errHint = document.getElementById('errorHint');

    function checkAnswer() {
      initAudio();
      const val = (ansInput.value || '').trim().toLowerCase();
      const validAnswers = (config.secretAnswers || []).map(a => a.toLowerCase().trim());

      const isMatch = validAnswers.some(ans => {
        return val === ans || val.includes(ans) || ans.includes(val);
      });

      if (isMatch && val.length > 0) {
        // Успех!
        triggerHaptic('success');
        errHint?.classList.add('hidden');
        submitBtn.querySelector('.btn-text')?.classList.add('hidden');
        submitBtn.querySelector('.btn-loader')?.classList.remove('hidden');

        playTone(523.25, 0.8); // До (High C)
        spawnHearts(12);

        setTimeout(() => {
          showScreen('screen-envelope');
        }, 650);
      } else {
        // Ошибка
        triggerHaptic('error');
        errHint?.classList.remove('hidden');
        ansInput.classList.add('shake');
        setTimeout(() => ansInput.classList.remove('shake'), 450);
      }
    }

    qForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      checkAnswer();
    });

    submitBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      checkAnswer();
    });

    // --- Экран 2: Клик по сургучному конверту ---
    const envBox = document.getElementById('envelopeElement');
    envBox?.addEventListener('click', () => {
      initAudio();
      if (envBox.classList.contains('opened')) return;

      envBox.classList.add('opened');
      triggerHaptic('medium');
      playTone(440, 1.0); // Звук открытия
      spawnHearts(16);

      // Фоновая музыка включается автоматически с этого момента для романтичности
      if (!state.isMusicPlaying) {
        startMusicLoop();
      }

      setTimeout(() => {
        showScreen('screen-letter');
      }, 1000);
    });

    // --- Экран 3: Кнопки письма ---
    const okBtn = document.getElementById('letterOkBtn');
    okBtn?.addEventListener('click', () => {
      triggerHaptic('medium');
      spawnHearts(20);
      showScreen('screen-activities');
    });

    const forgotBtn = document.getElementById('letterForgotBtn');
    const forgotAlert = document.getElementById('forgotJokeAlert');
    forgotBtn?.addEventListener('click', () => {
      triggerHaptic('light');
      forgotAlert?.classList.remove('hidden');
      forgotBtn.style.opacity = '0.5';
      forgotBtn.style.pointerEvents = 'none';
    });

    // --- Экран 4: Выбор варианта свидания ---
    const actList = document.getElementById('activitiesList');
    const actNextBtn = document.getElementById('activityNextBtn');

    actList?.addEventListener('click', (e) => {
      const card = e.target.closest('.activity-card');
      if (!card) return;

      document.querySelectorAll('.activity-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const actId = card.getAttribute('data-id');
      state.selectedActivity = config.activities.find(a => a.id === actId);

      triggerHaptic('selection');
      actNextBtn?.classList.remove('disabled');
      actNextBtn?.removeAttribute('disabled');
    });

    actNextBtn?.addEventListener('click', () => {
      if (!state.selectedActivity) return;
      triggerHaptic('medium');
      showScreen('screen-date');
    });

    // --- Экран 5: Выбор даты ---
    const dateWheel = document.getElementById('dateWheel');
    const dateNextBtn = document.getElementById('dateNextBtn');

    dateWheel?.addEventListener('click', (e) => {
      const item = e.target.closest('.picker-item');
      if (!item) return;

      document.querySelectorAll('#dateWheel .picker-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      state.selectedDate = {
        day: item.getAttribute('data-day'),
        weekday: item.getAttribute('data-weekday')
      };

      triggerHaptic('selection');
    });

    dateNextBtn?.addEventListener('click', () => {
      triggerHaptic('medium');
      showScreen('screen-time');
    });

    // --- Экран 6: Выбор времени ---
    const timeWheel = document.getElementById('timeWheel');
    const timeNextBtn = document.getElementById('timeNextBtn');

    timeWheel?.addEventListener('click', (e) => {
      const item = e.target.closest('.picker-item');
      if (!item) return;

      document.querySelectorAll('#timeWheel .picker-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      state.selectedTime = item.getAttribute('data-time');
      triggerHaptic('selection');
    });

    timeNextBtn?.addEventListener('click', () => {
      triggerHaptic('success');
      showScreen('screen-mosaic');
      startMosaicBuild();
    });

    // --- Экран 7: Отправка и копирование результатов ---
    const sendTgBtn = document.getElementById('sendTgBtn');
    const copyBtn = document.getElementById('copySummaryBtn');
    const sentFeedback = document.getElementById('sentFeedback');

    function buildResultText() {
      const act = state.selectedActivity || { title: "Свидание", subtitle: "" };
      const dt = state.selectedDate ? `${state.selectedDate.weekday}, ${state.selectedDate.day}` : "скоро";
      const tm = state.selectedTime || "вечером";

      return `❤️ Мой выбор для нашего свидания:\n` +
             `✨ Занятие: ${act.title} (${act.subtitle})\n` +
             `📅 Дата и время: ${dt} · ${tm}\n\n` +
             `Жду встречи с нетерпением! 🥰`;
    }

    sendTgBtn?.addEventListener('click', () => {
      triggerHaptic('success');
      const text = buildResultText();

      // 1. Попытка отправить через нативный Telegram WebApp API
      let sentViaTg = false;
      if (tg) {
        try {
          const payload = {
            activity: state.selectedActivity,
            date: state.selectedDate,
            time: state.selectedTime,
            text: text
          };
          tg.sendData(JSON.stringify(payload));
          sentViaTg = true;
        } catch (err) {
          console.warn("tg.sendData fallback:", err);
        }
      }

      // 2. Если открыто не через ReplyKeyboard или в браузере — отправляем через URL схему
      if (!sentViaTg) {
        const username = (config.telegramUsername || '').replace('@', '').trim();
        let shareUrl = '';
        if (username) {
          shareUrl = `https://t.me/${username}?text=${encodeURIComponent(text)}`;
        } else {
          shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
        }
        window.open(shareUrl, '_blank');
      }

      sentFeedback?.classList.remove('hidden');
      spawnHearts(25);
    });

    copyBtn?.addEventListener('click', () => {
      triggerHaptic('light');
      const text = buildResultText();
      navigator.clipboard?.writeText(text).then(() => {
        copyBtn.textContent = "Скопировано в буфер! ✨";
        setTimeout(() => {
          copyBtn.textContent = "Скопировать результат";
        }, 2500);
      });
    });
  }

  // --- Запуск генерации портрета из слов (Экран 7) ---
  function startMosaicBuild() {
    // 1. Заполняем итоговую карточку
    const act = state.selectedActivity || config.activities[0] || { title: "Парк и сладкая вата", subtitle: "как маленькие", icon: "🎡" };
    const dt = state.selectedDate ? `${state.selectedDate.weekday}, ${state.selectedDate.day}` : "чт, 10 сентября";
    const tm = state.selectedTime || "20:00";

    const sumIcon = document.getElementById('summaryIcon');
    if (sumIcon) sumIcon.textContent = act.icon || '🤍';

    const sumAct = document.getElementById('summaryActivity');
    if (sumAct) sumAct.textContent = act.title;

    const sumDt = document.getElementById('summaryDatetime');
    if (sumDt) sumDt.textContent = `${dt} · ${tm}`;

    const sumSub = document.getElementById('summarySubtitle');
    if (sumSub) sumSub.textContent = act.subtitle;

    // 2. Запускаем Canvas Mosaic
    const canvas = document.getElementById('mosaicCanvas');
    const counterEl = document.getElementById('mosaicCounter');

    if (window.renderWordMosaic && canvas) {
      window.renderWordMosaic({
        canvas: canvas,
        imageSrc: config.portraitPhoto,
        word: config.mosaicWord || config.recipientName.toUpperCase(),
        targetCount: config.mosaicTargetCount || 1450,
        onProgress: (current) => {
          if (counterEl) counterEl.textContent = current;
          if (current % 120 === 0) triggerHaptic('selection');
        },
        onComplete: () => {
          triggerHaptic('success');
          spawnHearts(30);
        }
      });
    }
  }

  // --- Точка входа ---
  document.addEventListener('DOMContentLoaded', () => {
    populateConfigData();
    setupEventListeners();
    initStars();
  });

})();
