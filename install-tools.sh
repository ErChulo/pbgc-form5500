#!/usr/bin/env bash
set -Eeuo pipefail

# bootstrap-speckit-codex-codespaces.sh
#
# Purpose:
#   Configure a GitHub Codespaces Linux environment so you can use:
#     - OpenAI Codex CLI
#     - GitHub Spec Kit ("specify")
#     - Spec Kit initialized for Codex skills inside the current repo
#
# Usage:
#   bash bootstrap-speckit-codex-codespaces.sh
#   bash bootstrap-speckit-codex-codespaces.sh /workspaces/pbgc-form5500
#
# Optional environment variables:
#   SPEC_KIT_REF=vX.Y.Z   # pin Spec Kit to a specific tag; default = latest from main
#   FORCE_REINIT=1        # rerun "specify init --here --ai codex" even if repo already looks initialized
#   NODE_MAJOR=20         # only used if Node is missing or too old

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

PROJECT_DIR="${1:-$PWD}"
SPEC_KIT_REF="${SPEC_KIT_REF:-}"
FORCE_REINIT="${FORCE_REINIT:-0}"
NODE_MAJOR="${NODE_MAJOR:-20}"

if [[ ! -d "$PROJECT_DIR" ]]; then
  die "Project directory does not exist: $PROJECT_DIR"
fi

cd "$PROJECT_DIR"

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

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

ensure_basic_tools() {
  log "Checking basic tools"

  if ! need_cmd git; then
    die "git is required"
  fi

  if ! need_cmd curl; then
    die "curl is required"
  fi

  if ! need_cmd python3; then
    warn "python3 not found; attempting installation"
    if need_cmd sudo && need_cmd apt-get; then
      sudo apt-get update
      sudo apt-get install -y python3 python3-venv python3-pip
    else
      die "python3 is missing and automatic install is unavailable"
    fi
  fi
}

ensure_node() {
  log "Checking Node.js"

  local install_node=0
  local current_major=""

  if need_cmd node; then
    current_major="$(node -p 'process.versions.node.split(".")[0]')"
    if [[ "$current_major" =~ ^[0-9]+$ ]] && (( current_major >= 18 )); then
      printf 'Node.js already available: %s\n' "$(node -v)"
      return 0
    fi
    warn "Node.js is present but too old: $(node -v)"
    install_node=1
  else
    install_node=1
  fi

  if (( install_node == 1 )); then
    log "Installing Node.js via nvm"

    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

    if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    fi

    # shellcheck disable=SC1090
    source "$NVM_DIR/nvm.sh"
    nvm install "$NODE_MAJOR"
    nvm use "$NODE_MAJOR"
    nvm alias default "$NODE_MAJOR"
  fi

  if ! need_cmd node; then
    die "Node.js installation failed"
  fi

  current_major="$(node -p 'process.versions.node.split(".")[0]')"
  if ! [[ "$current_major" =~ ^[0-9]+$ ]] || (( current_major < 18 )); then
    die "Node.js 18+ is required; found $(node -v)"
  fi

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

  if ! need_cmd uv; then
    die "uv installation failed"
  fi

  printf 'uv ready: %s\n' "$(uv --version)"
}

persist_shell_env() {
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

install_real_codex() {
  log "Installing the real OpenAI Codex CLI"

  export PATH="$HOME/.local/bin:$PATH"

  # Remove a common conflicting npm package if present.
  npm uninstall -g codex >/dev/null 2>&1 || true

  npm install -g @openai/codex@latest
  hash -r

  local npm_prefix npm_bin
  npm_prefix="$(npm prefix -g)"
  npm_bin="${npm_prefix}/bin"

  export PATH="${npm_bin}:$PATH"

  mkdir -p "$HOME/.local/bin"
  if [[ -x "${npm_bin}/codex" ]]; then
    ln -sf "${npm_bin}/codex" "$HOME/.local/bin/codex"
  fi

  hash -r

  if ! need_cmd codex; then
    die "codex is still not on PATH after installation"
  fi

  printf 'codex path: %s\n' "$(command -v codex)"
  codex --version || true

  local help_out
  help_out="$(codex --help 2>&1 || true)"
  if grep -Eiq 'create(s)? a new blog|my_cool_blog' <<<"$help_out"; then
    die "A different 'codex' executable is still shadowing OpenAI Codex CLI"
  fi
}

install_specify() {
  log "Installing Spec Kit CLI (specify)"

  local spec_from="git+https://github.com/github/spec-kit.git"
  if [[ -n "$SPEC_KIT_REF" ]]; then
    spec_from="${spec_from}@${SPEC_KIT_REF}"
  fi

  uv tool install specify-cli --force --from "$spec_from"
  export PATH="$HOME/.local/bin:$PATH"

  if ! need_cmd specify; then
    die "specify installation failed"
  fi

  printf 'specify path: %s\n' "$(command -v specify)"
  specify check || true
}

init_spec_kit_for_codex() {
  log "Initializing Spec Kit for Codex"

  local already_initialized=0

  if [[ -d ".specify" || -d ".agents/skills" ]]; then
    already_initialized=1
  fi

  if (( already_initialized == 1 )) && [[ "$FORCE_REINIT" != "1" ]]; then
    warn "Repo already appears initialized; skipping 'specify init --here --ai codex'"
    warn "Set FORCE_REINIT=1 if you want to rerun initialization"
    return 0
  fi

  specify init --here --ai codex
}

verify_layout() {
  log "Verifying repo setup"

  printf '\nCurrent repo: %s\n' "$PWD"

  if [[ -d ".agents/skills" ]]; then
    printf '\nDetected Codex skills directory:\n'
    find ".agents/skills" -maxdepth 3 -type f | sort || true
  else
    warn "No .agents/skills directory found"
  fi

  if [[ -d ".specify" ]]; then
    printf '\nDetected .specify directory:\n'
    find ".specify" -maxdepth 3 -type f | sort || true
  else
    warn "No .specify directory found"
  fi

  printf '\nwhich -a codex:\n'
  which -a codex || true

  printf '\nwhich -a specify:\n'
  which -a specify || true
}

write_helper_notes() {
  log "Writing helper notes"

  mkdir -p .agents

  cat > .agents/CODESPACES-SPECKIT-CODEX-README.md <<'EOF'
# Codespaces + Spec Kit + Codex

## First run
1. Open a fresh terminal, or run:
   source ~/.bashrc
2. Authenticate:
   codex
3. Inside Codex, use the Spec Kit skills:
   $speckit-constitution
   $speckit-specify
   $speckit-plan
   $speckit-tasks
   $speckit-implement

## Troubleshooting
- Verify Codex path:
  which -a codex
- Verify Spec Kit path:
  which -a specify
- Check Spec Kit installation:
  specify check
- If skills do not appear, restart Codex from the repo root.
EOF
}

main() {
  log "Bootstrapping GitHub Codespaces environment for Spec Kit + Codex"

  if [[ "${CODESPACES:-}" == "true" ]]; then
    printf 'Codespaces detected: yes\n'
  else
    warn "CODESPACES environment variable not detected; continuing anyway"
  fi

  ensure_basic_tools
  ensure_node
  ensure_uv
  persist_shell_env
  install_real_codex
  install_specify
  init_spec_kit_for_codex
  verify_layout
  write_helper_notes

  cat <<EOF

SUCCESS

Next steps:
  1. Start a fresh shell:
       source ~/.bashrc
  2. Authenticate Codex:
       codex
  3. Work from this repo root:
       $PROJECT_DIR

Inside Codex, use:
  \$speckit-constitution
  \$speckit-specify
  \$speckit-plan
  \$speckit-tasks
  \$speckit-implement

If skills do not show up immediately, restart Codex from the repo root.
EOF
}

main "$@"