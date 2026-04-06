# Centre d’aide Akaa — plan d’arborescence (rédaction)

> **Objet** : articles pour **les utilisateurs** (apprenants, formateurs, administrateurs) — équivalent d’un **centre d’aide** / aide en ligne.  
> Ce n’est **pas** la documentation technique du dépôt (`ARCHITECTURE.md` sert de **source de vérité interne** pour rédiger sans inventer ; elle ne se substitue pas aux articles publics).

**Dernière mise à jour** : avril 2026

---

## 1. Quels documents internes lire pour rédiger ?

| Fichier | Rôle pour les **articles d’aide** | Obligatoire ? |
|---------|-----------------------------------|---------------|
| **`ARCHITECTURE.md`** | Véracité : rôles, parcours, permissions, fonctionnalités. | **Oui** (référence interne, pas à copier tel quel vers les utilisateurs) |
| **`PHASE.md`** | Savoir ce qui est **déjà** disponible et ce qui est encore limité ou à venir. | **Oui** |
| **`DESIGN.md`** | Cohérence des mentions d’interface (couleurs, libellés généraux). | Recommandé |
| **`JOURNAL.md`** | Exploitation / incidents internes. | **Non** pour le centre d’aide (sauf article très spécifique « dépannage » validé par l’équipe) |
| **`AGENTS.md`** | Réservé aux développeurs. | **Non** pour le centre d’aide |

### Règle de vérification

En cas de doute sur un comportement à l’écran :

1. L’application (`src/app/`, `src/components/`)  
2. `prisma/schema.prisma` si besoin  
3. `ARCHITECTURE.md`  

> Les noms techniques dans `ARCHITECTURE.md` ne doivent pas forcément apparaître dans l’aide : **traduire en langage utilisateur** (ex. « inscription à une session », pas le nom de table SQL).

---

## 2. Principes de ton (centre d’aide)

- **Langue** : français ; **vouvoiement** (« vous »), ton clair et rassurant.  
- **Objectif** : répondre à *Comment faire… ?*, *Pourquoi… ?*, *Où trouver… ?* — pas de jargon interne (API, Prisma, déploiement).  
- **Publics** : séparer nettement **Apprenant**, **Formateur**, **Admin** (sections ou espaces distincts).  
- **Ne jamais publier** : mots de passe, URLs de base de données, secrets, procédures internes d’exploitation.  
- **Liens** : entre articles du centre d’aide (`./apprenant/...`) une fois publiés.

---

## 3. Arborescence cible des articles

```text
docs/
├── README.md                       ← page d’accueil du centre d’aide (liens par rôle)
├── CENTRE-AIDE-PLAN.md             ← ce fichier (plan + méthode pour la rédaction)
│
├── apprenant/
│   ├── README.md                   ← vue d’ensemble : votre espace apprenant
│   ├── compte-et-connexion.md    ← créer un compte, se connecter, Google, profil
│   ├── catalogue-et-cours.md     ← parcourir le catalogue, suivre un cours, progression
│   ├── chapitres-et-quiz.md      ← lire un chapitre, passer un quiz
│   ├── gamification.md           ← XP, niveaux, badges, série, classement
│   ├── calendrier-et-sessions.md ← calendrier, s’inscrire à une session
│   ├── parcours.md               ← parcours de formation
│   ├── notifications.md        ← notifications et rappels
│   └── avis.md                   ← donner un avis sur un cours ou la plateforme
│
├── formateur/
│   ├── README.md
│   ├── cours-et-contenu.md       ← créer et publier des cours, modules, chapitres, import
│   ├── quiz.md
│   ├── sessions-et-calendrier.md
│   ├── parcours.md
│   ├── apprenants-et-suivi.md    ← si couvert par l’interface
│   └── avis.md
│
├── admin/
│   ├── README.md
│   ├── utilisateurs-et-roles.md
│   ├── cours-et-catalogue.md
│   ├── categories-et-badges.md
│   ├── xp-et-calibrage.md
│   ├── calendrier-global.md
│   ├── parcours-global.md
│   └── avis-synthese.md
│
└── general/
    ├── faq.md
    └── glossaire.md              ← termes métier expliqués simplement
```

**Ordre de rédaction suggéré** : `docs/README.md` (accueil centre d’aide) → **apprenant** → **formateur** → **admin** → **general**.

---

## 4. Checklist avant publication d’un article

- [ ] Un utilisateur non technique comprend les étapes sans ouvrir le code.  
- [ ] Aligné avec `PHASE.md` : pas de promesse de fonctionnalité non livrée.  
- [ ] Permissions cohérentes avec la matrice §5 de `ARCHITECTURE.md`.  
- [ ] Pas de vocabulaire interne (tables, variables d’environnement, noms de branches).  
- [ ] Captures d’écran optionnelles : interface **light** (MVP sans dark mode).

---

## 5. Mise à jour

Quand une fonctionnalité change côté produit : mettre à jour **`ARCHITECTURE.md`** et **`PHASE.md`** en interne, puis l’**article du centre d’aide** concerné dans la foulée.
