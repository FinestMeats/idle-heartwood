#!/bin/bash
# runs each rule set on both cores, 150 games per pairing = 2,400 games
cd /home/claude/tcg; mkdir -p smartres
for cfg in "0 0 30" "chip 0 30" "carry 0 30" "chip tired 30" "chip clearing 30" "chip all 30" "chip 0 deck40"; do
  set -- $cfg; tag="$1_$2"; [ "$3" = deck40 ] && tag="$tag"_deck40
  node sim_smart.js $1 $2 150 0 2 $3 > smartres/$tag.0.json &
  node sim_smart.js $1 $2 150 1 2 $3 > smartres/$tag.1.json; wait
  echo "done $tag $(date +%T)"
done
