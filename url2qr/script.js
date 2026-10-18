/**
 * URL2QR - QR Code Generator & Downloader
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const body = document.body;
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const btnClear = document.getElementById('btnClear');
  const searchForm = document.querySelector('.search-form');
  const qrCanvas = document.getElementById('qrCanvas');
  const qrClickArea = document.getElementById('qrClickArea');
  const urlTextPreview = document.getElementById('urlTextPreview');
  const qrUrlDisplay = document.getElementById('qrUrlDisplay');
  const btnManualDownload = document.getElementById('btnManualDownload');
  const btnCopyUrl = document.getElementById('btnCopyUrl');
  const logoBtn = document.getElementById('logoBtn');
  const toastPopup = document.getElementById('toastPopup');

  let currentUrl = '';
  let toastTimer = null;
  let currentQrInstance = null;

  // ------------------------------------------------------------
  // 토스트 메시지 알림 함수
  // ------------------------------------------------------------
  function showToast(message, duration = 2800) {
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastPopup.textContent = message;
    toastPopup.classList.add('show');

    toastTimer = setTimeout(() => {
      toastPopup.classList.remove('show');
    }, duration);
  }

  // ------------------------------------------------------------
  // URL 주소 정규화 (http:// 또는 https:// 가 없을 경우 자동 보완)
  // ------------------------------------------------------------
  function normalizeUrl(input) {
    let trimmed = input.trim();
    if (!trimmed) return '';

    // 프로토콜(http, https, ftp 등)이 이미 포함된 경우 유지
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
      return trimmed;
    }

    // 도메인 또는 문자열인 경우 기본 https:// 추가
    return 'https://' + trimmed;
  }

  // ------------------------------------------------------------
  // QR 코드 캔버스 렌더링 함수 (선명한 고화질 렌더링)
  // ------------------------------------------------------------
  function renderQR(canvas, qr, displaySize = 220, margin = 2) {
    const moduleCount = qr.getModuleCount();
    const totalModules = moduleCount + margin * 2;
    
    // 고해상도(Retina 디스플레이 지원) 배율 계산
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const pixelSize = displaySize * dpr;
    const cellSize = pixelSize / totalModules;

    canvas.width = pixelSize;
    canvas.height = pixelSize;
    canvas.style.width = displaySize + 'px';
    canvas.style.height = displaySize + 'px';

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // 1. 순백색(#FFFFFF) 배경 채우기 (JPG 저장 시 투명도 왜곡 방지)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, pixelSize, pixelSize);

    // 2. 검은색(#000000) 모듈 그리기
    ctx.fillStyle = '#000000';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(
            Math.round((col + margin) * cellSize),
            Math.round((row + margin) * cellSize),
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          );
        }
      }
    }
  }

  // ------------------------------------------------------------
  // QR 코드 생성 함수 (UTF-8, 한글, 영문, 긴 URL 완벽 지원)
  // ------------------------------------------------------------
  function generateQRCode(text) {
    try {
      if (typeof qrcode !== 'function') {
        throw new Error('QR코드 생성 엔진을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
      }

      // qrcode(0, 'M') : 0 = 길이 기반 자동 버전 선택(1~40), 'M' = 15% 에러 정정율
      const qr = qrcode(0, 'M');
      qr.addData(text, 'Byte');
      qr.make();

      currentQrInstance = qr;
      currentUrl = text;

      // 캔버스에 렌더링
      renderQR(qrCanvas, qr, 220, 2);

      // 하단 정보 업데이트
      urlTextPreview.textContent = text;
      qrUrlDisplay.title = text;

      // 레이아웃 전환: 중앙 입력창이 하단으로 내려가고 중앙에 QR코드 표시
      if (!body.classList.contains('has-qr')) {
        body.classList.add('has-qr');
      }
    } catch (err) {
      console.error('QR 생성 오류:', err);
      showToast('⚠️ QR 코드 생성 중 오류가 발생했습니다: ' + (err.message || ''));
    }
  }

  // ------------------------------------------------------------
  // JPG 다운로드 함수 (고해상도 800x800, 흰 배경 보장)
  // ------------------------------------------------------------
  function downloadQRAsJPG() {
    if (!currentQrInstance || !currentUrl) {
      showToast('⚠️ 생성된 QR코드가 없습니다.');
      return;
    }

    try {
      // 다운로드용 고해상도(800x800) 오프스크린 캔버스 생성
      const exportCanvas = document.createElement('canvas');
      const exportSize = 800;
      renderQR(exportCanvas, currentQrInstance, exportSize, 3);

      // JPG 데이터 URL 추출 (품질 0.95)
      const jpgDataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);

      // 파일명 생성 (도메인 추출)
      let filename = 'qrcode.jpg';
      try {
        const parsed = new URL(currentUrl);
        const hostName = parsed.hostname.replace(/[^a-zA-Z0-9_-]/g, '_');
        filename = `QR_${hostName || 'url'}.jpg`;
      } catch (e) {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        filename = `QR_code_${dateStr}.jpg`;
      }

      // 가상 링크 다운로드
      const downloadLink = document.createElement('a');
      downloadLink.download = filename;
      downloadLink.href = jpgDataUrl;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast(`📥 ${filename} 다운로드 완료!`);
    } catch (err) {
      console.error('다운로드 오류:', err);
      showToast('⚠️ 다운로드 중 오류가 발생했습니다.');
    }
  }

  // ------------------------------------------------------------
  // 폼 제출 핸들러 (확인/생성하기 버튼 또는 엔터키)
  // ------------------------------------------------------------
  function handleFormSubmit() {
    const rawValue = urlInput.value.trim();

    if (!rawValue) {
      searchForm.classList.add('shake');
      setTimeout(() => searchForm.classList.remove('shake'), 450);
      showToast('⚠️ 변환할 URL 주소를 입력해 주세요.');
      urlInput.focus();
      return;
    }

    const processedUrl = normalizeUrl(rawValue);
    urlInput.value = processedUrl;
    btnClear.style.display = 'inline-flex';

    generateQRCode(processedUrl);
  }

  // ------------------------------------------------------------
  // 이벤트 바인딩
  // ------------------------------------------------------------

  // 1. 폼 제출 (엔터 키 및 생성하기 버튼 클릭 모두 단일 진입점으로 처리)
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleFormSubmit();
  });

  // 2. QR코드 영역 클릭 시 JPG 다운로드 (요구사항 4)
  qrClickArea.addEventListener('click', () => {
    downloadQRAsJPG();
  });

  qrClickArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      downloadQRAsJPG();
    }
  });

  // 3. 보조 다운로드 버튼
  btnManualDownload.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadQRAsJPG();
  });

  // 4. URL 복사 버튼
  btnCopyUrl.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!currentUrl) return;

    try {
      await navigator.clipboard.writeText(currentUrl);
      showToast('📋 URL이 클립보드에 복사되었습니다!');
    } catch (err) {
      const tempInput = document.createElement('input');
      tempInput.value = currentUrl;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      showToast('📋 URL이 클립보드에 복사되었습니다!');
    }
  });

  // 5. 입력창 실시간 상태
  urlInput.addEventListener('input', () => {
    btnClear.style.display = urlInput.value.trim().length > 0 ? 'inline-flex' : 'none';
  });

  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    btnClear.style.display = 'none';
    urlInput.focus();
  });

  // 6. 상단 좌측 로고 클릭 시 처음 화면으로 리셋
  logoBtn.addEventListener('click', () => {
    body.classList.remove('has-qr');
    urlInput.value = '';
    btnClear.style.display = 'none';
    currentUrl = '';
    currentQrInstance = null;
    const ctx = qrCanvas.getContext('2d');
    ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
    urlInput.focus();
    showToast('새로운 QR코드를 생성할 수 있습니다.');
  });

  // ------------------------------------------------------------
  // 7. 마우스 커서 위치에 따른 인터랙티브 그라데이션 색상 변경
  // ------------------------------------------------------------
  let targetMouseX = window.innerWidth / 2;
  let targetMouseY = window.innerHeight / 2;
  let currentMouseX = targetMouseX;
  let currentMouseY = targetMouseY;

  function updateInteractiveGradient() {
    // 부드러운 감속(Lerp) 보간으로 끊김 없는 유려한 움직임
    currentMouseX += (targetMouseX - currentMouseX) * 0.08;
    currentMouseY += (targetMouseY - currentMouseY) * 0.08;

    const w = window.innerWidth || 1920;
    const h = window.innerHeight || 1080;
    const ratioX = Math.max(0, Math.min(1, currentMouseX / w));
    const ratioY = Math.max(0, Math.min(1, currentMouseY / h));

    // 색조(Hue): 38°(따뜻한 살구/피치 앰버) ~ 54°(화사한 레몬/선샤인 골드)
    const hue = 38 + ratioX * 16 + (1 - ratioY) * 6;
    // 명도(Lightness): 항상 92% ~ 97%의 극도로 밝고 화사한 톤 유지
    const light = 95 - ratioY * 3.5;

    // CSS 변수 갱신
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--mouse-px-x', `${currentMouseX.toFixed(1)}px`);
    rootStyle.setProperty('--mouse-px-y', `${currentMouseY.toFixed(1)}px`);
    rootStyle.setProperty('--mouse-x', `${(ratioX * 100).toFixed(1)}%`);
    rootStyle.setProperty('--mouse-y', `${(ratioY * 100).toFixed(1)}%`);
    rootStyle.setProperty('--mouse-ratio-x', ratioX.toFixed(3));
    rootStyle.setProperty('--mouse-ratio-y', ratioY.toFixed(3));

    // 미세한 색상 변조
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

  // URL 파라미터(?url=...) 자동 감지 및 즉시 생성
  const urlParams = new URLSearchParams(window.location.search);
  const paramUrl = urlParams.get('url');
  if (paramUrl) {
    urlInput.value = paramUrl;
    btnClear.classList.add('show');
    generateQRCode(paramUrl);
  } else {
    // 초기 포커스
    urlInput.focus();
  }
});
