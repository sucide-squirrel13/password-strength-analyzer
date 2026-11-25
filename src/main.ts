import './styles/tokens.css';
import './styles/app.css';
import { AppController } from './ui/AppController.ts';

document.addEventListener('DOMContentLoaded', () => {
  const mount = document.getElementById('app');
  if (mount) {
    new AppController(mount);
  }
});
