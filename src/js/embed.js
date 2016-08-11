import iframeMessenger from 'guardian/iframe-messenger'
import embedHTML from './text/embed.html!text'

//import swimming_data from '../assets/data/women_freestyle_400.json!json'
//import swimming_text from '../assets/data/texts/women_freestyle_4x100.json!json'

//import running_data200 from '../assets/data/men_running_200.json!json'
//import running_text from '../assets/data/texts/men_running_200.json!json'

import records from '../assets/data/records_team_pursuit.json!json'


//import RunningPerspectiveOval from './components/RunningPerspectiveOval';
//import Running from './components/Running';
//import SwimmingPerspective from './components/SwimmingPerspective';

/*import {
	dimensions200m        
} from './lib/running';*/

import men_team_pursuit from '../assets/data/men_cycling_track_team_pursuit.json!json'
import TeamPursuit from './components/TeamPursuit';

import {
	json as d3_json
} from 'd3-request';

window.init = function init(el, config) {
    iframeMessenger.enableAutoResize();

    el.innerHTML = embedHTML;



   	//console.log("SWIMMING SwimmingPerspective",el)

   	d3_json("https://interactive.guim.co.uk/docsdata-test/1rubYCASgNxcWrpWCrh1e4Y_kNfwF3jyt84L_iehxevI.json",(json)=>{
   		
        let team_pursuit=new TeamPursuit(men_team_pursuit,{
            container:el,
            record:records.men_team_pursuit,
            text:json.embed_sim,
            race:"team_pursuit",
            title:"Team Pursuit, Men",
            margins: {
                left:40,
                right:40,
                top:40,
                bottom:40
            },
            multiplier:1
        })

   	})
    
    

};
