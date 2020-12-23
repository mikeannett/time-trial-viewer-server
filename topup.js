function getActivityType1( data ) {
    // Type 1 - user activity or user not public on Strava, page displays something like
    // "Follow xxx on Strava to see this activity." Tru and extract the name from this page.
    // Possible targets are:
    // 1:     <title>
    //    Follow XXX on Strava to see this activity. Join for free.
    //    </title>
    // 2: <meta content='Join XXX and get inspired for your next workout' name='description'>
    // 3: <h1>Follow XXX on Strava to see this activity. Join for free.</h1>
    // 4: <h2>Join XXX and get inspired for your next workout</h2>
    let activity;
    const o3=data.indexOf( "<h1>Follow" )+11;
    const o4=data.indexOf( "<h2>Join" )+9;
    const w3=data.substring( o3, data.indexOf( " ", o3 ));
    const w4=data.substring( o4, data.indexOf( " ", o4 ));
    if (w3!=w4) return;

    activity={ firstName: w3 };

    return activity;
}
    
function getActivityType2( data ) {
// Type 1 - user activity and user are public on Strava, page displays summary of activity." Tru and extract the name from this page.
// We are mostly after Athlete_id possible targets are:
// 1: \u0026athlete_id=xxxxxx
// 2: \u0026follow_athlete_id=xxxxx
// Also try and extract name, Targets:
// 3: <title>X.X km Run Activity on XX November 2020 by XXX X. on Strava</title>
// 4: <meta content='xxxActivity textxxx - xxxNamexx&#39;s x.x km run' property='og:title'>
// 6: <div data-react-class="ActivityPublic" data-react-props="{&quot;activity&quot;:{&quot;name&quot;:&quot;XXXXXXX&quot;,&quot;date&quot;:&quot;Yesterday&quot;,&quot;athlete&quot;:{&quot;name&quot;:&quot;XXX XXXXXX&quot;,&quot;avatarUrl&quot;:&quot;
// 5: Unreliable not always in this format
// 5: <meta content='XXX X. ran x.x km on xx Nov 2020.' property='twitter:description'>
    let activity;
    const o1=data.indexOf( "026athlete_id=" )+14;
    const o2=data.indexOf( "0026follow_athlete_id=" )+22;
    const o4e=data.indexOf( "' property='og:title'>" );
    const o4=data.substr( 1, o4e ).lastIndexOf(" - ")+3;
    const n1=parseInt( data.substring( o1, o1+15 ) );
    const n2=parseInt( data.substring( o2, o2+15 ) );
    let name;

    if (n1!=n2 || isNaN(n1) || isNaN(n2)) { 
        fs.writeFileSync("error.html",data);
        return;
    }

    activity={ athleteId: n1 };
    if (o4e>1 && o4>1 && o4e-o4 < 100 )
    {
        name=data.substring( o4, data.indexOf( "&#39;", o4 ));
        activity.firstName=name;
    }

    return activity;
}

function getActivity( data ) {
    
    let n=data.indexOf( "<title>Log In | Strava</title>" );

    if (n !== -1) {
        // type 3 - we've be sent to login page, most likely activity has been deleted or hidden
        return;
    }


    n=data.indexOf( "Strava to see this activity" );
    if (n !== -1) {
        console.log( 'type 1' );
        return getActivityType1( data );
    }

    console.log( 'type 2' );
    return getActivityType2( data );
}

exports.getActivity = getActivity;