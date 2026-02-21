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
    background: '#222',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '13px',
    maxWidth: '220px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    opacity: '0',
    transform: 'translateY(10px)',
    transition: 'all .35s cubic-bezier(.4,0,.2,1)',
    pointerEvents: 'none',
  });

  wrapper.appendChild(tooltip);
  setTimeout(() => {
    tooltip.style.opacity = '1';
    tooltip.style.transform = 'translateY(0)';
  }, 800);

  // Auto hide elegante
  setTimeout(() => {
    tooltip.style.opacity = '0';
    tooltip.style.transform = 'translateY(10px)';
  }, 5000);
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

Object.assign(iframe.style, {
  width: '380px',
  height: '600px',
  border: 'none',
  borderRadius: '18px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
  background: '#fff',
  transform: 'translateY(20px) scale(0.95)',
  opacity: '0',
  transition: 'all .3s cubic-bezier(.4,0,.2,1)',
  pointerEvents: 'none',
});

  document.body.appendChild(iframe);
  let isOpen = false;

  button.addEventListener('click', () => {
    if (!isOpen) {
      // APRI
      iframe.style.opacity = '1';
      iframe.style.transform = 'scale(1)';
      iframe.style.pointerEvents = 'auto';

      tooltip.style.opacity = '0';

      isOpen = true;

      iframe.contentWindow.postMessage({ type: 'BOT_OPEN' }, '*');
    } else {
      // CHIUDI
      iframe.style.opacity = '0';
      iframe.style.transform = 'scale(0.8)';
      iframe.style.pointerEvents = 'none';

      isOpen = false;
    }
  });
  window.addEventListener('message', (event) => {
    if (!event.data || !event.data.type) return;

    if (event.data.type === 'BOT_CLOSE') {
      iframe.style.opacity = '0';
      iframe.style.transform = 'scale(0.8)';
      iframe.style.pointerEvents = 'none';

      isOpen = false;
    }
  });
})();
