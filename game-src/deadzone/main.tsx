import { createRoot } from 'react-dom/client';
import GameShell from './GameShell';

const mount = document.getElementById('game');
if (mount) createRoot(mount).render(<GameShell />);
