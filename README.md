# FT Darts V5.3 — Nouveau moteur vocal + choix du premier joueur

## Nouveau moteur vocal

Le moteur utilise désormais un cycle strict :

1. ÉCOUTE
2. TRAITEMENT
3. ENREGISTREMENT
4. ANNONCE
5. DESTRUCTION complète du micro
6. Création d'une nouvelle reconnaissance pour le joueur suivant

L'ancienne transcription ne doit plus bloquer la volée suivante.

Un indicateur affiche l'état actuel :
- Micro : ÉCOUTE
- Micro : TRAITEMENT
- Micro : ENREGISTREMENT
- Micro : ANNONCE
- Micro : ATTENTE

## Premier joueur

Deux options sont disponibles :
- Aléatoire
- Plus proche du centre

En mode centre :
1. chaque joueur place son impact sur une cible tactile ;
2. le zoom permet d'être plus précis ;
3. FT Darts calcule la distance au centre ;
4. le joueur le plus proche est placé en premier dans l'ordre de jeu.

Cette sélection fonctionne avant une partie locale ou en ligne.

## Mise à jour GitHub

Remplace tous les fichiers du ZIP, ou au minimum :
- index.html
- styles.css
- app.js
- sw.js
- manifest.webmanifest

Après le commit, ouvre :
https://fablefdarts.github.io/FTDarts/?v=53

Teste d'abord dans un onglet privé afin d'éviter l'ancien cache.
