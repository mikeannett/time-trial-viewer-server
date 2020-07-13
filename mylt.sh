a=1
sub=ttviewer
dom=http://serverless.social
while true
do
    echo started $a - `date`
    lt -h $dom -p 3002 --subdomain $sub
    # lt dies every day or so, so repeat. 
    # need to sleep for a bit in the hope that our subdomain becomes available.
    echo finished $a -  `date`
    sleep 600
    a=$(($a+1))
done
