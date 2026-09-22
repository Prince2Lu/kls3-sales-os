# Conformité RGPD — prospection des offices notariaux

**Statut : brouillon à faire valider par un conseil juridique avant toute campagne réelle.**

## 1. Finalité

KLS3 constitue une base limitée d’offices notariaux afin de présenter une offre d’automatisation directement liée à leur activité professionnelle. Le pilote est limité à des lots de 25 offices.

## 2. Base légale envisagée

- **Prospection B2B liée à la profession : intérêt légitime** de KLS3 à développer son activité commerciale.
- Le consentement préalable n’est pas retenu par défaut et aucun champ `emailConsent` ne doit laisser croire qu’un consentement inexistant a été obtenu.
- Pour une adresse nominative, le message doit être en rapport avec la fonction professionnelle du destinataire, informer sur l’origine des données et permettre une opposition simple et gratuite.
- Les adresses génériques d’une personne morale (`contact@`, `info@`) sont traitées séparément des coordonnées personnelles, tout en conservant le mécanisme de désabonnement par prudence opérationnelle.

Une analyse de mise en balance de l’intérêt légitime doit être validée et conservée avant activation du mode d’envoi réel.

## 3. Source des données — blocage actuel

La présence publique d’une donnée ne rend pas automatiquement sa réutilisation commerciale licite. L’import automatisé depuis les annuaires actuellement ciblés reste désactivé jusqu’à obtention d’une autorisation écrite ou remplacement par une source dont la licence autorise explicitement cette réutilisation.

Pour chaque import autorisé, conserver :

- le nom et l’URL de la source ;
- la date de collecte ;
- la licence ou l’autorisation applicable ;
- les critères du lot ;
- l’utilisateur ayant déclenché l’import.

## 4. Données traitées

- Office : raison sociale, adresse professionnelle, site, téléphone, email générique, taille estimée.
- Notaire : nom, prénom, fonction, coordonnées professionnelles lorsqu’elles sont licitement disponibles.
- Traçabilité : source, date d’import, campagnes, statut de livraison, ouvertures, clics, opposition et tâches commerciales déclenchées.

Aucune donnée privée, sensible ou sans rapport avec la prospection professionnelle ne doit être collectée.

## 5. Information à fournir dans le premier message

Le modèle Brevo doit contenir, avant tout test externe :

- l’identité de KLS3 et ses coordonnées ;
- la finalité de la prospection ;
- la base légale retenue ;
- l’origine des coordonnées ;
- un lien vers la politique de confidentialité ;
- un moyen simple et gratuit de s’opposer à tout nouvel envoi.

## 6. Opposition et liste repoussoir

- Toute opposition, désinscription, plainte spam, adresse invalide ou hard bounce est enregistrée dans `EMAIL_SUPPRESSIONS`.
- La liste est vérifiée lors de la création du brouillon **et de nouveau immédiatement avant l’envoi**.
- Les exclusions actives ne sont pas désactivables depuis l’interface courante.
- La liste repoussoir doit être utilisée uniquement pour empêcher une nouvelle prospection.
- Durée cible à faire valider : conservation de l’information nécessaire à l’opposition pendant au moins trois ans, puis réévaluation documentée.

## 7. Droits des personnes

Les demandes sont enregistrées dès réception. L’identité du demandeur doit être vérifiée de façon proportionnée. Le CRM fournit un export JSON via `/privacy-requests`; son contenu doit être contrôlé avant transmission. La réponse doit être apportée dans le délai légal applicable, en principe un mois.

Les demandes de rectification, effacement, limitation ou opposition restent traitées manuellement durant le pilote, avec conservation de la preuve du traitement.

## 8. Durées de conservation proposées

- Prospects sans relation commerciale : trois ans après le dernier contact émanant du prospect ou la dernière interaction pertinente, sous réserve de validation juridique.
- Événements techniques détaillés : durée minimale nécessaire au suivi de campagne et à la preuve, à préciser dans le registre des traitements.
- Liste repoussoir : durée suffisante pour respecter durablement l’opposition ; recommandation opérationnelle minimale de trois ans, à valider.

## 9. Mesures techniques présentes

- import et envoi désactivés par défaut ;
- mode Brevo `test` limité à une adresse configurée ;
- authentification du webhook par header secret uniquement ;
- association obligatoire à un identifiant de campagne Brevo connu ;
- clé d’idempotence des événements ;
- journalisation JSON des webhooks ;
- contrôle des exclusions avant chaque envoi ;
- création d’une tâche uniquement après un clic qualifié vers l’URL d’intérêt ;
- échéance au prochain jour ouvré à 09:00, heure de Paris.

## 10. Références

- CNIL, prospection commerciale électronique : https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel
- CNIL, collecte par moissonnage : https://www.cnil.fr/fr/focus-interet-legitime-collecte-par-moissonnage
- CNIL, liste repoussoir : https://www.cnil.fr/fr/comment-utiliser-une-liste-repoussoir-pour-respecter-lopposition-la-prospection
- Brevo, sécurisation des webhooks : https://developers.brevo.com/docs/secured-webhooks

## 11. Décisions à obtenir avant le mode réel

- [ ] Validation juridique de la base légale et de l’analyse de mise en balance.
- [ ] Autorisation/licence écrite de la source de données.
- [ ] Validation du contenu d’information et du lien de désabonnement du modèle Brevo.
- [ ] Définition et publication de la politique de confidentialité KLS3.
- [ ] Inscription du traitement dans le registre RGPD de KLS3.
- [ ] Validation des durées de conservation et du processus d’exercice des droits.

