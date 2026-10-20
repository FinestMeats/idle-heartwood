#!/bin/bash
# ./run_var.sh N variant1 variant2 ...  (each variant on both cores; results in varres/)
cd /home/claude/tcg; mkdir -p varres; N=$1; shift
for v in "$@"; do node sim_var.js "$v" $N 0 2 > "varres/$v.0.json" & node sim_var.js "$v" $N 1 2 > "varres/$v.1.json"; wait; echo "done $v $(date +%T)"; done
