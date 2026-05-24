# JeuTirPerso

FPS première personne basé sur les designs de votre cahier de notes ! 🎮

## 🎮 Gameplay

Un jeu de tir en **vue subjective** où vous n'êtes rien qu'une arme ! Affrontez des vagues d'ennemis croissantes en vue première personne. Seule votre arme est visible à l'écran.

### Contrôles

- **W** : Avancer
- **S** : Reculer  
- **Souris** : Regarder autour (rotation de caméra)
- **Clic gauche** : Tirer
- **R** : Recharger

### Mécaniques

- Éliminez les ennemis pour gagner des points (+100 points par ennemi)
- Système de munitions limité (30 balles par chargeur)
- Évitez les contacts avec les ennemis (vous avez 3 vies)
- Les ennemis apparaissent autour de vous et avancent
- Chaque 5 ennemis tués = nouvelle vague plus difficile
- Les ennemis deviennent plus nombreux et rouges = plus proche

## 🚀 Installation

### Prérequis
- Un navigateur web moderne (Chrome, Firefox, Edge, Safari)

### Lancer le jeu

1. **Localement** :
   ```bash
   python -m http.server 8000
   ```
   Puis ouvrez `http://localhost:8000` dans votre navigateur

2. **En ligne** :
   Déployez les fichiers sur un serveur web (GitHub Pages, Netlify, etc.)

## 📁 Fichiers

- `index.html` - Interface HTML du jeu
- `game.js` - Logique du jeu (joueur, ennemis, bullets, explosions)
- `IMG_0829.png`, `IMG_0830.png`, `IMG_0831.png` - Designs originaux

## 🎨 Features

- **Vue première personne** (FPS subjectif)
- **Arme visible** à l'écran (pistolet avec animation de recul)
- Ennemis qui se rapprochent dynamiquement
- Système de munitions avec recharge (R)
- Crosshair vert au centre
- Bobbing de l'arme lors du mouvement
- Vagues d'ennemis croissantes
- Horizon avec ciel en dégradé et sol noir

## 🛠️ Technologie

- **HTML5 Canvas** pour le rendu
- **JavaScript Vanilla** (pas de dépendances)
- Boucle de jeu avec `requestAnimationFrame`

## 📈 Améliorations futures possibles

- [ ] Différents types d'ennemis
- [ ] Système de power-ups
- [ ] Niveaux/Maps multiples
- [ ] Son et musique
- [ ] Highscores sauvegardés
- [ ] Différents types d'armes

## 📝 Licence

MIT
