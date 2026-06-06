# Instagram Reels Timeline

## Project Overview

Tampermonkey/Greasemonkey userscript для добавления кастомного timeline в Instagram Reels.

Скрипт находит активный HTML5 `<video>` на странице Instagram и показывает поверх него панель с progress bar, draggable-ползунком и временем воспроизведения.

**Ключевые возможности:**

- Находит Reels-видео через универсальный `document.querySelectorAll('video')`
- Работает с динамически подгружаемыми Reels
- Использует один общий timeline на страницу
- Автоматически переключается на активное видео
- Показывает текущее время и длительность ролика
- Поддерживает перемотку кликом по timeline
- Поддерживает drag мышью и touch/pointer drag на мобильных браузерах
- Перематывает видео через `video.currentTime`
- Не зависит от нестабильных CSS-классов Instagram
- Работает на `instagram.com/reels/*`, `instagram.com/reel/*` и `instagram.com/*`

## Установка

1. Установите **Tampermonkey** или совместимый userscript-менеджер:
   - Chrome: [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/tampermonkey/)
   - Edge: [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
   - Opera: [Opera addons](https://addons.opera.com/extensions/details/tampermonkey-beta/)

2. Откройте `instagram-reels-timeline.user.js` в браузере и установите скрипт через Tampermonkey.

3. Убедитесь, что скрипт включён в менеджере userscripts.

## Использование

1. Откройте Instagram Reels или страницу Instagram с видео.
2. Timeline появится автоматически поверх активного Reels-видео.
3. Кликните по полосе для перемотки или перетащите ползунок мышью/пальцем.

Скрипт не добавляет сторонних библиотек, не скачивает видео и не меняет остальной интерфейс Instagram.

## Технические детали

### Как это работает

- **Поиск видео:** скрипт регулярно проверяет DOM и выбирает активный `<video>` по видимой площади, позиции на экране и состоянию воспроизведения.
- **Один overlay:** timeline создаётся один раз в `document.body` и перепривязывается к текущему активному видео.
- **Позиционирование:** панель использует `position: fixed`, поэтому не зависит от внутренних контейнеров Instagram, `overflow` и stacking context.
- **Обновление:** прогресс обновляется через `requestAnimationFrame` и media-события `loadedmetadata`, `durationchange`, `timeupdate`, `seeked`.
- **Перемотка:** click/drag вычисляет позицию указателя на track и устанавливает `video.currentTime`.
- **SPA-поддержка:** `MutationObserver`, `scroll`, `resize`, `play`, `click` и `visibilitychange` помогают корректно переключаться между Reels.
- **Pointer UX:** track и ползунок используют независимые CSS-переменные для синхронной hover/drag-анимации.

### Ограничения

- Работает только с HTML5 `<video>`, доступными в DOM.
- Если Instagram сильно изменит Reels-плеер, может потребоваться обновление логики поиска.
- Пока длительность видео недоступна, отображается `--:--`.
**- Скрипт не обходит DRM, приватность или ограничения платформы.**

## Технологии

- JavaScript ES6+
- Tampermonkey/Greasemonkey
- DOM API
- MutationObserver API
- Pointer Events API
- HTMLMediaElement API
- requestAnimationFrame API

## История версий

| Версия | Изменения |
|--------|-----------|
| 1.0.0 | Первая версия: progress bar, time label, click seek, drag, MutationObserver |
| 1.1.0 | Timeline вынесен в `document.body` для стабильной видимости поверх Instagram |
| 1.2.0 | Оптимизация до одного общего timeline на страницу |
| 1.3.0 | Переработана hover/drag-анимация track и thumb |
| 1.3.6 | Финальная настройка компактного UI, позиции панели и визуального стиля |
