/**
 * ============================================================================
 * ROMANTIC WORD ART / ASCII MOSAIC GENERATOR (CELAMUR STYLE)
 * ============================================================================
 * 
 * Преобразует портрет в мерцающую мозаику из повторяющихся букв заданного слова.
 * Реализует эстетичный романтический спектр (#ff758c -> #ffc371 -> #ffffff),
 * неоновое свечение букв, спиральное проявление из центра лица и синхронизированный счётчик.
 * 
 * Совместимо со всеми современными браузерами и Telegram WebApp (iOS / Android WebView).
 */

(function (global) {
  'use strict';

  // --- Вспомогательные функции цвета ---

  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpColor(c1, c2, t) {
    return {
      r: Math.round(lerp(c1.r, c2.r, t)),
      g: Math.round(lerp(c2.g ? c1.g : c1.g, c2.g, t)),
      b: Math.round(lerp(c1.b, c2.b, t))
    };
  }

  // Романтическая палитра Celamur
  const PALETTE = {
    deepRose: hexToRgb('d6336c'), // глубокий бархатный роза
    softPink: hexToRgb('ff758c'), // мягкий романтичный розовый
    warmGold: hexToRgb('ffc371'), // теплое сияющее золото
    brightCream: hexToRgb('fff5ea'), // кремово-белый акцент
    pureWhite: hexToRgb('ffffff')  // бриллиантовый белый блик
  };

  /**
   * Вычисляет цвет буквы и параметры свечения по яркости пикселя (0..1)
   * с мягким подмешиванием исходного оттенка фото для узнаваемости черт лица.
   */
  function getRomanticStyle(lum, origR, origG, origB) {
    // lum нормализован в диапазоне [0.10, 1.0]
    const t = Math.max(0, Math.min(1, (lum - 0.10) / 0.90));

    let baseR, baseG, baseB;
    let shadowColor, shadowBlur;
    let alpha = 0.75 + t * 0.25;

    if (t < 0.42) {
      // Теневая/полутеневая зона: от глубокой розы к мягкому розовому
      const subT = t / 0.42;
      baseR = Math.round(lerp(PALETTE.deepRose.r, PALETTE.softPink.r, subT));
      baseG = Math.round(lerp(PALETTE.deepRose.g, PALETTE.softPink.g, subT));
      baseB = Math.round(lerp(PALETTE.deepRose.b, PALETTE.softPink.b, subT));
      shadowBlur = Math.round(lerp(2, 5, subT));
      shadowColor = `rgba(255, 117, 140, ${0.4 + subT * 0.25})`;
    } else if (t < 0.78) {
      // Полутона и свет лица: от мягкого розового (#ff758c) к золоту (#ffc371)
      const subT = (t - 0.42) / 0.36;
      baseR = Math.round(lerp(PALETTE.softPink.r, PALETTE.warmGold.r, subT));
      baseG = Math.round(lerp(PALETTE.softPink.g, PALETTE.warmGold.g, subT));
      baseB = Math.round(lerp(PALETTE.softPink.b, PALETTE.warmGold.b, subT));
      shadowBlur = Math.round(lerp(5, 9, subT));
      shadowColor = `rgba(255, 195, 113, ${0.6 + subT * 0.2})`;
    } else {
      // Яркие блики (улыбка, взгляд, контур волос): от золота к белому неону
      const subT = (t - 0.78) / 0.22;
      baseR = Math.round(lerp(PALETTE.warmGold.r, PALETTE.pureWhite.r, subT));
      baseG = Math.round(lerp(PALETTE.warmGold.g, PALETTE.pureWhite.g, subT));
      baseB = Math.round(lerp(PALETTE.warmGold.b, PALETTE.pureWhite.b, subT));
      shadowBlur = Math.round(lerp(9, 14, subT));
      shadowColor = `rgba(255, 245, 230, ${0.85 + subT * 0.15})`;
    }

    // Деликатное подмешивание 24% исходного цвета фото для выразительности взгляда и губ
    const finalR = Math.min(255, Math.round(baseR * 0.76 + origR * 0.24));
    const finalG = Math.min(255, Math.round(baseG * 0.76 + origG * 0.24));
    const finalB = Math.min(255, Math.round(baseB * 0.76 + origB * 0.24));

    return {
      fillStyle: `rgba(${finalR}, ${finalG}, ${finalB}, ${alpha.toFixed(2)})`,
      shadowColor: shadowColor,
      shadowBlur: shadowBlur,
      isHighlight: t > 0.8
    };
  }

  // --- Загрузка изображения с кросс-доменной поддержкой ---

  function loadImage(src) {
    return new Promise((resolve) => {
      if (!src) {
        resolve(null);
        return;
      }
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          console.warn('[renderWordMosaic] Image load timeout, using romantic silhouette fallback.');
          resolve(null);
        }
      }, 1500);

      const img = new Image();
      img.onload = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(img);
        }
      };
      img.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          console.warn('[renderWordMosaic] Image load error, using romantic silhouette fallback.');
          resolve(null);
        }
      };
      img.src = src;
    });
  }

  /**
   * Рисует красивый, полноразмерный женский портрет с локонами и плечами,
   * заполняющий всё пространство Canvas.
   */
  function createFallbackSilhouetteCanvas(width, height) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const ctx = offCanvas.getContext('2d');

    // Тёмный бархатный фон
    const bgGrad = ctx.createRadialGradient(
      width * 0.5, height * 0.42, 30,
      width * 0.5, height * 0.5, width * 0.8
    );
    bgGrad.addColorStop(0, '#1d0c26');
    bgGrad.addColorStop(0.65, '#0e0413');
    bgGrad.addColorStop(1, '#050108');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Мягкий романтический ореол за головой
    const halo = ctx.createRadialGradient(
      width * 0.5, height * 0.38, 40,
      width * 0.5, height * 0.38, width * 0.45
    );
    halo.addColorStop(0, 'rgba(255, 117, 140, 0.55)');
    halo.addColorStop(0.5, 'rgba(255, 195, 113, 0.28)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height);

    // 1. Плечи и тело внизу (заполняют нижнюю часть холста)
    const bodyGrad = ctx.createLinearGradient(0, height * 0.6, 0, height);
    bodyGrad.addColorStop(0, '#ff758c');
    bodyGrad.addColorStop(0.4, '#d6336c');
    bodyGrad.addColorStop(1, '#8c1d40');
    ctx.fillStyle = bodyGrad;

    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.82);
    ctx.bezierCurveTo(width * 0.15, height * 0.76, width * 0.3, height * 0.66, width * 0.4, height * 0.62);
    ctx.lineTo(width * 0.6, height * 0.62);
    ctx.bezierCurveTo(width * 0.7, height * 0.66, width * 0.85, height * 0.76, width, height * 0.82);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // 2. Изящная шея
    ctx.beginPath();
    ctx.moveTo(width * 0.42, height * 0.62);
    ctx.lineTo(width * 0.42, height * 0.48);
    ctx.bezierCurveTo(width * 0.45, height * 0.52, width * 0.55, height * 0.52, width * 0.58, height * 0.48);
    ctx.lineTo(width * 0.58, height * 0.62);
    ctx.closePath();
    ctx.fillStyle = '#ff9a9e';
    ctx.fill();

    // 3. Пышные локоны волос (обрамляют лицо)
    const hairGrad = ctx.createLinearGradient(0, height * 0.1, 0, height * 0.75);
    hairGrad.addColorStop(0, '#ff758c');
    hairGrad.addColorStop(0.5, '#ffb199');
    hairGrad.addColorStop(1, '#d6336c');
    ctx.fillStyle = hairGrad;

    // Волосы слева
    ctx.beginPath();
    ctx.ellipse(width * 0.35, height * 0.38, width * 0.22, height * 0.28, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Волосы справа
    ctx.beginPath();
    ctx.ellipse(width * 0.65, height * 0.38, width * 0.22, height * 0.28, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Макушка и объём сверху
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.26, width * 0.30, height * 0.20, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Овал лица (светящаяся нежная кожа)
    const faceGrad = ctx.createRadialGradient(
      width * 0.5, height * 0.36, 10,
      width * 0.5, height * 0.36, width * 0.24
    );
    faceGrad.addColorStop(0, '#ffffff');
    faceGrad.addColorStop(0.4, '#fff0f3');
    faceGrad.addColorStop(0.75, '#ffc371');
    faceGrad.addColorStop(1, '#ff8099');
    ctx.fillStyle = faceGrad;

    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.36, width * 0.20, height * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // 5. Блик и акценты на чертах лица (глаза, улыбка)
    ctx.fillStyle = '#ffffff';
    // Блик на щеках и улыбке
    ctx.beginPath();
    ctx.ellipse(width * 0.45, height * 0.38, 12, 8, -0.2, 0, Math.PI * 2);
    ctx.ellipse(width * 0.55, height * 0.38, 12, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Улыбка и сияние губ
    ctx.beginPath();
    ctx.ellipse(width * 0.5, height * 0.44, 18, 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ff4d6d';
    ctx.fill();

    return offCanvas;
  }

  /**
   * Сэмплирует изображение по сетке и формирует массив точек мозаики
   */
  function extractMosaicPoints(sourceImgOrCanvas, width, height, word) {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d');

    // Рисуем изображение с режимом cover (пропорциональное заполнение)
    const srcW = sourceImgOrCanvas.width || width;
    const srcH = sourceImgOrCanvas.height || height;
    const srcAspect = srcW / srcH;
    const dstAspect = width / height;

    let sx = 0, sy = 0, sWidth = srcW, sHeight = srcH;
    if (srcAspect > dstAspect) {
      sWidth = srcH * dstAspect;
      sx = (srcW - sWidth) / 2;
    } else {
      sHeight = srcW / dstAspect;
      sy = (srcH - sHeight) / 2;
    }

    offCtx.drawImage(sourceImgOrCanvas, sx, sy, sWidth, sHeight, 0, 0, width, height);

    const imgData = offCtx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Шаг сетки: ~5.5-6px для заполнения всего портрета (~1300-1600 букв)
    const step = Math.max(5, Math.min(7, Math.round(width / 68)));
    const cleanWord = (word && word.trim().length > 0) ? word.trim().toUpperCase() : 'ДАША';

    const rawPoints = [];
    let sumX = 0;
    let sumY = 0;
    let sumWeight = 0;

    for (let y = Math.round(step * 0.8); y < height - step; y += step) {
      const rowIndex = Math.round(y / step);

      for (let x = Math.round(step * 0.8); x < width - step; x += step) {
        const colIndex = Math.round(x / step);

        // Усреднение цвета по блоку 3x3
        let r = 0, g = 0, b = 0, count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const px = Math.min(width - 1, Math.max(0, x + dx));
            const py = Math.min(height - 1, Math.max(0, y + dy));
            const idx = (py * width + px) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        // Яркость по стандарту ITU-R BT.601
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Порог отсечения фона: захватывает волосы, плечи и лицо
        if (lum > 0.08) {
          // Буква по горизонтали складывается в непрерывное слово Д А Ш А
          const char = cleanWord[colIndex % cleanWord.length];
          const style = getRomanticStyle(lum, r, g, b);

          const weight = Math.pow(lum, 1.5);
          sumX += x * weight;
          sumY += y * weight;
          sumWeight += weight;

          rawPoints.push({
            x: x,
            y: y,
            char: char,
            lum: lum,
            style: style
          });
        }
      }
    }

    // Фокальный центр портрета (взгляд/улыбка)
    const focalX = sumWeight > 0 ? sumX / sumWeight : width / 2;
    const focalY = sumWeight > 0 ? sumY / sumWeight : height * 0.42;

    // Спиральная сортировка от центра наружу с мягким органическим джиттером
    rawPoints.forEach((p) => {
      const dx = p.x - focalX;
      const dy = p.y - focalY;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx); // [-PI, PI]
      const normAngle = (angle + Math.PI) / (2 * Math.PI); // [0, 1]

      // Спиральный индекс: радиус + раскрутка угла + случайный трепет искр
      p.spiralScore = dist + normAngle * 22 + (Math.sin(p.x * 0.05 + p.y * 0.05) * 6);
    });

    rawPoints.sort((a, b) => a.spiralScore - b.spiralScore);

    return {
      points: rawPoints,
      focalX: focalX,
      focalY: focalY,
      step: step
    };
  }

  /**
   * Рисует маленькую романтическую звёздочку/искру на кончике волны
   */
  function drawSparkle(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowColor = '#fff5ea';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x, y, x + size, y);
    ctx.quadraticCurveTo(x, y, x, y + size);
    ctx.quadraticCurveTo(x, y, x - size, y);
    ctx.quadraticCurveTo(x, y, x, y - size);
    ctx.fill();
    ctx.restore();
  }

  // --- Основная функция генерации Word Mosaic ---

  /**
   * Запускает генерацию и анимацию портрета из слов на Canvas
   * 
   * @param {Object} options
   * @param {HTMLCanvasElement|string} options.canvas - Элемент canvas или селектор
   * @param {string} options.imageSrc - Путь к изображению девушки
   * @param {string} [options.word="ДАША"] - Слово/имя для мозаики
   * @param {number} [options.targetCount=1450] - Целевое число для счётчика
   * @param {Function} [options.onProgress] - Callback (currentCount) вызывается при приросте
   * @param {Function} [options.onComplete] - Callback () вызывается по завершении
   * @param {number} [options.duration=3600] - Длительность анимации в миллисекундах
   * @returns {Object} Контроллер анимации { cancel(), finish(), isFinished }
   */
  function renderWordMosaic(options) {
    if (!options) throw new Error('[renderWordMosaic] options object is required');

    let canvas = options.canvas;
    if (typeof canvas === 'string') {
      canvas = document.querySelector(canvas);
    }
    if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
      console.error('[renderWordMosaic] Invalid canvas element provided:', options.canvas);
      return { cancel: () => {}, finish: () => {}, isFinished: true };
    }

    // Если на этом canvas уже шла анимация — останавливаем её
    if (canvas._mosaicController && typeof canvas._mosaicController.cancel === 'function') {
      canvas._mosaicController.cancel();
    }

    const word = options.word || 'ДАША';
    const targetCount = typeof options.targetCount === 'number' ? options.targetCount : 1450;
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    const onComplete = typeof options.onComplete === 'function' ? options.onComplete : null;
    const duration = options.duration || 3600;

    let isCancelled = false;
    let isFinished = false;
    let animationFrameId = null;

    // Контроллер для внешнего управления
    const controller = {
      cancel: () => {
        isCancelled = true;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
      },
      finish: () => {},
      get isFinished() {
        return isFinished;
      }
    };
    canvas._mosaicController = controller;

    // Подготовка Canvas (учитываем физические размеры)
    const width = canvas.width || 400;
    const height = canvas.height || 520;
    const ctx = canvas.getContext('2d');

    // Очищаем и заливаем глубоким романтическим градиентом
    function drawBaseBackground(focalX = width / 2, focalY = height * 0.42) {
      const bgGrad = ctx.createRadialGradient(
        focalX, focalY, 30,
        focalX, focalY, Math.max(width, height) * 0.8
      );
      bgGrad.addColorStop(0, '#150820'); // глубокий аметистовый бархат
      bgGrad.addColorStop(0.55, '#0d0414');
      bgGrad.addColorStop(1, '#050208'); // полночный чёрный
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);
    }

    drawBaseBackground();

    // Загрузка фото и подготовка точек
    loadImage(options.imageSrc).then((loadedImg) => {
      if (isCancelled) return;

      const source = loadedImg || createFallbackSilhouetteCanvas(width, height);
      const { points, focalX, focalY, step } = extractMosaicPoints(source, width, height, word);

      const totalPoints = points.length;
      if (totalPoints === 0) {
        if (onProgress) onProgress(targetCount);
        if (onComplete) onComplete();
        isFinished = true;
        return;
      }

      // Перерисовываем красивый фон точно вокруг фокального центра лица
      drawBaseBackground(focalX, focalY);

      // Настройка шрифта для чёткого и эстетичного отображения букв
      const fontSize = Math.max(9, Math.round(step * 1.15));
      ctx.font = `700 ${fontSize}px "Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let lastDrawnIndex = 0;
      let lastReportedCount = 0;
      const startTime = performance.now();

      // Функция мгновенного завершения (finish)
      controller.finish = () => {
        if (isFinished || isCancelled) return;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        // Дорисовываем все оставшиеся буквы
        for (let i = lastDrawnIndex; i < totalPoints; i++) {
          const p = points[i];
          ctx.save();
          ctx.shadowColor = p.style.shadowColor;
          ctx.shadowBlur = p.style.shadowBlur;
          ctx.fillStyle = p.style.fillStyle;
          ctx.fillText(p.char, p.x, p.y);
          ctx.restore();
        }

        lastDrawnIndex = totalPoints;
        isFinished = true;
        if (onProgress) onProgress(targetCount);
        if (onComplete) onComplete();
      };

      // Плавная анимация проявления
      function animate(now) {
        if (isCancelled) return;

        const elapsed = now - startTime;
        const progressRatio = Math.min(1, elapsed / duration);

        // Кубическая функция замедления для мягкого финала (ease-out-cubic)
        const eased = 1 - Math.pow(1 - progressRatio, 3);

        const targetIndex = Math.min(totalPoints, Math.floor(eased * totalPoints));

        // Отрисовываем новую порцию букв
        if (targetIndex > lastDrawnIndex) {
          for (let i = lastDrawnIndex; i < targetIndex; i++) {
            const p = points[i];

            ctx.save();
            ctx.shadowColor = p.style.shadowColor;
            ctx.shadowBlur = p.style.shadowBlur;
            ctx.fillStyle = p.style.fillStyle;
            ctx.fillText(p.char, p.x, p.y);
            ctx.restore();

            // Мерцающая звёздочка на ведущем фронте волны
            if (p.style.isHighlight && Math.random() < 0.14) {
              drawSparkle(ctx, p.x, p.y, 4, '#ffffff');
            }
          }
          lastDrawnIndex = targetIndex;
        }

        // Плавный рост счётчика от 0 до targetCount
        const currentCount = Math.min(targetCount, Math.round(eased * targetCount));
        if (currentCount !== lastReportedCount) {
          lastReportedCount = currentCount;
          if (onProgress) onProgress(currentCount);
        }

        // Проверка завершения
        if (progressRatio < 1) {
          animationFrameId = requestAnimationFrame(animate);
        } else {
          // Финальный аккорд: гарантируем полную отрисовку всех букв и точный счётчик 1450
          for (let i = lastDrawnIndex; i < totalPoints; i++) {
            const p = points[i];
            ctx.save();
            ctx.shadowColor = p.style.shadowColor;
            ctx.shadowBlur = p.style.shadowBlur;
            ctx.fillStyle = p.style.fillStyle;
            ctx.fillText(p.char, p.x, p.y);
            ctx.restore();
          }
          lastDrawnIndex = totalPoints;
          if (onProgress) onProgress(targetCount);
          isFinished = true;
          if (onComplete) onComplete();
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    });

    return controller;
  }

  // Экспорт в глобальную область видимости (window / globalThis)
  global.renderWordMosaic = renderWordMosaic;

  // Экспорт для сред с модулями (CommonJS / Node / Bundlers)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderWordMosaic };
  }

})(typeof window !== 'undefined' ? window : globalThis);
