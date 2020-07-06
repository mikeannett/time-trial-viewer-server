require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const logger = require('morgan');
const fs = require('fs');
const helmet = require('helmet');
const request = require('request-promise');
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

    request(url1).then( res1 => {
      stream=JSON.parse(res1);

      const url2='https://nene.strava.com/flyby/matches/'+req.params.id;
      const options = {
        method: 'GET',
        uri: url2,
        headers: {
          'Origin': 'https://labs.strava.com',
          'User-Agent': 'curl/7.54.0',
          'Accept': '*/*'
        }
      };
      // console.log(url2);
      request(options).then( res2 => {
        const res2Json=JSON.parse(res2);
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
      })
    })
  } else {
    res.sendFile(`${req.params.id}.json`, { root: cacheDir });
  }

});

app.get('/test', function(req, res, next) {
  const url1 = 'https://www.strava.com/athletes/1630456';
  request(url1).then( res3 => {
    const athleteJson=findAthleteJson(res3);
    let ret;
    if (athleteJson=='') ret='Not Found!'
    else {
    /*
      ret = JSON.stringify({
          athleteName: athleteJson.name,
          atheletUrl: athleteJson.url,
          atheletImageUrl: athleteJson.image
        }) */ 
        ret=athleteJson;
    }
    res.end(ret);
  })
})

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

function findJsonBlock( str, start ) {
  const startTxt = "<script type='application/ld+json'>";
  const endTxt = "</script>";
  let beginning=str.indexOf(startTxt,start) + startTxt.length;
  let end;
  let ret;

  if (beginning > -1)
    end=str.indexOf(endTxt,beginning);

  if (beginning==-1 || end==-1)
    ret = { found: false }

  ret={
    found: true,
    json: str.substr(beginning,end-beginning),
    newStart: end + endTxt.length
  }

  return ret;
}

function findAthleteJson( str) {
  let jsonBlock;
  let json
  let start=0;
  let stillLooking = true;
  while (stillLooking)
  {
    jsonBlock = findJsonBlock(str, start)
    if (jsonBlock.found) {
      start = jsonBlock.newStart;
      json=JSON.parse(jsonBlock.json)
      if(json.hasOwnProperty('@type') && json['@type']=='Person'){
        stillLooking = false;
      }
    } else
      return '';
  }
  return json;
}

function shouldCompress (req, res) {
  if (req.headers['x-no-compression']) {
    // don't compress responses with this request header
    return false
  }

  // fallback to standard filter function
  return compression.filter(req, res)
}
