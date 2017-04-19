if [ -z "$DYNO" ] || [[ $DYNO == *"worker"* ]]; then
  export DISPLAY=':99.0'
  Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
fi
