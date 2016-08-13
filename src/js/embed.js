import iframeMessenger from 'guardian/iframe-messenger'
import embedHTML from './text/embed.html!text'

import records from '../assets/data/records_team_pursuit.json!json'

import men_team_pursuit from '../assets/data/men_cycling_track_team_pursuit.json!json'
import TeamPursuit from './components/TeamPursuit';

import {
	json as d3_json
} from 'd3-request';

window.init = function init(el, config) {
    iframeMessenger.enableAutoResize();

    el.innerHTML = embedHTML;



   	//console.log("SWIMMING SwimmingPerspective",el)

   	d3_json("https://interactive.guim.co.uk/docsdata-test/1-kgMNS_5G8Xm9DKhxWVs3GeeYBzEB8FYQYBkOoReXJg.json",(json)=>{
   		
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
            multiplier:2
        })

   	})
    
    

};
