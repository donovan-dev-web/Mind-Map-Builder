# Mind Map Builder

[![React](https://img.shields.io/badge/React-18-20232A?logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB?logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-Backend-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![License: CC0 1.0](https://img.shields.io/badge/License-CC0%201.0-lightgrey)](./LICENSE)

**Auteur : Donovan CHARTRAIN, developpeur web fullstack et mobile**

Mind Map Builder est une application de bureau orientée productivité, conçue pour créer et manipuler des cartes mentales, des organigrammes et des schémas libres dans une interface visuelle moderne.

Le projet combine un frontend React + Vite avec un shell desktop Tauri en Rust afin d'offrir une expérience légère, rapide et portable. Il met particulièrement l'accent sur la personnalisation graphique des nœuds, l'édition visuelle sur canvas et l'export de diagrammes.

## Aperçu

Ce projet a été pensé comme un éditeur visuel capable de couvrir plusieurs usages :

- cartographie d'idées et brainstorming
- création d'organigrammes
- conception de structures hiérarchiques
- mise en page de schémas libres
- création de modèles de nœuds réutilisables

L'application propose un flux complet :

1. créer un nouveau projet via un assistant de configuration
2. choisir un type de diagramme et un style global
3. éditer la carte dans un canvas interactif
4. concevoir des nœuds personnalisés dans un designer dédié
5. exporter le résultat dans plusieurs formats

## Fonctionnalités principales

### Edition visuelle

- canvas interactif basé sur React Flow
- ajout, suppression et déplacement de nœuds
- création de sous-nœuds et de nœuds frères
- connexion manuelle entre éléments
- zoom, centrage et ajustement à la vue
- sélection simple, multiple et rectangulaire
- verrouillage de l'édition
- grille et minimap

### Types de projets

- `mind-map`
- `org-chart`
- `freeform`

Chaque projet peut être initialisé avec :

- un style global de connecteurs
- une apparence typographique commune
- un style de nœud par défaut
- une disposition initiale `blank`, `horizontal`, `vertical` ou `radial`

### Personnalisation des nœuds

- nœuds standards : rectangle, rectangle arrondi, ovale, cercle, texte, image
- nœuds personnalisés basés sur un layout déclaratif
- bibliothèque de modèles enregistrés
- modèles intégrés fournis par défaut
- champs de données dynamiques dans les nœuds personnalisés
- import d'images et import de SVG dans l'environnement desktop

Le designer de nœuds permet de composer un modèle à partir de plusieurs éléments :

- rectangles
- cercles
- lignes
- textes
- images
- poignées de connexion

## Expérience utilisateur

- interface bilingue français / anglais
- thème clair / sombre
- réglages d'affichage et d'accessibilité
- aide intégrée et rappel des raccourcis clavier
- historique avec undo / redo
- copier / couper / coller
- système de mise à jour prévu côté application desktop

## Export et persistance

### Sauvegarde

- sauvegarde de projets
- réouverture de projets existants
- chargement de données via stockage local en mode web
- persistance fichier/configuration en mode Tauri

### Export

- export d'aperçus depuis une vue dédiée
- formats gérés côté code : `PNG`, `JPEG`, `SVG`
- paramétrage du papier, de l'orientation, des marges et de l'arrière-plan

## Architecture technique

Le projet est structuré autour de deux couches complémentaires :

- `src/` : interface, logique métier frontend, services, hooks et composants de canvas
- `src-tauri/` : shell desktop, commandes système et persistance native en Rust

### Frontend

- React 18
- TypeScript
- Vite
- React Router
- React Flow
- Tailwind CSS
- Radix UI
- Lucide Icons

### Desktop / backend local

- Tauri 2
- Rust
- commandes natives pour :
  - configuration utilisateur
  - gestion des templates de nœuds
  - lecture/écriture de projets
  - import de fichiers image et SVG
  - export de fichiers graphiques

## Points intéressants pour un portfolio

Ce projet met en avant plusieurs compétences de conception et d'ingénierie :

- architecture hybride TypeScript / Rust
- conception d'un éditeur visuel interactif
- modélisation d'objets graphiques personnalisables
- gestion d'état complexe avec historique utilisateur
- séparation claire entre UI, services et couche native
- expérience desktop moderne avec Tauri
- réflexion produit autour de plusieurs cas d'usage d'un même canvas

## Structure du projet

```text
src/
  app/                 Routes principales (home, editor, designer, export)
  components/          UI, modales, canvas, nœuds personnalisés
  config/              Configuration et traductions
  hooks/               Etat global, historique, updater, préférences
  lib/                 Templates et utilitaires
  services/            Persistance, export, Tauri bridge, gestion projet

src-tauri/
  src/commands/        Commandes Rust exposées au frontend
  tauri.conf.json      Configuration de l'application desktop
```

## Installation

### Prérequis

- Node.js
- npm
- Rust
- environnement Tauri compatible avec votre OS

### Lancer le frontend en développement

```bash
npm install
npm run dev
```

### Lancer l'application desktop

```bash
npm install
npm run tauri
```

### Générer un build frontend

```bash
npm run build
```

### Générer un package desktop

```bash
npm run tauri:build
```

## Scripts disponibles

```bash
npm run dev
npm run build
npm run preview
npm run tauri
npm run tauri:build
```

## Etat du projet

Mind Map Builder est un projet applicatif complet orienté expérimentation produit et interface riche. Il illustre une base solide pour un éditeur de diagrammes desktop, avec une vraie séparation des responsabilités entre rendu interactif, logique métier et intégration native.

Dans un contexte portfolio, il démontre à la fois :

- une capacité à concevoir un produit logiciel cohérent
- une maîtrise de l'écosystème React moderne
- une intégration desktop via Tauri
- un intérêt pour les outils visuels et les expériences utilisateur avancées

## Licence

Ce projet est distribue sous licence [CC0 1.0 Universal](./LICENSE).
