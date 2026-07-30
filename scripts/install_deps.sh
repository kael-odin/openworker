#!/usr/bin/env bash
set -euo pipefail
cd /d/Github_Open/openworker
.venv/Scripts/python.exe -m pip install -e ".[messaging,dev]"
