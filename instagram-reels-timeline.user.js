// ==UserScript==
// @name         Instagram Reels Timeline / Progress Bar
// @namespace    https://tampermonkey.net/
// @version      1.3.6
// @description  Adds a visible draggable timeline/progress bar to Instagram Reels videos.
// @author       -Inet
// @match        https://www.instagram.com/reels/*
// @match        https://www.instagram.com/reel/*
// @match        https://www.instagram.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (window.__inetInstagramReelsTimelineInitialized) {
        return;
    }
    window.__inetInstagramReelsTimelineInitialized = true;

    const STYLE_ID = 'inet-instagram-reels-timeline-style';
    const MIN_VISIBLE_AREA = 4000;

    let timeline = null;
    let activeVideo = null;
    let rafId = 0;
    let refreshRafId = 0;
    let isDragging = false;
    let activePointerId = null;

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .inet-reels-timeline {
                --inet-track-scale: 1;
                --inet-thumb-scale: 1;
                position: fixed;
                z-index: 2147483647;
                display: none;
                align-items: center;
                gap: 0;
                height: 31px;
                padding: 5px 7px;
                border: none;
                border-radius: 15px;
                background-color: rgba(44, 44, 44, 0.5);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
                backdrop-filter: blur(6px);
                -webkit-backdrop-filter: blur(6px);
                color: #fff;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                font-size: 12px;
                line-height: 33px;
                box-sizing: border-box;
                user-select: none;
                -webkit-user-select: none;
                touch-action: none;
                opacity: 0.94;
                pointer-events: auto;
            }

            .inet-reels-timeline:hover,
            .inet-reels-timeline:focus-within,
            .inet-reels-timeline.inet-dragging {
                --inet-track-scale: 1.1;
                --inet-thumb-scale: 1.04;
                opacity: 1;
            }

            .inet-reels-track {
                position: relative;
                flex: 1 1 auto;
                min-width: 100px;
                height: 23px;
                cursor: pointer;
                touch-action: none;
            }

            .inet-reels-track-bar {
                position: absolute;
                top: 50%;
                left: 0;
                width: 100%;
                height: 6px;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.28);
                overflow: visible;
                transform: translateY(-50%) scaleY(var(--inet-track-scale));
                transform-origin: center;
                transition: transform 160ms cubic-bezier(0.2, 0, 0, 1);
                will-change: transform;
            }

            .inet-reels-progress {
                position: absolute;
                inset: 0 auto 0 0;
                width: 0%;
                border-radius: inherit;
                background: linear-gradient(90deg, #ff2d55, #ff7a8a);
                pointer-events: none;
            }

            .inet-reels-thumb {
                position: absolute;
                top: 50%;
                left: 0%;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #fff;
                transform: translate(-50%, -50%) scale(var(--inet-thumb-scale));
                transform-origin: center;
                transition: transform 160ms cubic-bezier(0.2, 0, 0, 1);
                will-change: transform;
                pointer-events: none;
            }

            .inet-reels-time {
                flex: 0 0 auto;
                min-width: 66px;
                text-align: right;
                font-variant-numeric: tabular-nums;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
                white-space: nowrap;
            }
        `;

        document.documentElement.appendChild(style);
    }

    function createTimeline() {
        if (timeline) {
            return timeline;
        }

        const container = document.createElement('div');
        container.className = 'inet-reels-timeline';
        container.dataset.inetReelsTimeline = 'true';

        const track = document.createElement('div');
        track.className = 'inet-reels-track';

        const trackBar = document.createElement('div');
        trackBar.className = 'inet-reels-track-bar';

        const progress = document.createElement('div');
        progress.className = 'inet-reels-progress';

        const thumb = document.createElement('div');
        thumb.className = 'inet-reels-thumb';

        const timeLabel = document.createElement('div');
        timeLabel.className = 'inet-reels-time';
        timeLabel.textContent = '0:00 / --:--';

        trackBar.appendChild(progress);
        track.append(trackBar, thumb);
        container.append(track, timeLabel);
        document.body.appendChild(container);

        timeline = { container, track, progress, thumb, timeLabel };
        bindTimelineEvents();
        return timeline;
    }

    function bindTimelineEvents() {
        timeline.track.addEventListener('pointerdown', (event) => {
            if (event.pointerType === 'mouse' && event.button !== 0) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            isDragging = true;
            activePointerId = event.pointerId;
            timeline.container.classList.add('inet-dragging');

            setPointerCapture(event.pointerId);

            seekFromClientX(event.clientX);
        }, { passive: false });

        timeline.track.addEventListener('pointermove', (event) => {
            if (!isDragging || event.pointerId !== activePointerId) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            seekFromClientX(event.clientX);
        }, { passive: false });

        timeline.track.addEventListener('pointerup', finishDragging, { passive: false });
        timeline.track.addEventListener('pointercancel', finishDragging, { passive: false });
        timeline.track.addEventListener('lostpointercapture', stopDragging);
    }

    function setPointerCapture(pointerId) {
        if (!timeline || !timeline.track.setPointerCapture) {
            return;
        }

        try {
            timeline.track.setPointerCapture(pointerId);
        } catch (error) {
            void error;
        }
    }

    function releasePointerCapture(pointerId) {
        if (!timeline || !timeline.track.releasePointerCapture) {
            return;
        }

        try {
            timeline.track.releasePointerCapture(pointerId);
        } catch (error) {
            void error;
        }
    }

    function finishDragging(event) {
        if (activePointerId !== null && event.pointerId !== activePointerId) {
            return;
        }

        if (isDragging) {
            event.preventDefault();
            event.stopPropagation();
            seekFromClientX(event.clientX);
        }

        stopDragging();
    }

    function stopDragging() {
        if (activePointerId !== null) {
            releasePointerCapture(activePointerId);
        }

        isDragging = false;
        activePointerId = null;

        if (timeline) {
            timeline.container.classList.remove('inet-dragging');
        }
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return '0:00';
        }

        const totalSeconds = Math.floor(seconds);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }

        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }

    function getVisibleArea(rect) {
        const left = Math.max(0, rect.left);
        const right = Math.min(window.innerWidth, rect.right);
        const top = Math.max(0, rect.top);
        const bottom = Math.min(window.innerHeight, rect.bottom);
        return Math.max(0, right - left) * Math.max(0, bottom - top);
    }

    function isUsableVideo(video) {
        if (!(video instanceof HTMLVideoElement) || !video.isConnected) {
            return false;
        }

        const rect = video.getBoundingClientRect();
        const style = window.getComputedStyle(video);

        return rect.width > 40 &&
            rect.height > 40 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            getVisibleArea(rect) > MIN_VISIBLE_AREA;
    }

    function getActiveVideo() {
        const videos = document.querySelectorAll('video');
        let bestVideo = null;
        let bestScore = -Infinity;

        for (const video of videos) {
            if (!isUsableVideo(video)) {
                continue;
            }

            const rect = video.getBoundingClientRect();
            const visibleArea = getVisibleArea(rect);
            const centerDistance = Math.abs((rect.left + rect.width / 2) - window.innerWidth / 2) +
                Math.abs((rect.top + rect.height / 2) - window.innerHeight / 2);
            const playingBoost = !video.paused && !video.ended ? window.innerWidth * window.innerHeight : 0;
            const score = visibleArea + playingBoost - centerDistance * 250;

            if (score > bestScore) {
                bestScore = score;
                bestVideo = video;
            }
        }

        return bestVideo;
    }

    function setActiveVideo(video) {
        if (activeVideo === video) {
            return;
        }

        if (activeVideo) {
            activeVideo.removeEventListener('loadedmetadata', updateTimeline);
            activeVideo.removeEventListener('durationchange', updateTimeline);
            activeVideo.removeEventListener('timeupdate', updateTimeline);
            activeVideo.removeEventListener('seeked', updateTimeline);
        }

        activeVideo = video;

        if (activeVideo) {
            activeVideo.addEventListener('loadedmetadata', updateTimeline);
            activeVideo.addEventListener('durationchange', updateTimeline);
            activeVideo.addEventListener('timeupdate', updateTimeline);
            activeVideo.addEventListener('seeked', updateTimeline);
        }

        updateTimeline();
        startLoop();
    }

    function positionTimeline() {
        if (!activeVideo || !timeline) {
            return;
        }

        const rect = activeVideo.getBoundingClientRect();
        const leftGap = 12;
        const rightGap = 47;
        const width = Math.max(180, Math.min(rect.width - leftGap - rightGap, 520));
        const left = Math.max(8, Math.min(window.innerWidth - width - 8, rect.left + leftGap));
        const bottomInsideVideo = rect.bottom - 12;
        const top = Math.max(8, Math.min(window.innerHeight - 43, bottomInsideVideo - 33));

        timeline.container.style.left = `${Math.round(left)}px`;
        timeline.container.style.top = `${Math.round(top)}px`;
        timeline.container.style.width = `${Math.round(width)}px`;
    }

    function updateTimeline() {
        if (!timeline || !activeVideo || !isUsableVideo(activeVideo)) {
            hideTimeline();
            return;
        }

        positionTimeline();

        const duration = Number.isFinite(activeVideo.duration) ? activeVideo.duration : 0;
        const currentTime = Number.isFinite(activeVideo.currentTime) ? activeVideo.currentTime : 0;
        const percent = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;

        timeline.container.style.display = 'flex';
        timeline.progress.style.width = `${percent}%`;
        timeline.thumb.style.left = `${percent}%`;
        timeline.timeLabel.textContent = `${formatTime(currentTime)} / ${duration > 0 ? formatTime(duration) : '--:--'}`;
    }

    function hideTimeline() {
        if (timeline) {
            timeline.container.style.display = 'none';
        }
    }

    function seekFromClientX(clientX) {
        if (!activeVideo || !timeline || !Number.isFinite(activeVideo.duration) || activeVideo.duration <= 0) {
            return;
        }

        const rect = timeline.track.getBoundingClientRect();
        if (!rect.width) {
            return;
        }

        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        activeVideo.currentTime = ratio * activeVideo.duration;
        updateTimeline();
    }

    function refreshActiveVideo() {
        refreshRafId = 0;
        createTimeline();
        setActiveVideo(getActiveVideo());
    }

    function scheduleRefresh() {
        if (refreshRafId) {
            return;
        }

        refreshRafId = requestAnimationFrame(refreshActiveVideo);
    }

    function startLoop() {
        if (rafId) {
            return;
        }

        const tick = () => {
            if (!activeVideo || !activeVideo.isConnected || !isUsableVideo(activeVideo)) {
                rafId = 0;
                setActiveVideo(getActiveVideo());
                return;
            }

            if (!isDragging) {
                updateTimeline();
            }

            rafId = requestAnimationFrame(tick);
        };

        rafId = requestAnimationFrame(tick);
    }

    function observeDom() {
        const observer = new MutationObserver(scheduleRefresh);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
        });

        window.addEventListener('scroll', scheduleRefresh, { passive: true, capture: true });
        window.addEventListener('resize', scheduleRefresh, { passive: true });
        window.addEventListener('popstate', scheduleRefresh);
        document.addEventListener('visibilitychange', scheduleRefresh);
        document.addEventListener('play', scheduleRefresh, true);
        document.addEventListener('click', scheduleRefresh, true);

        setInterval(scheduleRefresh, 1500);
    }

    function init() {
        if (!document.body) {
            requestAnimationFrame(init);
            return;
        }

        injectStyles();
        createTimeline();
        refreshActiveVideo();
        observeDom();
    }

    init();
})();
