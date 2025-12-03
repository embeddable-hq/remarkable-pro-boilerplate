const injectSansCode = () => {
  if (typeof document === 'undefined') return;
  const head = document.head || document.getElementsByTagName('head')[0];
  if (!head) return;
  if (!document.querySelector('link[google-sans-code]')) {
    const pre1 = document.createElement('link');
    pre1.rel = 'preconnect';
    pre1.href = 'https://fonts.googleapis.com';
    head.appendChild(pre1);
    const pre2 = document.createElement('link');
    pre2.rel = 'preconnect';
    pre2.href = 'https://fonts.gstatic.com';
    pre2.crossOrigin = 'anonymous';
    head.appendChild(pre2);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Google+Sans+Code:ital,wght@0,300..800;1,300..800&display=swap';
    link.setAttribute('google-sans-code', '1');
    head.appendChild(link);
  }
};
injectSansCode();
export default {
  onThemeUpdated: () => {
    injectSansCode();
  },
};
