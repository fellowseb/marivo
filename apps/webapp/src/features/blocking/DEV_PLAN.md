# Blocking Feature - Plan de Développement

> **Blocking** = Mouvements scéniques (personnages & décor) en 2D synchronisés avec le texte.
> **Dossier** : `apps/webapp/src/features/blocking/`

---

## 📋 Sommaire

1. [Contexte & Objectifs](#-contexte--objectifs)
2. [Architecture Technique](#-architecture-technique)
3. [Choix du Moteur de Rendu](#-choix-du-moteur-de-rendu)
4. [Plan de Développement par Phase](#-plan-de-développement-par-phase)
5. [Détails Techniques](#-détails-techniques)
6. [Points de Vigilance](#-points-de-vigilance)
7. [Décisions en Attente](#-décisions-en-attente)

---

## 🎯 Contexte & Objectifs

### Cas d'usage principaux
1. **Metteur en scène** :
   - Créer et éditer des mouvements de personnages/décor sur une timeline
   - Partager les "blocking" avec les comédiens
   - Génération automatique de keyframes depuis le script (1 par réplique + intra-réplique pour les longues)

2. **Comédien** :
   - Visualiser les mouvements pendant la répétition
   - 3 modes de lecture : virtuel (WPM), audio (avec fichiers générés), manuel
   - Filtrer par personnage

3. **Futur** :
   - Génération de mouvements via IA (speech-to-text-to-instruction)
   - Import/export de plans de scène

### Contraintes
- ✅ **Extensibilité** : Architecture modulaire pour permettre un passage à WebGL (PixiJS) si besoin de performances accrues
- ✅ **Performance** : Doit gérer 50+ éléments animés simultanément
- ✅ **Synchronisation** : Précision temporelle entre texte et animation
- ✅ **Édition** : Interface intuitive pour créer/modifier les plans 2D

---

## 🏗️ Architecture Technique

### Schéma Global

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DOMAINE (Domain Layer)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────────┐  │
│  │  Timeline   │  │  Keyframe   │  │         StageState             │  │
│  │  - keyframes│  │  - index    │  │  - characters: CharacterState[]│  │
│  │  - duration │  │  - positionInLine │ │  - props: PropState[]        │  │
│  │  - mode     │  │  - timing    │  │  - stageDimensions            │  │
│  └─────────────┘  └─────────────┘  └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER (Business Logic)                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │ Keyframe         │  │ Timeline         │  │ Blocking                 │  │
│  │ Generator        │  │ Calculator       │  │ Synchronizer             │  │
│  │ - From script    │  │ - Timing          │  │ - Text ↔ Animation        │  │
│  │ - From AI        │  │ - Interpolation  │  │ - Mode management         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  ADAPTER LAYER (Rendering Abstraction)                 │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                    RENDERER INTERFACE                              │  │
│  │  - render(stageState: StageState)                                │  │
│  │  - updateElement(id: string, props: Partial<ElementProps>)        │  │
│  │  - onElementDrag(callback: (id, x, y) => void)                    │  │
│  │  - destroy()                                                      │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              ↓                                       │
│  ┌─────────────────────┐      ┌─────────────────────┐                │
│  │   CanvasRenderer    │      │    SVGRenderer       │                │
│  │  (Konva.js)         │      │   (Custom)           │                │
│  │                     │      │                      │                │
│  │ - Uses react-konva   │      │ - Uses React/SVG     │                │
│  │ - Drag & drop native│      │ - Lightweight        │                │
│  └─────────────────────┘      └─────────────────────┘                │
│                              ↓                                       │
│  ┌─────────────────────┐                                                    │
│  │   WebGLRenderer      │  ←-- FUTUR: PixiJS ou Three.js 2D                │
│  │  (PixiJS)            │                                                    │
│  └─────────────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    ANIMATION LAYER (Anime.js)                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  - Timeline management (play, pause, seek, reverse)              │  │
│  │  - Keyframe interpolation                                         │  │
│  │  - Synchronization with domain timeline                            │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Principes Clés

1. **Séparation des préoccupations** :
   - **Domaine** : Modèles de données (Timeline, Keyframe, StageState)
   - **Service** : Logique métier (génération, calculs)
   - **Adapter** : Abstraction du rendu (permet de changer de moteur)
   - **Animation** : Contrôle temporel (Anime.js)

2. **Extensibilité** :
   - Le **Renderer Interface** permet de basculer entre Canvas (Konva), SVG, ou WebGL (PixiJS)
   - Aucun code métier ne dépend du moteur de rendu choisi

3. **Performance** :
   - Kanva.js (Canvas) : ~50-100 éléments → OK
   - PixiJS (WebGL) : 1000+ éléments → OK (si besoin futur)

---

## 🎨 Choix du Moteur de Rendu

### Comparatif Final

| Critère | Konva.js (Canvas) | PixiJS (WebGL) | SVG Natif | Fabric.js |
|---------|------------------|----------------|-----------|-----------|
| **Performance** | ⭐⭐⭐ (50-100 él) | ⭐⭐⭐⭐⭐ (1000+ él) | ⭐⭐ (20-50 él) | ⭐⭐⭐ (100 él) |
| **Drag & Drop** | ✅ Natif | ⚠️ Manuel | ⚠️ Manuel | ✅ Natif |
| **Édition** | ✅✅✅ Excellente | ⚠️ Basique | ⚠️ Basique | ✅✅✅ Excellente |
| **Poids** | ~100 Ko | ~50 Ko | 0 Ko | ~200 Ko |
| **React** | ✅ react-konva | ✅ react-pixi | ✅ Natif | ⚠️ Manuel |
| **Complexité** | Moyenne | Élevée | Faible | Élevée |
| **Extensibilité** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ |

### Décision : **Konva.js en Production, PixiJS en Backup**

**Pourquoi Konva.js ?**
- ✅ Performant pour 50-100 éléments (largement suffisant pour du théâtre)
- ✅ Drag & drop et édition native
- ✅ Intégration React parfaite via `react-konva`
- ✅ Compatible avec Anime.js
- ✅ Facile à prendre en main

**Pourquoi garder PixiJS en option ?**
- Si un jour tu as besoin de **1000+ éléments animés** (ex: particules, effets spéciaux)
- La migration sera **facile** grâce à l'interface Renderer abstraite

**Implémentation** :
```
features/blocking/
├── adapters/
│   ├── renderer/
│   │   ├── renderer.interface.ts    # Interface commune
│   │   ├── konva-renderer.ts        # Implémentation Konva (DÉFAUT)
│   │   ├── svg-renderer.ts          # Implémentation SVG (optionnelle)
│   │   └── pixi-renderer.ts         # Implémentation PixiJS (FUTUR)
```

---

## 📅 Plan de Développement par Phase

### Phase 0 : Préparation (1 jour)
**Objectif** : Mise en place de l'architecture de base

- [ ] Créer la structure de dossiers `features/blocking/`
- [ ] Définir les types TypeScript (Timeline, Keyframe, StageState)
- [ ] Configurer les dépendances : `konva`, `@types/konva`, `animejs`
- [ ] Créer le fichier de configuration `blocking.config.ts`
- [ ] Mettre en place les hooks de base (`useBlocking`, `useTimeline`)

**Livrables** :
- Structure de fichiers prête
- Types TypeScript définis
- Environnement de dev configuré

---

### Phase 1 : Modèles & Génération (3-4 jours)
**Objectif** : Implémenter le cœur du domaine et la génération automatique

#### Tâches :
- [ ] **Modèles de données** (`models/`)
  - [ ] `types.ts` : Types de base (Position, CharacterState, PropState, StageState)
  - [ ] `timeline.ts` : Classe Timeline avec méthodes utilitaires
  - [ ] `keyframe.ts` : Classe Keyframe + helpers
  - [ ] `blocking.ts` : Modèle principal de la feature

- [ ] **Génération automatique** (`services/keyframe-generator.ts`)
  - [ ] Générer 1 keyframe par début de réplique
  - [ ] Générer des keyframes intra-réplique pour les longues répliques (>15 mots)
  - [ ] Détection des phrases (split par ponctuation)
  - [ ] Intégration avec le script existant (via l'API)

- [ ] **Calcul des timings** (`services/timing-calculator.ts`)
  - [ ] Calcul basé sur WPM (Words Per Minute)
  - [ ] Support des timings manuels
  - [ ] Préparation pour les timings audio (futur)

**Livrables** :
- Modèles TypeScript complets
- Génération automatique de timelines depuis un script
- Calcul des durées entre keyframes

---

### Phase 2 : Rendu & Édition Basique (5-7 jours)
**Objectif** : Afficher la scène et permettre une édition simple

#### Tâches :
- [ ] **Renderer Interface** (`adapters/renderer/renderer.interface.ts`)
  - [ ] Définir l'interface commune pour tous les renderers
  - [ ] Méthodes : `render()`, `updateElement()`, `onDrag()`, `destroy()`

- [ ] **Konva Renderer** (`adapters/renderer/konva-renderer.ts`)
  - [ ] Intégration avec `react-konva`
  - [ ] Rendu des personnages (Cercles/Groupes)
  - [ ] Rendu des props (Rectangles, Formes custom)
  - [ ] Gestion des calques (background, props, characters)
  - [ ] Drag & drop natif
  - [ ] Sélection d'éléments

- [ ] **Stage Viewer** (`components/stage-viewer.tsx`)
  - [ ] Affichage de la scène en lecture seule
  - [ ] Intégration avec le renderer
  - [ ] Gestion des dimensions de la scène

- [ ] **Stage Editor** (`components/stage-editor.tsx`)
  - [ ] Ajout/suppression de personnages
  - [ ] Ajout/suppression de props
  - [ ] Drag & drop pour positionner les éléments
  - [ ] Sélection des éléments
  - [ ] Barre d'outils (ajouter personnage/prop)

- [ ] **Style & UI**
  - [ ] Styles CSS pour l'éditeur
  - [ ] Thème cohérent avec l'app existante

**Livrables** :
- Scene visible avec personnages et props
- Édition basique du plan 2D (ajout/suppression/déplacement)
- Intégration avec Konva.js

---

### Phase 3 : Animation & Timeline (5-7 jours)
**Objectif** : Animer la scène selon la timeline

#### Tâches :
- [ ] **AnimeJS Adapter** (`adapters/animejs-adapter.ts`)
  - [ ] Conversion Timeline → AnimeJS Timeline
  - [ ] Gestion des keyframes (position, opacité, etc.)
  - [ ] Méthodes : `play()`, `pause()`, `seekTo()`, `reverse()`
  - [ ] Synchronisation avec le renderer Konva

- [ ] **Blocking Player** (`services/blocking-player.ts`)
  - [ ] Contrôle de la lecture (play, pause, stop)
  - [ ] Gestion des 3 modes : virtual, audio, manual
  - [ ] Synchronisation avec le texte (via callbacks)
  - [ ] Gestion de la vitesse (WPM)

- [ ] **Timeline Editor** (`components/timeline-editor.tsx`)
  - [ ] Affichage de la timeline avec keyframes
  - [ ] Visualisation des keyframes (barres colorées)
  - [ ] Séparateurs par réplique
  - [ ] Zoom/Scroll sur la timeline
  - [ ] Sélection des keyframes

- [ ] **Playback Controls** (`components/playback-controls.tsx`)
  - [ ] Boutons play/pause/stop
  - [ ] Slider de position
  - [ ] Affichage du temps (current/total)
  - [ ] Sélecteur de mode (virtual/audio/manual)
  - [ ] Contrôle de la vitesse (WPM)

- [ ] **Intégration avec le script**
  - [ ] Synchronisation texte ↔ animation
  - [ ] Surbrillance de la réplique en cours
  - [ ] Scroll automatique du script

**Livrables** :
- Animation fluide selon la timeline
- Contrôles de lecture complets
- Édition visuelle de la timeline
- Synchronisation texte/animation

---

### Phase 4 : Fonctionnalités Avancées (5-7 jours)
**Objectif** : Ajouter les fonctionnalités d'édition avancée

#### Tâches :
- [ ] **Édition des keyframes**
  - [ ] Ajout manuel de keyframes (via clic sur la timeline)
  - [ ] Suppression de keyframes
  - [ ] Déplacement de keyframes (glisser-déposer sur la timeline)
  - [ ] Édition des propriétés d'une keyframe (position, visibilité)

- [ ] **Outils d'édition avancée**
  - [ ] Grille d'alignement (optionnelle)
  - [ ] Aimantation à la grille (snap to grid)
  - [ ] Redimensionnement des éléments
  - [ ] Rotation des éléments
  - [ ] Groupement d'éléments
  - [ ] Calques (layers)
  - [ ] Annuler/Rétablir (undo/redo)

- [ ] **Gestion des plans de scène**
  - [ ] Sauvegarde des plans (backend API)
  - [ ] Chargement des plans
  - [ ] Liste des plans sauvegardés
  - [ ] Partage de plans (lien ou export JSON)

- [ ] **Génération audio** (préparation)
  - [ ] Intégration avec TTS (Text-to-Speech)
  - [ ] Génération des audios par réplique
  - [ ] Stockage des audios

**Livrables** :
- Édition complète des keyframes
- Outils d'édition avancés (grille, redimensionnement, etc.)
- Sauvegarde/chargement des plans de scène
- Préparation pour la synchronisation audio

---

### Phase 5 : Synchronisation Audio (3-5 jours)
**Objectif** : Implémenter le mode de lecture audio

#### Tâches :
- [ ] **Audio Timing Strategy** (`services/timing-strategies/audio-strategy.ts`)
  - [ ] Chargement des fichiers audio
  - [ ] Synchronisation avec la timeline
  - [ ] Détection des timings audio

- [ ] **Génération automatique des audios**
  - [ ] Intégration avec un service TTS (ex: Web Speech API, AWS Polly)
  - [ ] Génération par réplique
  - [ ] Stockage des fichiers audio (backend)

- [ ] **Player audio**
  - [ ] Lecture des audios avec synchronisation animation
  - [ ] Contrôles audio (play, pause, seek)
  - [ ] Visualisation de la forme d'onde (optionnel)

**Livrables** :
- Mode de lecture audio fonctionnel
- Génération automatique des audios
- Synchronisation parfaite audio/animation

---

### Phase 6 : Optimisations & Finitions (3-5 jours)
**Objectif** : Améliorer les performances et l'expérience utilisateur

#### Tâches :
- [ ] **Optimisations de performance**
  - [ ] Virtualisation de la timeline (ne pas rendre les keyframes hors écran)
  - [ ] Memoization des composants React
  - [ ] Optimisation des redraws Konva
  - [ ] Lazy loading des ressources

- [ ] **Améliorations UX**
  - [ ] Tooltips contextuels
  - [ ] raccourcis clavier (play, pause, seek)
  - [ ] Feedback visuel pendant les actions
  - [ ] Tutorial/onboarding pour l'éditeur

- [ ] **Gestion des erreurs**
  - [ ] Validation des données
  - [ ] Messages d'erreur clairs
  - [ ] Recovery en cas de crash

- [ ] **Tests**
  - [ ] Tests unitaires (modèles, services)
  - [ ] Tests d'intégration (rendu, animation)
  - [ ] Tests e2e (workflows utilisateur)

**Livrables** :
- Application optimisée et fluide
- Expérience utilisateur polie
- Code robuste et testé

---

### Phase 7 : Préparation IA (2-3 jours)
**Objectif** : Préparer l'intégration future de l'IA

#### Tâches :
- [ ] **Service Movement AI** (`services/movement-ai.ts`)
  - [ ] Détection des mouvements dans le texte (patterns regex)
  - [ ] Génération de suggestions de keyframes
  - [ ] Intégration avec un LLM (pour l'analyse avancée)

- [ ] **UI pour l'IA**
  - [ ] Bouton "Analyser avec IA"
  - [ ] Visualisation des suggestions
  - [ ] Acceptation/Rejet des suggestions

**Livrables** :
- Système prêt pour l'intégration IA
- Détection basique des mouvements via regex

---

### Phase 8 : Migration WebGL (Optionnelle - Futur)
**Objectif** : Basculer vers PixiJS si besoin de performances accrues

#### Tâches :
- [ ] Implémenter `PixiRenderer` (`adapters/renderer/pixi-renderer.ts`)
- [ ] Adapter les composants existants
- [ ] Tests de performance comparatifs
- [ ] Migration progressive (feature flag)

**Livrables** :
- Renderer WebGL fonctionnel
- Migration transparente pour l'utilisateur

---

## 🛠️ Détails Techniques

### Structure des Fichiers

```
features/blocking/
├── README.md                    # Documentation générale
├── DEV_PLAN.md                 # Ce fichier
├── models/
│   ├── types.ts                # Types TypeScript de base
│   ├── timeline.ts             # Modèle Timeline
│   ├── keyframe.ts             # Modèle Keyframe
│   ├── stage-state.ts          # Modèle StageState
│   └── blocking.ts             # Modèle principal
├── adapters/
│   ├── animejs-adapter.ts       # Adaptateur pour Anime.js
│   ├── renderer/
│   │   ├── renderer.interface.ts # Interface commune des renderers
│   │   ├── konva-renderer.ts    # Renderer Kanva (DÉFAUT)
│   │   ├── svg-renderer.ts      # Renderer SVG (optionnel)
│   │   └── pixi-renderer.ts     # Renderer PixiJS (FUTUR)
│   └── audio/
│       └── audio-player.ts      # Gestion de l'audio
├── services/
│   ├── keyframe-generator.ts   # Génération des keyframes
│   ├── timing-calculator.ts    # Calcul des timings
│   ├── blocking-player.ts      # Lecteur de blocking
│   ├── blocking-service.ts     # Service API (backend)
│   └── movement-ai.ts           # IA pour les mouvements (FUTUR)
├── components/
│   ├── stage/
│   │   ├── stage-viewer.tsx     # Visualisation de la scène
│   │   ├── stage-editor.tsx     # Éditeur du plan 2D
│   │   ├── stage-element.tsx    # Composant générique d'élément
│   │   ├── character.tsx        # Composant Personne
│   │   └── prop.tsx             # Composant Prop
│   ├── timeline/
│   │   ├── timeline-editor.tsx  # Éditeur de timeline
│   │   ├── keyframe-marker.tsx  # Marqueur de keyframe
│   │   └── timeline-ruler.tsx   # Règle temporelle
│   ├── controls/
│   │   ├── playback-controls.tsx # Contrôles de lecture
│   │   └── wpm-control.tsx       # Contrôle de vitesse
│   └── toolbar/
│       ├── tool-palette.tsx      # Palette d'outils
│       └── element-properties.tsx # Propriétés de l'élément sélectionné
├── hooks/
│   ├── useBlocking.ts           # Hook principal
│   ├── useTimeline.ts           # Gestion de la timeline
│   ├── useStageElements.ts      # Gestion des éléments de scène
│   └── useAnimation.ts          # Gestion des animations
├── utils/
│   ├── interpolation.ts         # Fonctions d'interpolation
│   ├── konva-utils.ts           # Utilitaires Konva
│   └── stage-helpers.ts          # Helpers pour la scène
└── constants/
    ├── defaults.ts              # Valeurs par défaut
    └── presets.ts               # Préréglages (couleurs, tailles, etc.)
```

### Types Principaux

```typescript
// src/features/blocking/models/types.ts

// Position 2D
export interface Position {
  x: number;
  y: number;
}

// Dimensions
export interface Dimensions {
  width: number;
  height: number;
}

// État d'un personnage
export interface CharacterState {
  id: string;
  position: Position;
  visible: boolean;
  action?: string; // 'standing', 'walking', 'sitting', etc.
  direction?: 'left' | 'right' | 'center' | 'up' | 'down';
  color?: string; // Pour l'affichage
}

// État d'un accessoire/prop
export interface PropState {
  id: string;
  position: Position;
  visible: boolean;
  type: string; // 'table', 'tree', 'chair', etc.
  variant?: string; // 'wooden-table', 'oak-tree', etc.
  dimensions?: Dimensions;
  rotation?: number; // en degrés
  color?: string;
}

// État complet de la scène
export interface StageState {
  characters: Record<string, CharacterState>;
  props: Record<string, PropState>;
  dimensions: Dimensions; // Taille de la scène
  background?: string; // Couleur ou image de fond
}

// Timing d'une keyframe
export interface KeyframeTiming {
  estimated?: {
    startAt: number; // ms depuis le début
    duration: number; // ms
  };
  audio?: {
    audioFileId: string;
    startAt: number; // ms dans le fichier audio
    endAt: number;
  };
  manual?: {
    startAt: number; // ms depuis le début (définis par l'utilisateur)
  };
  resolved: {
    startAt: number;
    duration: number;
  };
}

// Keyframe
export interface Keyframe {
  id: string;
  index: number; // Position dans la timeline
  sourceLineId?: string; // Référence à la ligne du script
  positionInLine?: number; // Offset en mots depuis le début de la ligne (0 = début)
  stageState: StageState;
  label?: string;
  createdBy: 'system' | 'user' | 'ai';
  timing: KeyframeTiming;
  color?: string; // Pour l'UI (bleu = début de réplique, vert = intra, etc.)
}

// Timeline
export interface Timeline {
  id: string;
  keyframes: Keyframe[];
  totalDuration: number; // en ms
  playbackMode: 'virtual' | 'audio' | 'manual';
  stagePlanId?: string; // Référence au plan de scène
  scriptId: string; // Référence au script
  createdAt: Date;
  updatedAt: Date;
}

// Plan de scène (le "plateau" 2D)
export interface StagePlan {
  id: string;
  name: string;
  elements: StageElement[];
  dimensions: Dimensions;
  background?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Élément de scène (générique)
export type StageElementType = 'character' | 'prop';
export interface StageElement {
  id: string;
  type: StageElementType;
  characterId?: string; // Si type === 'character'
  propType?: string; // Si type === 'prop'
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number; // Pour l'ordre d'affichage
  locked?: boolean; // Éléments verrouillés
}

// Modes de lecture
export type PlaybackMode = 'virtual' | 'audio' | 'manual';
```

### Interface du Renderer

```typescript
// src/features/blocking/adapters/renderer/renderer.interface.ts

import type { StageState, Position, Dimensions } from '../../models/types';

export interface ElementProps {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  visible: boolean;
  zIndex?: number;
  // Autres propriétés spécifiques au rendu
  [key: string]: any;
}

export interface RendererEventHandlers {
  onDragStart?: (id: string, position: Position) => void;
  onDrag?: (id: string, position: Position) => void;
  onDragEnd?: (id: string, position: Position) => void;
  onClick?: (id: string) => void;
  onDoubleClick?: (id: string) => void;
  onSelect?: (id: string) => void;
}

export interface Renderer {
  // Initialisation
  initialize(container: HTMLElement, dimensions: Dimensions): Promise<void>;
  
  // Rendu
  render(stageState: StageState): void;
  
  // Mise à jour d'un élément
  updateElement(id: string, props: Partial<ElementProps>): void;
  
  // Ajout d'un élément
  addElement(element: StageElement, props?: Partial<ElementProps>): void;
  
  // Suppression d'un élément
  removeElement(id: string): void;
  
  // Gestion des événements
  setEventHandlers(handlers: RendererEventHandlers): void;
  
  // Nettoyage
  destroy(): void;
  
  // Utilitaires
  getElement(id: string): ElementProps | null;
  getAllElements(): ElementProps[];
  
  // Pour l'édition
  enableDrag(dragEnabled: boolean): void;
  enableSelection(selectionEnabled: boolean): void;
  setGrid(enabled: boolean, size?: number): void;
}
```

### Exemple d'Implémentation Konva

```typescript
// src/features/blocking/adapters/renderer/konva-renderer.ts

import Konva from 'konva';
import { Stage as KonvaStage, Layer as KonvaLayer, Group as KonvaGroup } from 'konva';
import type { Renderer, RendererEventHandlers, ElementProps } from './renderer.interface';
import type { StageState, Position, Dimensions, StageElement } from '../../models/types';

export class KonvaRenderer implements Renderer {
  private stage: KonvaStage | null = null;
  private layer: KonvaLayer | null = null;
  private elements: Map<string, KonvaGroup> = new Map();
  private eventHandlers: RendererEventHandlers = {};
  private gridSize: number = 20;
  private showGrid: boolean = false;
  
  async initialize(container: HTMLElement, dimensions: Dimensions): Promise<void> {
    this.stage = new KonvaStage({
      container,
      width: dimensions.width,
      height: dimensions.height,
    });
    
    this.layer = new KonvaLayer();
    this.stage.add(this.layer);
    
    // Dessiner la grille si activée
    this.updateGrid();
    
    // Forcer le redessin
    this.stage.draw();
  }
  
  render(stageState: StageState): void {
    if (!this.layer) return;
    
    // Effacer les éléments existants (sauf le fond)
    this.elements.forEach((group) => group.destroy());
    this.elements.clear();
    
    // Dessiner le fond
    this.drawBackground(stageState);
    
    // Dessiner les props
    Object.entries(stageState.props).forEach(([id, prop]) => {
      this.drawProp(id, prop);
    });
    
    // Dessiner les personnages
    Object.entries(stageState.characters).forEach(([id, char]) => {
      this.drawCharacter(id, char);
    });
    
    this.layer.draw();
  }
  
  private drawBackground(stageState: StageState): void {
    if (!this.layer) return;
    
    const bg = new Konva.Rect({
      x: 0,
      y: 0,
      width: stageState.dimensions.width,
      height: stageState.dimensions.height,
      fill: stageState.background || '#f0f0f0',
    });
    this.layer.add(bg);
  }
  
  private drawCharacter(id: string, char: CharacterState): void {
    if (!this.layer) return;
    
    const group = new KonvaGroup({
      x: char.position.x,
      y: char.position.y,
      draggable: true,
    });
    
    // Cercle pour le personnage
    const circle = new Konva.Circle({
      radius: 20,
      fill: char.color || '#4a90e2',
      stroke: 'black',
      strokeWidth: 2,
    });
    group.add(circle);
    
    // Nom du personnage
    const text = new Konva.Text({
      text: id,
      y: -30,
      align: 'center',
      fontSize: 12,
    });
    group.add(text);
    
    // Direction (flèche)
    if (char.direction) {
      const arrow = this.drawDirectionArrow(char.direction);
      group.add(arrow);
    }
    
    // Événements
    group.on('dragstart', () => this.eventHandlers.onDragStart?.(id, char.position));
    group.on('dragmove', () => {
      this.eventHandlers.onDrag?.(id, { x: group.x(), y: group.y() });
    });
    group.on('dragend', () => {
      const newPos = { x: group.x(), y: group.y() };
      this.eventHandlers.onDragEnd?.(id, newPos);
    });
    group.on('click', () => this.eventHandlers.onClick?.(id));
    group.on('dblclick', () => this.eventHandlers.onDoubleClick?.(id));
    
    this.layer.add(group);
    this.elements.set(id, group);
  }
  
  private drawProp(id: string, prop: PropState): void {
    // Implémentation similaire pour les props
  }
  
  updateElement(id: string, props: Partial<ElementProps>): void {
    const group = this.elements.get(id);
    if (!group) return;
    
    if (props.x !== undefined) group.x(props.x);
    if (props.y !== undefined) group.y(props.y);
    if (props.visible !== undefined) group.visible(props.visible);
    // ... autres propriétés
    
    this.layer?.draw();
  }
  
  addElement(element: StageElement): void {
    // Implémentation
  }
  
  removeElement(id: string): void {
    const group = this.elements.get(id);
    if (group) {
      group.destroy();
      this.elements.delete(id);
      this.layer?.draw();
    }
  }
  
  setEventHandlers(handlers: RendererEventHandlers): void {
    this.eventHandlers = handlers;
  }
  
  destroy(): void {
    this.stage?.destroy();
    this.stage = null;
    this.layer = null;
    this.elements.clear();
  }
  
  // ... autres méthodes
  
  private updateGrid(): void {
    if (!this.layer || !this.showGrid) return;
    
    // Dessiner la grille
    for (let i = 0; i < this.stage!.width(); i += this.gridSize) {
      const line = new Konva.Line({
        points: [i, 0, i, this.stage!.height()],
        stroke: '#ddd',
        strokeWidth: 1,
      });
      this.layer.add(line);
    }
    
    for (let i = 0; i < this.stage!.height(); i += this.gridSize) {
      const line = new Konva.Line({
        points: [0, i, this.stage!.width(), i],
        stroke: '#ddd',
        strokeWidth: 1,
      });
      this.layer.add(line);
    }
  }
  
  private drawDirectionArrow(direction: string): Konva.Arrow {
    // Implémentation de la flèche de direction
    return new Konva.Arrow({ /* ... */ });
  }
}
```

---

## ⚠️ Points de Vigilance

### Performance
1. **Nombre d'éléments** :
   - Konva.js : ~100 éléments max pour des animations fluides (OK pour du théâtre)
   - Si > 500 éléments → passer à PixiJS (WebGL)
   - **Solution** : L'interface `Renderer` permet de changer facilement

2. **Redraws fréquents** :
   - Konva redessine tout le layer à chaque changement
   - **Optimisation** : Utiliser `batchDraw()` et regrouper les changements

3. **Mémoire** :
   - Détruire les nœuds Konva inutilisés
   - Éviter les fuites mémoire avec les event listeners

### Synchronisation
1. **Précision temporelle** :
   - Utiliser `performance.now()` pour un timing précis
   - Éviter `setTimeout`/`setInterval` pour les animations

2. **Désynchronisation texte/animation** :
   - Toujours avoir une source de vérité (le texte OU l'animation)
   - **Solution** : Le texte est la source de vérité, l'animation suit

### Édition
1. **Undo/Redo** :
   - Implémenter un système de historique pour l'édition
   - **Solution** : Utiliser un pattern Command ou un simple tableau d'états

2. **Sélection multiple** :
   - Gérer la sélection de plusieurs éléments
   - **Solution** : Stocker les IDs sélectionnés dans un state

### Backend
1. **Stockage des timelines** :
   - Les timelines peuvent devenir grosses (beaucoup de keyframes)
   - **Solution** : Compresser les données (ex: ne stocker que les différences entre keyframes)

2. **Versioning** :
   - Prévoir un système de version pour les plans de scène
   - **Solution** : Champ `version` dans la table `stage_plans`

---

## ❓ Décisions en Attente

| Décision | Options | Recommandation | Priorité |
|----------|---------|----------------|----------|
| **Moteur de rendu initial** | Konva.js vs SVG Natif | **Konva.js** | ⭐⭐⭐ |
| **Génération audio** | Client-side (Web Speech API) vs Server-side (AWS Polly) | **Server-side** (meilleure qualité) | ⭐⭐ |
| **Stockage des audios** | Base64 en DB vs Fichiers S3/MinIO | **Fichiers** (plus léger) | ⭐⭐ |
| **Format des plans** | JSON vs Binary | **JSON** (plus lisible) | ⭐ |
| **Gestion des conflits** | Last-write-wins vs Merge manuel | **Last-write-wins** (simple) | ⭐ |

---

## 📊 Estimation des Temps

| Phase | Durée Estmée | Complexité | Équipe |
|-------|--------------|------------|--------|
| Phase 0 | 1 jour | Faible | 1 dev |
| Phase 1 | 3-4 jours | Moyenne | 1 dev |
| Phase 2 | 5-7 jours | Élevée | 1-2 devs |
| Phase 3 | 5-7 jours | Élevée | 1-2 devs |
| Phase 4 | 5-7 jours | Élevée | 1-2 devs |
| Phase 5 | 3-5 jours | Moyenne | 1 dev |
| Phase 6 | 3-5 jours | Moyenne | 1 dev |
| Phase 7 | 2-3 jours | Faible | 1 dev |
| **Total** | **~27-36 jours** | | |

> ⚠️ **Note** : Ces estimations supposent un développeur expérimenté avec React/TypeScript.
> Pour une équipe de 2 devs, diviser par ~1.5.

---

## 🎯 Prochaines Étapes

### Immédiat (Cette session)
- [ ] Valider ce plan de développement
- [ ] Décider des choix en attente (moteur de rendu, génération audio, etc.)
- [ ] Prioriser les phases si nécessaire

### Court Terme (1 semaine)
- [ ] Démarrer la **Phase 0** (préparation)
- [ ] Créer les types TypeScript
- [ ] Configurer l'environnement

### Moyen Terme (2-3 semaines)
- [ ] Implémenter les **Phases 1-3** (modèles + rendu + animation)
- [ ] Avoir une démo fonctionnelle de base

### Long Terme (1-2 mois)
- [ ] Compléter toutes les phases
- [ ] Tests utilisateurs
- [ ] Corrections et optimisations

---

## 📚 Ressources Utiles

- [Konva.js Documentation](https://konvajs.org/docs/)
- [react-konva](https://github.com/konvajs/react-konva)
- [Anime.js Documentation](https://animejs.com/documentation/)
- [PixiJS](https://pixijs.com/)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

## 🔄 Historique des Révisions

| Version | Date | Auteur | Changements |
|---------|------|--------|-------------|
| 1.0 | 2026-07-26 | Mistral Vibe | Création initiale |
