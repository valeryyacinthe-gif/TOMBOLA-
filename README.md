# TOMBOLA CAMEROUN

Prototype de plateforme de tombola — édition Noël 2026 en préparation.

## État actuel
- Interface publique responsive et pages règlement / participant.
- Connexion et création de compte Firebase prêtes après configuration.
- Lecture des éditions et lots depuis Firestore.
- Les paiements, participations payantes, codes et tirages réels sont volontairement désactivés.

## Installation
1. Installer Node.js 20.19+ ou 22.12+.
2. Exécuter `npm install`, puis `npm run dev`.
3. Copier `.env.example` en `.env.local` et renseigner la configuration de l'application Web Firebase.
4. Activer Firebase Authentication (e-mail/mot de passe) et créer la base Firestore.
5. Déployer `firestore.rules` avant d'ajouter des données.

## Sécurité et conformité
- Ne jamais placer de clé privée, secret marchand ou clé de service dans les variables `VITE_*`.
- Les écritures de participations sont interdites depuis le navigateur.
- L'activation d'un paiement exige une intégration serveur, des webhooks vérifiés et une protection contre les doublons.
- Pas de collecte de fonds, vente de tickets ni tirage réel avant autorisations administratives, règlement validé et garanties applicables au Cameroun.

## Déploiement
Projet Vite compatible Vercel. Définir les variables Firebase publiques dans les paramètres du projet Vercel avant le déploiement.
