# FT Darts V5.8 — Calcul automatique des finishes

## Nouvelle fonctionnalité

FT Darts recherche automatiquement une combinaison de sortie en une, deux ou trois fléchettes.

Le calcul respecte la règle choisie :
- Finish libre : la dernière fléchette peut être un simple, un double, un triple ou une Bull.
- Double-out : la dernière fléchette doit être un double ou la Bull intérieure à 50.

Exemple :
- 141 → T20 · T19 · D12
- 100 → T20 · D20
- 40 → D20

Lorsqu'aucune combinaison n'existe, FT Darts affiche :
- Pas de finish en 3 flèches
- ou Pas de finish double-out en 3 flèches

L'annonce vocale indique également le finish possible au début du tour.

## Mise à jour GitHub

Remplace tous les fichiers du ZIP.

Après le commit, ouvre :
https://fablefdarts.github.io/FTDarts/?v=58

Teste d'abord dans un onglet privé.
