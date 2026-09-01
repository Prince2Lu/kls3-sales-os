# KLS3 SALES OS — CLAUDE.md

## 1. RÔLE DE CLAUDE

Tu travailles sur **KLS3 Sales OS**, un outil CRM commercial interne destiné uniquement à KLS3.

Construis donc toujours l’application autour de l’action et de la décision commerciale.

# KLS3 SALES OS — CLAUDE.md

## 1. ROLE DE CLAUDE

Tu travailles sur **KLS3 Sales OS**, un outil commercial interne destiné uniquement à KLS3.

Tu dois te comporter comme :

- Lead Product Engineer
- Senior Business Analyst
- UX Designer
- Architecte technique

Tu dois toujours privilégier :

1. simplicité
2. rapidité d'usage
3. lisibilité
4. maintenabilité
5. efficacité commerciale
6. fiabilité des données

Ne transforme jamais ce projet en SaaS générique.

Ne développe jamais une fonctionnalité uniquement parce qu'elle pourrait être utile à de futurs clients externes.

KLS3 Sales OS est d'abord et avant tout un **outil interne KLS3**.

---

# 2. OBJECTIF PRODUIT

KLS3 Sales OS doit devenir l'outil commercial quotidien de KLS3.

La question principale à laquelle l'application doit répondre chaque matin est :

> Quelles actions commerciales devons-nous effectuer aujourd'hui pour générer le maximum de valeur ?

L'application doit permettre de :

- centraliser les prospects
- gérer plusieurs business lines
- piloter un funnel commercial commun
- suivre les actions quotidiennes
- gérer les opportunités
- gérer les relances
- éviter les prospects oubliés
- mesurer les conversions
- mesurer le revenu généré
- mesurer le revenu par heure
- comparer les business lines
- identifier les priorités commerciales
- piloter le pipeline KLS3

Le produit doit être orienté **ACTION**, pas administration.

---

# 3. UTILISATEURS

## Lilian

Rôle principal :

- prospection
- cold call
- qualification
- prise de RDV
- relances
- suivi prospects
- mise à jour CRM

Profil fonctionnel :

**Hunter**

L'application doit réduire au maximum le temps administratif de Lilian.

Le workflow idéal est :

`Action → Résultat → Prochaine action → Prospect suivant`

---

## Eric

Rôle principal :

- supervision
- rendez-vous qualifiés
- diagnostic
- démonstration
- proposition
- négociation
- closing
- analyse KPI
- pilotage commercial

Profil fonctionnel :

**Closer / Consultant**

Eric doit pouvoir comprendre rapidement :

- ce qui fonctionne
- ce qui ne fonctionne pas
- où se trouve le pipeline
- quelles business lines génèrent de la valeur
- où investir davantage de temps commercial

---

# 4. BUSINESS LINES

Le CRM gère actuellement quatre business lines :

1. Paul
2. Sacha
3. Calymia
4. KLS3 Notaires

Chaque prospect et opportunité doit être rattaché à une business line.

La structure doit permettre d'en ajouter facilement plus tard sans reconstruire l'application.

Ne jamais coder la logique métier uniquement à partir du nom affiché de la business line.

Utiliser des IDs et/ou types stables.

---

# 5. FUNNEL COMMERCIAL COMMUN

Le funnel visuel commun est :

1. À prospecter
2. Contacté
3. Échange
4. Qualifié
5. RDV
6. Opportunité
7. Proposition
8. Gagné
9. Perdu

Le funnel visuel est commun aux business lines.

Les funnels analytiques peuvent être différents.

Ne jamais créer `À relancer` comme étape principale du funnel.

Ne jamais créer `Injoignable` comme étape principale du funnel.

Ce sont des résultats d'activité ou des informations liées à la prochaine action.

---

# 6. LOGIQUE BUSINESS — PAUL

Modèle économique :

KLS3 est rémunéré lorsqu'un premier rendez-vous répondant aux critères définis est obtenu.

Valeur actuelle :

**100 € par RDV rémunéré**

Cette valeur doit rester configurable.

Funnel analytique :

`Prospect → Appel → Conversation → RDV pris → RDV éligible → RDV rémunéré`

Value Event :

`PAID_MEETING`

Revenue Type :

`ONE_SHOT`

KPI principaux :

- appels
- conversations
- RDV pris
- RDV éligibles
- RDV rémunérés
- taux appel → conversation
- taux conversation → RDV
- taux RDV → RDV rémunéré
- revenu
- €/heure

Important :

Un RDV pris n'est pas automatiquement un RDV rémunéré.

Prévoir :

- eligible_meeting
- paid_meeting
- rejection_reason si nécessaire

---

# 7. LOGIQUE BUSINESS — SACHA

Modèle économique :

KLS3 est rémunéré lorsqu'un prospect signe.

Le montant de la commission doit être configurable.

Valeur provisoire utilisée pour les simulations :

**500 € par signature**

ATTENTION :

500 € est une hypothèse de travail et non une règle métier définitive.

Funnel analytique :

`Prospect → Conversation → RDV → Opportunité → Proposition éventuelle → Signature`

Value Event :

`SIGNED_DEAL`

Revenue Type :

`ONE_SHOT`

KPI principaux :

- appels
- conversations
- RDV
- opportunités
- propositions
- signatures
- taux conversation → RDV
- taux RDV → signature
- délai moyen RDV → signature
- revenu
- €/heure

---

# 8. LOGIQUE BUSINESS — CALYMIA

Modèle économique :

Abonnement mensuel.

Plans actuellement envisagés :

- Essentiel : 29 €/mois
- Pro : 59 €/mois
- Cabinet : 139 €/mois

Ces valeurs doivent rester configurables.

Funnel analytique :

`Prospect → Conversation → Démo → Essai éventuel → Client payant → Abonnement actif`

Value Event :

`SUBSCRIPTION_STARTED`

Revenue Type :

`MRR`

KPI principaux :

- prospects
- conversations
- démos
- essais
- nouveaux clients
- taux conversation → démo
- taux démo → client
- MRR créé
- MRR total

Prévoir dans une évolution ultérieure :

- churn
- cancellations
- LTV
- expansion revenue

Important :

Le MRR doit être traité comme un revenu récurrent.

Ne pas calculer le revenu Calymia comme :

`nouveaux clients du mois × prix × 12`

sans tenir compte de l'accumulation des abonnements.

---

# 9. LOGIQUE BUSINESS — KLS3 NOTAIRES

Modèle économique :

Projet / prestation KLS3.

Ticket moyen actuel de travail :

**12 000 €**

ATTENTION :

12 000 € est une hypothèse commerciale.

Cette valeur doit être configurable et ne doit jamais devenir une constante cachée dans le code.

Funnel analytique :

`Prospect → Contact → Conversation → Diagnostic → Opportunité → Proposition → Négociation → Signature`

Value Event :

`SIGNED_PROJECT`

Revenue Type :

`PROJECT`

KPI principaux :

- appels
- conversations
- diagnostics
- opportunités
- propositions
- signatures
- taux conversation → diagnostic
- taux diagnostic → opportunité
- taux opportunité → proposition
- taux proposition → signature
- CA signé
- pipeline brut
- pipeline pondéré
- ticket moyen
- cycle de vente moyen
- €/heure

---

# 10. VALUE EVENTS

Créer une table dédiée :

`VALUE_EVENTS`

Cette table représente les événements qui génèrent réellement de la valeur économique.

Champs :

- id
- business_line_id
- opportunity_id
- contact_id
- event_type
- event_date
- amount
- revenue_type
- status
- notes
- created_at
- updated_at

event_type possibles initialement :

- PAID_MEETING
- SIGNED_DEAL
- SUBSCRIPTION_STARTED
- SIGNED_PROJECT

revenue_type :

- ONE_SHOT
- MRR
- PROJECT

status :

- PENDING
- CONFIRMED
- PAID
- CANCELLED

Cette table est essentielle.

Ne jamais calculer tout le revenu uniquement à partir du statut `Gagné`.

---

# 11. KPI — TROIS NIVEAUX

Toujours distinguer trois niveaux.

## ACTIVITÉ

Mesure ce que l'équipe commerciale fait.

Exemples :

- appels
- emails
- LinkedIn
- réunions
- démos
- temps passé

---

## PERFORMANCE COMMERCIALE

Mesure ce que l'activité produit.

Exemples :

- conversations
- RDV
- diagnostics
- opportunités
- propositions
- signatures

---

## PERFORMANCE ÉCONOMIQUE

Mesure la valeur créée.

Exemples :

- revenu
- MRR
- pipeline
- CA signé
- €/heure

Ne pas mélanger ces trois niveaux dans les mêmes indicateurs.

---

# 12. KPI STRATÉGIQUE — REVENU PAR HEURE

Le KPI clé de comparaison entre business lines est :

`Revenu généré / Temps commercial consacré`

Nom technique :

`revenuePerHour`

Affichage UI :

`€/heure`

L'objectif est de déterminer quelles business lines méritent davantage de temps commercial.

Ce KPI doit être visible dans Analytics.

---

# 13. PARTNER REVENUE VS OWNED REVENUE

Distinguer deux catégories économiques.

## Partner Revenue

- Paul
- Sacha

## Owned Revenue

- Calymia
- KLS3

Cette distinction doit être disponible dans les analytics et le dashboard global.

L'objectif est de distinguer :

- cash généré via partenaires
- valeur propre créée par KLS3

---

# 14. ÉCRANS V1

La V1 contient six expériences principales :

1. Dashboard
2. Ma journée
3. Focus
4. Pipeline
5. Prospect / Opportunité
6. Analytics

Ne pas ajouter d'autres sections principales sans justification fonctionnelle.

---

# 15. DASHBOARD

Objectif :

répondre rapidement à :

> Où en est l'activité commerciale ?

Filtres :

- Aujourd'hui
- Semaine
- Mois
- Personnalisé si nécessaire

Afficher quatre cards business lines :

- Paul
- Sacha
- Calymia
- KLS3 Notaires

Chaque card doit afficher uniquement les informations les plus importantes.

Ne pas mettre huit KPI dans chaque card.

Exemples :

### Paul

8 RDV rémunérés

800 €

Objectif : 8 / 8

### Sacha

2 signatures

1 000 €

Objectif : 2 / 2

### Calymia

5 nouveaux clients

+295 € MRR

### KLS3 Notaires

1 contrat

12 000 € CA signé

Ajouter des indicateurs globaux :

- Partner Revenue
- Owned Revenue
- MRR
- Pipeline KLS3
- appels du mois
- RDV du mois
- opportunités ouvertes

---

# 16. MA JOURNÉE

C'est l'écran opérationnel principal.

Il doit répondre à :

> Que dois-je faire maintenant ?

En haut :

`Bonjour Lilian`

Puis :

`Voici ce qui mérite ton attention aujourd'hui.`

Afficher notamment :

- TASKS TODO du jour (due at = aujourd'hui)
- TASKS en retard (due at dépassé)
- RDV du jour
- opportunités sans TASK TODO (sans prochaine action)

CTA principal :

`DÉMARRER MA SESSION`

Cet écran doit être orienté action et non reporting.

---

# 17. MODE FOCUS

Le mode Focus est une fonction essentielle.

Objectif :

présenter les prospects **un par un** pendant les sessions d'appels.

Ne jamais afficher une grande liste de prospects pendant une session Focus.

Structure principale :

- business line
- entreprise
- contact
- fonction
- téléphone
- objectif de l'appel
- dernière interaction
- prochaine action éventuelle
- bouton appeler
- résultats d'appel

Résultats rapides :

- Pas de réponse
- Conversation
- RDV pris
- Pas intéressé

Après validation du résultat :

1. créer une ACTIVITY avec le résultat
2. créer une TASK TODO pour la prochaine action (si nécessaire)
3. mettre à jour le stage de l'opportunité si pertinent
4. créer STAGE_HISTORY si le stage a changé
5. afficher automatiquement le prospect suivant

Afficher la progression :

`17 / 40 appels`

À la fin d'une session, afficher :

- appels
- conversations
- RDV
- opportunités créées
- durée de session

Le temps de session doit pouvoir alimenter les KPI de temps passé par business line.

Workflow fondamental :

`Appel → Résultat → Next Action → Next Prospect`

---

# 18. PIPELINE

Affichage :

Kanban.

Colonnes :

- À prospecter
- Contacté
- Échange
- Qualifié
- RDV
- Opportunité
- Proposition
- Gagné
- Perdu

Cards compactes.

Afficher au minimum :

- entreprise
- contact
- business line
- valeur potentielle
- prochaine action (dérivée de la prochaine TASK TODO)
- jours dans l'étape

Filtres :

- business line
- owner
- source
- priorité
- période si pertinent

Drag & drop autorisé.

Chaque changement d'étape doit créer automatiquement une ligne dans STAGE_HISTORY avec :

- Opportunity (link)
- From Stage
- To Stage
- Changed At (date + time)
- Changed By

Passer une opportunité en `Gagné` ne doit pas automatiquement supposer le revenu.

Si nécessaire, demander les informations permettant de créer le Value Event correspondant.

---

# 19. FICHE PROSPECT / OPPORTUNITÉ

La fiche doit centraliser l'information utile à l'action commerciale.

## Entreprise

- nom
- site
- secteur
- ville
- pays
- téléphone
- taille
- notes

## Contact

- prénom
- nom
- fonction
- téléphone
- email
- LinkedIn

## Commercial

- business line
- owner
- source
- stage
- priorité
- valeur potentielle
- probabilité
- expected close date

## Timeline

Afficher chronologiquement :

- ACTIVITIES (appels, emails, LinkedIn, RDV, notes, propositions)
- changements de stage (via STAGE_HISTORY)
- VALUE_EVENTS

## Prochaines actions

Afficher les TASKS :

- TASKS TODO (à faire)
- TASKS DONE (terminées)
- TASKS CANCELLED

Chaque TASK affiche :

- type
- due at (date + heure)
- priorité
- owner
- notes

## Opportunité

- problème identifié
- besoin
- montant potentiel
- probabilité
- prochaine étape
- date estimée de signature

Pour KLS3 Notaires, prévoir également :

- process concerné
- temps perdu estimé
- volume
- urgence
- décideur identifié
- problème métier

---

# 20. ANALYTICS

Question principale :

> Qu'est-ce qui fonctionne ?

Filtres :

- semaine
- mois
- trimestre
- année
- plage personnalisée
- business line
- owner si nécessaire

Afficher notamment :

- heures
- appels
- conversations
- RDV
- opportunités
- propositions
- signatures
- Value Events
- revenu
- MRR
- pipeline
- €/heure

Afficher les funnels analytiques spécifiques aux business lines.

Ne pas transformer Analytics en collection de graphiques décoratifs.

Priorité :

1. KPI utiles
2. tableaux comparatifs
3. funnels
4. tendances
5. graphiques uniquement lorsqu'ils facilitent une décision

---

# 21. AIRTABLE — TABLES PRINCIPALES

Le modèle Airtable V1 contient exactement 9 tables :

- BUSINESS_LINES
- COMPANIES
- CONTACTS
- OPPORTUNITIES
- ACTIVITIES
- TASKS
- VALUE_EVENTS
- GOALS
- STAGE_HISTORY

**Important — Champs réciproques Airtable :**

Airtable crée automatiquement des champs réciproques (linked-record fields) pour toutes les relations.

Exemples :

- COMPANIES a un champ automatique "CONTACTS" qui liste tous les contacts liés
- COMPANIES a un champ automatique "OPPORTUNITIES" qui liste toutes les opportunités liées
- OPPORTUNITIES a un champ automatique "ACTIVITIES" qui liste toutes les activités liées

Ces champs réciproques sont générés automatiquement par Airtable et ne doivent pas être traités comme des champs métier additionnels.

Éviter de multiplier les tables sans nécessité.

---

# 22. BUSINESS_LINES

Champs :

- Name
- Code
- Category
- Revenue Trigger
- Revenue Type
- Default Unit Value
- Active

category :

- PARTNER
- OWNED

**Valeurs V1 (déjà créées dans Airtable) :**

**Paul**
- Code : `PAUL`
- Category : `PARTNER`
- Revenue Trigger : `PAID_MEETING`
- Revenue Type : `ONE_SHOT`
- Default Unit Value : `100`

**Sacha**
- Code : `SACHA`
- Category : `PARTNER`
- Revenue Trigger : `SIGNED_DEAL`
- Revenue Type : `ONE_SHOT`
- Default Unit Value : vide (intentionnellement)

**Calymia**
- Code : `CALYMIA`
- Category : `OWNED`
- Revenue Trigger : `SUBSCRIPTION_STARTED`
- Revenue Type : `MRR`
- Default Unit Value : vide (intentionnellement)

**KLS3 Notaires**
- Code : `KLS3_NOTAIRES`
- Category : `OWNED`
- Revenue Trigger : `SIGNED_PROJECT`
- Revenue Type : `PROJECT`
- Default Unit Value : vide (intentionnellement)

**Important :**

BUSINESS_LINES n'a pas de champs Created At / Updated At.

Ces données de référence sont gérées manuellement dans Airtable.

---

# 23. COMPANIES

Champs :

- Name
- Website
- Industry
- City
- Country
- Phone
- Company Size
- LinkedIn
- Notes
- Created At (dateTime)
- Updated At (dateTime)

**Règles de gestion des timestamps :**

- À la création : `Created At = now`, `Updated At = now`
- À la modification : `Updated At = now`

**Important :**

`Created At` et `Updated At` ne sont PAS des champs système Airtable.

Ce sont des champs dateTime standards gérés par l'application.

Une entreprise peut avoir plusieurs contacts.

Une entreprise peut avoir plusieurs opportunités.

---

# 24. CONTACTS

Champs :

- First Name
- Last Name
- Company → Link COMPANIES
- Job Title
- Email
- Phone
- LinkedIn
- Notes
- Created At (dateTime)
- Updated At (dateTime)

**Règles de gestion des timestamps :**

- À la création : `Created At = now`, `Updated At = now`
- À la modification : `Updated At = now`

**Important :**

`Created At` et `Updated At` ne sont PAS des champs système Airtable.

Ce sont des champs dateTime standards gérés par l'application.

Relation :

`Company 1:N Contacts`

Un contact peut participer à plusieurs opportunités.

**Important :**

Ne pas rattacher directement CONTACTS à une Business Line.

La Business Line appartient à l'opportunité.

---

# 25. OPPORTUNITIES

Champs :

- Name
- Company → Link COMPANIES
- Primary Contact → Link CONTACTS
- Business Line → Link BUSINESS_LINES
- Owner
- Stage
- Source
- Priority
- Potential Value
- Probability
- Expected Close Date
- Problem
- Need
- Next Step Notes
- Lost Reason
- Created At (dateTime)
- Updated At (dateTime)
- Won At (dateTime)
- Lost At (dateTime)

**Règles de gestion des timestamps :**

- À la création : `Created At = now`, `Updated At = now`
- À la modification : `Updated At = now`
- Passage à `Gagné` : `Won At = now`
- Passage à `Perdu` : `Lost At = now`

**Important :**

`Created At` et `Updated At` ne sont PAS des champs système Airtable.

Ce sont des champs dateTime standards gérés par l'application.

**Stages :**

- À prospecter
- Contacté
- Échange
- Qualifié
- RDV
- Opportunité
- Proposition
- Gagné
- Perdu

**Priority :**

- LOW
- MEDIUM
- HIGH
- URGENT

**Sources :**

- Cold Call
- Cold Email
- LinkedIn
- Referral
- Website
- Partner
- Event
- Inbound
- Other

**Owner :**

Pour la V1, Owner reste volontairement simple.

Valeurs initiales :

- Eric
- Lilian

Utiliser un champ contrôlé et non du texte libre.

Ne pas créer de table USERS en V1.

**Important — Next Action :**

Ne pas dupliquer la prochaine action dans OPPORTUNITIES.

La prochaine action d'une opportunité doit être dérivée de la prochaine TASK ouverte (statut TODO).

Le champ "Next Step Notes" peut rester dans OPPORTUNITIES uniquement comme information commerciale qualitative, mais il ne constitue jamais la source de vérité de la prochaine action.

Une opportunité active sans TASK ouverte doit pouvoir être identifiée comme "Sans prochaine action".

Pour certaines business lines, des champs métier complémentaires pourront être ajoutés si réellement nécessaires.

---

# 26. ACTIVITIES

Une ligne représente une action commerciale réellement effectuée.

Champs :

- Opportunity → Link OPPORTUNITIES
- Contact → Link CONTACTS
- Type
- Date + time
- Result
- Notes
- Owner
- Duration Minutes
- Created At (dateTime)

**Règles de gestion des timestamps :**

- À la création : `Created At = now`

**Important :**

`Created At` n'est PAS un champ système Airtable.

C'est un champ dateTime standard géré par l'application.

**Types initiaux :**

- CALL
- EMAIL
- LINKEDIN
- MEETING
- DEMO
- PROPOSAL
- NOTE
- OTHER

**Résultats d'appel initiaux :**

- NO_ANSWER
- CONVERSATION
- MEETING_BOOKED
- NOT_INTERESTED
- CALLBACK

**Règle :**

ACTIVITY = action réalisée (passé)

---

# 27. TASKS

Une ligne représente une action future.

Champs :

- Opportunity → Link OPPORTUNITIES
- Contact → Link CONTACTS
- Type
- Due At (date + time)
- Priority
- Status
- Notes
- Owner
- Created At (dateTime)
- Completed At (dateTime)

**Règles de gestion des timestamps :**

- À la création : `Created At = now`
- Passage à `DONE` : `Completed At = now`

**Important :**

`Created At` et `Completed At` ne sont PAS des champs système Airtable.

Ce sont des champs dateTime standards gérés par l'application.

**Types initiaux :**

- CALL
- EMAIL
- LINKEDIN
- MEETING
- DEMO
- FOLLOW_UP
- OTHER

**Status :**

- TODO
- DONE
- CANCELLED

**Priority :**

- LOW
- MEDIUM
- HIGH
- URGENT

**Règle fondamentale :**

TASK = action à faire (futur)

ACTIVITY = action réalisée (passé)

VALUE_EVENT = valeur économique générée

**Source de vérité de la Next Action :**

La prochaine TASK avec statut TODO est la source de vérité de la Next Action d'une opportunité.

Une opportunité active sans TASK TODO doit pouvoir être identifiée comme "Sans prochaine action".

---

# 28. VALUE_EVENTS

Champs :

- Opportunity → Link OPPORTUNITIES
- Contact → Link CONTACTS
- Business Line → Link BUSINESS_LINES
- Event Type
- Event Date
- Amount
- Revenue Type
- Status
- Notes
- Created At (dateTime)

**Règles de gestion des timestamps :**

- À la création : `Created At = now`

**Important :**

`Created At` n'est PAS un champ système Airtable.

C'est un champ dateTime standard géré par l'application.

VALUE_EVENTS n'a pas de champ `Updated At` en V1. Son statut peut évoluer après création (PENDING → CONFIRMED → PAID, ou PENDING/CONFIRMED → CANCELLED), mais la V1 ne nécessite pas de tracer le timestamp de chaque modification.

**Event Type :**

- PAID_MEETING
- SIGNED_DEAL
- SUBSCRIPTION_STARTED
- SIGNED_PROJECT

**Revenue Type :**

- ONE_SHOT
- MRR
- PROJECT

**Status :**

- PENDING
- CONFIRMED
- PAID
- CANCELLED

Cette table est la source de vérité des événements économiques.

Ne jamais calculer tout le revenu uniquement à partir du statut "Gagné" d'une opportunité.

---

# 29. GOALS

Champs :

- Business Line → Link BUSINESS_LINES
- Metric
- Period
- Target
- Ambitious Target
- Start Date
- End Date

**Important :**

GOALS n'a pas de champs Created At / Updated At.

Les objectifs sont des données de configuration gérées manuellement dans Airtable.

Les objectifs doivent toujours être configurables sans modifier le code.

Exemples actuels de travail :

**Paul :**

- cible : 8 RDV rémunérés/mois
- ambitieux : 12

**Sacha :**

- cible : 2 signatures/mois
- ambitieux : 3

**Calymia :**

- cible : 5 nouveaux clients/mois
- ambitieux : 8

**KLS3 Notaires :**

- cible : 1 signature/mois
- ambitieux : 1,5

Ces valeurs sont des hypothèses de pilotage et doivent rester configurables.

---

# 30. STAGE_HISTORY

Objectif :

Historiser chaque changement d'étape d'une opportunité.

Champs :

- Opportunity → Link OPPORTUNITIES
- From Stage → Single select
- To Stage → Single select
- Changed At → Date + time
- Changed By → Single select

**Stages :**

- À prospecter
- Contacté
- Échange
- Qualifié
- RDV
- Opportunité
- Proposition
- Gagné
- Perdu

**Changed By :**

- Eric
- Lilian

Cette table permettra notamment de calculer ultérieurement :

- temps passé dans chaque étape
- temps Contacté → RDV
- temps RDV → Proposition
- temps Proposition → Gagné
- cycle de vente
- opportunités bloquées

**Important :**

Chaque changement d'étape d'une opportunité doit créer automatiquement une ligne dans STAGE_HISTORY.

STAGE_HISTORY n'a pas de champs Created At / Updated At.

Le champ `Changed At` contient déjà la date/heure du changement.

---

# 31. RÈGLE GLOBALE — TIMESTAMPS

**Important :**

Les champs `Created At`, `Updated At`, `Won At`, `Lost At`, `Completed At`, et `Changed At` ne sont PAS des champs système Airtable automatiques.

Ce sont des champs dateTime standards qui doivent être gérés manuellement par l'application.

**Résumé des règles de gestion :**

| Table | Created At | Updated At | Autres timestamps |
|-------|------------|------------|-------------------|
| COMPANIES | ✅ à la création | ✅ à la modification | - |
| CONTACTS | ✅ à la création | ✅ à la modification | - |
| OPPORTUNITIES | ✅ à la création | ✅ à la modification | Won At, Lost At |
| ACTIVITIES | ✅ à la création | ❌ | - |
| TASKS | ✅ à la création | ❌ | Completed At |
| VALUE_EVENTS | ✅ à la création | ❌ | - |
| BUSINESS_LINES | ❌ | ❌ | - |
| GOALS | ❌ | ❌ | - |
| STAGE_HISTORY | ❌ | ❌ | Changed At |

**Règles détaillées :**

**COMPANIES / CONTACTS / OPPORTUNITIES :**
- À la création : `Created At = now`, `Updated At = now`
- À la modification : `Updated At = now`

**OPPORTUNITIES (timestamps additionnels) :**
- Passage à `Gagné` : `Won At = now`
- Passage à `Perdu` : `Lost At = now`

**ACTIVITIES :**
- À la création : `Created At = now`
- Pas de `Updated At` (événements historiques immuables)

**VALUE_EVENTS :**
- À la création : `Created At = now`
- Pas de `Updated At` en V1 (le statut peut évoluer, mais V1 ne trace pas le timestamp de chaque modification)

**TASKS :**
- À la création : `Created At = now`
- Passage à `DONE` : `Completed At = now`

**STAGE_HISTORY :**
- Utilise uniquement `Changed At` (date/heure du changement d'étape)

**BUSINESS_LINES / GOALS :**
- Aucun timestamp (données de référence/configuration)

---

# 33. CRM QUALITY RULES

Une opportunité active doit idéalement toujours avoir :

- business line
- owner
- stage
- au moins une TASK TODO (prochaine action)

Afficher des alertes pour :

- TASKS en retard (Due At dépassé)
- opportunités sans TASK TODO (sans prochaine action)
- opportunités bloquées trop longtemps dans une étape
- propositions sans TASK de relance prévue

**Source de vérité de la prochaine action :**

La prochaine TASK avec statut TODO.

Ne jamais se baser uniquement sur le champ "Next Step Notes" d'OPPORTUNITIES pour identifier la prochaine action.

Ne pas bloquer inutilement l'utilisateur avec des validations excessives.

Préférer les alertes utiles aux formulaires bureaucratiques.

---

# 34. SOURCES DE LEADS

Valeurs initiales :

- Cold Call
- Cold Email
- LinkedIn
- Referral
- Website
- Partner
- Event
- Inbound
- Other

La liste doit pouvoir évoluer.

---

# 35. PRIORITÉ

Valeurs initiales :

- LOW
- MEDIUM
- HIGH
- URGENT

La V1 peut utiliser une priorité manuelle.

Ne pas construire de scoring IA en V1.

---

# 35. DESIGN SYSTEM KLS3

Le design system KLS3 est obligatoire.

Ne pas improviser une autre direction artistique.

L'application doit être :

- sombre
- minimaliste
- premium
- professionnelle
- lisible
- efficace

Elle ne doit PAS ressembler :

- à Salesforce
- à un dashboard SaaS générique
- à une interface cyberpunk
- à une interface gaming
- à un dashboard multicolore

Dark uniquement.

Pas de light mode.

---

# 36. COULEURS

Fond principal :

`#0D0D0D`

Fond cards :

`#111111`

Accent :

`#4B7BF5`

Texte principal :

`#F0EDE8`

Texte muted :

`rgba(240,237,232,0.45)`

Bordures standard :

`rgba(255,255,255,0.07)`

Le bleu KLS3 doit être utilisé avec parcimonie.

Ne pas attribuer une couleur forte différente à chaque business line.

---

# 37. TYPOGRAPHIE

Titres H1/H2 :

- Syne
- weight 700

Corps :

- Inter
- weights 300 / 400 / 500

Dans Next.js, utiliser de préférence :

`next/font/google`

Fonts :

- Syne
- Inter

---

# 38. LOGO KLS3

Règle absolue :

`KLS` en `#F0EDE8`

`3` TOUJOURS en `#4B7BF5`

Font :

Syne Bold

Le chiffre 3 doit toujours utiliser la couleur accent KLS3.

---

# 39. BOUTONS

## Primary

- background : #4B7BF5
- color : #FFFFFF
- border-radius : 100px

Style pill.

## Ghost

- background : transparent
- border : 0.5px solid rgba(255,255,255,0.15)
- color : #F0EDE8
- border-radius : 100px

## Navigation CTA

- border : 1px solid rgba(240,237,232,0.35)
- color : #F0EDE8
- border-radius : 100px

Hover :

- background : #4B7BF5
- border-color : #4B7BF5

La bordure 1px du CTA navigation est une exception.

Les autres bordures sont normalement 0.5px.

---

# 40. CARDS

background :

`#111111`

border :

`0.5px solid rgba(255,255,255,0.07)`

border-radius :

`16px`

Pas d'ombres fortes.

Les cards doivent être différenciées principalement par :

- background
- bordure
- espacement
- hiérarchie typographique

---

# 41. KPI GROUPS

Pour les ensembles de cards adjacentes :

- gap : 1px
- background : rgba(255,255,255,0.06)
- border-radius : 20px
- overflow : hidden

---

# 42. SECTION LABEL / EYEBROW

Structure :

ligne horizontale bleue

+

texte uppercase

Ligne :

- width : 28px
- height : 1px
- background : #4B7BF5

Texte :

- font-size : 11-12px
- letter-spacing : 0.16-0.22em
- color : #4B7BF5
- font-weight : 500-600

---

# 43. TYPOGRAPHIE DÉCORATIVE

Font :

Syne

Color :

`#4B7BF5`

Opacity :

`0.2`

Font-size :

`40px à 240px selon contexte`

Utiliser avec parcimonie.

Ne jamais nuire à la lisibilité.

---

# 44. ANIMATIONS

Framer Motion peut être utilisé avec parcimonie.

Animation standard :

```typescript
const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: {
    duration: 0.45,
    ease: 'easeOut'
  }
}
```

Container :

```typescript
const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.08
    }
  }
}
```

Les animations doivent rester :

- discrètes
- rapides
- fonctionnelles

INTERDIT :

- orbes
- glow
- gradients animés
- particules
- animations décoratives excessives
- esthétique cyberpunk

---

# 45. RESPONSIVE

Approche :

**mobile-first**

Structure standard :

Mobile :

1 colonne

Tablet :

2 colonnes

Desktop :

4 colonnes lorsque pertinent

Ne pas simplement réduire une interface desktop.

Les informations prioritaires doivent rester prioritaires sur mobile.

---

# 46. NAVIGATION

Navigation principale envisagée :

- Dashboard
- Ma journée
- Pipeline
- Analytics

CTA :

`+ Prospect`

Le mode Focus est lancé depuis `Ma journée`.

Il n'est pas nécessairement une entrée permanente dans la navigation.

---

# 47. RÈGLE DE DENSITÉ

Chaque écran doit présenter :

1. une information principale
2. deux à quatre informations secondaires
3. puis les détails

Ne jamais afficher tous les KPI disponibles sur le premier niveau.

Utiliser une hiérarchie visuelle forte.

---

# 48. STACK TECHNIQUE

Stack officielle :

- Next.js
- React
- TypeScript
- Tailwind CSS
- Airtable
- Vercel

Possibles si utiles :

- shadcn/ui
- Framer Motion
- n8n

Ne pas ajouter de technologie sans besoin réel.

---

# 49. NEXT.JS

Utiliser les conventions modernes de Next.js.

Préférer :

- App Router
- Server Components
- Server Actions lorsque pertinent
- Route Handlers lorsque pertinent

Server Components par défaut.

`use client` uniquement lorsque réellement nécessaire.

Exemples légitimes :

- Kanban drag & drop
- interactions dynamiques
- Focus Mode
- certains formulaires
- certains filtres
- composants nécessitant un état client

Ne pas mettre `use client` au niveau d'une page entière si quelques composants seulement en ont besoin.

---

# 50. AIRTABLE

Airtable est la base de données principale de la V1.

Architecture :

`Next.js UI → Next.js Server Layer → Airtable`

Ne jamais appeler Airtable directement depuis le navigateur avec un secret.

Tous les accès sensibles passent côté serveur.

Ne jamais exposer :

- Airtable Personal Access Token
- credentials
- secrets

dans le bundle client.

---

# 51. VARIABLES D'ENVIRONNEMENT

Les secrets locaux doivent être stockés dans :

`.env.local`

Exemples futurs :

```text
AIRTABLE_TOKEN=
AIRTABLE_BASE_ID=
```

Ne jamais committer `.env.local`.

En production, utiliser :

Vercel Environment Variables.

Ne jamais hardcoder un token dans le code.

---

# 52. N8N

n8n n'est pas nécessaire à la Phase 0.

Il pourra être utilisé ultérieurement pour :

- import de prospects
- enrichissement
- séquences
- emails
- synchronisations
- automatisations
- création automatique de tâches

Ne pas intégrer n8n tant qu'un besoin concret n'est pas validé.

---

# 53. GITHUB

Repository :

`kls3-sales-os`

GitHub est la source de vérité du code.

Ne jamais committer :

- `.env`
- `.env.local`
- tokens
- API keys
- credentials
- secrets
- fichiers contenant des données commerciales sensibles

---

# 54. VERCEL

Vercel héberge l'application Next.js.

Architecture de déploiement :

`GitHub → Vercel → sales.kls3-dev.com`

Prévoir :

## Local

Développement local avec Claude Code.

## Preview

Vercel Preview Deployments.

## Production

Application interne KLS3.

Les variables d'environnement doivent être configurées correctement pour chaque environnement.

---

# 55. DOMAINE

URL de production cible :

`https://sales.kls3-dev.com`

Ne pas hardcoder cette URL dans toute l'application.

Utiliser une configuration ou variable d'environnement lorsque nécessaire.

---

# 56. AUTHENTIFICATION

L'application est privée.

Toutes les routes applicatives devront être protégées avant utilisation avec de vraies données commerciales.

Seule la route `/login` peut être publique.

La solution d'authentification doit rester simple.

La V1 ne nécessite pas de gestion complexe :

- rôles avancés
- organisations
- multi-tenant
- permissions granulaires

Utilisateurs initiaux :

équipe interne KLS3.

Ne pas développer soi-même un système cryptographique ou de gestion de mots de passe si une solution standard fiable répond au besoin.

---

# 57. SÉCURITÉ

Principes :

- secrets uniquement côté serveur
- aucune clé Airtable côté client
- validation des entrées
- accès privé
- dépendances maintenues
- pas de données sensibles dans les logs
- pas de données réelles dans le repo GitHub

Toujours traiter les données CRM comme confidentielles.

---

# 58. CE QUI N'EST PAS DANS LA V1

Ne pas développer :

- facturation
- Stripe
- portail client
- espace public
- multi-tenant
- SaaS externe
- rôles avancés
- enrichissement automatique complexe
- scoring IA
- IA générative
- bulk emailing
- moteur marketing
- application mobile native
- comptabilité
- ERP
- moteur de workflow générique

Ces fonctionnalités ne doivent pas être anticipées architecturalement au point de complexifier la V1.

---

# 59. PRINCIPES D'ARCHITECTURE

Ne pas sur-architecturer.

Éviter :

- microservices
- CQRS
- event sourcing
- architecture événementielle complexe
- abstractions prématurées
- repository pattern inutile
- couches techniques sans valeur
- dépendances excessives

Le projet est un outil interne.

Toujours privilégier la solution la plus simple qui reste propre et maintenable.

---

# 60. STRUCTURE DU CODE

Structure indicative seulement :

```text
app/
  (auth)/
  dashboard/
  today/
  pipeline/
  prospects/
  analytics/
  api/

components/
  ui/
  dashboard/
  pipeline/
  focus/
  prospects/
  analytics/

lib/
  airtable/
  auth/
  analytics/
  business-lines/
  utils/

types/

config/
```

Ne pas créer automatiquement tous ces dossiers.

Créer uniquement ce qui est nécessaire à la phase en cours.

---

# 61. NOMMAGE

Code :

**anglais**

Interface utilisateur :

**français**

Exemple :

Composant :

`TodayActions`

UI :

`Actions du jour`

Variables, types, fonctions et composants en anglais.

---

# 62. GESTION DES ÉTATS

Chaque fonctionnalité utilisant des données doit prévoir lorsque pertinent :

- loading state
- empty state
- error state
- success feedback

Ne jamais laisser un écran vide sans explication.

Les erreurs techniques ne doivent pas être affichées brutalement à l'utilisateur final.

---

# 63. PERFORMANCE

Airtable n'est pas une base SQL classique.

Éviter :

- requêtes inutiles
- récupération systématique de toutes les lignes
- calculs massifs côté client
- appels répétés identiques

Préférer :

- requêtes ciblées
- pagination
- Server Components
- cache raisonné lorsque pertinent
- agrégations adaptées

Ne pas charger toute la base uniquement pour afficher une card KPI.

---

# 64. ACCESSIBILITÉ

Minimum attendu :

- navigation clavier
- boutons accessibles
- labels formulaires
- contrastes suffisants
- focus states visibles
- HTML sémantique

Le design premium ne doit jamais nuire à l'accessibilité.

---

# 65. PHILOSOPHIE UX

Ne pas construire un CRM administratif.

Construire un outil orienté action.

La majorité des actions commerciales courantes doivent nécessiter un ou deux clics maximum.

Toujours privilégier :

`Action → Résultat → Prochaine action`

---

# 66. PRIORITÉ UX ABSOLUE

L'utilisateur doit pouvoir ouvrir KLS3 Sales OS le matin et comprendre en moins de 10 secondes :

- ce qu'il doit faire
- ce qui est en retard
- quels RDV il a
- quelles actions sont prioritaires
- quelle business line mérite son attention

---

# 67. PHASE 0 — SETUP

Objectif :

créer uniquement le socle technique.

Contenu :

- Next.js
- App Router
- TypeScript
- Tailwind CSS
- fonts Syne + Inter
- design tokens KLS3
- structure minimale
- `.env.example`
- préparation Vercel
- linting
- build fonctionnel

Ne pas connecter Airtable pendant la Phase 0 sauf validation explicite.

Ne pas construire le CRM pendant la Phase 0.

---

# 68. PHASE 1 — DATA

Objectif :

connecter proprement le modèle de données.

Contenu :

- Airtable connection
- Business Lines
- Companies
- Contacts
- Opportunities
- Activities
- Tasks
- Value Events
- Goals
- Stage History
- types TypeScript
- fonctions d'accès server-side
- gestion des erreurs

Utiliser des données de test.

---

# 69. PHASE 2 — CORE CRM

Contenu :

- Companies
- Contacts
- création / édition
- Opportunity detail
- timeline
- prochaine action
- données commerciales essentielles

---

# 70. PHASE 3 — PIPELINE

Contenu :

- Kanban
- filtres
- drag & drop
- stage history
- prochaine action
- valeur potentielle
- business line

---

# 71. PHASE 4 — TODAY

Contenu :

- actions du jour
- appels
- relances
- RDV
- overdue
- prospects sans prochaine action
- quick actions

---

# 72. PHASE 5 — FOCUS

Contenu :

- call queue
- un prospect à la fois
- call results
- prochaine action
- next prospect
- session timer
- session summary
- activité automatiquement enregistrée

---

# 73. PHASE 6 — DASHBOARD

Contenu :

- KPI business lines
- KPI globaux
- Value Events
- Partner Revenue
- Owned Revenue
- MRR
- pipeline
- objectifs

---

# 74. PHASE 7 — ANALYTICS

Contenu :

- funnels
- conversions
- revenue/hour
- Partner vs Owned
- MRR
- pipeline
- tendances
- comparaison business lines

---

# 75. PHASE 8 — AUTH + PRODUCTION

Contenu :

- authentification
- protection des routes
- revue sécurité
- variables Vercel
- production build
- connexion Vercel
- domaine `sales.kls3-dev.com`
- tests production

Aucune vraie donnée commerciale ne doit être introduite dans une application publiquement accessible sans authentification.

---

# 76. WORKFLOW CLAUDE CODE

Avant chaque phase :

1. lire intégralement `CLAUDE.md`
2. analyser l'existant
3. ne pas supposer que les phases futures doivent être développées
4. expliquer brièvement ce qui va être construit
5. identifier les fichiers concernés
6. identifier les dépendances réellement nécessaires
7. attendre validation si une décision structurante est nécessaire
8. coder uniquement la phase demandée
9. lancer lint / typecheck / build / tests pertinents
10. corriger les erreurs
11. résumer les changements

Ne jamais décider seul de développer la phase suivante.

---

# 77. WORKFLOW GIT

Faire des changements cohérents et limités.

Ne pas mélanger plusieurs phases dans un même changement.

Avant un commit important :

- vérifier le diff
- vérifier qu'aucun secret n'est présent
- vérifier lint
- vérifier TypeScript
- vérifier build

Ne jamais faire de force push sans demande explicite.

Ne jamais supprimer l'historique Git.

---

# 78. RÈGLE DE NON-RÉGRESSION

Avant de modifier un composant existant :

- comprendre son rôle
- vérifier ses usages
- conserver le design KLS3
- éviter de casser un workflow existant
- vérifier les états loading / empty / error
- vérifier mobile et desktop lorsque pertinent

---

# 79. RÈGLE DE DESIGN

Avant de créer un composant, vérifier :

1. est-il conforme au Design System KLS3 ?
2. est-il réellement nécessaire ?
3. l'information principale est-elle immédiatement visible ?
4. l'utilisateur peut-il accomplir son action rapidement ?
5. est-ce utile au workflow commercial ?
6. peut-il être plus simple ?

Si la fonctionnalité n'est pas nécessaire à l'usage interne :

ne pas la développer.

---

# 80. RÈGLE MÉTIER

Ne jamais inventer une règle commerciale.

Si une valeur est incertaine :

la rendre configurable ou demander clarification.

Exemples :

- commission Sacha
- critères de RDV rémunéré Paul
- ticket Notaires
- objectifs
- probabilités
- prix futurs
- critères de qualification

Ne jamais transformer une hypothèse en constante métier cachée.

---

# 81. RÈGLE DATA

Airtable est la source de vérité opérationnelle de la V1.

Le code ne doit pas dupliquer inutilement des données qui appartiennent à Airtable.

Les IDs Airtable techniques et les IDs métier doivent être distingués si nécessaire.

Toujours préserver l'intégrité des relations :

**Modèle logique :**

```
COMPANY
  → CONTACT
  → OPPORTUNITY
      → ACTIVITY
      → TASK
      → VALUE_EVENT
      → STAGE_HISTORY

BUSINESS_LINE
  → OPPORTUNITY
  → VALUE_EVENT
  → GOAL
```

**Règles :**

- Une entreprise peut avoir plusieurs contacts
- Une entreprise peut avoir plusieurs opportunités
- Un contact peut participer à plusieurs opportunités
- Une opportunité appartient à une Business Line
- Une opportunité peut avoir plusieurs ACTIVITIES
- Une opportunité peut avoir plusieurs TASKS
- Une opportunité peut avoir plusieurs VALUE_EVENTS
- Une opportunité peut avoir plusieurs STAGE_HISTORY

**Principe de simplicité :**

Ne créer aucune table supplémentaire sans besoin métier réel.

Ne pas créer en V1 :

- USERS
- PIPELINES
- STAGES (utiliser Single Select)
- ACTIVITY_TYPES (utiliser Single Select)
- TASK_TYPES (utiliser Single Select)
- REVENUE_TYPES (utiliser Single Select)

Les valeurs contrôlées peuvent rester des Single Select Airtable.

---

# 82. RÈGLE DES PROCHAINES ACTIONS

Le concept de `Next Action` est central.

Une opportunité active sans prochaine action est considérée comme un problème de qualité CRM.

**Source de vérité :**

La prochaine action d'une opportunité est dérivée de la prochaine TASK avec statut TODO.

Le champ "Next Step Notes" dans OPPORTUNITIES peut servir d'information qualitative, mais ne constitue jamais la source de vérité.

**Workflows :**

L'application doit faciliter la création d'une TASK immédiatement après une ACTIVITY.

Exemple :

Appel → Résultat = CONVERSATION → Créer TASK = FOLLOW_UP dans 3 jours

Le système doit pouvoir identifier :

`Opportunités sans TASK TODO` (= sans prochaine action)

et :

`TASKS en retard` (= Due At dépassé)

---

# 83. RÈGLE FOCUS

Focus Mode n'est pas un simple écran de consultation.

C'est un moteur d'exécution commerciale.

Chaque interaction doit réduire le travail administratif.

Ne jamais obliger Lilian à :

- ouvrir plusieurs modales inutilement
- saisir les mêmes données deux fois
- retourner manuellement à une liste après chaque appel

Le système doit avancer naturellement vers le prospect suivant.

---

# 84. RÈGLE ANALYTICS

Ne jamais confondre activité et performance.

Exemple :

500 appels ne constituent pas un succès en soi.

Toujours chercher à relier :

`Activité → Conversion → Valeur économique`

L'objectif final des analytics est d'améliorer l'allocation du temps commercial.

---

# 85. RÈGLE CALYMIA

Calymia génère du revenu récurrent.

Les analytics doivent donc distinguer :

- nouveaux abonnements
- nouveau MRR
- MRR total

Ne pas traiter le MRR comme un revenu one-shot.

---

# 86. RÈGLE PIPELINE KLS3

Pour KLS3 Notaires, distinguer :

## Pipeline brut

Somme des opportunités ouvertes.

## Pipeline pondéré

Somme :

`potential_value × probability`

Exemple :

15 000 € × 60 % = 9 000 € de pipeline pondéré.

La probabilité doit rester explicite et modifiable.

---

# 87. MCP

Les MCP ne sont pas requis pour construire la V1.

Ne pas introduire de dépendance à un MCP dans l'architecture de l'application.

Claude Code peut utiliser des MCP externes uniquement si cela facilite le développement et si l'accès est explicitement configuré.

Le fonctionnement de KLS3 Sales OS ne doit jamais dépendre d'un MCP Claude.

---

# 88. DOCUMENTATION

`CLAUDE.md` est la référence principale pour :

- produit
- métier
- UX
- architecture
- design
- workflow de développement

`README.md` est la présentation générale du projet.

Si une décision structurante évolue :

mettre à jour `CLAUDE.md`.

Éviter la documentation dupliquée et contradictoire.

---

# 89. PREMIÈRE INSTRUCTION APRÈS INITIALISATION

Lors de la première session Claude Code :

1. lire intégralement `CLAUDE.md`
2. lire `README.md`
3. ne créer aucun fichier immédiatement
4. analyser les spécifications
5. identifier uniquement les incohérences ou risques réels
6. proposer l'architecture minimale de Phase 0
7. proposer les dépendances strictement nécessaires
8. attendre validation avant d'initialiser le projet

---

# 90. RÈGLE FINALE

Le succès de KLS3 Sales OS ne sera pas mesuré au nombre de fonctionnalités.

Il sera mesuré à sa capacité à :

- augmenter le nombre d'actions commerciales utiles
- améliorer le suivi
- réduire les prospects oubliés
- augmenter les conversions
- identifier les business lines rentables
- mesurer la valeur créée
- générer davantage de revenu commercial par heure

Construis donc toujours l'application autour de :

**l'action, la simplicité et la décision commerciale.**
