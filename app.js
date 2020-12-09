require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const logger = require('morgan');
const fs = require('fs');
const helmet = require('helmet');
const fetch = require('node-fetch');
const path = require( 'path' )

const app = express();
// enable security headers
app.use(helmet());
// enable compression of requests
app.use(compression({ filter: shouldCompress }))

// Use the Morgan logger
// create a write stream (in append mode)
var accessLogStream = fs.createWriteStream(path.join(__dirname, 'morgan.log'), { flags: 'a' });
app.use(logger('dev', { stream: accessLogStream }));

// Might connect to Strava in the future
// const initialiseStravaAccessToken = require('./stravaTok.js');
//var stravaAccessTokenJson;
//initialiseStravaAccessToken();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Static website content linked to dist of UI project
app.use(express.static('static'))

const cacheDir=process.env.CACHE_DIR;

app.get('/activity/:id', function(req, res, next) {
  const cachedFileName = path.format( {dir: cacheDir, base: `${req.params.id}.json`});
  
  if (!fs.existsSync(cachedFileName)) {
    const url1 = 'https://nene.strava.com/flyby/stream_compare/'+req.params.id+'/'+req.params.id;
    var stream;

    fetch(url1)
    .then(checkResponseStatus)
    .then(res1 => res1.json())
    .then( res1 => {
      stream=res1;

      const url2='https://nene.strava.com/flyby/matches/'+req.params.id;
      const options = {
        method: 'GET',
        headers: {
          'Origin': 'https://labs.strava.com',
          'User-Agent': 'curl/7.54.0',
          'Accept': '*/*'
        }
      };
      // console.log(url2);
      fetch(url2, options)
      .then(checkResponseStatus)
      .then(res2 => res2.json())
      .then( res2Json => {
        let athleteId;
        // this API returns {} for athletes with certain privacy settings
        try {
          athleteId=res2Json.activity.athleteId;
        } catch(err) {
          athleteId='0';
        }

        if (athleteId!=0)
        {
          // merge activity structure
          // structure: "activity":{"id":9999999999,"athleteId":9999999,"startTime":1592496376,
          // "elapsedTime":2546.0,"name":"Afternoon Run","distance":7249.0,
          // "activityType":"Run"}
          stream.activity = res2Json.activity

          // Lookup this athlete and get firstName
          // structure: "athletes":{"9999999":{"id":9999999,"firstName":"Pete"},...}
          stream.activity.firstName=res2Json.athletes[athleteId].firstName;
        }

        const retString=JSON.stringify(stream)
        fs.writeFileSync(cachedFileName,retString);
        res.setHeader('Content-Type', 'application/json');
        res.end(retString);
      });
    });
  } else {
    res.sendFile(`${req.params.id}.json`, { root: cacheDir });
  }

});

app.get('/events', function(req, res, next) {
  // this endpoint is an indicator for site use.
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const currentdate = new Date();
  const d= currentdate.getDate() + "/"
  + (currentdate.getMonth()+1)  + "/" 
  + currentdate.getFullYear() + " @ "  
  + currentdate.getHours() + ":"  
  + currentdate.getMinutes() + ":" 
  + currentdate.getSeconds();//Date.now().toISOString(); 
  console.log( `${d} - Request from: ${ip}`)
  res.sendFile('events.json', { root: __dirname });
})

app.get('/athletes', function(req, res, next) {
  res.sendFile('athletes.json', { root: __dirname });
})

app.use(function (err, req, res, next) {
  console.error(err.stack)
  res.status(500).send('Something broke!')
})

app.use(function (req, res, next) {
  res.status(404).send("Sorry can't find that!")
})
module.exports = app;

function shouldCompress (req, res) {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false
  }

  // fallback to standard filter function
  return compression.filter(req, res)
}

function checkResponseStatus(res) {
  if(res.ok){
      return res
  } else {
      throw new Error(`The HTTP status of the reponse: ${res.status} (${res.statusText})`);
  }
}