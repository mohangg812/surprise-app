/**
 * ============================================================================
 * ROMANTIC SURPRISE APP (CELAMUR STYLE) - CORE SCRIPT
 * Версия с КВИЗОМ (quiz) вместо выбора свидания
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
    musicInterval: null,
    // Квиз
    quizStep: 0,
    quizGifts: []
  };

  const config = window.APP_CONFIG || {
    recipientName: "Ульяша",
    senderName: "Твой любимый",
    secretQuestion: "где мы познакомились?",
    secretAnswers: ["на дискотеке"],
    secretErrorHint: "Неправильно... Подсказка: вспомни музыку 🎶😉",
    envelopeBadge: "Ульяша",
    letterHeader: "это тебе, Ульяша",
    letterGreeting: "Ульяша, с полугодием! 💕",
    letterBody: ["Люблю тебя."],
    letterSign: "твой любимый ❤️",
    polaroidPhoto: "assets/polaroid.jpg",
    polaroidCaption: "мы 🤍",
    quizMode: true,
    quiz: [],
    activities: [],
    dates: [],
    times: [],
    portraitPhoto: "assets/portrait.jpg",
    mosaicWord: "УЛЬЯША",
    mosaicTargetCount: 175,
    mosaicSubtext: "каждый день мои мысли о тебе, любимость 💕",
    telegramUsername: "gahrfb"
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
    try {
      if (tg?.HapticFeedback) {
        if (type === 'selection') {
          if (typeof tg.HapticFeedback.selectionChanged === 'function') {
            tg.HapticFeedback.selectionChanged();
          } else {
            tg.HapticFeedback.impactOccurred?.('light');
          }
        } else if (type === 'success' || type === 'error' || type === 'warning') {
          tg.HapticFeedback.notificationOccurred?.(type);
        } else {
          tg.HapticFeedback.impactOccurred?.(type || 'light');
        }
      }
    } catch (e) {
      // Игнорируем любые ошибки виброотклика
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

    // Подсказка
    const hintText = document.getElementById('hintText');
    if (hintText && config.secretHint) hintText.textContent = config.secretHint;

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

    // 4. Квиз / Активности
    if (config.quizMode && config.quiz && config.quiz.length > 0) {
      // Инициализируем квиз
      initQuiz();
    } else {
      // Fallback: старый формат с карточками
      const actList = document.getElementById('activitiesList');
      if (actList && Array.isArray(config.activities)) {
        actList.innerHTML = config.activities.map((act, idx) => `
          <div class="activity-card ${idx === 0 ? 'selected' : ''}" data-id="${act.id}" data-index="${idx}">
            <span class="activity-icon">${act.icon || '✨'}</span>
            <div class="activity-info">
              <span class="activity-title">${act.title}</span>
              <span class="activity-subtitle">${act.subtitle}</span>
            </div>
          </div>
        `).join('');
        if (config.activities.length > 0) {
          state.selectedActivity = config.activities[0];
        }
      }
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
    const footerText = document.getElementById('mosaicFooterText');
    if (footerText && config.mosaicSubtext) {
      footerText.textContent = config.mosaicSubtext;
    }

    // 8. Кнопки с юзернеймом заказчика и телефоном
    const tgUsername = (config.telegramUsername || 'gahrfb').replace('@', '').trim();
    const phone = (config.phone || '+375333636015').replace(/[^0-9+]/g, '');
    const rawDigits = phone.replace('+', '');

    const sendTgBtnEl = document.getElementById('sendTgBtn');
    if (sendTgBtnEl) {
      sendTgBtnEl.innerHTML = `<span class="btn-tg-icon">✈️</span><span>Отправить ответ @${tgUsername}</span>`;
    }
    const openDirectBtnEl = document.getElementById('openDirectBtn');
    if (openDirectBtnEl) {
      openDirectBtnEl.textContent = `💬 В диалог @${tgUsername}`;
      openDirectBtnEl.href = `https://t.me/${tgUsername}`;
    }
    const openPhoneBtnEl = document.getElementById('openPhoneBtn');
    if (openPhoneBtnEl) {
      openPhoneBtnEl.textContent = `📱 По номеру`;
      openPhoneBtnEl.href = `https://t.me/+${rawDigits}`;
      openPhoneBtnEl.title = config.phone || '+375 33 363-60-15';
    }
  }

  // ============================================================
  //  КВИЗ — последовательные вопросы с подарками
  // ============================================================
  function initQuiz() {
    state.quizStep = 0;
    state.quizGifts = [];
    showQuizStep(0);
  }

  function showQuizStep(step) {
    const quiz = config.quiz;
    const container = document.getElementById('quizContainer');
    const giftCard = document.getElementById('quizGiftCard');
    const bonus = document.getElementById('quizBonus');
    const progressFill = document.getElementById('quizProgressFill');
    const progressText = document.getElementById('quizProgressText');

    if (!quiz || step >= quiz.length) {
      // Все вопросы пройдены — показываем бонус
      if (container) container.classList.add('hidden');
      if (giftCard) giftCard.classList.add('hidden');
      if (bonus) {
        bonus.classList.remove('hidden');

        // Заполняем бонус
        const bonusTitle = document.getElementById('quizBonusTitle');
        const bonusSub = document.getElementById('quizBonusSubtitle');
        if (config.quizBonus) {
          if (bonusTitle) bonusTitle.textContent = config.quizBonus.title;
          if (bonusSub) bonusSub.textContent = config.quizBonus.subtitle;
        }

        // Показываем список подарков
        const giftsSummary = document.getElementById('quizGiftsSummary');
        if (giftsSummary) {
          giftsSummary.innerHTML = '<h4 class="gifts-summary-title">Твои подарки:</h4>' +
            state.quizGifts.map(g => `
              <div class="gift-summary-item">
                <span class="gift-summary-icon">${g.icon}</span>
                <span class="gift-summary-text">${g.text}</span>
              </div>
            `).join('');
        }
      }

      if (progressFill) progressFill.style.width = '100%';
      if (progressText) progressText.textContent = `${quiz.length} / ${quiz.length}`;

      // Устанавливаем "кино" как выбранную активность
      state.selectedActivity = config.activities[0] || { title: "Кино", subtitle: "наш вечер", icon: "🎬" };

      spawnHearts(25);
      triggerHaptic('success');
      return;
    }

    // Показать текущий вопрос
    if (container) container.classList.remove('hidden');
    if (giftCard) giftCard.classList.add('hidden');
    if (bonus) bonus.classList.add('hidden');

    const q = quiz[step];
    const questionEl = document.getElementById('quizQuestion');
    const answerInput = document.getElementById('quizAnswerInput');
    const errorEl = document.getElementById('quizError');

    if (questionEl) questionEl.textContent = q.question;
    if (answerInput) {
      answerInput.value = '';
      answerInput.focus();
    }
    if (errorEl) errorEl.classList.add('hidden');

    // Обновить прогресс
    if (progressFill) progressFill.style.width = `${(step / quiz.length) * 100}%`;
    if (progressText) progressText.textContent = `${step} / ${quiz.length}`;
  }

  function checkQuizAnswer() {
    const quiz = config.quiz;
    if (!quiz || state.quizStep >= quiz.length) return;

    const q = quiz[state.quizStep];
    const answerInput = document.getElementById('quizAnswerInput');
    const errorEl = document.getElementById('quizError');
    const rawVal = (answerInput?.value || '').trim().toLowerCase();
    const cleanVal = rawVal.replace(/\s+/g, ' ');

    if (!cleanVal) return;

    // 1. Проверка: если введена просто цифра без месяца
    if (/^\d{1,2}$/.test(rawVal)) {
      triggerHaptic('error');
      if (errorEl) {
        errorEl.textContent = "💡 Почти! Напиши ещё и месяц (например: словами или 27.04) 😉";
        errorEl.classList.remove('hidden');
      }
      if (answerInput) {
        answerInput.classList.add('shake');
        setTimeout(() => answerInput.classList.remove('shake'), 450);
      }
      return;
    }

    // 2. Точная проверка по списку правильных ответов
    const validAnswers = (q.answers || []).map(a => a.toLowerCase().trim());
    const isMatch = validAnswers.some(ans => {
      const cleanAns = ans.replace(/\s+/g, ' ');
      const noSpaceAns = ans.replace(/\s+/g, '');
      const noSpaceVal = cleanVal.replace(/\s+/g, '');
      return cleanVal === cleanAns || noSpaceVal === noSpaceAns;
    });

    if (isMatch) {
      // Верный ответ!
      triggerHaptic('success');
      if (errorEl) errorEl.classList.add('hidden');

      // Сохраняем подарок
      state.quizGifts.push({
        icon: q.giftIcon || '🎁',
        text: q.gift || 'Сюрприз!'
      });

      // Показываем карточку подарка
      showGiftCard(q);
      playTone(523.25, 0.8);
      spawnHearts(15);
    } else {
      // Неверный ответ — выводим нативную подсказку
      triggerHaptic('error');
      if (errorEl) {
        errorEl.textContent = q.hint || "Попробуй ещё раз! 😉";
        errorEl.classList.remove('hidden');
      }
      if (answerInput) {
        answerInput.classList.add('shake');
        setTimeout(() => answerInput.classList.remove('shake'), 450);
      }
    }
  }

  function showGiftCard(q) {
    const container = document.getElementById('quizContainer');
    const giftCard = document.getElementById('quizGiftCard');
    const giftIcon = document.getElementById('quizGiftIcon');
    const giftText = document.getElementById('quizGiftText');

    if (container) container.classList.add('hidden');
    if (giftCard) {
      giftCard.classList.remove('hidden');
      // Анимация появления
      giftCard.style.animation = 'none';
      giftCard.offsetHeight; // reflow
      giftCard.style.animation = 'giftReveal 0.6s ease-out';
    }
    if (giftIcon) giftIcon.textContent = q.giftIcon || '🎁';
    if (giftText) giftText.textContent = q.gift || 'Сюрприз!';
  }

  function nextQuizStep() {
    state.quizStep++;
    showQuizStep(state.quizStep);
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

    // Кнопка подсказки
    const hintBtn = document.getElementById('hintBtn');
    const hintText = document.getElementById('hintText');
    hintBtn?.addEventListener('click', () => {
      hintText?.classList.toggle('hidden');
      triggerHaptic('light');
    });

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
        if (errHint) {
          errHint.classList.remove('hidden');
          errHint.textContent = config.secretErrorHint || "Неправильный ответ... Вспомни получше! 😉";
        }
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

    // --- Экран 4: КВИЗ ---
    const quizCheckBtn = document.getElementById('quizCheckBtn');
    const quizAnswerInput = document.getElementById('quizAnswerInput');
    const quizNextBtn = document.getElementById('quizNextBtn');
    const quizDoneBtn = document.getElementById('quizDoneBtn');

    quizCheckBtn?.addEventListener('click', () => {
      checkQuizAnswer();
    });

    // Enter в поле ввода квиза
    quizAnswerInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        checkQuizAnswer();
      }
    });

    quizNextBtn?.addEventListener('click', () => {
      triggerHaptic('medium');
      nextQuizStep();
    });

    quizDoneBtn?.addEventListener('click', () => {
      triggerHaptic('medium');
      showScreen('screen-date');
    });

    // Fallback: старый выбор (на случай если quizMode выключен)
    const actList = document.getElementById('activitiesList');
    const actNextBtn = document.getElementById('activityNextBtn');

    actList?.addEventListener('click', (e) => {
      const card = e.target.closest('.activity-card');
      if (!card) return;

      document.querySelectorAll('.activity-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      const actId = card.getAttribute('data-id');
      state.selectedActivity = config.activities.find(a => a.id === actId);

      if (actNextBtn) {
        actNextBtn.disabled = false;
        actNextBtn.removeAttribute('disabled');
        actNextBtn.classList.remove('disabled');
      }

      triggerHaptic('selection');
    });

    actNextBtn?.addEventListener('click', () => {
      if (!state.selectedActivity && config.activities.length > 0) {
        state.selectedActivity = config.activities[0];
      }
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
    const openDirectBtn = document.getElementById('openDirectBtn');
    const copyBtn = document.getElementById('copySummaryBtn');
    const sentFeedback = document.getElementById('sentFeedback');

    function buildResultText() {
      const act = state.selectedActivity || { title: "Кино", subtitle: "наш вечер" };
      const dt = state.selectedDate 
        ? `${state.selectedDate.day}${state.selectedDate.weekday ? ' (' + state.selectedDate.weekday + ')' : ''}` 
        : "в эти выходные";
      const tm = state.selectedTime || "19:30";

      const gifts = (state.quizGifts && state.quizGifts.length > 0)
        ? state.quizGifts
        : [
            { icon: "🧸", text: "Плюшевый мишка;)" },
            { icon: "🎂", text: "Бенто тортик" },
            { icon: "🌹", text: "Лего Розы" }
          ];

      const giftsText = '\n\n🎁 Подарки, которые я отгадала:\n' + gifts.map(g => `${g.icon} ${g.text}`).join('\n');

      return `❤️ Мой выбор для нашего свидания:\n` +
             `🎬 ${act.title} (${act.subtitle})\n` +
             `📅 ${dt} · ${tm}` +
             giftsText +
             `\n\nЖду нашей встречи! 🥰`;
    }

    function copyToClipboard(text) {
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      }
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        ta.setAttribute('readonly', '');
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, 99999);
        document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (err) {
        console.warn("Fallback copy error:", err);
      }
    }

    function safeOpenUrl(url) {
      // Для внешних ссылок (не t.me) внутри Telegram WebApp используем tg.openLink
      if (tg?.openLink && !url.includes('t.me/')) {
        try {
          tg.openLink(url);
          return;
        } catch (e) {
          console.warn("tg.openLink error:", e);
        }
      }
      try {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try { document.body.removeChild(a); } catch (e) {}
        }, 300);
      } catch (err) {
        window.open(url, '_blank');
      }
    }

    function openTelegramChat(url) {
      // Внутри Telegram WebApp открываем ссылки t.me через нативный метод SDK,
      // чтобы окно не прыгало между браузером и Telegram
      if (tg?.openTelegramLink) {
        try {
          tg.openTelegramLink(url);
          return;
        } catch (e) {
          console.warn("tg.openTelegramLink error:", e);
        }
      }
      safeOpenUrl(url);
    }

    // 1. Основная кнопка: Отправить ответ в Telegram (Share с готовым текстом)
    sendTgBtn?.addEventListener('click', (e) => {
      e?.preventDefault();
      triggerHaptic('success');
      const text = buildResultText();

      // Гарантированно копируем текст в буфер обмена
      copyToClipboard(text);

      const username = (config.telegramUsername || 'gahrfb').replace('@', '').trim();
      // Открываем нативное окно "Поделиться" в Telegram с уже готовым текстом
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent('https://t.me/' + username)}&text=${encodeURIComponent(text)}`;
      openTelegramChat(shareUrl);

      // Показываем четкую подсказку пользователю
      if (sentFeedback) {
        sentFeedback.innerHTML = `
          <div class="feedback-badge">✨ Текст скопирован в буфер!</div>
          <div class="feedback-title">Открываем Telegram...</div>
          <p class="feedback-desc">
            Выбери диалог с <b>@${username}</b> — готовый текст уже вставлен в поле ввода, просто нажми <b>«Отправить»</b> ❤️<br>
            <span class="feedback-sub">Либо напиши в диалог напрямую или по номеру ниже.</span>
          </p>
        `;
        sentFeedback.classList.remove('hidden');
      }

      spawnHearts(25);
    });

    // 2. Вторая кнопка: Открыть диалог с @gahrfb напрямую
    openDirectBtn?.addEventListener('click', (e) => {
      e?.preventDefault();
      triggerHaptic('success');
      const text = buildResultText();

      // Копируем в буфер
      copyToClipboard(text);

      // Открываем прямой чат с пользователем
      const username = (config.telegramUsername || 'gahrfb').replace('@', '').trim();
      const directUrl = `https://t.me/${username}`;
      openTelegramChat(directUrl);

      // Инструкция пользователю
      if (sentFeedback) {
        sentFeedback.innerHTML = `
          <div class="feedback-badge">💌 Текст скопирован!</div>
          <div class="feedback-title">Диалог с @${username} открывается...</div>
          <p class="feedback-desc">
            Текст твоего выбора уже в буфере. Просто нажми <b>«Вставить»</b> в чате и отправь 🥰
          </p>
        `;
        sentFeedback.classList.remove('hidden');
      }

      spawnHearts(20);
    });

    // 3. Третья кнопка: Отправить по номеру телефона (+375333636015)
    openPhoneBtn?.addEventListener('click', (e) => {
      e?.preventDefault();
      triggerHaptic('success');
      const text = buildResultText();

      copyToClipboard(text);

      const phone = (config.phone || '+375333636015').replace(/[^0-9+]/g, '');
      const rawDigits = phone.replace('+', '');
      // Открываем диалог в Telegram по номеру телефона
      const tgPhoneUrl = `https://t.me/+${rawDigits}`;
      openTelegramChat(tgPhoneUrl);

      if (sentFeedback) {
        sentFeedback.innerHTML = `
          <div class="feedback-badge">📱 Номер: ${config.phone || '+375 33 363-60-15'}</div>
          <div class="feedback-title">Текст скопирован в буфер!</div>
          <p class="feedback-desc">
            Открываем Telegram по номеру телефона. Если диалог не открылся, можно также написать в <a href="https://wa.me/${rawDigits}?text=${encodeURIComponent(text)}" target="_blank" style="color:#25d366;text-decoration:underline;">WhatsApp</a> 🥰
          </p>
        `;
        sentFeedback.classList.remove('hidden');
      }

      spawnHearts(20);
    });

    // 4. Четвертая кнопка: Скопировать текст ответа
    copyBtn?.addEventListener('click', (e) => {
      e?.preventDefault();
      triggerHaptic('light');
      const text = buildResultText();
      copyToClipboard(text);

      const username = (config.telegramUsername || 'gahrfb').replace('@', '').trim();
      copyBtn.innerHTML = `<span>Скопировано в буфер! ✨</span>`;
      setTimeout(() => {
        copyBtn.innerHTML = `<span>📋 Скопировать результат</span>`;
      }, 2500);

      if (sentFeedback) {
        sentFeedback.innerHTML = `
          <div class="feedback-badge">📋 Скопировано!</div>
          <p class="feedback-desc">
            Текст твоего выбора в буфере обмена. Ты можешь вставить и отправить его <b>@${username}</b> или по номеру в любой мессенджер ❤️
          </p>
        `;
        sentFeedback.classList.remove('hidden');
      }
    });
  }

  // --- Запуск генерации портрета из слов (Экран 7) ---
  function startMosaicBuild() {
    // 1. Заполняем итоговую карточку
    const act = state.selectedActivity || config.activities[0] || { title: "Кино", subtitle: "наш вечер", icon: "🎬" };
    const dt = state.selectedDate ? `${state.selectedDate.day}${state.selectedDate.weekday ? ' (' + state.selectedDate.weekday + ')' : ''}` : "в эти выходные";
    const tm = state.selectedTime || "19:30";

    const sumIcon = document.getElementById('summaryIcon');
    if (sumIcon) sumIcon.textContent = act.icon || '🎬';

    const sumAct = document.getElementById('summaryActivity');
    if (sumAct) sumAct.textContent = act.title;

    const sumDt = document.getElementById('summaryDatetime');
    if (sumDt) sumDt.textContent = `${dt} · ${tm}`;

    const sumSub = document.getElementById('summarySubtitle');
    if (sumSub) sumSub.textContent = act.subtitle || '';

    // Отображаем список отгаданных подарков в итоговой карточке
    const sumGifts = document.getElementById('summaryGiftsList');
    if (sumGifts) {
      const gifts = (state.quizGifts && state.quizGifts.length > 0)
        ? state.quizGifts
        : [
            { icon: "🧸", text: "Плюшевый мишка;)" },
            { icon: "🎂", text: "Бенто тортик" },
            { icon: "🌹", text: "Лего Розы" }
          ];
      sumGifts.innerHTML = `
        <span class="gifts-label">🎁 Твои подарки:</span>
        ${gifts.map(g => `<span class="gift-pill">${g.icon} ${g.text}</span>`).join(' ')}
      `;
      sumGifts.classList.remove('hidden');
    }

    // 2. Запускаем Canvas Mosaic
    const canvas = document.getElementById('mosaicCanvas');
    const counterEl = document.getElementById('mosaicCounter');

    if (window.renderWordMosaic && canvas) {
      window.renderWordMosaic({
        canvas: canvas,
        imageSrc: config.portraitPhoto,
        word: config.mosaicWord || config.recipientName.toUpperCase(),
        targetCount: config.mosaicTargetCount || 175,
        onProgress: (current) => {
          if (counterEl) counterEl.textContent = current;
          if (current > 0 && current % 25 === 0) triggerHaptic('selection');
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
