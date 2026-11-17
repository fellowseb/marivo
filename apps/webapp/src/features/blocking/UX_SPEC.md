# Blocking Feature - Spécification UX

> **Éditeur de blocking** = interface de création et de consultation des mouvements scéniques (personnages & décor) en 2D, synchronisés avec le texte.
> **Dossier** : `apps/webapp/src/features/blocking/`
> **Complément de** : [DEV_PLAN.md](./DEV_PLAN.md) (architecture technique)

---

## 📋 Sommaire

1. [Principes directeurs](#-principes-directeurs)
2. [Cible matérielle](#-cible-matérielle)
3. [Les deux modes](#-les-deux-modes)
4. [Timeline à base de cues](#-timeline-à-base-de-cues)
5. [Taxonomie des cues](#-taxonomie-des-cues)
6. [Sélection et commandes](#-sélection-et-commandes)
7. [Panneau d'inspection persistant](#-panneau-dinspection-persistant)
8. [Édition des durées](#-édition-des-durées)
9. [Pistes de personnages](#-pistes-de-personnages)
10. [Scène 2D](#-scène-2d)
11. [État initial et empty state](#-état-initial-et-empty-state)
12. [Décisions ouvertes](#-décisions-ouvertes)

---

## 🎯 Principes directeurs

1. **Le texte est la source de vérité temporelle.** L'animation ne "combat" jamais le script. Les cues de réplique forment la grille de la timeline ; tout le reste s'y accroche.
2. **Un cue, trois surfaces d'édition.** Tap-sélection, manipulation directe (drag des bords, du corps), et panneau d'inspection. Si un nouveau type de cue ne rentre pas dans ce pattern, c'est probablement une autre feature.
3. **Sélection unique, synchrone.** Un seul état de sélection partagé entre timeline, scène 2D et panneau : sélectionner sur une surface met en évidence sur les deux autres.
4. **Tablet-first.** Pas de hover : toutes les affordances sont visibles et persistantes. Les cibles tactiles font ≥ 44 px.

---

## 💻 Cible matérielle

- **Cible principale : tablette 10-11"** en mode paysage (metteur en scène) et portrait (comédien).
- **Desktop : cas secondaire.** Les raccourcis clavier sont conservés (undo/redo, navigation ligne à ligne) mais aucune affordance ne dépend du hover.
- **Gestes :** un doigt édite, deux doigts pan/zoom (convention Figma). Pas de toggle de mode.
- **Stylus = bonus.** Pas de fonctionnalité liée au stylet (pression, inclinaison) ; le stylet est traité comme un doigt.
- **Téléphone :** mode comédien uniquement (lecture, filtre par personnage).

---

## 🎭 Les deux modes

L'éditeur est explicitement divisé en deux produits partageant la même scène :

### Mode metteur en scène (édition)

- Scénario d'usage : créer, ajuster, annoter le blocking. Lent, précis, itératif.
- Peur de casser → **undo/redo omniprésent** (boutons proéminents + raccourcis).
- Composition : scène 2D (~60-65 % hauteur), timeline compacte (lignes ~32-36 px, repliable à la règle + playhead).

### Mode comédien (lecture)

- Scénario d'usage : répétition, mains libres, à distance de l'écran.
- **Mode de lecture auto-sélectionné** : audio si des fichiers existent pour la pièce, sinon virtuel (WPM). Le mode manuel ("je suis le métronome", tap/espace pour avancer) est un toggle explicite.
- Contrôles volumineux : play/pause, ligne précédente/suivante, barre de progression scrubbable.
- **Filtre par personnage au premier plan** : "voir mes entrées/mouvements", les autres personnages atténués en ghosts.
- Bandeau "réplique courante" avec le texte (lecture à mi-distance pendant la répétition).

---

## 📼 Timeline à base de cues

La timeline est une **séquence de cues**, pas une courbe de positions. Les keyframes de mouvement sont un type de cue parmi d'autres.

### Structure hybride règle + répliques

```
┌──────────────────────────────────────────────────────┐
│  ⏮ ▶ ⏭   ───────●───────────   02:14 / 11:30  [mode]│  barre de lecture
├──────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────┐ │
│ │              SCÈNE 2D                             │ │
│ └──────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────┤
│ ruler:  │0:30    │1:00    │1:30    │2:00    │2:30     │
├──────────────────────────────────────────────────────┤
│ HAMLET  │  ◆━━━━━━╪────────◆━━━━━━╪━━━━◆              │  une piste / personnage
│ OPHELIA │      ◆━━╪━━◆━━━━━━━━━━━━╪━━━━               │  ◆ = cue
├──────────────────────────────────────────────────────┤
│  ▲ marqueurs de répliques (╪) en pleine hauteur       │
└──────────────────────────────────────────────────────┘
```

- **Axe vertical = qui** : une piste par personnage, colorée comme sur la scène.
- **Axe horizontal = temps** : les frontières de répliques (╪) sont dessinées comme des marqueurs pleine hauteur. Les keyframes étant générées par réplique, les marqueurs _sont_ la grille.
- **Scrub vs sélection** : tap sur la timeline = scrub (aperçu) ; tap sur un cue ou une réplique = sélection (cible d'édition). Ces deux verbes ont des états visuels distincts.

---

## 🧩 Taxonomie des cues

### Tier 1 — Core (v1)

| Type                 | Description                                                                                                                                        | Création                                                 | Panneau                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------- |
| **Cue de réplique**  | Ancrage d'une réplique du script (1 par ligne + subdivisions intra-réplique pour les longues). Contenu immuable (vient du script), durée éditable. | Auto-généré                                              | Texte (lecture seule), locuteur, durée               |
| **Cue de mouvement** | Position d'un personnage à un instant donné.                                                                                                       | Implicite (drag du personnage sur la scène) ou explicite | Personnage, position from (ghost) → to, durée, notes |

### Tier 2 — Structurel (v1.x)

| Type                      | Description                                                                       | Notes                                     |
| ------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------- |
| **Cue de décor (prop)**   | Idem mouvement, sujet = élément de décor.                                         | `PropState[]` existe déjà dans le domaine |
| **Cue d'entrée / sortie** | Apparition / départ d'un personnage. Rend la présence _factuelle_ et non inférée. | Rendu distinct (flèche in/out)            |
| **Cue de pause / beat**   | Durée sans contenu : silence, attente. Indispensable en mode manuel.              | Trivial dans le modèle                    |

### Tier 3 — Annotations & futur

| Type                          | Description                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cue de note**               | Marqueur texte libre du metteur en scène ("table ici", "ralentir ici"). N'anime rien. Cible naturelle de la génération IA de mouvements (cf. DEV_PLAN). |
| **Marqueurs de scène / acte** | Dérivés du script (non éditables) ; rendus en séparateurs pleine hauteur, pilotent la présence et les niveaux de zoom.                                  |
| **Cues lumière / son**        | Hors périmètre du blocking, mais le modèle (sujet + temps + durée + payload) reste générique. Prévoir un champ `type` dès la v1.                        |

### Règles de modèle

1. **Les cues de réplique sont la grille** ; les autres cues s'ancrent à une réplique ("à la réplique 12") ou au temps libre ("3,5 s après la réplique 12"). Le panneau affiche l'ancre.
2. **Supprimer un cue de réplique ne supprime jamais la ligne du script** ; il le retire seulement de la timeline de blocking. Suppression toujours annulable.

---

## ✋ Sélection et commandes

Deux dimensions séparées :

- **Le cue comme objet** (quoi, quand, contenu) → panneau.
- **Le cue comme bloc sur la timeline** (position, durée) → manipulation directe.

Gestes :

- **Tap** = sélectionner. Une **barre d'actions compacte apparaît au-dessus du cue sélectionné** (proche du pouce) : insérer avant/après, dupliquer, supprimer.
- **Drag du corps du cue** = déplacer dans le temps (snap aux frontières de cues voisines et aux marqueurs de réplique).
- **Drag du bord gauche/droit** = changer la durée (cf. Édition des durées).
- **Long-press** = menu contextuel (duplicata, supprimer, verrouiller). Jamais de double-tap pour des actions destructrices.
- Les commandes structurelles ne sont **jamais** imbriquées dans le panneau : le panneau édite le contenu, la barre d'actions et les gestures font la "chirurgie timeline".

---

## 🖥 Panneau d'inspection persistant

Modèle Photoshop/Figma : **docké et permanent**, pas de popover.

- **État persistant.** Le panneau ne s'ouvre/ferme pas à la sélection ; sans sélection il affiche les réglages niveau pièce (mode de lecture, durées par défaut, grille).
- **Position et taille mémorisées** entre sessions. Dock à droite en paysage, bottom sheet en portrait. Repliable en rail fin, jamais masqué par un tap accidentel.
- **Deux niveaux :** bandeau compact (type, personnage, durée, sauter au cue) toujours visible ; détails repliés en dessous (position, notes, interpolation).
- **Restreint :** cue de réplique = 3 champs ; cue de mouvement = 4-5. Si le panneau demande plus, c'est le modèle de cue qui doit être simplifié.
- **Synchronisation bidirectionnelle :** sélection dans le panneau → mise en évidence sur la scène ; tap d'un personnage/trait sur la scène → sélection du cue correspondant.

---

## ⏱ Édition des durées

**Deux surfaces, un seul chiffre :** le drag de bord et le champ panneau sont la même valeur, synchronisés en direct, sans bouton "appliquer".

- Poignées de bord ~24 px, affichées uniquement sur le cue sélectionné.
- **Loupe horizontale pendant le drag** affichant la valeur sous le doigt (le doigt masque le cue).
- **Snap :** d'abord aux frontières de cues voisines et aux marqueurs de réplique ; positionnement libre avec deux doigts. Jamais de toggle de snap enterré dans les réglages.

---

## 🛤 Pistes de personnages

### Géométrie vs occupation

- **Occupation** : où un personnage a des cues (par définition creux).
- **Géométrie** : la piste existe-t-elle en pleine largeur ?

| Zoom                             | Rendu                                                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scène (édition, état normal)** | Pistes pleine largeur pour les personnages actifs de la scène. Ordre = ordre de la distribution (stable, jamais alphabétique).                                  |
| **Vue pièce (dézoomée)**         | **Bandes de présence** : chaque personnage devient une bande continue sur sa plage de présence. La vue d'ensemble devient une carte "qui est où dans la pièce". |
| Transition                       | Continue (pinch-zoom), les bandes se résolvent en pistes avec blocs. Pas de switch de mode.                                                                     |

### Visibilité

- **Auto par défaut** : pistes des personnages ayant des cues dans la fenêtre courante. Une piste par personnage apparaît quand la 1ère position est posée.
- **Chips de filtrage** au-dessus de la timeline : "Tous" / "Sur scène" / chips par personnage.
  - Un chip personnage **épingle** la piste (pleine largeur, y compris les zones vides ; les absences _sont_ l'information). Les zones vides épinglées sont rendues en retrait visuel et **n'acceptent pas** d'édition.
  - "Sur scène" désépingle tout et revient au mode auto.
- **Chip "+ distribution"** en fin de rangée : ajouter une piste (et une première position) à un personnage sans cue, pour planifier en avance.

---

## 🎬 Scène 2D

- **Gestes :** un doigt = déplacer un personnage (crée/modifie le cue de mouvement au playhead courant) ; deux doigts = pan/zoom.
- **Ghosts et traînées :** silhouettes atténuées des positions aux cues précédente et suivante + ligne de chemin quand un personnage est sélectionné. Toujours visibles (pas de hover).
- **Sélection synchrone** avec timeline et panneau.
- Snap-to-grid et nudging : phase ultérieure (cf. DEV_PLAN Phase 4).

---

## 🌱 État initial et empty state

À la première ouverture :

- **Timeline déjà porteuse de sens** : les cues de répliques pré-remplissent la timeline (squelette de la pièce).
- **Scène vide mais utile** : géométrie de la scène (côtés cour/jardin, ligne médiane) + rail de distribution (avatars en bord de scène) à glisser + hint "tapez un cue de réplique puis glissez un personnage sur la scène".
- Poser un personnage à un cue **crée implicitement son premier cue de mouvement et sa piste**. Aucune étape "ajouter un personnage à la timeline" nulle part.
- Proposition "générer le blocking depuis le script" (pré-placement en demi-cercle) accessible depuis l'empty state.

---

## ❓ Décisions ouvertes

| Décision                                           | Options                                                                 | Recommandation                       |
| -------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| Affichage du texte dans le mode metteur en scène   | bandeau réplique courante seul / panneau script complet à un tap / rien | bandeau par défaut, panneau à un tap |
| Cues intra-réplique : densité visuelle             | zoom obligatoire / libellés compacts                                    | zoom + libellés                      |
| Ordre des pistes                                   | distribution / ordre d'apparition                                       | distribution (stabilité musculaire)  |
| Modélisation explicite entrée/sortie en v1 ou v1.x | v1 / v1.x                                                               | v1.x (présence dérivée d'abord)      |

---

## 🔄 Historique

| Version | Date       | Source               | Changements       |
| ------- | ---------- | -------------------- | ----------------- |
| 1.0     | 2026-11-14 | Discussion UX (Vibe) | Création initiale |

> Généré à partir de la discussion de design UX menée avec Mistral Vibe.
