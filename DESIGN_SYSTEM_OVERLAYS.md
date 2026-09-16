# KLS3 DESIGN SYSTEM — OVERLAY SURFACES

**Date** : 2026-09-16
**Status** : ✅ RÈGLE OBLIGATOIRE

---

## PROBLÈME RÉCURRENT RÉSOLU

À chaque évolution fonctionnelle, certains overlays (menus, modaux, popovers) repassaient avec un fond transparent/semi-transparent.

**CAUSE RACINE** :
- Variable `card-bg` utilisée massivement mais non définie dans `globals.css`
- Développeurs utilisaient `bg-background`, `bg-black/50`, `bg-popover/80` avec alpha
- Tailwind CSS 4 générait des couleurs par défaut transparentes

---

## RÈGLE VISUELLE CENTRALISÉE

### Couleurs KLS3 (opaques uniquement)

```css
--color-background: #0d0d0d   /* Page background */
--color-card: #111111          /* Cards/Panels/Menus */
--color-card-bg: #111111       /* Alias (opaque) */
--color-accent: #4b7bf5        /* Actions */
--color-text-primary: #f0ede8  /* Main text */

/* Intentional transparency (text/borders ONLY) */
--color-text-muted: rgba(240, 237, 232, 0.45)
--color-border: rgba(255, 255, 255, 0.07)
```

### Utility Classes (Source Unique de Vérité)

#### `.overlay-surface` — Dropdowns, Popovers, Menus

```css
.overlay-surface {
  background: var(--color-card-bg);     /* #111111 opaque */
  border: 1px solid var(--color-border); /* rgba(255,255,255,0.07) */
  border-radius: 0.5rem;                 /* 8px */
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.3);
}
```

**Utilisation** :
```tsx
<div className="absolute top-full mt-2 overlay-surface py-1 z-50">
  {/* dropdown content */}
</div>
```

#### `.modal-backdrop` — Modaux Fullscreen

```css
.modal-backdrop {
  background: var(--color-background); /* #0d0d0d opaque */
  /* NO opacity, NO backdrop-blur, NO transparency */
}
```

**Utilisation** :
```tsx
<div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center">
  <Card>{/* modal content */}</Card>
</div>
```

#### `.sheet-surface` — Drawers/Sidebars

```css
.sheet-surface {
  background: var(--color-card);                  /* #111111 opaque */
  border-left: 1px solid var(--color-border);
  box-shadow: -10px 0 15px -3px rgb(0 0 0 / 0.3);
}
```

---

## INTERDICTIONS STRICTES

### ❌ INTERDIT sur surfaces principales

```tsx
/* ❌ INTERDIT - Backgrounds avec alpha */
className="bg-background/80"
className="bg-black/50"
className="bg-popover/90"
className="bg-card/60"

/* ❌ INTERDIT - Backdrop blur sur modaux */
className="backdrop-blur-sm"
className="backdrop-filter"

/* ❌ INTERDIT - Opacity sur surfaces */
className="opacity-95"
style={{ opacity: 0.9 }}
```

### ✅ AUTORISÉ uniquement pour

```tsx
/* ✅ OK - Hover states */
className="hover:bg-accent/10"
className="hover:bg-white/5"

/* ✅ OK - Borders */
className="border-white/15"
className="border-accent/30"

/* ✅ OK - Text muted */
className="text-text-muted"  /* déjà rgba(240,237,232,0.45) */
className="text-text-primary/60"
```

### ✅ EXCEPTION : Navigation uniquement

```tsx
/* ✅ OK - Navigation sticky avec blur (seul cas autorisé) */
<nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
```

---

## COMPOSANTS CONCERNÉS

### Primitives UI (utiliser utility classes)

- **DropdownMenu** → `.overlay-surface`
- **Select** → `.overlay-surface`
- **Popover** → `.overlay-surface`
- **Command** → `.overlay-surface`
- **ContextMenu** → `.overlay-surface`

### Modaux (utiliser `.modal-backdrop`)

- **Dialog / Modal** → `.modal-backdrop`
- **AlertDialog** → `.modal-backdrop`
- **StatusChangeMenu** → `.modal-backdrop`
- **CallbackModal** → `.modal-backdrop`
- **StageChangeMenu** → `.modal-backdrop`
- **CallResultMenu** → `.modal-backdrop`
- **CreateTaskModal** → `.modal-backdrop`
- **Loading overlays** → `.modal-backdrop`

### Sheets (utiliser `.sheet-surface`)

- **Sheet** → `.sheet-surface`
- **Drawer** → `.sheet-surface`
- **EntityQuickView** → `.sheet-surface`

---

## PROTECTION ANTI-RÉGRESSION

### 1. Recherche automatique (pre-commit hook recommandé)

```bash
# Chercher les violations potentielles
grep -rn "bg-.*\/[0-9]" components/ui/*.tsx app/**/*.tsx | grep -v "hover:" | grep -v "text-"
```

### 2. Checklist développeur

Avant de créer un nouveau overlay :

- [ ] Utiliser `.overlay-surface` pour dropdowns/menus
- [ ] Utiliser `.modal-backdrop` pour modaux fullscreen
- [ ] Utiliser `.sheet-surface` pour drawers/sidebars
- [ ] Vérifier aucun `bg-*/XX` sur la surface principale
- [ ] Vérifier aucun `backdrop-blur` (sauf navigation)
- [ ] Vérifier aucune `opacity` sur la surface
- [ ] Tester visuellement : surface opaque #111111

### 3. Code review checklist

- [ ] Nouveau composant overlay utilise utility class centralisée ?
- [ ] Aucun background avec alpha sur surface principale ?
- [ ] Aucun backdrop-blur hors navigation ?
- [ ] Design KLS3 respecté (dark, opaque, minimal) ?

---

## MIGRATION EXISTANTE

**Fichiers corrigés** :

1. `app/globals.css` — Ajout `--color-card-bg`, utility classes, documentation
2. `components/ui/dropdown-menu.tsx` — Utilise `.overlay-surface`
3. `app/cold-call/status-change-menu.tsx` — Utilise `.modal-backdrop`
4. `app/cold-call/call-result-menu.tsx` — Utilise `.modal-backdrop`
5. `app/cold-call/callback-modal.tsx` — Utilise `.modal-backdrop`
6. `app/pipeline/stage-change-menu.tsx` — Utilise `.modal-backdrop`
7. `components/pipeline/create-task-modal.tsx` — Utilise `.modal-backdrop`
8. `app/cold-call/cold-call-board.tsx` — Utilise `.modal-backdrop` (loading)
9. `app/pipeline/pipeline-board.tsx` — Utilise `.modal-backdrop` (loading)

**Pattern avant** :
```tsx
className="bg-card-bg border border-border rounded-lg shadow-lg"
className="fixed inset-0 bg-background z-50"
```

**Pattern après** :
```tsx
className="overlay-surface"
className="fixed inset-0 modal-backdrop z-50"
```

---

## DESIGN SYSTEM KLS3 — RÉSUMÉ

### Surfaces opaques (#111111)

- Dropdowns
- Modaux
- Sheets
- Cards
- Panels
- Menus contextuels

### Transparence autorisée

- Text muted (45%)
- Borders (7%)
- Hover states (5-10%)
- Navigation sticky (60-95% avec blur)

### Interdictions

- ❌ Glow/cyberpunk effects
- ❌ Backdrop blur sur modaux
- ❌ Backgrounds translucides
- ❌ Opacity sur surfaces principales
- ❌ Alpha sur `bg-background`, `bg-card`, `bg-popover`

---

**Si transparence détectée** :

1. Vérifier si violation de cette règle
2. Utiliser utility class appropriée
3. Tester visuellement : opaque #111111
4. Commit avec message : `fix: restore opaque overlay surfaces (KLS3 design)`

---

**Auteur** : Claude Code
**Date** : 2026-09-16
**Règle** : OBLIGATOIRE pour tous les overlays
