if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/pwa_dynamic/sw.js')
      .then(reg => {
        console.log('SW registrado:', reg);
      })
      .catch(err => {
        console.log('SW no registrado:', err);
      });
  });
}