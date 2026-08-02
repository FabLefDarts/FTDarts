# FT Darts V4

Version web complète sans caméra.

## Inclus

- 201, 301, 501 et Cricket
- Début libre ou double-in
- Finish libre ou double-out
- 2 à 8 joueurs en local
- Jeu en ligne à deux avec code privé
- Saisie visuelle Simple / Double / Triple
- Reconnaissance vocale
- Mode mains libres selon compatibilité du navigateur
- Annonce vocale du score et du joueur suivant
- Conseils de finish
- Profils joueurs
- Statistiques
- Historique global
- Classement Elo
- Succès
- Installation sur écran d'accueil en PWA

## Mise en ligne sur GitHub Pages

Dépose tous les fichiers du dossier à la racine du dépôt GitHub Pages :
- index.html
- styles.css
- app.js
- firebase-config.js
- manifest.webmanifest
- sw.js
- icon.svg

## Activer le jeu en ligne

1. Créer un projet sur Firebase.
2. Activer Realtime Database.
3. Ajouter une application Web.
4. Copier la configuration Firebase dans `firebase-config.js`.
5. Dans Realtime Database > Rules, utiliser :

```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Ces règles sont adaptées uniquement à un prototype privé utilisé par Fabien et Thibault.

## Reconnaissance vocale

La reconnaissance vocale web dépend du navigateur :
- Chrome Android : généralement le plus compatible.
- Safari iPhone : fonctionnement plus limité et parfois interruption automatique.
- La saisie visuelle reste toujours disponible.

## Limites

- Le mode en ligne V4 est prévu pour deux joueurs.
- Les profils, statistiques, Elo et succès sont stockés localement sur chaque téléphone.
- Pour partager les statistiques entre les deux téléphones, une prochaine évolution devra les enregistrer dans Firebase.
