# Checklist de mise en service — Notaires / Brevo

## État par défaut

```env
NOTARY_IMPORT_ENABLED=false
BREVO_SEND_MODE=disabled
```

Ne jamais activer `live` directement.

## Étape A — source autorisée

- [ ] Autorisation écrite ou licence compatible archivée.
- [ ] URLs, date et conditions de collecte documentées.
- [ ] `NOTARY_IMPORT_ENABLED=true` uniquement dans l’environnement de test/staging.
- [ ] Prévisualiser cinq offices, sans importer.
- [ ] Vérifier manuellement les cinq fiches et leur source.
- [ ] Importer ces cinq offices.
- [ ] Réimporter exactement le même lot et confirmer l’absence de doublons.

## Étape B — oppositions

- [ ] Ajouter une opposition manuelle dans `/email-suppressions`.
- [ ] Créer un brouillon comprenant cet office.
- [ ] Vérifier le statut `EXCLUDED`.
- [ ] Ajouter une opposition après création d’un second brouillon.
- [ ] Vérifier que l’envoi est encore bloqué au dernier contrôle.

## Étape C — test Brevo interne

```env
BREVO_SEND_MODE=test
BREVO_TEST_RECIPIENT_EMAIL=adresse-interne-a-valider@kls3-dev.com
```

- [ ] Configurer le webhook avec le header `x-kls3-webhook-secret`.
- [ ] Ne placer aucun secret dans l’URL du webhook.
- [ ] Créer une campagne contenant exactement l’adresse de test.
- [ ] Vérifier réception, délivré, ouverture et clic.
- [ ] Cliquer le lien d’intérêt et vérifier une seule tâche de relance.
- [ ] Vérifier l’échéance au prochain jour ouvré à 09:00 Europe/Paris.
- [ ] Tester désabonnement, hard bounce et plainte spam sur des scénarios maîtrisés.
- [ ] Rejouer un même événement webhook et vérifier qu’il est ignoré comme doublon.

## Étape D — passage réel

- [ ] Tous les points juridiques de `CONFORMITE_RGPD_NOTAIRES.md` sont signés.
- [ ] Le modèle Brevo contient identité, source, information RGPD et désabonnement.
- [ ] Une alerte externe contrôle la disponibilité du webhook.
- [ ] Les journaux Vercel sont accessibles aux seules personnes autorisées.
- [ ] Sauvegarder la configuration du mode test.
- [ ] Passer `BREVO_SEND_MODE=live`.
- [ ] Première campagne réelle limitée à cinq offices.
- [ ] Après contrôle, augmenter par lots jusqu’à 25 maximum.

## Retour arrière

En cas de doute, incident ou plainte :

```env
NOTARY_IMPORT_ENABLED=false
BREVO_SEND_MODE=disabled
```

Puis enregistrer immédiatement l’adresse ou l’entité dans `/email-suppressions`.

