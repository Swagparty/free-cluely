#!/usr/bin/env bash
set -uo pipefail

TARGET="${1:?usage: codesign.sh <file>}"
LOG="$(mktemp)"

{
  if [ ! -f "$TARGET" ]; then
    echo "target not found: $TARGET"
    echo "SIGNED_OK=false"
    exit 0
  fi

  JAR="$(find "${CODESIGNTOOL_DIR}" -name 'code_sign_tool-*.jar' | head -n 1)"
  CONF="$(find "${CODESIGNTOOL_DIR}" -type d -name conf | head -n 1)"
  TOOL_ROOT="$(dirname "$CONF")"
  TARGET_ABS="$(cd "$(dirname "$TARGET")" && pwd)/$(basename "$TARGET")"
  OUT_DIR="$(mktemp -d)"
  SIGNED="${OUT_DIR}/$(basename "$TARGET_ABS")"

  echo "target=$TARGET_ABS"
  echo "jar=$JAR"

  cd "$TOOL_ROOT" || exit 0

  run_sign() {
    java -jar "$JAR" sign \
      -username="$SSL_COM_ESIGNER_USERNAME" \
      -password="$SSL_COM_ESIGNER_PASSWORD" \
      -totp_secret="$SSL_COM_ESIGNER_TOTP_SECRET" \
      -input_file_path="$TARGET_ABS" \
      -output_dir_path="$OUT_DIR" \
      "$@"
  }

  run_sign
  if [ ! -f "$SIGNED" ]; then
    echo "retrying with malware_block after OTP window"
    sleep 32
    run_sign -malware_block
  fi

  if [ -f "$SIGNED" ]; then
    cp -f "$SIGNED" "$TARGET_ABS"
    echo "SIGNED_OK=true"
  else
    echo "SIGNED_OK=false"
  fi
  rm -rf "$OUT_DIR"
} 2>&1 | tee "$LOG"

if grep -q '^SIGNED_OK=true$' "$LOG"; then
  exit 0
fi

encoded="$(tail -n 40 "$LOG" | sed -e 's/%/%25/g' -e 's/\r$//' | awk '{ printf "%s%%0A", $0 }')"
echo "::error::Signing failed for ${TARGET}:%0A${encoded}"
exit 1
