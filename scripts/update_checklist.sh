#!/usr/bin/env bash

CHECKLIST="01_pedrodemenagement_index.md"
TEMP="01_pedrodemenagement_index.md.tmp"

cp "$CHECKLIST" "$TEMP"

mark_fixed() {
    local pattern="$1"
    local label="$2"

    if grep -R "$pattern" -n src/pages >/dev/null; then
        # Found old route → NOT fixed → keep as [ ]
        :
    else
        # Old route NOT found → likely fixed → mark [x]
        sed -i "s|- \[ \] $label|- \[x\] $label|g" "$TEMP"
    fi
}

# ROUTE CHECKS
mark_fixed "authFetch('/websites"      "Replace \`/websites\` → \`/api/backend/websites\`"
mark_fixed "authFetch('/clients"       "Replace \`/clients\` → \`/api/backend/clients\`"
mark_fixed
