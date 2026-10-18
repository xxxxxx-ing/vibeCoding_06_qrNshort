/**
 * LinkHub - Main Portal Hub Script (script.js)
 * 마우스 인터랙티브 그라데이션 물리 엔진 & 네비게이션 제어
 */

document.addEventListener('DOMContentLoaded', () => {
  // 마우스 반응형 인터랙티브 그라데이션 물리 엔진 (Lerp)
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

    // 색조: 38° ~ 54°
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

  // 카드 3D 틸트 인터랙션 (마우스 호버 시 입체감 부여)
  const cards = document.querySelectorAll('.service-card');
  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -6;
      const rotateY = ((x - centerX) / centerX) * 6;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-8px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
});
