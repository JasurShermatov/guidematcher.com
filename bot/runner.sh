#!/bin/bash

# shellcheck disable=SC2155
export PYTHONPATH=$(pwd)

python app.py

#!/bin/bash

export PYTHONPATH="$(pwd):$PYTHONPATH"

python app.py
