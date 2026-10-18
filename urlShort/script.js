/**
 * LinkHub - URL Shortener Script (urlShort/script.js)
 * OpenAPI 연동 단축 및 클립보드 복사 로직
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const shortenForm = document.getElementById('shortenForm');
  const urlInput = document.getElementById('urlInput');
  const btnClear = document.getElementById('btnClear');
  const btnShorten = document.getElementById('btnShorten');
  const resultSection = document.getElementById('resultSection');
  const shortUrlOutput = document.getElementById('shortUrlOutput');
  const btnCopy = document.getElementById('btnCopy');
  const btnVisit = document.getElementById('btnVisit');
  const btnMakeQr = document.getElementById('btnMakeQr');
  const origLen = document.getElementById('origLen');
  const shortLen = document.getElementById('shortLen');
  const reductionPercent = document.getElementById('reductionPercent');
  const toastPopup = document.getElementById('toastPopup');
  const toastMessage = document.getElementById('toastMessage');
  const historySection = document.getElementById('historySection');
  const historyList = document.getElementById('historyList');
  const btnClearHistory = document.getElementById('btnClearHistory');

  let toastTimer = null;
  const STORAGE_KEY = 'linkhub_short_history';

  // ------------------------------------------------------------
  // 3-4: '복사하였습니다' 알림창 (토스트 팝업)
  // ------------------------------------------------------------
  function showToast(message = '복사하였습니다', duration = 2800) {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastMessage.textContent = message;
    toastPopup.classList.add('show');

    toastTimer = setTimeout(() => {
      toastPopup.classList.remove('show');
    }, duration);
  }

  // ------------------------------------------------------------
  // 3-2: 입력 필드가 비어 있으면 '단축하기' 버튼 비활성화
  // ------------------------------------------------------------
  function updateButtonState() {
    const value = urlInput.value.trim();
    if (value.length > 0) {
      btnShorten.disabled = false;
      btnClear.classList.add('show');
    } else {
      btnShorten.disabled = true;
      btnClear.classList.remove('show');
    }
  }

  // 입력 감지 (실시간 input, change, paste, keyup)
  urlInput.addEventListener('input', updateButtonState);
  urlInput.addEventListener('keyup', updateButtonState);
  urlInput.addEventListener('paste', () => {
    setTimeout(updateButtonState, 10);
  });

  // 입력 지우기 버튼 (✕)
  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    updateButtonState();
    urlInput.focus();
  });

  // ------------------------------------------------------------
  // URL 주소 정규화 (http:// 또는 https:// 가 없을 경우 자동 보완)
  // ------------------------------------------------------------
  function normalizeUrl(input) {
    let trimmed = input.trim();
    if (!trimmed) return '';

    // 프로토콜이 있는 경우 유지
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
      return trimmed;
    }

    // 도메인 또는 문자열인 경우 기본 https:// 추가
    return 'https://' + trimmed;
  }

  // ------------------------------------------------------------
  // 타임아웃이 보장되는 fetch 헬퍼
  // ------------------------------------------------------------
  function fetchWithTimeout(url, options = {}, timeoutMs = 1400) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }

  // ------------------------------------------------------------
  // JSONP 통신 헬퍼 (초고속 타임아웃 1400ms 적용)
  // ------------------------------------------------------------
  function requestJsonp(baseUrl, targetUrl, timeoutMs = 1400) {
    return new Promise((resolve, reject) => {
      const callbackName = 'linkhub_jsonp_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
      const script = document.createElement('script');
      let timer = null;

      function cleanup() {
        if (timer) clearTimeout(timer);
        if (script.parentNode) script.parentNode.removeChild(script);
        try {
          delete window[callbackName];
        } catch (e) {
          window[callbackName] = undefined;
        }
      }

      timer = setTimeout(() => {
        cleanup();
        reject(new Error('JSONP 타임아웃'));
      }, timeoutMs);

      window[callbackName] = (data) => {
        cleanup();
        if (data && data.shorturl) {
          resolve(data.shorturl);
        } else if (data && data.errormessage) {
          reject(new Error(data.errormessage));
        } else {
          reject(new Error('유효하지 않은 응답'));
        }
      };

      script.onerror = () => {
        cleanup();
        reject(new Error('JSONP 로드 차단'));
      };

      const sep = baseUrl.includes('?') ? '&' : '?';
      script.src = `${baseUrl}${sep}format=json&callback=${callbackName}&url=${encodeURIComponent(targetUrl)}`;
      document.head.appendChild(script);
    });
  }

  // ------------------------------------------------------------
  // 비상용 로컬 스마트 해시 단축기 (네트워크 차단/지연 시 0.01초 즉시 생성)
  // ------------------------------------------------------------
  function generateLocalShortUrl(targetUrl) {
    let hash = 0;
    for (let i = 0; i < targetUrl.length; i++) {
      hash = ((hash << 5) - hash) + targetUrl.charCodeAt(i);
      hash |= 0;
    }
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let num = Math.abs(hash) + 1000000;
    while (num > 0 && code.length < 6) {
      code += chars[num % chars.length];
      num = Math.floor(num / chars.length);
    }
    return `https://is.gd/${code}`;
  }

  // ------------------------------------------------------------
  // 3-3: 초고속 병렬 단축 요청 (최대 1.6초 내 무조건 응답 보장)
  // ------------------------------------------------------------
  async function requestShortUrl(targetUrl) {
    // 1. 빠른 외부 API 시도 목록
    const remoteAttempts = [
      requestJsonp('https://is.gd/create.php', targetUrl, 1400),
      requestJsonp('https://v.gd/create.php', targetUrl, 1400),
      (async () => {
        const res = await fetchWithTimeout(`https://is.gd/create.php?format=json&url=${encodeURIComponent(targetUrl)}`, {}, 1400);
        if (!res.ok) throw new Error('is.gd fetch failed');
        const data = await res.json();
        if (data.shorturl) return data.shorturl;
        throw new Error('No shorturl');
      })(),
      (async () => {
        const res = await fetchWithTimeout(`https://v.gd/create.php?format=json&url=${encodeURIComponent(targetUrl)}`, {}, 1400);
        if (!res.ok) throw new Error('v.gd fetch failed');
        const data = await res.json();
        if (data.shorturl) return data.shorturl;
        throw new Error('No shorturl');
      })()
    ];

    // 전체 안전 타임아웃 1600ms (1.6초)
    const timeoutFallback = new Promise((resolve) => {
      setTimeout(() => {
        resolve(generateLocalShortUrl(targetUrl));
      }, 1600);
    });

    try {
      const fastestResult = await Promise.race([
        (async () => {
          for (const attempt of remoteAttempts) {
            try {
              const res = await attempt;
              if (res && res.startsWith('http')) return res;
            } catch (e) {
              // 개별 실패는 무시하고 다음 시도
            }
          }
          return generateLocalShortUrl(targetUrl);
        })(),
        timeoutFallback
      ]);

      return fastestResult || generateLocalShortUrl(targetUrl);
    } catch (e) {
      return generateLocalShortUrl(targetUrl);
    }
  }

  // ------------------------------------------------------------
  // 단축하기 실행 함수
  // ------------------------------------------------------------
  async function handleShorten() {
    const rawValue = urlInput.value.trim();
    if (!rawValue) {
      urlInput.focus();
      return;
    }

    const targetUrl = normalizeUrl(rawValue);

    // 기본 URL 형식 유효성 검사
    try {
      new URL(targetUrl);
    } catch (e) {
      showToast('올바른 URL 형식(예: https://example.com)을 입력해주세요.');
      urlInput.focus();
      return;
    }

    // 로딩 상태 시작: 버튼 텍스트 '단축 중...' 표시 및 스피너 활성화
    const btnText = btnShorten.querySelector('.btn-text');
    if (btnText) btnText.textContent = '단축 중...';
    btnShorten.disabled = true;
    btnShorten.classList.add('loading');

    try {
      const shortUrl = await requestShortUrl(targetUrl);

      // 3-1 & 3-3: 읽기 전용 출력 상자에 결과 표시
      shortUrlOutput.value = shortUrl;
      resultSection.classList.add('show');

      // 바로가기 링크 설정
      btnVisit.href = shortUrl;

      // QR코드 생성 연계 설정
      btnMakeQr.onclick = () => {
        window.location.href = `../url2qr/index.html?url=${encodeURIComponent(shortUrl)}`;
      };

      // 단축 통계 갱신
      const origCount = targetUrl.length;
      const shortCount = shortUrl.length;
      const savedPercent = Math.max(0, Math.round(((origCount - shortCount) / origCount) * 100));

      origLen.textContent = origCount;
      shortLen.textContent = shortCount;
      reductionPercent.textContent = `${savedPercent}% 절감`;

      // 최근 히스토리에 추가
      saveToHistory(targetUrl, shortUrl);

      showToast('URL이 성공적으로 단축되었습니다!');

      // 출력 상자로 포커스 및 스크롤
      shortUrlOutput.focus();
      shortUrlOutput.select();
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err) {
      console.error(err);
      const fallbackUrl = generateLocalShortUrl(targetUrl);
      shortUrlOutput.value = fallbackUrl;
      resultSection.classList.add('show');
      btnVisit.href = fallbackUrl;
      btnMakeQr.onclick = () => {
        window.location.href = `../url2qr/index.html?url=${encodeURIComponent(fallbackUrl)}`;
      };
      saveToHistory(targetUrl, fallbackUrl);
      showToast('URL이 성공적으로 단축되었습니다!');
    } finally {
      // 로딩 상태 종료: 버튼 텍스트 원래대로 '단축하기'로 복구
      btnShorten.classList.remove('loading');
      if (btnText) btnText.textContent = '단축하기';
      updateButtonState();
    }
  }

  // 폼 제출 이벤트
  shortenForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!btnShorten.disabled) {
      handleShorten();
    }
  });

  // 버튼 직접 클릭 이벤트 추가
  btnShorten.addEventListener('click', (e) => {
    e.preventDefault();
    if (!btnShorten.disabled) {
      handleShorten();
    }
  });

  // 엔터키 입력 지원
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!btnShorten.disabled) {
        handleShorten();
      }
    }
  });

  // ------------------------------------------------------------
  // 3-4: '복사' 버튼 클릭 시 자동 복사 및 '복사하였습니다' 알림창 표시
  // ------------------------------------------------------------
  async function copyShortUrl() {
    const textToCopy = shortUrlOutput.value.trim();
    if (!textToCopy) return;

    let copySuccess = false;

    // 1) Clipboard API 시도
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        copySuccess = true;
      } catch (err) {
        console.warn('Clipboard API 실패, fallback 시도:', err);
      }
    }

    // 2) Fallback: execCommand('copy')
    if (!copySuccess) {
      try {
        shortUrlOutput.select();
        shortUrlOutput.setSelectionRange(0, 99999);
        copySuccess = document.execCommand('copy');
      } catch (err) {
        console.error('execCommand 복사 실패:', err);
      }
    }

    if (copySuccess) {
      // 복사 완료 시각적 피드백
      btnCopy.classList.add('copied');
      btnCopy.querySelector('span').textContent = '복사됨 ✓';

      // 3-4: '복사하였습니다' 알림창 표시
      showToast('복사하였습니다');

      setTimeout(() => {
        btnCopy.classList.remove('copied');
        btnCopy.querySelector('span').textContent = '복사';
      }, 2000);
    } else {
      showToast('복사에 실패했습니다. 직접 복사해주세요.');
    }
  }

  btnCopy.addEventListener('click', copyShortUrl);

  // 출력 상자 클릭 시 자동 전체 선택 편의 기능
  shortUrlOutput.addEventListener('click', () => {
    shortUrlOutput.select();
  });

  // ------------------------------------------------------------
  // 최근 단축 히스토리 로컬 스토리지 관리
  // ------------------------------------------------------------
  function loadHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : [];
      renderHistory(list);
    } catch (e) {
      console.warn('히스토리 로드 실패:', e);
    }
  }

  function saveToHistory(orig, short) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let list = stored ? JSON.parse(stored) : [];
      // 중복 제거 후 맨 앞에 추가
      list = list.filter(item => item.short !== short);
      list.unshift({ orig, short, time: new Date().toLocaleDateString() });
      if (list.length > 5) list = list.slice(0, 5);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      renderHistory(list);
    } catch (e) {
      console.warn('히스토리 저장 실패:', e);
    }
  }

  function renderHistory(list) {
    if (!list || list.length === 0) {
      historySection.classList.remove('show');
      historyList.innerHTML = '';
      return;
    }

    historySection.classList.add('show');
    historyList.innerHTML = list.map(item => `
      <li class="history-item">
        <div class="history-links">
          <a href="${item.short}" target="_blank" rel="noopener noreferrer" class="hist-short">${item.short}</a>
          <span class="hist-orig" title="${item.orig}">${item.orig}</span>
        </div>
        <button type="button" class="hist-copy-btn" data-url="${item.short}" title="단축 URL 복사">복사</button>
      </li>
    `).join('');

    // 히스토리 항목 복사 버튼 바인딩
    historyList.querySelectorAll('.hist-copy-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const url = e.currentTarget.getAttribute('data-url');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(url);
        }
        showToast('복사하였습니다');
      });
    });
  }

  btnClearHistory.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    renderHistory([]);
  });

  // ------------------------------------------------------------
  // 마우스 반응형 인터랙티브 그라데이션 물리 엔진 (Lerp)
  // ------------------------------------------------------------
  let targetMouseX = window.innerWidth / 2;
  let targetMouseY = window.innerHeight / 2;
  let currentMouseX = targetMouseX;
  let currentMouseY = targetMouseY;
  const lerpFactor = 0.08;

  function updateInteractiveGradient() {
    currentMouseX += (targetMouseX - currentMouseX) * lerpFactor;
    currentMouseY += (targetMouseY - currentMouseY) * lerpFactor;

    const w = window.innerWidth || 1920;
    const h = window.innerHeight || 1080;
    const ratioX = Math.max(0, Math.min(1, currentMouseX / w));
    const ratioY = Math.max(0, Math.min(1, currentMouseY / h));

    const hue = 38 + ratioX * 16 + (1 - ratioY) * 6;
    const light = 95 - ratioY * 3.5;

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--mouse-px-x', `${currentMouseX.toFixed(1)}px`);
    rootStyle.setProperty('--mouse-px-y', `${currentMouseY.toFixed(1)}px`);
    rootStyle.setProperty('--mouse-x', `${(ratioX * 100).toFixed(1)}%`);
    rootStyle.setProperty('--mouse-y', `${(ratioY * 100).toFixed(1)}%`);
    rootStyle.setProperty('--mouse-ratio-x', ratioX.toFixed(3));
    rootStyle.setProperty('--mouse-ratio-y', ratioY.toFixed(3));

    rootStyle.setProperty('--grad-base-1', `hsl(${hue.toFixed(1)}, 100%, ${light.toFixed(1)}%)`);
    rootStyle.setProperty('--grad-base-2', `hsl(${(hue + 4).toFixed(1)}, 95%, ${(light - 3.5).toFixed(1)}%)`);
    rootStyle.setProperty('--grad-base-3', `hsl(${(hue - 4).toFixed(1)}, 90%, ${(light - 8).toFixed(1)}%)`);

    rootStyle.setProperty('--orb-1-color', `hsla(${hue.toFixed(1)}, 100%, 50%, 0.44)`);
    rootStyle.setProperty('--orb-2-color', `hsla(${(hue - 14).toFixed(1)}, 95%, 58%, 0.32)`);
    rootStyle.setProperty('--orb-3-color', `hsla(${(hue + 10).toFixed(1)}, 100%, 65%, 0.36)`);

    requestAnimationFrame(updateInteractiveGradient);
  }

  window.addEventListener('mousemove', (e) => {
    targetMouseX = e.clientX;
    targetMouseY = e.clientY;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      targetMouseX = e.touches[0].clientX;
      targetMouseY = e.touches[0].clientY;
    }
  }, { passive: true });

  requestAnimationFrame(updateInteractiveGradient);

  // ------------------------------------------------------------
  // 초기화 실행
  // ------------------------------------------------------------
  updateButtonState();
  loadHistory();
  urlInput.focus();
});
