import iframeMessenger from 'guardian/iframe-messenger'
import embedHTML from './text/embed.html!text'

import swimming_data from '../assets/data/women_freestyle_400.json!json'
import swimming_text from '../assets/data/texts/women_freestyle_4x100.json!json'

//import running_data100 from '../assets/data/men_running_100.json!json'
//import running_text from '../assets/data/texts/men_running_100.json!json'

import records from '../assets/data/records.json!json'


//import RunningPerspective from './components/RunningPerspective';
import SwimmingPerspective from './components/SwimmingPerspective';

import {
	dimensions100m        
} from './lib/running';

window.init = function init(el, config) {
    iframeMessenger.enableAutoResize();

    el.innerHTML = embedHTML;

   	console.log("SWIMMING SwimmingPerspective",el)

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
    return;

    /*console.log("RUNNING RunningPerspective",el)

    new RunningPerspective(running_data100,{
        container:el,
        dimensions:dimensions100m,
        text:running_text,
        record:records.men_medley_200,
        multiplier: 1,
        margins: {
            left:10,
            right:80,
            top:10,
            bottom:10
        }
    })*/

};
