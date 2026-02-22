(function () {
  const BOT_URL = 'https://chatbot-ristoranti.vercel.app/';
  const scriptTag = document.currentScript;
  const client = scriptTag.dataset.client || 'demo';
  const primaryColor = scriptTag.dataset.primaryColor || '#111';

  // ===============================
  // WRAPPER FIXED
  // ===============================
  const wrapper = document.createElement('div');
  Object.assign(wrapper.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '2147483647',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '12px',
  });

  document.body.appendChild(wrapper);
  const tooltip = document.createElement('div');
  tooltip.innerText = 'Hai domande su menù, orari o prenotazioni?';

  Object.assign(tooltip.style, {
    position: 'relative',
    background: '#ffffff',
    color: '#111',
    padding: '12px 16px',
    borderRadius: '18px',
    fontSize: '14px',
    lineHeight: '1.4',
    maxWidth: '240px',
    boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
    opacity: '0',
    transform: 'translateY(12px)',
    transition: 'all .35s cubic-bezier(.4,0,.2,1)',
    pointerEvents: 'none',
  });
  const tail = document.createElement('div');

  Object.assign(tail.style, {
    position: 'absolute',
    bottom: '-6px',
    right: '18px',
    width: '12px',
    height: '12px',
    background: '#ffffff',
    transform: 'rotate(45deg)',
    boxShadow: '2px 2px 6px rgba(0,0,0,0.05)',
  });

  tooltip.appendChild(tail);
  wrapper.appendChild(tooltip);

  let floatInterval;

  setTimeout(() => {
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translateY(0)';

    floatInterval = setInterval(() => {
      tooltip.style.transform = 'translateY(-4px)';
      setTimeout(() => {
        tooltip.style.transform = 'translateY(0)';
      }, 1200);
    }, 2400);
  }, 800);
  setTimeout(() => {
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translateY(0)';
  }, 800);

  // Auto hide elegante
  setTimeout(() => {
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateY(12px)';
    clearInterval(floatInterval);
  }, 6000);
  const button = document.createElement('div');
  button.innerHTML = '💬';

  Object.assign(button.style, {
    width: '60px',
    height: '60px',
    background: primaryColor,
    color: '#fff',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
    cursor: 'pointer',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    transition: 'all .25s cubic-bezier(.4,0,.2,1)',
    backdropFilter: 'blur(6px)',
  });

  wrapper.appendChild(button);
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.08)';
    button.style.boxShadow = '0 14px 40px rgba(0,0,0,0.35)';
  });

  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
  });

  button.addEventListener('mousedown', () => {
    button.style.transform = 'scale(0.96)';
  });

  button.addEventListener('mouseup', () => {
    button.style.transform = 'scale(1.08)';
  });
  const iframe = document.createElement('iframe');
  iframe.src = BOT_URL + '?client=' + encodeURIComponent(client);
  const FAB_SIZE = 60;
  const BASE_OFFSET = 24;
  const GAP = 16;

  Object.assign(iframe.style, {
    position: 'fixed',
    bottom: `${BASE_OFFSET + FAB_SIZE + GAP}px`,
    right: '24px',
    width: '380px',
    height: '600px',
    border: 'none',
    borderRadius: '18px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
    background: 'transparent',
    transform: 'scale(0.8)',
    opacity: '0',
    pointerEvents: 'none',
  });

  document.body.appendChild(iframe);
  let isOpen = false;

  button.addEventListener('click', () => {
    if (!isOpen) {
      // 🔥 FULLSCREEN
      tooltip.style.opacity = '0';
      tooltip.style.transform = 'translateY(10px)';

      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '100vw';
      iframe.style.height = '100dvh';
      iframe.style.borderRadius = '0';
      iframe.style.boxShadow = 'none';
      wrapper.style.pointerEvents = 'none';
      iframe.style.zIndex = '2147483646';
      iframe.style.opacity = '1';
      iframe.style.transform = 'scale(1)';
      iframe.style.pointerEvents = 'auto';

      isOpen = true;

      iframe.contentWindow.postMessage({ type: 'BOT_OPEN' }, '*');
    } else {
      // 🔄 TORNA FLOATING
      iframe.style.top = 'auto';
      iframe.style.left = 'auto';
      iframe.style.right = '24px';
      iframe.style.bottom = `${BASE_OFFSET + FAB_SIZE + GAP}px`;
      wrapper.style.pointerEvents = 'auto';
      iframe.style.width = '380px';
      iframe.style.height = '600px';
      iframe.style.borderRadius = '18px';
      iframe.style.boxShadow = '0 20px 60px rgba(0,0,0,0.35)';

      iframe.style.opacity = '0';
      iframe.style.transform = 'scale(0.8)';
      iframe.style.pointerEvents = 'none';

      isOpen = false;
    }
  });
  window.addEventListener('message', (event) => {
    if (!event.data || !event.data.type) return;

    if (event.data.type === 'BOT_CLOSE') {
      iframe.style.top = 'auto';
      iframe.style.left = 'auto';
      iframe.style.right = '24px';
      iframe.style.bottom = `${BASE_OFFSET + FAB_SIZE + GAP}px`;
      wrapper.style.pointerEvents = 'auto';
      iframe.style.width = '380px';
      iframe.style.height = '600px';
      iframe.style.borderRadius = '18px';
      iframe.style.boxShadow = '0 20px 60px rgba(0,0,0,0.35)';

      iframe.style.opacity = '0';
      iframe.style.transform = 'scale(0.8)';
      iframe.style.pointerEvents = 'none';

      isOpen = false;
    }
  });
  window.addEventListener('message', (event) => {
    if (!event.data || !event.data.type) return;

    if (event.data.type === 'BOT_DISABLED') {
      wrapper.remove();
      iframe.remove();
    }
  });
})();
