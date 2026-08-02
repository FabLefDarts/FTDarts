# FT Darts V5.2 — Correctif vocal iPhone

Corrections :
- « vin » est compris comme « vingt » ;
- les séparateurs comme `18/14` sont découpés en `18 14` ;
- prise en compte de plusieurs propositions fournies par la reconnaissance vocale ;
- FT Darts retient la proposition contenant le plus de fléchettes reconnues ;
- si seulement 1 ou 2 fléchettes sont reconnues, l’application indique `1/3` ou `2/3` et relance l’écoute ;
- une nouvelle écoute ne démarre jamais avant la fermeture complète de l’écoute précédente ;
- relance automatique plus stable après une erreur ou un silence.

## Mise à jour GitHub

Remplace tous les fichiers du ZIP, ou au minimum :
- app.js
- index.html
- sw.js

Après le commit, ouvre :
https://fablefdarts.github.io/FTDarts/?v=52

Sur iPhone, supprime éventuellement l’ancienne icône de l’écran d’accueil ou teste d’abord dans un onglet privé afin d’éviter l’ancien cache.
