#!/bin/bash

# KLS3 Design System - Overlay Transparency Check
# Detects potential violations of opaque overlay surface rule
# Run: ./scripts/check-overlay-transparency.sh

echo "🔍 KLS3 Design System - Overlay Transparency Audit"
echo "=================================================="
echo ""

VIOLATIONS=0

# Check for bg-* with alpha on primary surfaces (excluding hover states and text)
echo "Checking for bg-* with alpha on surfaces..."
RESULTS=$(grep -rn "className.*bg-[a-z]*\/[0-9]" components/ui/*.tsx app/**/*.tsx 2>/dev/null | \
  grep -v "hover:" | \
  grep -v "text-" | \
  grep -v "border-" | \
  grep -v "group-hover:" | \
  grep -v "focus:" | \
  grep -v "active:")

if [ -n "$RESULTS" ]; then
  echo "⚠️  Found potential violations:"
  echo "$RESULTS"
  echo ""
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ No bg-* with alpha violations found"
  echo ""
fi

# Check for backdrop-blur outside navigation
echo "Checking for backdrop-blur usage (should be navigation only)..."
BACKDROP_RESULTS=$(grep -rn "backdrop-blur" components/ app/ 2>/dev/null | \
  grep -v "nav-v2.tsx" | \
  grep -v "\.css")

if [ -n "$BACKDROP_RESULTS" ]; then
  echo "⚠️  Found backdrop-blur outside navigation:"
  echo "$BACKDROP_RESULTS"
  echo ""
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ No backdrop-blur violations found"
  echo ""
fi

# Check for opacity on modal/overlay surfaces
echo "Checking for opacity on overlay surfaces..."
OPACITY_RESULTS=$(grep -rn "className.*opacity-[0-9]" components/ui/*.tsx app/**/{modal,menu,dialog,popover,dropdown}*.tsx 2>/dev/null)

if [ -n "$OPACITY_RESULTS" ]; then
  echo "⚠️  Found opacity on overlay surfaces:"
  echo "$OPACITY_RESULTS"
  echo ""
  VIOLATIONS=$((VIOLATIONS + 1))
else
  echo "✅ No opacity violations found"
  echo ""
fi

# Check for missing utility classes
echo "Checking for legacy patterns (should use utility classes)..."
LEGACY_DROPDOWN=$(grep -rn 'className=".*absolute.*bg-card-bg.*border.*border-border' components/ui/dropdown-menu.tsx 2>/dev/null)
LEGACY_MODAL=$(grep -rn 'className=".*fixed.*inset-0.*bg-background' app/ components/ 2>/dev/null | grep -v "modal-backdrop")

LEGACY_COUNT=0
if [ -n "$LEGACY_DROPDOWN" ]; then
  echo "⚠️  Found legacy dropdown pattern (should use overlay-surface):"
  echo "$LEGACY_DROPDOWN"
  echo ""
  LEGACY_COUNT=$((LEGACY_COUNT + 1))
fi

if [ -n "$LEGACY_MODAL" ]; then
  echo "⚠️  Found legacy modal pattern (should use modal-backdrop):"
  echo "$LEGACY_MODAL"
  echo ""
  LEGACY_COUNT=$((LEGACY_COUNT + 1))
fi

if [ $LEGACY_COUNT -eq 0 ]; then
  echo "✅ All components use utility classes"
  echo ""
fi

# Summary
echo "=================================================="
if [ $VIOLATIONS -eq 0 ] && [ $LEGACY_COUNT -eq 0 ]; then
  echo "✅ All overlay surfaces follow KLS3 Design System"
  echo "   - Opaque backgrounds (#111111)"
  echo "   - No unwanted transparency"
  echo "   - Utility classes used correctly"
  exit 0
else
  echo "⚠️  Found $VIOLATIONS violations and $LEGACY_COUNT legacy patterns"
  echo ""
  echo "📚 See DESIGN_SYSTEM_OVERLAYS.md for rules"
  echo "🔧 Fix violations:"
  echo "   1. Use .overlay-surface for dropdowns/menus"
  echo "   2. Use .modal-backdrop for fullscreen modals"
  echo "   3. Remove bg-*/XX with alpha on surfaces"
  echo "   4. Remove backdrop-blur (except navigation)"
  exit 1
fi
