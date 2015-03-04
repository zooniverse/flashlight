#!/bin/bash
function timeout_cmd {
  if [ -z "$2" ]
  then
  TIMEOUT=60
  else
  TIMEOUT=$2
  fi

  SLEEP_TIME=1

  SUCCESS=false

  until [ $TIMEOUT -le 0 ]
  do
    if eval $1
    then
      SUCCESS=true
      break
    fi
    sleep $SLEEP_TIME
    TIMEOUT=$(($TIMEOUT - $SLEEP_TIME))
  done

  $SUCCESS
}

#config vars
file="config/firebase.sh"
if [ -f "$file" ]
then
  . $file
else
  export FB_TOKEN=''
  export FB_NAME=''
  export NODE_ENV='demo'
fi

# #wait for ES to be up and running
timeout_cmd "[ $(curl --write-out %{http_code} --silent --output /dev/null $ES_HOST:9200) -eq 200 ]"

#start the app
node app.js
#start the example app to run searches
#cd example
#sed -i s/FIREBASE_TOKEN_GOES_HERE/$FB_TOKEN/g example.js
#serve
