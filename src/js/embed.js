import iframeMessenger from 'guardian/iframe-messenger'
import embedHTML from './text/embed.html!text'

//import swimming_data from '../assets/data/women_freestyle_400.json!json'
//import swimming_text from '../assets/data/texts/women_freestyle_4x100.json!json'

import running_data200 from '../assets/data/men_running_200.json!json'
import running_text from '../assets/data/texts/men_running_200.json!json'

import records from '../assets/data/records.json!json'


import RunningPerspectiveOval from './components/RunningPerspectiveOval';
//import Running from './components/Running';
//import SwimmingPerspective from './components/SwimmingPerspective';

import {
	dimensions200m        
} from './lib/running';

window.init = function init(el, config) {
    iframeMessenger.enableAutoResize();

    el.innerHTML = embedHTML;

   	/*console.log("SWIMMING SwimmingPerspective",el)

    new SwimmingPerspective(swimming_data,{
        container:el,
        text:swimming_text,
        record:records["women_freestyle_400"],
        team:false,
        multiplier: 1,
        margins: {
            left:10,
            right:10,
            top:10,
            bottom:10
        }
    })
    return;*/

    new RunningPerspectiveOval(running_data200,{
        container:el,
        text:running_text,
        record:records["women_freestyle_400"],
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

    return;
    console.log("RUNNING RunningPerspective",el)

    new Running(running_data200,{
        container:el,
        dimensions:dimensions200m,
        text:running_text,
        record:records.men_medley_200,
        multiplier: 1,
        race:"200m",
        margins: {
            left:0,
            right:0,
            top:0,
            bottom:0
        }
    })

};
