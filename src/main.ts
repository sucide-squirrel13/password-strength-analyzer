import './styles/tokens.css';
import './styles/app.css';
import { AppController } from './ui/AppController.ts';
import { ThemeManager } from './ui/ThemeManager.ts';

const themeManager = new ThemeManager();

document.addEventListener('DOMContentLoaded', () => {
  const mount = document.getElementById('app');
  if (mount) {
    new AppController(mount, themeManager);
  }
  window.requestAnimationFrame(() => {
    document.documentElement.classList.add('theme-ready');
  });
});
