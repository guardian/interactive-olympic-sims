import iframeMessenger from 'guardian/iframe-messenger'
import embedHTML from './text/embed.html!text'

//import swimming_data from '../assets/data/women_freestyle_400.json!json'
//import swimming_text from '../assets/data/texts/women_freestyle_4x100.json!json'

import running_data200 from '../assets/data/women_running_200.json!json'
//import running_text from '../assets/data/texts/men_running_200.json!json'

import records from '../assets/data/records_w_200m.json!json'


import RunningPerspectiveOval from './components/RunningPerspectiveOval';
//import Running from './components/Running';
//import SwimmingPerspective from './components/SwimmingPerspective';

import {
	dimensions200m        
} from './lib/running';

import {
	json as d3_json
} from 'd3-request';

window.init = function init(el, config) {
    iframeMessenger.enableAutoResize();

    el.innerHTML = embedHTML;



   	//console.log("SWIMMING SwimmingPerspective",el)

   	d3_json("https://interactive.guim.co.uk/docsdata-test/1cwk7e6sC5Y1eiowZrOaYzLZb9-dAUhJq-01zlc8izp8.json",(json)=>{
   		new RunningPerspectiveOval(running_data200,{
	        container:el,
	        text:json.embed_sim.map(d=>{
	        	d.mt = +d.mt;
	        	d.lane = +d.lane;
	        	return d;
	        }),
	        record:records["women_running_200"],
            dimensions:dimensions200m,
	        length:200,
            race:"200m",
	        team:false,
	        multiplier: 1,
	        margins: {
	            left:10,
	            right:10,
	            top:10,
	            bottom:10
	        }
	    });

   	})
    
    return;

    /*new RunningPerspectiveOval(running_data200,{
        container:el,
        text:running_text,
        record:records["men_running_200"],
        dimensions:dimensions200m,
        team:false,
        multiplier: 1,
        race:"200m",
        margins: {
            left:0,
            right:0,
            top:0,
            bottom:0
        }
    })

    return;*/
   /* console.log("RUNNING RunningPerspective",el)

    new Running(running_data200,{
        container:el,
        dimensions:dimensions200m,
        text:running_text,
        record:records.men_running_200,
        multiplier: 1,
        race:"200m",
        margins: {
            left:0,
            right:0,
            top:0,
            bottom:0
        }
    })*/

};
