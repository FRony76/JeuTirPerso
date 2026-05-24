# JeuTirPerso

Jeu de tir arcade basé sur les designs de votre cahier de notes !

## 🎮 Gameplay

Un jeu de tir arcade où vous affrontez des vagues d'ennemis croissantes. Survivez le plus longtemps possible et obtenez le meilleur score !

### Contrôles

- **W** : Avancer
- **S** : Reculer  
- **Souris** : Viser
- **Clic gauche** : Tirer

### Mécaniques

- Éliminez les ennemis pour gagner des points (+100 points par ennemi)
- Évitez les contacts avec les ennemis (vous avez 3 vies)
- Chaque 5 ennemis tués = nouvelle vague plus difficile
- Les ennemis deviennent plus nombreux à chaque vague

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

- Rendu canvas avec grille de fond
- Système de collision joueur/ennemi/balles
- Explosions avec particules
- UI avec score et vies
- Crosshair dynamique
- Vagues d'ennemis progressives

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
