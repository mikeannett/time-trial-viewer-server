a=1

sub=ttviewer
dom=http://serverless.social
while true
do
    echo started $a - `date`
    lt -h $dom -p 3002 --subdomain $sub >lt.log &
    PID=$!

    sleep 10
    cat lt.log
    if grep -q $sub lt.log; then 
	echo successful launch PID is $PID
	wait $PID
	# lt dies every day or so, so repeat. 
	# need to sleep for a bit in the hope that our subdomain becomes available.
	echo finished $a -  `date`
	sleep 600
    else
	# We didn't get the subdomain we wanted
	kill $PID
	echo Didn\'t get the correct subdomain, retry in 20 mins.
	sleep 2400
	echo retrying ...
    fi
    a=$(($a+1))
done | tee -a mylt.log
