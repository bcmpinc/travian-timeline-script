#!/bin/bash
set -e
grep -v "@require" travian_time_line.user.js > script.js
list=$(grep "@require" travian_time_line.user.js | sed -e 's/.*\s\([-a-z]*\.js\)/\1/i')
for i in $list; do
    echo -e "\n// FILE $i" >> script.js
    cat $i >> script.js
done

