#!/usr/bin/env bash
set -Eeuo pipefail

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

PROJECT_DIR="${1:-$PWD}"
FORCE_REINIT="${FORCE_REINIT:-0}"
NODE_MAJOR="${NODE_MAJOR:-20}"
SPEC_KIT_REF="${SPEC_KIT_REF:-}"

cd "$PROJECT_DIR"

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

append_block_once() {
  local file="$1"
  local marker_begin="$2"
  local marker_end="$3"
  local block="$4"

  mkdir -p "$(dirname "$file")"
  touch "$file"

  if grep -Fq "$marker_begin" "$file"; then
    return 0
  fi

  {
    printf '\n%s\n' "$marker_begin"
    printf '%s\n' "$block"
    printf '%s\n' "$marker_end"
  } >> "$file"
}

ensure_basic_tools() {
  log "Checking basic tools"

  need_cmd git || die "git is required"
  need_cmd curl || die "curl is required"

  if ! need_cmd python3; then
    die "python3 is required"
  fi
}

ensure_node() {
  log "Checking Node.js"

  if need_cmd node; then
    local major
    major="$(node -p 'process.versions.node.split(".")[0]')"
    if [[ "$major" =~ ^[0-9]+$ ]] && (( major >= 18 )); then
      printf 'Node.js already available: %s\n' "$(node -v)"
      printf 'npm already available: %s\n' "$(npm -v)"
      return 0
    fi
  fi

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  fi
  # shellcheck disable=SC1090
  source "$NVM_DIR/nvm.sh"
  nvm install "$NODE_MAJOR"
  nvm use "$NODE_MAJOR"
  nvm alias default "$NODE_MAJOR"

  need_cmd node || die "Node.js install failed"
  printf 'Node.js ready: %s\n' "$(node -v)"
  printf 'npm ready: %s\n' "$(npm -v)"
}

ensure_uv() {
  log "Checking uv"

  export PATH="$HOME/.local/bin:$PATH"
  if ! need_cmd uv; then
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
  fi

  need_cmd uv || die "uv install failed"
  printf 'uv ready: %s\n' "$(uv --version)"
}

persist_env() {
  log "Persisting PATH and CODEX_HOME in ~/.bashrc"

  local block
  block='export PATH="$HOME/.local/bin:$PATH"
if command -v npm >/dev/null 2>&1; then
  __NPM_GLOBAL_BIN="$(npm prefix -g 2>/dev/null)/bin"
  case ":$PATH:" in
    *":${__NPM_GLOBAL_BIN}:"*) ;;
    *) export PATH="${__NPM_GLOBAL_BIN}:$PATH" ;;
  esac
  unset __NPM_GLOBAL_BIN
fi
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"'

  append_block_once \
    "$HOME/.bashrc" \
    "# >>> speckit-codex-codespaces >>>" \
    "# <<< speckit-codex-codespaces <<<" \
    "$block"

  export PATH="$HOME/.local/bin:$PATH"
  export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
  mkdir -p "$CODEX_HOME"
}

repair_and_install_codex() {
  log "Installing OpenAI Codex CLI"

  local npm_prefix npm_bin existing_codex
  npm_prefix="$(npm prefix -g)"
  npm_bin="${npm_prefix}/bin"
  mkdir -p "$npm_bin"

  export PATH="${npm_bin}:$PATH"

  printf 'npm global prefix: %s\n' "$npm_prefix"
  printf 'npm global bin: %s\n' "$npm_bin"

  # Show existing codex resolution before cleanup
  printf '\nBefore cleanup, which -a codex:\n'
  which -a codex || true

  # Remove known conflicting npm packages
  npm uninstall -g codex @openai/codex >/dev/null 2>&1 || true

  # Remove stale global executable if it still exists
  existing_codex="${npm_bin}/codex"
  if [[ -e "$existing_codex" || -L "$existing_codex" ]]; then
    warn "Removing stale executable: $existing_codex"
    rm -f "$existing_codex"
  fi

  hash -r

  npm i -g @openai/codex@latest

  hash -r

  need_cmd codex || die "codex is still not on PATH after installation"

  printf '\nAfter install, which -a codex:\n'
  which -a codex || true

  printf '\nCodex version:\n'
  codex --version || true

  printf '\nCodex help:\n'
  codex --help | head -40 || true
}

install_specify() {
  log "Installing Spec Kit CLI"

  local spec_from="git+https://github.com/github/spec-kit.git"
  if [[ -n "$SPEC_KIT_REF" ]]; then
    spec_from="${spec_from}@${SPEC_KIT_REF}"
  fi

  uv tool install specify-cli --force --from "$spec_from"
  export PATH="$HOME/.local/bin:$PATH"
  hash -r

  need_cmd specify || die "specify installation failed"

  printf 'specify path: %s\n' "$(command -v specify)"
  specify check || true
}

init_spec_kit_for_codex() {
  log "Initializing Spec Kit for Codex skills"

  if [[ -d ".specify" || -d ".agents/skills" ]] && [[ "$FORCE_REINIT" != "1" ]]; then
    warn "Repo already appears initialized; skipping init"
    warn "Use FORCE_REINIT=1 to force reinitialization"
    return 0
  fi

  specify init --here --force --ai codex --ai-skills
}

write_notes() {
  log "Writing local notes"

  mkdir -p .agents

  cat > .agents/CODESPACES-SPECKIT-CODEX-README.md <<'EOF'
After this script finishes:

1. Start a fresh shell:
   source ~/.bashrc

2. Start Codex:
   codex

3. In Codex, use the Spec Kit skills:
   $speckit-constitution
   $speckit-specify
   $speckit-plan
   $speckit-tasks
   $speckit-implement

If the skills do not appear immediately, exit Codex and launch it again from the repo root.
EOF
}

verify() {
  log "Verification"

  printf '\nRepo root: %s\n' "$PWD"

  printf '\nwhich -a codex:\n'
  which -a codex || true

  printf '\nwhich -a specify:\n'
  which -a specify || true

  printf '\nspecify check:\n'
  specify check || true

  printf '\nGenerated directories:\n'
  find . -maxdepth 3 \( -path './.specify*' -o -path './.agents*' \) | sort || true
}

main() {
  log "Bootstrapping GitHub Codespaces environment for Spec Kit + Codex"

  ensure_basic_tools
  ensure_node
  ensure_uv
  persist_env
  repair_and_install_codex
  install_specify
  init_spec_kit_for_codex
  write_notes
  verify

  cat <<'EOF'

SUCCESS

Now run:
  source ~/.bashrc
  codex

Then inside Codex:
  $speckit-constitution
  $speckit-specify
  $speckit-plan
  $speckit-tasks
  $speckit-implement
EOF
}

main "$@"